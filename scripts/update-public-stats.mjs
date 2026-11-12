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

function label(x, y, value, size = 12, color = "#d1d5db", weight = 400, anchor = "") {
  const align = anchor ? ' text-anchor="' + anchor + '"' : "";
  return '<text x="' + x + '" y="' + y + '" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif"' +
    ' font-size="' + size + '" font-weight="' + weight + '" fill="' + color + '"' + align + '>' +
    escapeXml(value) + '</text>';
}

function shell(body) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="460" height="285" viewBox="0 0 460 285" role="img">' +
    '<rect x="1" y="1" width="458" height="283" rx="14" fill="#0b1220" stroke="#2a4059" stroke-width="1.5"/>' +
    body + '</svg>\n';
}

function header(title, description) {
  return '<rect x="20" y="22" width="5" height="34" rx="2.5" fill="#38bdf8"/>' +
    label(36, 35, "GITHUB / ANALYTICS", 11, "#38bdf8", 700) +
    label(36, 60, title, 21, "#f8fafc", 700) +
    label(20, 84, description, 11.6, "#94a3b8");
}

function statsSvg(data, date) {
  const metrics = [
    ["Stars received", data.stars, "#38bdf8"],
    ["Pull requests", data.publicPRs, "#818cf8"],
    ["Repositories", data.repositories, "#34d399"],
    ["Issues opened", data.publicIssues, "#fbbf24"]
  ];
  let body = header("Activity overview", "Public repositories · GitHub API");
  metrics.forEach(([name, value, color], index) => {
    const x = 20 + 218 * (index % 2);
    const y = 104 + 73 * Math.floor(index / 2);
    body += '<rect x="' + x + '" y="' + y + '" width="202" height="64" rx="10" fill="#111e32" stroke="#20334d"/>' +
      '<circle cx="' + (x + 17) + '" cy="' + (y + 20) + '" r="4" fill="' + color + '"/>' +
      label(x + 30, y + 24, name, 12, "#b5c4d9", 500) +
      label(x + 15, y + 55, Number(value).toLocaleString("en-US"), 26, "#f8fafc", 700);
  });
  body += label(20, 268, "UPDATED " + date + " UTC · PUBLIC ONLY", 10, "#71869f", 600);
  return shell(body);
}

function languagesSvg(counts, date) {
  const top = counts.slice(0, 8);
  const total = counts.reduce((sum, language) => sum + language.bytes, 0);
  const colors = [
    "#facc15", "#3b82f6", "#a855f7", "#f97316",
    "#e11d48", "#a3e635", "#e879f9", "#6b7280"
  ];
  let body = header("Programming languages", "Share of source code bytes · Non-fork projects") +
    '<rect x="20" y="109" width="420" height="11" rx="5.5" fill="#1f314a"/>';
  let offset = 20;
  top.forEach((language, index) => {
    const share = total ? language.bytes / total : 0;
    const width = share * 420;
    body += '<rect x="' + offset.toFixed(2) + '" y="109" width="' + width.toFixed(2) +
      '" height="11" fill="' + colors[index] + '"/>';
    offset += width;
    const x = 20 + 218 * (index % 2);
    const y = 152 + 27 * Math.floor(index / 2);
    body += '<circle cx="' + (x + 5) + '" cy="' + (y - 4) + '" r="4.3" fill="' + colors[index] + '"/>' +
      label(x + 16, y, language.name.slice(0, 17), 12, "#d1dfef", 500) +
      label(x + 198, y, (share * 100).toFixed(1) + "%", 12, "#f8fafc", 700, "end");
  });
  if (!total) body += label(20, 152, "No language byte counts available", 13, "#94a3b8");
  body += label(20, 268, "UPDATED " + date + " UTC · PUBLIC CODE", 10, "#71869f", 600);
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
