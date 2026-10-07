import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { distDir, lessonsDir } from './paths.js';

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function buildSite(): void {
  fs.mkdirSync(distDir, { recursive: true });

  const lessonFiles = fs.existsSync(lessonsDir)
    ? fs.readdirSync(lessonsDir).filter((name) => name.endsWith('.md')).sort()
    : [];

  const listItems =
    lessonFiles.length === 0
      ? '<li><em>Lessons will appear here as they are added (M3+).</em></li>'
      : lessonFiles
          .map((file) => {
            const slug = file.replace(/\.md$/, '');
            return `<li><a href="/lessons/${escapeHtml(slug)}.html">${escapeHtml(slug)}</a></li>`;
          })
          .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EWURK class curriculum</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <main>
    <h1>EWURK class curriculum</h1>
    <p>Saturday lessons for the Linux desktop lease program. Attendance is recorded in <a href="https://github.com/Worthless-Haunted-Meat/ewurk">EWURK</a>, not here.</p>
    <h2>Lessons</h2>
    <ul>
${listItems}
    </ul>
  </main>
</body>
</html>
`;

  fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');
  fs.mkdirSync(path.join(distDir, 'lessons'), { recursive: true });

  const css = `body { font-family: system-ui, sans-serif; line-height: 1.5; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; }
a { color: #0b57d0; }`;
  fs.writeFileSync(path.join(distDir, 'style.css'), css, 'utf8');
}

const isMain =
  process.argv[1] !== undefined &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMain) {
  buildSite();
}
