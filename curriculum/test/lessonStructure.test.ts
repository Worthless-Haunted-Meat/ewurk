import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listLessonMarkdownFiles, readLessonFile } from '../src/lessonsOnDisk.js';
import { validateLesson } from '../src/lessonSchema.js';

const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturesDir = path.join(packageRoot, 'test', 'fixtures');

describe('lesson files on disk', () => {
  test('every lessons/*.md lesson file satisfies the contract', () => {
    const files = listLessonMarkdownFiles();
    assert.ok(files.length > 0, 'expected at least one lesson file in lessons/');
    for (const file of files) {
      const markdown = readLessonFile(file);
      const errors = validateLesson(file, markdown);
      assert.deepEqual(errors, [], `validation failed for ${file}`);
    }
  });
});

describe('lessonSchema validation failures', () => {
  function fixture(name: string): string {
    return fs.readFileSync(path.join(fixturesDir, name), 'utf8');
  }

  test('fails when Goal section is missing', () => {
    const errors = validateLesson('bad.md', fixture('invalid-missing-goal.md'));
    assert.ok(errors.some((e) => e.message.includes('Goal')));
  });

  test('fails when fewer than 3 numbered steps', () => {
    const errors = validateLesson('bad.md', fixture('invalid-too-few-steps.md'));
    assert.ok(errors.some((e) => e.message.includes('at least 3')));
  });

  test('fails when more than 5 numbered steps', () => {
    const errors = validateLesson('bad.md', fixture('invalid-too-many-steps.md'));
    assert.ok(errors.some((e) => e.message.includes('at most 5')));
  });
});
