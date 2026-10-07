# Writing a lesson

Each Saturday lesson is one markdown file in this folder. Use a **zero-padded** number and slug:

`NN-short-title.md` — for example `02-browser-basics.md` for EWURK topic `Lesson 2 — Browser basics`.

## Required sections

Every lesson file must include these level-2 headings, in any order:

| Heading | Purpose |
| --- | --- |
| `## Goal` | One short paragraph: what learners will be able to do today. |
| `## Materials` | Bulleted list (lab Linux PCs, handouts you bring, etc.). |
| `## Steps` | **3–5** numbered steps (`1. …`, `2. …`) the instructor reads aloud. |
| `## If the room is chaotic (10 minutes)` | A calm fallback activity (~10 minutes). |
| `## Done looks like` | What you should see before you mark attendance in EWURK. |

Copy `LESSON-TEMPLATE.md` in this folder and fill in each section. Run `npm test` from the `curriculum/` directory before committing.

## EWURK attendance

This folder does **not** record who attended. After class, use [EWURK](https://github.com/Worthless-Haunted-Meat/ewurk) to mark the roster.

## Privacy

Do not put real family names, addresses, SSN, income, or school records in lesson text. Use fictional examples only.
