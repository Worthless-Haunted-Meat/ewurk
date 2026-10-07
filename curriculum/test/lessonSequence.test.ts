import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { listLessonMarkdownFiles } from '../src/lessonsOnDisk.js';
import {
  EXPECTED_LESSON_COUNT,
  validateLessonSequence,
} from '../src/lessonSequence.js';

describe('lesson sequence 01–10', () => {
  test('lessons directory has exactly ten numbered files with no gaps or duplicates', () => {
    const files = listLessonMarkdownFiles();
    const errors = validateLessonSequence(files);
    assert.deepEqual(errors, []);
    assert.equal(files.length, EXPECTED_LESSON_COUNT);
  });

  test('validateLessonSequence fails when a lesson number is missing', () => {
    const files = listLessonMarkdownFiles().filter((f) => !f.startsWith('03-'));
    const errors = validateLessonSequence(files);
    assert.ok(errors.some((e) => e.includes('Missing lesson file numbered 03')));
  });

  test('validateLessonSequence fails on duplicate numbers', () => {
    const files = [...listLessonMarkdownFiles(), '03-duplicate.md'];
    const errors = validateLessonSequence(files);
    assert.ok(errors.some((e) => e.includes('Duplicate lesson number 3')));
  });
});
