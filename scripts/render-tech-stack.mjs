import { mkdirSync, writeFileSync } from "node:fs";

// Curated technologies: listed as skills, never interpreted as GitHub API language shares.
const categories = [
  [
    "Frontend",
    [
      "JavaScript",
      "TypeScript",
      "React",
      "Next.js",
      "HTML5",
      "CSS3",
      "Tailwind CSS",
      "Material UI",
      "shadcn/ui",
      "DaisyUI",
      "Redux Toolkit",
      "Zustand",
      "TanStack Query"
    ]
  ],
  [
    "Backend & APIs",
    [
      "Node.js",
      "Express.js",
      "NestJS",
      "REST APIs",
      "JWT",
      "Socket.IO",
      "RabbitMQ"
    ]
  ],
  [
    "Databases & ORM",
    [
      "MongoDB",
      "PostgreSQL",
      "SQLite",
      "Mongoose",
      "TypeORM"
    ]
  ],
  [
    "DevOps & Deployment",
    [
      "Docker",
      "GitHub Actions",
      "CI/CD",
      "Vercel",
      "Git",
      "GitHub"
    ]
  ],
  [
    "Testing & Quality",
    [
      "Jest",
      "Playwright",
      "ESLint",
      "Prettier"
    ]
  ],
  [
    "Tools & Integrations",
    [
      "VS Code",
      "Postman",
      "Cloudinary",
      "Stripe"
    ]
  ]
];

function renderTechSvg(groups) {
  const esc=(s)=>String(s).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]));
  let out = '<svg xmlns="http://www.w3.org/2000/svg" width="920" height="613" viewBox="0 0 920 613" role="img" aria-labelledby="title desc">\n';
  out += '<title id="title">Full-stack technologies</title><desc id="desc">Curated list of frontend, backend, database, DevOps, testing, and integration technologies. No proficiency percentages are claimed.</desc>\n';
  out += '<rect x="1" y="1" width="918" height="611" rx="18" fill="#0b1220" stroke="#2a4059" stroke-width="2"/>\n';
  out += '<rect x="22" y="23" width="6" height="44" rx="3" fill="#38bdf8"/>\n';
  out += '<text x="42" y="38" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#38bdf8">GITHUB / TECH STACK</text>\n';
  out += '<text x="42" y="64" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="#f8fafc">Full-stack technologies</text>\n';
  out += '<text x="22" y="88" font-family="Arial,sans-serif" font-size="12.5" fill="#94a3b8">Selected tools and frameworks used across projects · Grouped by area</text>\n';
  const accents=["#38bdf8","#34d399","#818cf8","#fbbf24","#e879f9","#fb923c"];
  for(let i=0;i<groups.length;i++){
    const [title,techs]=groups[i], x=22+(i%3)*296, y=112+Math.floor(i/3)*237;
    out += `<rect x="${x}" y="${y}" width="282" height="224" rx="12" fill="#111e32" stroke="#273c58"/>\n`;
    out += `<circle cx="${x+17}" cy="${y+27}" r="5" fill="${accents[i]}"/>\n`;
    out += `<text x="${x+30}" y="${y+33}" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="#f1f5f9">${esc(title)}</text>\n`;
    for(let j=0;j<techs.length;j++){
      const px=x+13+(j%2)*135,py=y+50+Math.floor(j/2)*23;
      out += `<rect x="${px}" y="${py}" width="126" height="21" rx="6" fill="#1c2b43" stroke="#344861" stroke-width=".5"/>\n`;
      out += `<text x="${px+8}" y="${py+14.5}" font-family="Arial,sans-serif" font-size="12.4" font-weight="500" fill="#dbeafe">${esc(techs[j])}</text>\n`;
    }
  }
  out += '<text x="22" y="595" font-family="Arial,sans-serif" font-size="11" fill="#8192ab">CURATED SKILLS · NOT GITHUB LANGUAGE METRICS OR PROFICIENCY SCORES</text>\n</svg>\n';
  return out;
}

mkdirSync("assets", { recursive: true });
writeFileSync("assets/github-fullstack-technologies.svg", renderTechSvg(categories));
console.log("Updated curated full-stack technology card.");
