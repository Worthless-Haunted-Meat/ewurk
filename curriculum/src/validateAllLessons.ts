import { readLessonFile, listLessonMarkdownFiles } from './lessonsOnDisk.js';
import { validateLessonOrThrow } from './lessonSchema.js';

/** Validate every `lessons/NN-*.md` file; throws with filename and reason on first failure. */
export function validateAllLessonsOnDisk(): void {
  const files = listLessonMarkdownFiles();
  for (const file of files) {
    const markdown = readLessonFile(file);
    validateLessonOrThrow(file, markdown);
  }
}
