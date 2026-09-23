# Spiral Sounds

A full-stack vinyl e-commerce platform built with Node.js, Express.js, and Vanilla JS — featuring session-based authentication, Stripe payments, and scroll-driven GSAP animations.

**[Live Demo](https://spiral-sounds-8dk9.onrender.com)** 

---

## Overview

Spiral Sounds is a warm, editorial-style vinyl record store where users can browse records by genre, search by title, artist, or subgenre, add items to a cart, and complete purchases via Stripe. The project demonstrates a production-ready full-stack architecture — from REST API design and database migration to secure checkout, automated testing, and CI/CD deployment.

---

## Tech Stack

**Frontend:** Vanilla JS (ES Modules), HTML5, CSS3, GSAP 3 + ScrollTrigger, Stripe.js

**Backend:** Node.js, Express.js, express-session, bcryptjs, validator, Stripe Node SDK

**Database:** Supabase PostgreSQL (migrated from SQLite)

**Testing:** Vitest, Supertest

**DevOps:** Render (hosting + auto-deploy), GitHub Actions (CI)

---

## Architecture

```
├── app.js                 # Express app definition — middleware, session, routes (no listen)
├── server.js              # Starts the HTTP server (imports app.js)
├── db/
│   └── db.js              # SQLite→PostgreSQL adapter (toPostgres() + RETURNING id)
├── routes/                # 5 routers: auth, me, products, cart, payments
├── controllers/           # Business logic for each route
│   ├── authController.js  # Register, login, logout with bcrypt + session
│   ├── cartController.js  # Upsert logic, SQL JOINs, cart count
│   ├── productsController.js  # Dynamic SQL, ILIKE + subgenre-aware search, genre filter
│   ├── meController.js    # Session-based auth check
│   └── paymentsController.js  # Stripe PaymentIntent creation, server-side amount validation
├── middleware/
│   └── requireAuth.js     # Session guard for 6 protected endpoints
└── public/
    ├── js/                # Frontend ES modules, incl. cartTotal.js (shared with the backend)
    ├── css/
    ├── images/            # favicon.svg + product/hero images
    └── *.html             # 5 pages: index, login, signup, cart, detail
```

**Key design decisions:**

- **Database adapter:** `db.js` wraps `pg.Pool` with a SQLite-compatible interface — converting `?` placeholders to `$n` syntax and auto-appending `RETURNING id` to INSERT statements, keeping all 5 controllers unchanged during migration.
- **Auth:** HTTP-only session cookies with bcrypt password hashing. A single `requireAuth` middleware protects all cart and payment routes.
- **Payments:** Two-step Stripe flow — backend creates a PaymentIntent and returns a `clientSecret`; frontend mounts a Payment Element and calls `confirmPayment()`, never handling card data directly. The server independently recomputes the cart total from the database and rejects any request whose amount doesn't match it, so a tampered client-side amount can't reach Stripe.
- **Search:** Server-side `ILIKE` query across title, artist, and genre fields, with dynamic SQL construction to support both genre filtering and keyword search from a single endpoint. A `SUBGENRE_MAP` broadens matching so a subgenre search (e.g. "New Wave") still surfaces records tagged with the corresponding parent genre.
- **Testability:** `app.js` and `server.js` are split so the Express app can be imported directly by tests (via Supertest) without binding a real port. Shared pure logic like cart total calculation lives in a plain module (`public/js/cartTotal.js`) used by both the frontend and the payment validation on the backend.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) PostgreSQL database
- A [Stripe](https://stripe.com) account (test mode keys)

### Installation

```bash
git clone https://github.com/CodeCary80/Spiral-Sounds.git
cd Spiral-Sounds
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=your_supabase_connection_string
STRIPE_SECRET_KEY=sk_test_...
SPIRAL_SESSION_SECRET=your_session_secret
```

### Run Locally

```bash
node server.js
```

Visit `http://localhost:8000`

### Test Payment

Use Stripe's test card: `4242 4242 4242 4242` · any future expiry · any CVC

---

## Testing

4 test files, 22 tests, run with [Vitest](https://vitest.dev) and [Supertest](https://github.com/ladjs/supertest):

| File | Type | Covers |
|---|---|---|
| `public/js/cartTotal.test.js` | Unit | Cart total math — multi-item sums, empty cart, missing/zero quantity, price as a string |
| `controllers/paymentsController.test.js` | Unit | Payment amount format validation and server-side cart-total matching |
| `app.test.js` | Integration | Unauthenticated requests to protected routes return `401` |
| `controllers/cartController.test.js` | Integration | `DELETE /api/cart/all` empties a logged-in user's cart |

```bash
npm test
```

The integration tests exercise the real Express app in-memory via Supertest (no real port bound) and, for the cart-clearing test, the live Supabase database through a fixed throwaway account that's created and cleaned up automatically on each run — this project doesn't have a separate test database.

### End-to-end tests (Playwright)

5 tests, each run in chromium, firefox and webkit.

#### Prerequisites

`.env` containing `DATABASE_URL` and `STRIPE_SECRET_KEY`.

#### Files

- `homepage.spec.ts`: title of the home page
- `cart.spec.ts`: redirect to the login page when logged out, and logged-in users can add items to the cart
- `checkout.spec.ts`: empty cart shows the empty message and disables the checkout button
- `search.spec.ts`: searching for a nonexistent item shows "No records found."

#### How to run tests

```bash
npm run test:e2e
```

#### Trade-offs

- Each test registers its own uniquely named account, so the three browsers running in parallel never collide on a shared user.
- Teardown deletes that account from `users` and `cart_items`, so runs leave no leftover data.
- Like the Vitest integration tests, these run against the live Supabase database, since there's no separate test database.

---

## CI/CD

- **CI:** GitHub Actions runs `node --check server.js` on every push
- **CD:** Render auto-deploys on push to `main`
- **E2E:** `playwright.yml` runs the Playwright suite on pull requests into `main` and on pushes to `main`; `DATABASE_URL` and `STRIPE_SECRET_KEY` are stored as GitHub Actions secrets