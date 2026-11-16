# Mess Meal Manager

A mobile-first web application designed to run the daily meal accounting and collective logistics of shared messes (boarding houses) in Bangladesh.

## Core Features

- Boarders manage their own meals (full, half, lunch only, dinner only, egg preference, guest count).
- Automatic daily shopper summary generated at cut-off time (default 22:00 Asia/Dhaka).
- Shopper tools: menu declaration, expense reporting with receipt image uploads.
- Append-only financial ledger: money is tracked with exact decimal precision (decimal.js, numeric(12,4)).
- Transparency: daily meal totals, public menus, and shared expenses accessible to all mess members.
- Privacy preservation: individual deposits, account balances, and status ring colors are private to the member and manager until month close.
- Bi-lingual support: Bangla (default) and English with zero hardcoded text.

## Tech Stack

- Monorepo: pnpm workspaces
- Backend: NestJS, TypeORM, PostgreSQL 16, Argon2id, JWT with rotating refresh tokens
- Frontend: Next.js (App Router, Turbopack), Tailwind CSS, TanStack Query, React Hook Form with Zod, next-intl
- Shared: TypeScript types, Zod validation schemas, business constants

## Getting Started

### Prerequisites

- Node.js >= 20.x
- pnpm >= 9.x
- PostgreSQL 16 (or Docker)

### Installation

```bash
# Install dependencies across all workspaces
pnpm install

# Start local PostgreSQL container
docker compose up -d

# Start backend in development mode
pnpm dev:api

# Start frontend in development mode
pnpm dev:web
```

### Verification Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
```
