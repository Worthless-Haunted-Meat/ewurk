/**
 * Required level-2 headings for every file in `lessons/*.md`.
 * See SPEC.md §6 and lessons/README.md for authoring guidance.
 */
export const SECTION_GOAL = 'Goal';
export const SECTION_MATERIALS = 'Materials';
export const SECTION_STEPS = 'Steps';
export const SECTION_CHAOTIC_FALLBACK = 'If the room is chaotic (10 minutes)';
export const SECTION_DONE = 'Done looks like';

/** Order preserved for error messages and docs. */
export const REQUIRED_SECTIONS: readonly string[] = [
  SECTION_GOAL,
  SECTION_MATERIALS,
  SECTION_STEPS,
  SECTION_CHAOTIC_FALLBACK,
  SECTION_DONE,
];

export const MIN_STEPS = 3;
export const MAX_STEPS = 5;

export interface ParsedLesson {
  filename: string;
  sections: Map<string, string>;
  stepCount: number;
}

export interface LessonValidationError {
  filename: string;
  message: string;
}

const STEP_LINE = /^\s*\d+\.\s+\S/;

function parseSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = markdown.split(/\r?\n/);
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  const flush = (): void => {
    if (currentHeading !== null) {
      sections.set(currentHeading, buffer.join('\n').trim());
    }
  };

  for (const line of lines) {
    const headingMatch = /^##\s+(.+?)\s*$/.exec(line);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[1]!.trim();
      buffer = [];
      continue;
    }
    if (currentHeading !== null) {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

function countSteps(stepsBody: string): number {
  return stepsBody.split(/\r?\n/).filter((line) => STEP_LINE.test(line)).length;
}

export function parseLesson(filename: string, markdown: string): ParsedLesson {
  const sections = parseSections(markdown);
  const stepsBody = sections.get(SECTION_STEPS) ?? '';
  return {
    filename,
    sections,
    stepCount: countSteps(stepsBody),
  };
}

export function validateLesson(filename: string, markdown: string): LessonValidationError[] {
  const errors: LessonValidationError[] = [];
  const parsed = parseLesson(filename, markdown);

  for (const heading of REQUIRED_SECTIONS) {
    const body = parsed.sections.get(heading);
    if (body === undefined || body.length === 0) {
      errors.push({
        filename,
        message: `Missing or empty section "## ${heading}".`,
      });
    }
  }

  if (parsed.stepCount < MIN_STEPS) {
    errors.push({
      filename,
      message: `Section "## ${SECTION_STEPS}" must have at least ${MIN_STEPS} numbered steps (found ${parsed.stepCount}).`,
    });
  } else if (parsed.stepCount > MAX_STEPS) {
    errors.push({
      filename,
      message: `Section "## ${SECTION_STEPS}" must have at most ${MAX_STEPS} numbered steps (found ${parsed.stepCount}).`,
    });
  }

  return errors;
}

export function validateLessonOrThrow(filename: string, markdown: string): ParsedLesson {
  const errors = validateLesson(filename, markdown);
  if (errors.length > 0) {
    const detail = errors.map((e) => e.message).join(' ');
    throw new Error(`${filename}: ${detail}`);
  }
  return parseLesson(filename, markdown);
}
