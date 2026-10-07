import { describe, test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSite } from '../src/build.js';
import { listLessonMarkdownFiles } from '../src/lessonsOnDisk.js';
import { lessonSlugFromFilename } from '../src/lessonMeta.js';
import { SITE_CSS } from '../src/siteCss.js';
import { assertIndexLessonLinkSymmetry } from '../src/indexLinks.js';

const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(packageRoot, 'dist');

describe('index links for markdown lessons', () => {
  before(() => {
    buildSite();
  });

  test('every lessons/*.md lesson file is linked from dist/index.html', () => {
    const index = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
    const markdownLessons = listLessonMarkdownFiles();
    assert.ok(markdownLessons.length > 0);
    for (const file of markdownLessons) {
      const slug = lessonSlugFromFilename(file);
      assert.ok(
        index.includes(`/lessons/${slug}.html`),
        `index.html must link markdown lesson ${file}`,
      );
    }
  });

  test('index, markdown lessons, and dist HTML stay in sync', () => {
    const index = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
    assertIndexLessonLinkSymmetry(distDir, index);
  });

  test('built stylesheet includes print rules that hide navigation chrome', () => {
    const css = fs.readFileSync(path.join(distDir, 'style.css'), 'utf8');
    assert.equal(css, SITE_CSS);
    assert.ok(css.includes('@media print'));
    assert.ok(css.includes('.site-nav'));
    assert.ok(css.includes('display: none'));
  });
});
