# Breyanna Fitness

A booking + membership + CRM web app for a fitness studio, inspired by
[bsport](https://bsport.io). One responsive web app serves two audiences:

- **Members** — browse the class schedule, book/cancel classes, join waitlists,
  buy memberships & class packs, and manage their account. Works great on a
  phone browser.
- **The studio (CRM)** — your wife's side: a dashboard, schedule management,
  member records, attendance tracking, class & instructor setup, and plans.

> This is a **working MVP foundation**. The core experience is real and
> functional. Card payments are intentionally **not** wired up yet — choosing a
> plan grants it instantly so you can try booking end-to-end. (Adding Stripe
> later is straightforward.)

## Tech stack

- **Next.js 14** (App Router, React Server Components, Server Actions)
- **TypeScript**
- **Prisma** ORM with a **PostgreSQL** database
- **Tailwind CSS**
- Lightweight built-in auth (scrypt password hashing + signed session cookie,
  no third-party auth service)

## 🚀 Just want it online?

If you want a live web link to use on your phone (no coding), follow
**[DEPLOY.md](DEPLOY.md)** — a step-by-step, beginner-friendly guide using free
hosting. You do **not** need the local setup below for that.

## Running locally (for development)

You need a PostgreSQL database. The easiest free option is a
[Neon](https://neon.tech) database — create one and copy its connection string.

```bash
cp .env.example .env      # then paste your DATABASE_URL into .env
npm install               # install dependencies
npm run setup             # create tables + load demo data
npm run dev               # start the dev server at http://localhost:3000
```

Then open http://localhost:3000.

### Demo logins

| Role   | Email             | Password   |
| ------ | ----------------- | ---------- |
| Owner  | `owner@demo.com`  | `password` |
| Member | `member@demo.com` | `password` |

The owner account sees the **Studio CRM**; the member account sees the booking
app. New members can also self-register at `/register`.

## Useful scripts

| Command            | What it does                                            |
| ------------------ | ------------------------------------------------------- |
| `npm run dev`      | Start the development server                             |
| `npm run build`    | Production build                                         |
| `npm run start`    | Run the production build                                |
| `npm run setup`    | First-time setup (generate + db push + seed)            |
| `npm run db:seed`  | Reload the sample data                                   |
| `npm run db:reset` | Wipe the database and reseed from scratch               |

## How it works

### Roles

Every user has a role: `MEMBER`, `STAFF`, or `OWNER`. Staff/owner accounts can
reach the `/admin` CRM area; members are redirected away from it.

### Booking & credits

- A member needs an **active membership** to book.
- **Unlimited** plans allow any number of bookings while active.
- **Packs** and **drop-ins** spend **credits**; a class can cost more than one
  credit (e.g. Reformer Pilates costs 2).
- When a class is full, booking puts the member on the **waitlist** (no credit
  is charged until they get a confirmed spot).
- **Cancelling** a confirmed spot refunds the credit and automatically
  **promotes** the next person on the waitlist (charging their credit).
- Cancelling a whole class (from the CRM) releases and refunds everyone.

The booking rules live in [`lib/booking.ts`](lib/booking.ts) and run inside
database transactions so credits and spots stay consistent.

## Project structure

```
app/
  (member)/        Member-facing pages: schedule, bookings, memberships, account
  (admin)/         Studio CRM: dashboard, schedule, members, classes, plans
  actions/         Server Actions (auth, member booking, admin management)
  login, register  Auth pages
components/         Reusable UI (forms, nav, booking buttons, icons)
lib/               db client, auth/session, booking engine, formatting helpers
prisma/
  schema.prisma    Data model
  seed.ts          Demo data
```

## Notes & next steps

Ideas for where to take it next:

- **Payments** — add Stripe Checkout so plan purchases take real money.
- **Notifications** — email/SMS confirmations and waitlist-promotion alerts.
- **Recurring schedule tools** — duplicate a week, repeating classes.
- **Reports** — attendance trends, revenue charts, member retention.
- **Installable app** — wrap the web app as a PWA / native shell.
- **Production database** — swap SQLite for Postgres (change one line in
  `prisma/schema.prisma` plus `DATABASE_URL`).

## Configuration

Environment variables (see `.env.example`):

- `DATABASE_URL` — database connection (defaults to the local SQLite file).
- `AUTH_SECRET` — secret used to sign session cookies. **Set a long random
  value in production.**
