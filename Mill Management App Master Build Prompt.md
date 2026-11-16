# Mill Management App: Master Build Prompt

Paste everything below into your AI coding agent (Claude Code, Cursor, etc.) as the first message. It is self-contained, so the agent does not need the planning report.

## ROLE AND GOAL

You are a senior full-stack engineer and a strict code reviewer in one. Build **Mess Meal Manager**, a mobile-first web app that runs the daily meal accounting of a shared mess (boarding house) in Bangladesh. Boarders set their own meals, the shopper gets an automatic daily summary, the manager only handles money and exceptions, and everyone gets transparent shared records.

Deliver production-quality code, not a demo. Before writing any code, read this whole prompt and reply with a short plan: folder structure, module list, database schema, and phase breakdown. Then build phase by phase. After every phase run lint, type check and tests, then commit.

## 1. FIXED TECH STACK

- **Monorepo** with pnpm workspaces: `apps/api` (NestJS), `apps/web` (Next.js), `packages/shared` (shared enums, types, constants, validation schemas).
- **Backend:** NestJS (latest stable), TypeScript strict mode, TypeORM, PostgreSQL, JWT authentication.
- **Frontend:** Next.js (latest stable, App Router) with **Turbopack** for dev and build, Tailwind CSS, TypeScript strict mode.
- **Allowed libraries:** next-intl, react-hook-form with zod, TanStack Query, class-validator, class-transformer, @nestjs/config, @nestjs/swagger, @nestjs/schedule (or BullMQ), @nestjs/throttler, helmet, argon2, decimal.js, Jest, Firebase Cloud Messaging for push notifications.
- **Not allowed:** shadcn/ui, any prebuilt component kit that forces its own look.
- **Time:** all business logic uses the `Asia/Dhaka` timezone. Store timestamps in UTC. The server clock is the only authority for cut-off times.

## 2. ENGINEERING RULES (apply to every file)

### 2.1 Clean code

- Follow SOLID, KISS and DRY. Small functions with one job, meaningful names, no magic numbers, no dead code, no commented-out code.
- Prefer early returns over deep nesting. Keep files under about 200 lines and components under about 150 lines. Split when they grow.
- Strict TypeScript: no `any`, no non-null assertions without a reason. Share types through `packages/shared`.
- ESLint and Prettier configured once at the root and enforced by a pre-commit hook.

### 2.2 Commenting for multi-developer work

- Every module, class, public method, hook, component and utility gets a short JSDoc block: what it does, parameters, return value, and any business rule it enforces.
- Explain the **why** for non-obvious logic, especially money, cut-off and grace period rules. Do not narrate obvious code.
- Each module folder has a short `README.md` explaining its responsibility, public API and how it connects to other modules.
- Mark unfinished work with `TODO(owner): reason` only when it is tracked in an issue.

### 2.3 No repetition, fully component-wise

- If code appears twice, extract it. Shared logic goes to services, utilities, hooks or `packages/shared`.
- Frontend is built from small reusable components. A feature may never restyle a primitive, it composes primitives instead.
- Backend repeats nothing across modules: shared guards, decorators, interceptors, pagination and error handling live in a `common` module.

### 2.4 Git discipline

- Branches: `main` (always deployable), `develop`, and `feature/<scope>-<short-name>`. Never commit to `main` directly.
- **Conventional Commits** only: `type(scope): subject`. Types: feat, fix, refactor, perf, test, docs, chore, build, ci. Subject in imperative mood, at most 72 characters, no trailing period.
- One logical change per commit. Every commit must build and pass tests. Add a body explaining the why when the change is not obvious.
- Use husky, commitlint and lint-staged to enforce the format and run lint on staged files.
- Provide `.gitignore`, `.env.example`, a PR template and a `CONTRIBUTING.md`. Never commit secrets, `.env` files or build output.

### 2.5 Security (apply everywhere, no exceptions)

