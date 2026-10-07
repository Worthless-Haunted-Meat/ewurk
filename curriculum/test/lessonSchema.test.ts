import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REQUIRED_SECTIONS,
  SECTION_CHAOTIC_FALLBACK,
  SECTION_DONE,
  SECTION_GOAL,
  SECTION_MATERIALS,
  SECTION_STEPS,
  parseLesson,
} from '../src/lessonSchema.js';
import { readLessonFile } from '../src/lessonsOnDisk.js';

describe('lessonSchema exports', () => {
  test('documents required section headings', () => {
    assert.deepEqual(REQUIRED_SECTIONS, [
      SECTION_GOAL,
      SECTION_MATERIALS,
      SECTION_STEPS,
      SECTION_CHAOTIC_FALLBACK,
      SECTION_DONE,
    ]);
  });

  test('parses lesson 01 step count', () => {
    const markdown = readLessonFile('01-welcome-linux-desktop.md');
    const parsed = parseLesson('01-welcome-linux-desktop.md', markdown);
    assert.equal(parsed.stepCount, 5);
    assert.ok(parsed.sections.get(SECTION_GOAL)?.includes('sign in'));
  });
});
