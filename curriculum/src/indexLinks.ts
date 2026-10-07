import fs from 'node:fs';
import path from 'node:path';
import { listLessonMarkdownFiles } from './lessonsOnDisk.js';
import { lessonSlugFromFilename } from './lessonMeta.js';

const LESSON_HREF = /href="\/lessons\/([^"]+)\.html"/g;

export function extractLessonSlugsFromIndexHtml(indexHtml: string): string[] {
  const slugs: string[] = [];
  for (const match of indexHtml.matchAll(LESSON_HREF)) {
    slugs.push(match[1]!);
  }
  return slugs;
}

export interface IndexLinkReport {
  missingFromIndex: string[];
  orphanIndexLinks: string[];
  missingHtmlFiles: string[];
  orphanHtmlFiles: string[];
}

/** Compare markdown lessons, index hrefs, and built HTML under `dist/lessons/`. */
export function auditIndexLessonLinks(distDir: string, indexHtml: string): IndexLinkReport {
  const markdownSlugs = listLessonMarkdownFiles().map((f) => lessonSlugFromFilename(f));
  const indexSlugs = extractLessonSlugsFromIndexHtml(indexHtml);

  const markdownSet = new Set(markdownSlugs);
  const indexSet = new Set(indexSlugs);

  const lessonsDist = path.join(distDir, 'lessons');
  const htmlSlugs = fs.existsSync(lessonsDist)
    ? fs
        .readdirSync(lessonsDist)
        .filter((name) => name.endsWith('.html'))
        .map((name) => name.replace(/\.html$/, ''))
    : [];
  const htmlSet = new Set(htmlSlugs);

  return {
    missingFromIndex: markdownSlugs.filter((s) => !indexSet.has(s)),
    orphanIndexLinks: indexSlugs.filter((s) => !markdownSet.has(s)),
    missingHtmlFiles: markdownSlugs.filter((s) => !htmlSet.has(s)),
    orphanHtmlFiles: htmlSlugs.filter((s) => !markdownSet.has(s)),
  };
}

export function assertIndexLessonLinkSymmetry(distDir: string, indexHtml: string): void {
  const report = auditIndexLessonLinks(distDir, indexHtml);
  const problems: string[] = [];
  if (report.missingFromIndex.length > 0) {
    problems.push(`index missing links for: ${report.missingFromIndex.join(', ')}`);
  }
  if (report.orphanIndexLinks.length > 0) {
    problems.push(`index links without markdown source: ${report.orphanIndexLinks.join(', ')}`);
  }
  if (report.missingHtmlFiles.length > 0) {
    problems.push(`dist missing HTML for: ${report.missingHtmlFiles.join(', ')}`);
  }
  if (report.orphanHtmlFiles.length > 0) {
    problems.push(`orphan HTML without markdown: ${report.orphanHtmlFiles.join(', ')}`);
  }
  if (problems.length > 0) {
    throw new Error(problems.join('; '));
  }
}