- Validate and whitelist every input with DTOs (`ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`). Never trust the client, including for roles, mess ids and money values.
- Authorization on every endpoint: JWT guard plus role guard plus mess membership guard. A user can only touch data of messes they belong to. Prevent IDOR by always scoping queries by mess id.
- Passwords hashed with argon2id. Never log passwords, tokens, OTPs or personal data.
- JWT: short-lived access token (15 minutes), rotating refresh token stored **hashed** in the database and sent as `httpOnly`, `secure`, `sameSite` cookie. Support logout, revoke all sessions and refresh token reuse detection.
- Use `helmet`, strict CORS allow-list, rate limiting (stricter on login, OTP and refresh), request size limits and a global exception filter that never leaks stack traces.
- Only parameterized queries through TypeORM. No raw SQL built from strings.
- File uploads (receipts, profile pictures): check MIME type and magic bytes, size limit, random file names, private storage with signed URLs.
- Secrets only from environment variables, validated at startup with a schema. Provide `.env.example`.
- Add CSRF protection for cookie-based requests, security headers on the frontend (CSP, X-Frame-Options, Referrer-Policy), and sanitize anything rendered as HTML.
- Run `pnpm audit` in CI. Keep dependencies pinned and updated.
- Money and balance changes are **append-only ledger entries**. Corrections are new reversing entries, never edits or deletes. Every manager exception and money entry is written to an audit log.

## 3. FRONTEND RULES

### 3.1 Design system

- Build a rich, consistent, modern design system from scratch with Tailwind. Define design tokens once (colors, spacing scale, radius, shadows, font sizes, z-index) as CSS variables mapped into the Tailwind theme. Components never use raw color or pixel values.
- Create a `components/ui` layer of primitives: Button, IconButton, Input, Textarea, Select, Checkbox, Switch, RadioGroup, Card, Modal, BottomSheet, Tabs, Tooltip, Toast, Avatar, StatusDot, EmptyState, Skeleton, Spinner, PageHeader, DataTable. Feature components in `components/features` compose these.
- Mobile-first, responsive, accessible (keyboard focus, ARIA, contrast, touch targets of at least 44px). Every screen has loading, empty and error states.
- **Buttons are consistent:** one `Button` component with variants (primary, secondary, ghost, danger), sizes (sm, md, lg), loading and disabled states, identical heights per size, identical focus ring. No one-off button styles anywhere.
- **Border radius:** the outer container and the elements nested inside it use the **same radius token**. Define a single radius scale and reuse the same value for parent and child.

### 3.2 Hard style bans

- **No em dashes** anywhere: UI text, translations, comments, docs, commit messages. Use commas, colons or periods.
- **No hero badges:** no small pill, chip or label above headings or hero sections.
- **No letter-spacing and no uppercase text styles:** never use Tailwind `tracking-*` or `uppercase`, and no CSS `letter-spacing` or `text-transform: uppercase`. Bangla text must never be tracked.
- No analytics or tracking scripts.

### 3.3 Localization and no hardcoding

- Use **next-intl** with locale-prefixed routing. **Bangla (`bn`) is the default**, English (`en`) is the second language. Provide a language switcher that remembers the choice.
- **Zero hardcoded user-facing text.** Every label, message, validation error, notification text and date or number format comes from `messages/bn.json` and `messages/en.json`. The API returns error **codes**, and the frontend translates them.
- Format numbers, money (BDT) and dates with `Intl` using the active locale. Bangla locale shows Bangla digits.
- Use a Bangla-friendly font (Hind Siliguri or Noto Sans Bengali) with comfortable line height.
- Nothing else is hardcoded either: API URLs and keys come from env, business numbers (cut-off, grace days, thresholds) come from server settings, colors and spacing come from tokens.

### 3.4 Structure

