# Spiral Sounds

A full-stack vinyl e-commerce platform built with Node.js, Express.js, and Vanilla JS — featuring session-based authentication, Stripe payments, and scroll-driven GSAP animations.

**[Live Demo](https://spiral-sounds-8dk9.onrender.com)** · **[GitHub](https://github.com/CodeCary80/Spiral-Sounds)**

---

## Overview

Spiral Sounds is a Bauhaus-inspired vinyl record store where users can browse records by genre, search by title or artist, add items to a cart, and complete purchases via Stripe. The project demonstrates a production-ready full-stack architecture — from REST API design and database migration to secure checkout and CI/CD deployment.

---

## Tech Stack

**Frontend:** Vanilla JS (ES Modules), HTML5, CSS3, GSAP 3 + ScrollTrigger, Stripe.js

**Backend:** Node.js, Express.js, express-session, bcryptjs, validator, Stripe Node SDK

**Database:** Supabase PostgreSQL (migrated from SQLite)

**DevOps:** Render (hosting + auto-deploy), GitHub Actions (CI)

---

## Architecture

```
├── server.js              # Express server, session config, route mounting
├── db/
│   └── db.js              # SQLite→PostgreSQL adapter (toPostgres() + RETURNING id)
├── routes/                # 5 routers: auth, me, products, cart, payments
├── controllers/           # Business logic for each route
│   ├── authController.js  # Register, login, logout with bcrypt + session
│   ├── cartController.js  # Upsert logic, SQL JOINs, cart count
│   ├── productsController.js  # Dynamic SQL, ILIKE search, genre filter
│   ├── meController.js    # Session-based auth check
│   └── paymentsController.js  # Stripe PaymentIntent creation
├── middleware/
│   └── requireAuth.js     # Session guard for 6 protected endpoints
└── public/
    ├── js/                # 10 frontend ES modules
    ├── css/
    └── *.html             # 5 pages: index, login, signup, cart, detail
```

**Key design decisions:**

- **Database adapter:** `db.js` wraps `pg.Pool` with a SQLite-compatible interface — converting `?` placeholders to `$n` syntax and auto-appending `RETURNING id` to INSERT statements, keeping all 5 controllers unchanged during migration.
- **Auth:** HTTP-only session cookies with bcrypt password hashing. A single `requireAuth` middleware protects all cart and payment routes.
- **Payments:** Two-step Stripe flow — backend creates a PaymentIntent and returns a `clientSecret`; frontend mounts a Payment Element and calls `confirmPayment()`, never handling card data directly.
- **Search:** Server-side `ILIKE` query across title, artist, and genre fields, with dynamic SQL construction to support both genre filtering and keyword search from a single endpoint.

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

## CI/CD

- **CI:** GitHub Actions runs `node --check server.js` on every push
- **CD:** Render auto-deploys on push to `main`