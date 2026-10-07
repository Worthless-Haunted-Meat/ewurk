import { listLessonMarkdownFiles } from './lessonsOnDisk.js';

export const EXPECTED_LESSON_COUNT = 10;

export function lessonNumbersFromFilenames(filenames: readonly string[]): number[] {
  return filenames.map((name) => {
    const prefix = name.slice(0, 2);
    const n = Number.parseInt(prefix, 10);
    if (Number.isNaN(n)) {
      throw new Error(`Invalid lesson filename (need NN- prefix): ${name}`);
    }
    return n;
  });
}

/** Returns human-readable errors; empty array means 01–10 present exactly once. */
export function validateLessonSequence(filenames: readonly string[]): string[] {
  const errors: string[] = [];

  if (filenames.length !== EXPECTED_LESSON_COUNT) {
    errors.push(`Expected exactly ${EXPECTED_LESSON_COUNT} lesson files, found ${filenames.length}.`);
  }

  const numbers = lessonNumbersFromFilenames(filenames);
  const seen = new Map<number, number>();

  for (const n of numbers) {
    seen.set(n, (seen.get(n) ?? 0) + 1);
  }

  for (let expected = 1; expected <= EXPECTED_LESSON_COUNT; expected += 1) {
    const count = seen.get(expected) ?? 0;
    if (count === 0) {
      errors.push(`Missing lesson file numbered ${String(expected).padStart(2, '0')}.`);
    } else if (count > 1) {
      errors.push(`Duplicate lesson number ${expected} (${count} files).`);
    }
  }

  return errors;
}

export function assertCompleteLessonSequence(): void {
  const files = listLessonMarkdownFiles();
  const errors = validateLessonSequence(files);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }
}