- Feature-based folders: `app/` (routes only, thin), `components/ui`, `components/features/<feature>`, `hooks`, `lib` (api client, utils), `messages`, `styles`. Types come from `packages/shared`.
- Server state with TanStack Query. Forms with react-hook-form and zod. Route pages stay thin and compose feature components.
- The meal **heatmap** is a dedicated reusable component: horizontally scrollable, sticky name column, sticky date header, cells split in two halves (top lunch, bottom dinner).

## 4. BACKEND RULES

- NestJS with TypeORM and PostgreSQL. **Migrations only**, `synchronize` is always false. Provide seed data for local development.
- **Object-oriented and layered:** controller, service, repository. Controllers only handle HTTP and delegate. Business rules live in services and pure domain classes (for example `MealResolver`, `CostCalculator`, `BalanceEvaluator`, `RosterShuffler`), which are fully unit tested. Use dependency injection and interfaces or abstract classes for replaceable parts (notification sender, file storage).
- One Nest module per domain: auth, users, messes, memberships, meals, menus, ledger, billing, roster, expenses, notices, notifications, reports, audit, scheduler, common.
- Every endpoint has request and response DTOs, Swagger docs, pagination where relevant and consistent error codes.
- **Database models must be clean and simple.** UUID primary keys, `created_at` and `updated_at` on every table, snake\_case names, proper foreign keys and indexes, enums for fixed sets, no polymorphic or over-normalized tricks, no JSON blobs where a column works. Money is `numeric(12,4)`, handled with decimal.js, **never floats**. Round to 2 decimals only for display and for month close.
- Scheduled jobs are idempotent and safe to re-run. Log every run.

## 5. PRODUCT SPECIFICATION

### 5.1 Roles

Roles are **per mess**, one person can belong to several messes.

- **Manager:** adds or removes boarders, records deposits, sets cut-off time, meal rate and thresholds, creates exceptions after lock, forces meals on, approves shopper expenses, posts notices, closes the month.
- **Boarder:** sets own meals, sees own balance and ledger, votes for shopping days, requests swaps, sees the public heatmap and public expenses.
- **Shopper:** not a permanent role. A boarder on the roster for that day gets shopper tools: daily summary, menu entry, expense entry with receipt photo.

### 5.2 Meals

- Each day has two slots: **lunch** and **dinner**. Every active slot counts as **0.5 meal**. Full meal means both slots, half meal means one slot of the boarder's choice.
- Per slot a boarder can also set **egg preference** and **guest count**.
- **Egg preference** is an enum: `NONE`, `INSTEAD_OF_FISH`, `INSTEAD_OF_CHICKEN`.
- **Guest meals** are charged to the boarder who brought the guest: meal cost and fuel cost, but not the cook (khala) bill.
- **Resolution priority** for a slot: single-day override, then date range, then continuous on/off toggle, then permanent default profile.
- The default profile (full or half, which slot, egg preference) and a one-tap continuous on/off toggle mean boarders do not have to enter meals daily.

### 5.3 Cut-off and lock

- The manager sets a cut-off time (default 22:00 the previous day). After cut-off, the next day's meals, egg preference and guests are **locked**. Boarders and shoppers cannot change them.
- Only the manager can change a locked day, with a mandatory reason. It is written to the audit log and flagged as a manager liability in the month report.
- At cut-off the scheduler creates the final meal records for the day, writes ledger debits and sends the shopper summary. A reminder goes 30 minutes before cut-off to boarders who have not confirmed.

### 5.4 Balance, grace and auto off

- Balance is **never stored as a number**. It is computed from the ledger.
- Each active slot writes ledger debits for the three costs below.
- Notifications and rules (all thresholds configurable per mess):
  - 2 days before the balance runs out: warning notification, yellow ring.
  - Balance reaches zero: second notification, red ring. Meals still run for up to **3 grace days** as debt.
  - On the 2nd grace day: final warning to the boarder and the manager.
  - After the grace days: meals switch off automatically with a notification, red cell in the heatmap.
  - On a new deposit the system proposes restoring the auto-off days, and the manager confirms. The boarder's earlier preferences apply again.
  - The manager may keep a boarder's meals running. That is recorded as the manager's own liability.
