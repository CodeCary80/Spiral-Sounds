# Spiral Sounds

A full-stack vinyl record e-commerce store built with a Bauhaus design aesthetic — black, cream, and red, with editorial typography and scroll-driven animations.

**Live demo → [spiral-sounds-8dk9.onrender.com](https://spiral-sounds-8dk9.onrender.com)**

> Stripe is in test mode. Use card `4242 4242 4242 4242` (any future expiry, any CVC) to test checkout.

---

## Features

- **Scroll-driven animations** — GSAP ScrollTrigger scrub on hero, editorial text reveal, genre scatter, and showcase image expansion
- **Genre product overlay** — rises from below on genre click, 2-column product grid, live filter tabs, and a cart sidebar that slides in when items are added
- **Client stories slider** — 3-card wipe transition with click-to-advance
- **Footer rise** — footer slides up over the pinned stories section as you scroll
- **Session auth** — register, log in, log out with bcrypt password hashing
- **Cart** — add, remove, and view items; count badge updates in real time
- **Stripe checkout** — full payment flow with Stripe's Payment Element; handles success and card declines inline

---

## Tech Stack

| | |
|---|---|
| Frontend | Vanilla HTML / CSS / JavaScript (ES Modules) |
| Animations | GSAP 3.12.5 + ScrollTrigger |
| Fonts | Adobe Typekit — Alfarn, Neue Kabel Black |
| Backend | Node.js + Express |
| Database | SQLite |
| Auth | express-session + bcrypt |
| Payments | Stripe (test mode) |
| Deploy | Render |

---

## Running Locally

**Prerequisites:** Node.js 18+

```bash
# 1. Clone the repo
git clone https://github.com/CodeCary80/spiral-sounds.git
cd spiral-sounds

# 2. Install dependencies
npm install

# 3. Create a .env file
cp .env.example .env
# then fill in your values (see below)

# 4. Start the server
node server.js
# → http://localhost:8000
```

### .env

```
SPIRAL_SESSION_SECRET=your-session-secret
STRIPE_SECRET_KEY=sk_test_...
```

> Get your Stripe test keys at [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API Keys.

---

## Test Payments

| Card number | Result |
|---|---|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 9995` | Declined — insufficient funds |

Use any future expiry date and any 3-digit CVC.

---

## Project Structure

```
Spiral-Sounds/
├── public/
│   ├── index.html           # Main page
│   ├── cart.html            # Cart + Stripe checkout
│   ├── css/index.css
│   └── js/
│       ├── index.js         # Animations + genre overlay
│       ├── cart.js          # Cart page
│       ├── checkout.js      # Stripe Payment Element
│       ├── cartService.js   # Shared cart API helpers
│       └── productService.js
├── routes/
│   ├── products.js
│   ├── cart.js
│   ├── auth.js
│   ├── me.js
│   └── payments.js
├── controllers/
│   ├── cartController.js
│   ├── authController.js
│   ├── productsController.js
│   └── paymentsController.js
├── middleware/
│   └── requireAuth.js
├── db/db.js
├── server.js
└── .env                     # Never commit this
```

---

## Author

**Cary Zhu** — [caryzhu.com](https://caryzhu.com) · [GitHub](https://github.com/CodeCary80) · [contact@caryzhu.com](mailto:contact@caryzhu.com)