# Afterbeep: Code Rules

## No comments, ever

NEVER write comments in any code file, in any language or file type. This applies to:

- Inline comments
- Block comments
- JSDoc or TSDoc docblocks
- TODO, FIXME, HACK, NOTE annotations
- Commented-out code
- File-header comments

Names and structure carry all the meaning. If a piece of code needs a comment to be understood, the code needs to be rewritten, not annotated.

## Naming

Names are precise and honest. A function named `extractCard` extracts a card. A variable named `callbackNumber` holds a callback number. Abbreviations are only used when the abbreviated form is universally understood (e.g. `id`, `url`, `env`).

Boolean names start with `is`, `has`, or `can`. Functions that return booleans follow the same rule.

## Function design

Functions are small and focused. Each function does one thing. If a function needs a long name to describe what it does, it is probably doing too much.

Functions that can fail return a discriminated union (`{ ok: true, value: T } | { ok: false, error: E }`) rather than throwing or returning null. Throwing is reserved for truly unrecoverable programmer errors.

## No dead code

No unused variables, functions, imports, or types. No code that exists "just in case". Remove it. If it needs to come back, git has it.

## Module boundaries

`src/lib` is pure TypeScript. No Next.js imports, no React imports, no `window`, no `document`. Everything in `src/lib` must be testable with Vitest alone.

## Types

Prefer explicit types over inference for public function signatures. Use `unknown` over `any`. Validate external data (API responses, user input, database rows) with Zod before trusting it.

## Formatting

Prettier handles formatting. Do not fight it. Consistent style is not a personal preference, it is a team constraint.