- Ring colors on the profile picture (visible only to the boarder and the manager): green, yellow, red, from days of balance left, using the sum of all three per-slot costs. Others never see colors or amounts.

### 5.5 Cost rules

Per active slot, three costs are debited:

| Cost                 | How it is set                                                                            | Per slot debit                                      |
| -------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Meal                 | Estimated meal rate set by the manager, adjusted to the actual rate at month close       | meal rate x 0.5                                     |
| Fuel and gas (khori) | At month start the manager sets an estimated total (the app suggests last month's total) | estimated total / total expected slots in the month |
| Cook bill (khala)    | Fixed amount per boarder per month                                                       | amount / (days in month x 2)                        |

Worked example: 30 boarders, fuel cost last month 12,000. Total slots = 30 x 60 = 1,800, so fuel per slot = 12,000 / 1,800 = 6.67. A boarder on full meal for 30 days (60 slots) pays 400. A cook bill of 250 gives 250 / 60 = 4.17 per slot.

At month close, if the actual fuel and gas cost is above what was collected, the extra is shared among boarders (default: in proportion to slots eaten, configurable). Unit tests must cover this example.

### 5.6 Shopping roster and voting

- Manager settings per month: shoppers per day (default 2), times per boarder per month (default 2), voting deadline.
- At month start boarders vote for their preferred shopping dates. A date closes when its seat count is full (first vote wins).
- At the deadline the system **auto shuffles** the remaining boarders into empty days, fairly. Boarders who are away that day are not assigned.
- Boarders can request a swap with another boarder, and the manager approves.
- Notifications: the evening before and the morning of the shopping day.

### 5.7 Shopper flow

- Shopper sees a daily summary after cut-off: total meals per slot, how many want egg per the day's menu, guest count, and the amount due (total meal units x estimated rate).
- **The shopper decides the menu** (fish, chicken, other items) and can enter or change it any time before shopping. Menu is visible to everyone. If it is missing, a reminder is sent.
- Shopper records expenses with item lines and a receipt photo. The manager approves, and approved expenses become public. Actual spend is compared with the amount handed over.

### 5.8 Transparency and privacy

- **Public to every member:** the heatmap, daily meal totals, shopping expenses, fuel and gas expenses, boarders' basic info, notices, and each person's total meals.
- **Private until month close:** who deposited how much, individual balances and the ring colors. After the month is closed, all deposits and expenses become public.
- **Heatmap:** rows are boarders, columns are dates. Each cell is split in two halves: top is lunch, bottom is dinner. Green means a meal, gray means no meal, red means auto off for no balance (reason is not shown to others). Row ends show total meals, column ends show the day's total.

### 5.9 Month close and reports

- Manager closes the month after a checklist. Closing locks that month's data. Later fixes are reversing entries in the new month.
- Report: per boarder meals (full, half, egg, guest), total deposit, meal cost, fuel share, cook bill, balance, grace-day debt, manager-forced meals. Mess totals: total meals, total market cost, estimated vs actual meal rate, fuel and gas totals, cook bills. Export as PDF.

### 5.10 Notices and notifications

- Manager can post notices to the whole mess. Push notifications through FCM plus an in-app notification list. Every notification type uses a translated template.

## 6. DATA MODEL (keep it this simple)

| Table              | Key columns                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| users              | id, name, phone (unique), password\_hash, avatar\_url                                                       |
| refresh\_tokens    | id, user\_id, token\_hash, expires\_at, revoked\_at, replaced\_by                                           |
| messes             | id, name, cutoff\_time, meal\_rate, grace\_days, warning\_days, shoppers\_per\_day, shop\_times\_per\_month |
| memberships        | id, user\_id, mess\_id, role, is\_active, joined\_at, left\_at, cook\_bill\_amount                          |
| meal\_defaults     | id, membership\_id, meal\_type (full or half), half\_slot, egg\_preference, effective\_from                 |
| meal\_rules        | id, membership\_id, from\_date, to\_date, status (on or off), kind (toggle or range)                        |
| meal\_overrides    | id, membership\_id, date, slot, status, egg\_preference, guest\_count, source                               |
| meal\_finals       | id, membership\_id, date, slot, status, egg\_preference, guest\_count, forced\_by\_manager, reason          |
| daily\_menus       | id, mess\_id, date, shopper\_id, protein (fish, chicken, other), note                                       |
| ledger\_entries    | id, membership\_id, type, amount, date, reference\_id, note, created\_by                                    |
| monthly\_settings  | id, mess\_id, month, est\_fuel\_total, est\_meal\_rate, voting\_deadline                                    |
| shopping\_roster   | id, mess\_id, date, membership\_id, source (vote, auto, swap)                                               |
| swap\_requests     | id, roster\_id, from\_membership\_id, to\_membership\_id, status                                            |
| shopping\_expenses | id, mess\_id, date, shopper\_id, total, status, receipt\_url                                                |
| expense\_items     | id, expense\_id, name, quantity, price                                                                      |
| fuel\_expenses     | id, mess\_id, date, kind, amount                                                                            |
| notices            | id, mess\_id, author\_id, title, body                                                                       |
| notifications      | id, user\_id, type, payload, read\_at                                                                       |
| audit\_logs        | id, mess\_id, actor\_id, action, entity, before, after, reason                                              |
| month\_closes      | id, mess\_id, month, totals, closed\_by, closed\_at                                                         |

Ledger types: `DEPOSIT`, `MEAL`, `FUEL`, `COOK_BILL`, `GUEST`, `ADJUSTMENT`, `REFUND`.

## 7. SCHEDULED JOBS (server side, idempotent)

| Job           | When                | What it does                                                  |
| ------------- | ------------------- | ------------------------------------------------------------- |
| Cut-off lock  | Mess cut-off time   | Build meal\_finals, write ledger debits, send shopper summary |
| Balance check | Daily               | Send warnings, apply grace, auto off                          |
| Reminders     | Evening and morning | Cut-off, shopping day, missing menu                           |
| Voting close  | Voting deadline     | Auto shuffle and publish roster                               |
| Month end     | Last day of month   | Draft report, notify manager                                  |

## 8. DELIVERY PHASES

1. **Phase 0, foundation:** monorepo, lint, commit hooks, CI, env validation, design tokens, UI primitives, i18n setup, auth (phone and password, JWT with refresh rotation), mess and membership management.
2. **Phase 1, core (MVP):** meal defaults, overrides, continuous toggle, cut-off and lock, ledger and deposits, cost engine, balance warnings, grace and auto off, heatmap, shopper summary and menu, notices, basic month report.
3. **Phase 2, shopping:** roster, voting, auto shuffle, swaps, expenses with receipts, public expense lists, ring colors.
4. **Phase 3, hardening:** audit log screens, manager exceptions report, restore confirmations, PDF reports, date range leave, rate limiting review, security review, load test.
5. **Phase 4, later:** multiple messes per user, manager handover, offline queue, English polish.

After each phase: update the READMEs, run all checks, and give a short summary of what was built, what was decided, and what is next.

## 9. DEFINITION OF DONE

- Lint, type check, unit tests and build all pass. Domain classes (meal resolution, cost calculator, balance and grace evaluator, roster shuffler) have thorough unit tests. Key flows have e2e tests.
- No hardcoded text, secrets or magic numbers. Both languages complete.
- No repeated code, no one-off styles, no banned styles (em dash, hero badge, tracking, uppercase).
- Every public unit documented with JSDoc and every module has a README.
- Git history is clean Conventional Commits.
- A security checklist pass is documented in `docs/security.md`.

## 10. IF SOMETHING IS UNCLEAR

Do not guess on money or privacy rules. List the question, give your recommended answer, continue with it, and record the decision in `docs/decisions.md`.
