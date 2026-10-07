import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('curriculum package layout', () => {
  test('lessons directory exists for future markdown sources', () => {
    const lessonsDir = path.join(packageRoot, 'lessons');
    assert.ok(fs.existsSync(lessonsDir));
    assert.ok(fs.statSync(lessonsDir).isDirectory());
  });
});
