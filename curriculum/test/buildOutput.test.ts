import { describe, test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSite } from '../src/build.js';
import { listLessonMarkdownFiles } from '../src/lessonsOnDisk.js';
import { lessonSlugFromFilename } from '../src/lessonMeta.js';

const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(packageRoot, 'dist');

describe('static build output', () => {
  before(() => {
    buildSite();
  });

  test('emits HTML for each lesson markdown file', () => {
    const files = listLessonMarkdownFiles();
    assert.ok(files.length >= 4, 'expected lessons 1–4 at minimum');
    for (const file of files) {
      const slug = lessonSlugFromFilename(file);
      const htmlPath = path.join(distDir, 'lessons', `${slug}.html`);
      assert.ok(fs.existsSync(htmlPath), `missing ${htmlPath}`);
      const html = fs.readFileSync(htmlPath, 'utf8');
      assert.ok(html.includes('<main class="lesson">'));
    }
  });

  test('index links to every lesson html file', () => {
    const index = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
    for (const file of listLessonMarkdownFiles()) {
      const slug = lessonSlugFromFilename(file);
      assert.ok(index.includes(`/lessons/${slug}.html`), `index missing link for ${slug}`);
    }
  });
});
