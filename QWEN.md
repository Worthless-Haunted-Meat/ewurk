@AGENTS.md

## Orchestrator quality gate

An automated gate runs after every turn in this clone. It is not this session's
report that decides a turn is done:
- The repo's own `npm run lint|typecheck|test|build` (whichever exist) must exit 0.
- A fresh clone (`git clone . scratch && npm ci`) must start the app: `npm start`
  answers HTTP 200, or a CLI's `--help` exits 0.
- `git ls-files` must never include `.qwen/`, `.aider*`, `dist/`, `build/`,
  `coverage/`, `node_modules/`, `*.db`, or `.env`. They are in .gitignore already.
- Do not edit SPEC.md, ROADMAP.md, REQUIREMENTS.md, QUALITY.md, DESIGN.md, TASKS.md,
  QA.md, eslint/tsconfig/test-runner config, or package.json scripts. Ask for that
  change in your report instead of making it; the gate reverts it.
- Do not edit test files. Tests define done. Fix the code they test.
Failures come back to you as feedback; fix the cause, never the check.
