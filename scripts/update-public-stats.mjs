import { mkdirSync, writeFileSync } from "node:fs";

const username = process.env.GITHUB_USERNAME || "a-basuony";
const token = process.env.GH_TOKEN;
if (!/^[a-zA-Z0-9-]+$/.test(username) || !token) {
  throw new Error("GITHUB_USERNAME and GH_TOKEN are required.");
}

async function github(path) {
  const response = await fetch("https://api.github.com" + path, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "public-github-profile-stats",
    },
  });
  if (!response.ok) {
    throw new Error("GitHub API HTTP " + response.status + " at " + path.split("?")[0]);
  }
  return response.json();
}

async function getPublicRepos() {
  const repos = [];
  for (let page = 1; page <= 50; page++) {
    const batch = await github("/users/" + username + "/repos?type=owner&per_page=100&page=" + page);
    repos.push(...batch.filter((repo) => !repo.private));
    if (batch.length < 100) return repos;
  }
  throw new Error("Repository pagination exceeded 5,000 entries.");
}

async function searchCount(query) {
  const result = await github("/search/issues?q=" + encodeURIComponent(query) + "&per_page=1");
  if (result.incomplete_results || !Number.isSafeInteger(result.total_count)) {
    throw new Error("GitHub search is incomplete; refusing to publish a misleading count.");
  }
  return result.total_count;
}

async function languageBytes(repos) {
  const projects = repos.filter((repo) => !repo.fork && repo.name !== username);
  const languages = new Map();
  for (let i = 0; i < projects.length; i += 6) {
    const breakdowns = await Promise.all(
      projects.slice(i, i + 6).map((repo) => github("/repos/" + repo.full_name + "/languages"))
    );
    for (const breakdown of breakdowns) {
      for (const [name, bytes] of Object.entries(breakdown)) {
        if (Number.isFinite(bytes) && bytes > 0) {
          languages.set(name, (languages.get(name) || 0) + bytes);
        }
      }
    }
  }
  return [...languages].map(([name, bytes]) => ({ name, bytes })).sort((a, b) => b.bytes - a.bytes);
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
  })[character]);
}

function label(x, y, value, fontSize, color, weight = 400) {
  return '<text x="' + x + '" y="' + y + '" fill="' + color + '" font-size="' + fontSize +
    '" font-weight="' + weight + '" font-family="Arial,Helvetica,sans-serif">' +
    escapeXml(value) + '</text>';
}

function shell(body) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="540" height="285" viewBox="0 0 540 285" role="img">' +
    '<rect x="1" y="1" width="538" height="283" rx="14" fill="#06132b" stroke="#344767" stroke-width="2"/>' +
    body + '</svg>\n';
}

function statsSvg(data, date) {
  const metrics = [
    ["Public PRs authored", data.publicPRs],
    ["Public issues authored", data.publicIssues],
    ["Stars on public repos", data.stars],
    ["Public repositories", data.repositories]
  ];
  let body = label(28, 40, "Verified public GitHub statistics", 22, "#08c5ff", 700) +
    label(28, 62, "Source: GitHub REST API · public data only", 13, "#b6c8db");
  metrics.forEach(([name, value], i) => {
    const x = i % 2 === 0 ? 28 : 275;
    const y = i < 2 ? 105 : 193;
    body += label(x, y, name, 13, "#b6c8db") +
      label(x, y + 37, Number(value).toLocaleString("en-US"), 32, "#ffffff", 700);
  });
  body += label(28, 262, "Checked " + date + " UTC · Private activity excluded", 12, "#92a7c2");
  return shell(body);
}

function languagesSvg(counts, date) {
  const top = counts.slice(0, 8);
  const total = counts.reduce((sum, language) => sum + language.bytes, 0);
  const colors = ["#ffe34d", "#228be6", "#ff6b36", "#9c36bb",
    "#f04d7f", "#77a329", "#cb5996", "#60bcc2"];
  let body = label(28, 40, "Languages in public code repositories", 22, "#08c5ff", 700) +
    label(28, 62, "Percentage of code bytes · excludes forks · not a skill score", 13, "#b6c8db") +
    '<rect x="28" y="88" width="484" height="11" rx="5" fill="#1b2f4e"/>';
  let offset = 28;
  top.forEach((language, i) => {
    const share = total ? language.bytes / total : 0;
    const width = share * 484;
    body += '<rect x="' + offset.toFixed(2) + '" y="88" width="' + width.toFixed(2) +
      '" height="11" fill="' + colors[i] + '"/>';
    offset += width;
    const x = 28 + (i % 2) * 248;
    const y = 135 + Math.floor(i / 2) * 28;
    body += '<circle cx="' + (x + 7) + '" cy="' + (y - 4) + '" r="5" fill="' + colors[i] + '"/' +
      label(x + 20, y, language.name.slice(0, 17) + " (" + (share * 100).toFixed(1) + "%)", 13, "#e5f2ff");
  });
  if (!total) body += label(28, 135, "No language byte counts available", 13, "#b6c8db");
  body += label(28, 262, "Checked " + date + " UTC · Calculated from GitHub language data", 12, "#92a7c2");
  return shell(body);
}

const repos = await getPublicRepos();
const [publicPRs, publicIssues, languages] = await Promise.all([
  searchCount("author:" + username + " is:pr is:public"),
  searchCount("author:" + username + " is:issue is:public"),
  languageBytes(repos)
]);
const stars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
const date = new Date().toISOString().slice(0, 10);

mkdirSync("assets", { recursive: true });
writeFileSync("assets/github-public-stats.svg", statsSvg({
  publicPRs, publicIssues, stars, repositories: repos.length
}, date));
writeFileSync("assets/github-public-languages.svg", languagesSvg(languages, date));

console.log("Public statistics refreshed: PRs=" + publicPRs + ", issues=" + publicIssues +
  ", stars=" + stars + ", public repositories=" + repos.length +
  ", language categories=" + languages.length + ", date=" + date);
