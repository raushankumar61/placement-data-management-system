const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const inputPath = path.join(root, 'PROJECT_DOCUMENTATION.md');
const htmlPath = path.join(root, 'PlaceCloud_Project_Documentation.html');

const { marked } = require(path.join(root, 'backend', 'node_modules', 'marked'));

const markdown = fs.readFileSync(inputPath, 'utf8');

const slugCounts = new Map();
const slugify = (text) => {
  const base = String(text)
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
  const count = slugCounts.get(base) || 0;
  slugCounts.set(base, count + 1);
  return count ? `${base}-${count}` : base;
};

const headings = [];
const renderer = new marked.Renderer();
renderer.heading = (text, level) => {
  const plain = String(text).replace(/<[^>]*>/g, '');
  const id = slugify(plain);
  headings.push({ id, level, text: plain });
  return `<h${level} id="${id}"><a class="heading-link" href="#${id}">${text}</a></h${level}>`;
};

marked.setOptions({
  renderer,
  gfm: true,
  breaks: false,
  mangle: false,
  headerIds: false,
});

const content = marked.parse(markdown);
const toc = headings
  .filter((heading) => heading.level <= 3)
  .map((heading) => {
    const indent = Math.max(0, heading.level - 1) * 14;
    return `<a class="toc-link toc-level-${heading.level}" style="padding-left:${indent}px" href="#${heading.id}">${heading.text}</a>`;
  })
  .join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PlaceCloud Project Documentation</title>
  <style>
    :root {
      --ink: #182033;
      --muted: #5f6c80;
      --blue: #006fd6;
      --blue-dark: #084b92;
      --gold: #b86d00;
      --line: #dce4ef;
      --soft: #f5f8fc;
      --code: #0f172a;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      color: var(--ink);
      background: white;
      font-family: "Segoe UI", Arial, sans-serif;
      line-height: 1.55;
    }
    .cover {
      min-height: 96vh;
      padding: 72px 68px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      border-bottom: 8px solid var(--blue);
      background:
        linear-gradient(135deg, rgba(0,111,214,0.12), rgba(184,109,0,0.08)),
        radial-gradient(circle at top right, rgba(0,111,214,0.16), transparent 34%),
        #fff;
      page-break-after: always;
    }
    .eyebrow {
      color: var(--gold);
      font-size: 13px;
      letter-spacing: .08em;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 18px;
    }
    .cover h1 {
      max-width: 820px;
      margin: 0 0 22px;
      font-size: 50px;
      line-height: 1.05;
      color: #07162d;
    }
    .cover p {
      max-width: 760px;
      font-size: 18px;
      color: var(--muted);
      margin: 0 0 32px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      max-width: 760px;
    }
    .meta-card {
      border: 1px solid var(--line);
      background: rgba(255,255,255,.7);
      border-radius: 12px;
      padding: 14px;
    }
    .meta-card strong { display: block; color: #07162d; font-size: 13px; }
    .meta-card span { display: block; color: var(--muted); font-size: 12px; margin-top: 4px; }
    .toc-page {
      padding: 52px 64px;
      page-break-after: always;
    }
    .toc-page h2 {
      margin-top: 0;
      color: #07162d;
      font-size: 30px;
    }
    .toc {
      columns: 2;
      column-gap: 34px;
    }
    .toc-link {
      display: block;
      color: var(--blue-dark);
      text-decoration: none;
      border-bottom: 1px dotted rgba(8,75,146,.25);
      padding: 5px 0;
      break-inside: avoid;
      font-size: 12px;
    }
    .toc-level-1 { font-weight: 800; margin-top: 6px; color: #07162d; }
    .toc-level-2 { font-weight: 650; }
    .toc-level-3 { color: var(--muted); }
    main {
      padding: 42px 64px 56px;
      max-width: 1100px;
      margin: 0 auto;
    }
    h1, h2, h3, h4 {
      color: #07162d;
      line-height: 1.2;
      page-break-after: avoid;
    }
    h1 {
      font-size: 34px;
      border-bottom: 3px solid var(--blue);
      padding-bottom: 12px;
      margin: 0 0 24px;
    }
    h2 {
      font-size: 26px;
      margin-top: 42px;
      padding-top: 10px;
      border-top: 1px solid var(--line);
    }
    h3 { font-size: 19px; margin-top: 26px; color: var(--blue-dark); }
    h4 { font-size: 15px; margin-top: 20px; }
    .heading-link { color: inherit; text-decoration: none; }
    p, li { font-size: 12.5px; }
    a { color: var(--blue-dark); }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 26px;
      font-size: 10.5px;
      page-break-inside: auto;
    }
    tr { page-break-inside: avoid; }
    th {
      text-align: left;
      color: #07162d;
      background: #eaf2fb;
      border: 1px solid #cad8e8;
      padding: 7px;
      vertical-align: top;
    }
    td {
      border: 1px solid #d8e1ed;
      padding: 7px;
      vertical-align: top;
    }
    blockquote {
      border-left: 4px solid var(--blue);
      background: var(--soft);
      margin: 18px 0;
      padding: 10px 14px;
      color: var(--muted);
    }
    code {
      font-family: "Cascadia Mono", Consolas, monospace;
      background: #eef3f8;
      border-radius: 4px;
      padding: 1px 4px;
      font-size: 90%;
    }
    pre {
      background: var(--code);
      color: #e6edf7;
      border-radius: 10px;
      padding: 14px;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      page-break-inside: avoid;
      font-size: 10.2px;
      line-height: 1.45;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    ul, ol { padding-left: 22px; }
    hr { border: 0; border-top: 1px solid var(--line); margin: 32px 0; }
    .callout {
      margin: 18px 0;
      padding: 14px 16px;
      border-radius: 10px;
      background: #fff7e8;
      border: 1px solid #ffd9a3;
      color: #553300;
      font-size: 12px;
    }
    @page {
      size: A4;
      margin: 13mm 11mm 15mm;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      main { padding: 0; max-width: none; }
      .cover, .toc-page { padding: 42px 32px; }
      h2 { break-after: avoid; }
      a { text-decoration: none; }
    }
  </style>
</head>
<body>
  <section class="cover">
    <div class="eyebrow">Interactive Architecture PDF</div>
    <h1>PlaceCloud Placement System Documentation</h1>
    <p>Professional reverse-engineered documentation covering project overview, tech stack, architecture, modules, database design, security, automation, DevOps, performance, and improvement roadmap.</p>
    <div class="meta-grid">
      <div class="meta-card"><strong>Project</strong><span>Cloud-Based Placement Management System</span></div>
      <div class="meta-card"><strong>Stack</strong><span>React, Node.js, Express, Firebase</span></div>
      <div class="meta-card"><strong>Generated</strong><span>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span></div>
    </div>
  </section>
  <section class="toc-page">
    <h2>Clickable Table of Contents</h2>
    <p>Use the links below to jump to sections in PDF viewers that support internal links.</p>
    <nav class="toc">${toc}</nav>
  </section>
  <main>${content}</main>
</body>
</html>`;

fs.writeFileSync(htmlPath, html, 'utf8');
console.log(htmlPath);
