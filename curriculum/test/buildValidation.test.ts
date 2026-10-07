import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLessonOrThrow } from '../src/lessonSchema.js';
import { validateAllLessonsOnDisk } from '../src/validateAllLessons.js';

const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturesDir = path.join(packageRoot, 'test', 'fixtures');

describe('invalid lesson markdown', () => {
  test('validateLessonOrThrow includes filename and section detail', () => {
    const bad = fs.readFileSync(path.join(fixturesDir, 'invalid-missing-goal.md'), 'utf8');
    assert.throws(
      () => validateLessonOrThrow('09-bad-lesson.md', bad),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /09-bad-lesson\.md/);
        assert.match(err.message, /Goal/);
        return true;
      },
    );
  });

  test('validateAllLessonsOnDisk passes for shipped lessons (build runs this first)', () => {
    validateAllLessonsOnDisk();
  });

  test('build entrypoint rejects invalid markdown via shared validation', () => {
    const bad = fs.readFileSync(path.join(fixturesDir, 'invalid-too-few-steps.md'), 'utf8');
    assert.throws(
      () => validateLessonOrThrow('lessons/04-typing-and-text.md', bad),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /lessons\/04-typing-and-text\.md/);
        assert.match(err.message, /at least 3/);
        return true;
      },
    );
  });
});
