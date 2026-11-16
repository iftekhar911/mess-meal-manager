# Contributing to Mess Meal Manager

Thank you for contributing to Mess Meal Manager. Please adhere to the following engineering standards.

## 1. Branch Strategy

- `main`: Production-ready code only. Direct commits are forbidden.
- `develop`: Integration branch for tested features.
- `feature/<scope>-<short-name>`: Topic branch for specific features.

## 2. Commit Message Convention

All commits must follow the Conventional Commits specification:

```text
type(scope): subject
```

- Allowed types: feat, fix, refactor, perf, test, docs, chore, build, ci
- Imperative mood, lower case, maximum 72 characters, no trailing period.
- No em dashes are permitted in commit messages.

## 3. Code Quality and Style Rules

- Strict TypeScript: no any types, no non-null assertions without documented justification.
- Clean code: SOLID principles, early returns over nesting, maximum 200 lines per file where practical.
- JSDoc comments on every module, class, public method, hook, and utility.
- Strict style bans: no em dashes, no uppercase text transforms, no letter-spacing (tracking), no hero badges.
- All monetary math must use decimal.js with numeric(12,4) precision. No floating point operations.
- Localization: no hardcoded strings. Every user-facing text must be defined in messages/bn.json and messages/en.json.

## 4. Verification

Before submitting changes, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
```
