# CLAUDE.md

Guidance for working in this repository.

## What this is

Dwell Studio — a studio booking + membership + CRM web app (think bsport),
built as a single Next.js app. See `README.md` for the full overview.

## Stack

- Next.js 14 App Router, React Server Components + **Server Actions** for all
  mutations (no REST/API routes — prefer adding new actions in `app/actions/`).
- Prisma + SQLite (`prisma/schema.prisma`, db file `prisma/dev.db`).
- Tailwind CSS. Shared UI primitives are in `app/globals.css` (`.btn-primary`,
  `.card`, `.input`, `.badge`, etc.) — reuse them.
- Auth is custom and dependency-free: `lib/password.ts` (scrypt) +
  `lib/auth.ts` (HMAC-signed session cookie). `getCurrentUser()` reads the
  session in server components.

## Conventions

- **Enums are strings.** SQLite via Prisma has no native enums, so `role`,
  `status`, `kind` are `String` fields with documented allowed values (see
  comments in `schema.prisma`). Compare against string literals.
- **Money is stored in cents** (`priceCents`, `pricePaidCents`). Format with
  `money()` from `lib/format.ts`.
- Mutations: add a `"use server"` action in `app/actions/`, call it from a
  client component, and `revalidatePath()` the affected routes.
- Admin actions must call `requireStaff()` (see `app/actions/admin.ts`).
- Core booking/credit/waitlist logic lives in `lib/booking.ts` and must stay
  inside `prisma.$transaction` to keep credits and capacity consistent.

## Commands

- `npm run dev` — develop.
- `npm run build` — must pass before committing (catches type errors).
- `npm run db:reset` — wipe + reseed demo data.

## After changing the schema

Run `npx prisma db push` (or `npm run db:reset` to also reseed) and
`npx prisma generate`.
