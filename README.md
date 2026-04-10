# TradeNest

TradeNest is a full-stack buying and reselling marketplace built with Django, Django REST Framework, MySQL-ready configuration, and a React + CSS frontend. The product direction is now marketplace-first: independent sellers publish listings, buyers check out through an escrow-style flow, and orders move through seller shipment, buyer confirmation, and dispute states.

Detailed teammate handoff notes live in `docs/TEAM_HANDOFF.md`.

## What’s included

- Buyer authentication, profile management, saved addresses, and token-based sessions
- Seller onboarding with `SellerProfile`, store details, payout email, and escrow policy copy
- Resale listings with seller attribution, condition, authenticity status, resale status, shipping origin, and escrow flags
- Seller workspace for creating, editing, and deleting listings plus viewing seller-side orders
- Cart, wishlist, coupon application, recently viewed tracking, newsletter signup, and order history
- Escrow-oriented checkout with one seller per cart, seller shipment updates, buyer receipt confirmation, and dispute opening
- Order, payment, escrow, shipment, and status-history models for marketplace operations
- Responsive React UI with homepage, browse, listing detail, cart, checkout, account, orders, wishlist, and sell workspace
- Fallback demo data and local persistence so the frontend still works when the backend API is unavailable

## Project structure

```text
backend/   Django API for accounts, listings, orders, and escrow flow
frontend/  React marketplace powered by Vite
docs/      Teammate-facing implementation notes
```

## Quick start with Docker

1. Run `docker compose up --build`
2. Open `http://localhost:5173`
3. Open `http://localhost:8000/admin` for Django admin

The backend container automatically:

- creates migrations for the custom apps
- runs database migrations
- seeds TradeNest demo data and the `TRADENEST5` coupon
- starts the Django development server

## Manual backend setup

1. Create and activate a virtual environment
2. Install backend packages with `pip install -r backend/requirements.txt`
3. Copy `backend/.env.example` to `backend/.env`, then export those variables in your shell or load them with your preferred env tool
4. Make sure MySQL is running with the credentials from `backend/.env.example`, or adjust the env vars before starting Django
5. Run:

```bash
cd backend
python manage.py makemigrations accounts catalog commerce
python manage.py migrate
python manage.py seed_store
python manage.py createsuperuser
python manage.py runserver
```

If you need a quick local fallback instead of MySQL, set `DB_ENGINE=sqlite`.

## Manual frontend setup

1. Install Node.js 20+
2. Copy `frontend/.env.example` to `frontend/.env`
3. Run:

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the API at `http://localhost:8000/api` by default. Change it with `frontend/.env.example`.

## Seeded content

- Starter seller profiles and sample marketplace listings
- Featured categories for sneakers, luxury bags, and tech
- Resale-oriented product records with condition and authenticity metadata
- Coupon code: `TRADENEST5`

## Key API areas

- `api/auth/` for register, login, profile, addresses, and seller profile management
- `api/catalog/` for home feed, categories, brands, listings, seller listing CRUD, search, and reviews
- `api/commerce/` for cart, wishlist, checkout, buyer orders, seller orders, escrow actions, newsletter, and admin metrics

## Notes

- Custom app migrations are still generated at setup time for project evolution from the scaffolded base.
- Escrow is modeled in the backend, but it is still a demo implementation rather than a real third-party payment gateway or payout rail.
- Checkout currently requires a signed-in buyer account and supports one seller per cart so escrow stays tied to a single seller payout.
- The frontend includes fallback demo behavior so the UI remains usable even before the API is fully installed.
