import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { distDir } from './paths.js';
import { listLessonMarkdownFiles, readLessonFile } from './lessonsOnDisk.js';
import { validateLessonOrThrow } from './lessonSchema.js';
import { lessonDisplayTitle, lessonSlugFromFilename } from './lessonMeta.js';
import { SITE_CSS } from './siteCss.js';

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function buildSite(): void {
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(path.join(distDir, 'lessons'), { recursive: true });

  const lessonFiles = listLessonMarkdownFiles();

  const listItems =
    lessonFiles.length === 0
      ? '<li><em>Lessons will appear here as they are added.</em></li>'
      : lessonFiles
          .map((file) => {
            const markdown = readLessonFile(file);
            validateLessonOrThrow(file, markdown);
            const slug = lessonSlugFromFilename(file);
            const display = lessonDisplayTitle(file, markdown);
            return `<li><a href="/lessons/${escapeHtml(slug)}.html">${escapeHtml(display)}</a></li>`;
          })
          .join('\n');

  const indexHtml = `<!DOCTYPE html>
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
    <p class="index-intro">Saturday lessons for the Linux desktop lease program. Attendance is recorded in <a href="https://github.com/Worthless-Haunted-Meat/ewurk">EWURK</a>, not here.</p>
    <h2>Lessons</h2>
    <ul>
${listItems}
    </ul>
  </main>
</body>
</html>
`;

  fs.writeFileSync(path.join(distDir, 'index.html'), indexHtml, 'utf8');

  for (const file of lessonFiles) {
    const markdown = readLessonFile(file);
    validateLessonOrThrow(file, markdown);
    const slug = lessonSlugFromFilename(file);
    const display = lessonDisplayTitle(file, markdown);
    const bodyHtml = marked.parse(markdown, { async: false }) as string;
    const lessonHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(display)}</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <nav class="site-nav"><a href="/">← All lessons</a></nav>
  <main class="lesson">
${bodyHtml}
  </main>
</body>
</html>
`;
    fs.writeFileSync(path.join(distDir, 'lessons', `${slug}.html`), lessonHtml, 'utf8');
  }

  fs.writeFileSync(path.join(distDir, 'style.css'), SITE_CSS, 'utf8');
}

const isMain =
  process.argv[1] !== undefined &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMain) {
  buildSite();
}
