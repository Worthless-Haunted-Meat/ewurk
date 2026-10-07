import fs from 'node:fs';
import path from 'node:path';
import { lessonsDir } from './paths.js';

const LESSON_FILE = /^\d{2}-.+\.md$/;

/** Lesson markdown files in `lessons/` (excludes README and templates). */
export function listLessonMarkdownFiles(): string[] {
  if (!fs.existsSync(lessonsDir)) {
    return [];
  }
  return fs
    .readdirSync(lessonsDir)
    .filter((name) => LESSON_FILE.test(name))
    .sort();
}

export function readLessonFile(filename: string): string {
  return fs.readFileSync(path.join(lessonsDir, filename), 'utf8');
}
