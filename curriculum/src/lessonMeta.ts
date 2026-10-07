const FILENAME_NUMBER = /^(\d{2})-/;

/** Human title from the first `#` heading in the lesson markdown. */
export function readLessonTitle(markdown: string): string {
  const match = /^#\s+(.+?)\s*$/m.exec(markdown);
  if (!match) {
    throw new Error('Lesson markdown must start with a level-1 title (# …).');
  }
  return match[1]!.trim();
}

export function lessonNumberFromFilename(filename: string): number {
  const match = FILENAME_NUMBER.exec(filename);
  if (!match) {
    throw new Error(`Invalid lesson filename: ${filename}`);
  }
  return Number.parseInt(match[1]!, 10);
}

export function lessonSlugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, '');
}

/** EWURK session topic format per SPEC.md. */
export function lessonDisplayTitle(filename: string, markdown: string): string {
  const number = lessonNumberFromFilename(filename);
  const title = readLessonTitle(markdown);
  return `Lesson ${number} — ${title}`;
}
