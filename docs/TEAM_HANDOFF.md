# Team Handoff Guide

This guide explains how the current TradeNest codebase works, what is already implemented, which files own which responsibilities, and where teammates should make changes when evolving the marketplace.

## 1. Project Summary

TradeNest is now a buying and reselling marketplace, not a traditional single-merchant store.

The main product ideas already implemented are:

- buyers can browse and purchase resale listings
- sellers can create listings and manage seller-facing orders
- checkout is modeled as an escrow-style flow
- order state can move from funded escrow to shipped, completed, or disputed
- product detail pages surface seller trust signals, condition, and authenticity context

The stack is:

- Django + Django REST Framework for the backend and admin
- token authentication for sessions
- MySQL-ready database configuration, with SQLite fallback for demos
- React + Vite for the frontend
- plain CSS for the UI system

### 1.1 Runtime requirements

Recommended local setup:

- Python 3.10+ for the Django backend
- `pip` and `venv`
- Node.js 20+ and `npm` for the React frontend
- MySQL 8.x for the primary database path
- SQLite for quick local demos when MySQL is not needed
- Docker + Docker Compose if the team wants containerized local development

Helpful Linux packages when installing `mysqlclient` locally:

- `python3-dev`
- `default-libmysqlclient-dev`
- `build-essential`
- `pkg-config`

Notes:

- the Docker setup currently uses `mysql:8.4`
- local fallback mode in the frontend allows UI development even if the backend is offline
- the backend can run against SQLite by setting `DB_ENGINE=sqlite`

### 1.2 Backend dependencies

The backend dependency file is `backend/requirements.txt`.

Current Python dependencies:

- `Django>=5.1,<5.3`
  - core web framework
  - model layer, admin, routing, settings, auth base classes
- `djangorestframework>=3.15,<3.16`
  - API views, serializers, response helpers, token auth integration
- `django-cors-headers>=4.4,<4.5`
  - allows the Vite frontend on `localhost:5173` to call the backend API during development
- `mysqlclient>=2.2,<2.3`
  - MySQL database driver for Django
- `Pillow>=10.4,<11.0`
  - image-related support used by Django projects; currently the app mostly stores image URLs rather than uploaded files

Backend framework features currently in use:

- Django admin
- custom user model
- DRF generic views and viewsets
- DRF token authentication
- CORS middleware
- MySQL or SQLite database backends

### 1.3 Frontend dependencies

The frontend dependency file is `frontend/package.json`.

Current runtime dependencies:

- `react`
  - component rendering and stateful UI
- `react-dom`
  - browser renderer for React
- `react-router-dom`
  - routing for pages such as `/shop`, `/account`, `/orders`, and `/sell`

Current development dependencies:

- `vite`
  - dev server and production bundler
- `@vitejs/plugin-react`
  - React support for Vite

Frontend architecture choices currently in use:

- no global state library beyond React context
- no CSS framework
- no component library
- no TypeScript
- one shared CSS file in `frontend/src/styles/app.css`

### 1.4 Environment configuration

Backend environment template:

- file: `backend/.env.example`
- current variables:
  - `DJANGO_SECRET_KEY`
  - `DJANGO_DEBUG`
  - `DJANGO_ALLOWED_HOSTS`
  - `CORS_ALLOWED_ORIGINS`
  - `CSRF_TRUSTED_ORIGINS`
  - `DB_ENGINE`
  - `DB_NAME`
  - `DB_USER`
  - `DB_PASSWORD`
  - `DB_HOST`
  - `DB_PORT`
  - `DEFAULT_FROM_EMAIL`
  - `FRONTEND_BASE_URL`

Frontend environment template:

- file: `frontend/.env.example`
- current variable:
  - `VITE_API_BASE_URL`

Important note:

- some default variable names still use inherited scaffold naming such as `ecommerce_db` and `ecommerce_user`
- these are only defaults in the env template and Docker compose file; they can be renamed safely if the environment variables are updated consistently

### 1.5 Setup and boot requirements

Typical backend first-run sequence:

1. create a virtual environment
2. install `backend/requirements.txt`
3. configure `backend/.env`
4. run `python manage.py makemigrations accounts catalog commerce`
5. run `python manage.py migrate`
6. run `python manage.py seed_store`
7. optionally run `python manage.py createsuperuser`
8. run `python manage.py runserver`

Typical frontend first-run sequence:

1. install Node.js dependencies with `npm install`
2. configure `frontend/.env`
3. run `npm run dev`

Docker startup requirements:

- Docker daemon must be installed and running
- the current user must have permission to use Docker, or commands must be run with `sudo`
- `docker compose up --build` starts MySQL, backend, and frontend together

## 2. Repository Map

```text
backend/
  config/                   Django settings and root URL config
  apps/
    accounts/               Users, addresses, auth, seller profiles
    catalog/                Categories, brands, listings, reviews, seller CRUD
    commerce/               Cart, wishlist, checkout, orders, escrow, newsletter
  utils/                    Shared abstract model base

frontend/
  src/
    api/                    Central API client and auth/session storage
    components/             Shared UI pieces such as header and listing cards
    context/                Global app state via ShopContext
    data/                   Fallback demo marketplace data
    pages/                  Route-level screens
    styles/                 Main CSS file

docs/
  TEAM_HANDOFF.md           This guide
```

## 3. How the App Boots

### Backend

The backend entrypoint is `backend/manage.py`, which loads `backend/config/settings.py`.

Important setup choices:

- `AUTH_USER_MODEL` is `accounts.User`
- DRF token auth is enabled
- all API routes are mounted from `backend/config/urls.py`
- database defaults to MySQL unless `DB_ENGINE=sqlite`

API route prefixes:

- `/api/auth/`
- `/api/catalog/`
- `/api/commerce/`

### Frontend

The frontend entrypoint is `frontend/src/main.jsx`.

Startup order:

1. `App` mounts inside `BrowserRouter`
2. `ShopProvider` initializes auth, cart, home feed, wishlist, and orders
3. `Header`, route tree, and `Footer` render around the page content

Main routes:

- `/`
- `/shop`
- `/product/:slug`
- `/cart`
- `/checkout`
- `/wishlist`
- `/account`
- `/orders`
- `/sell`

## 4. Backend Architecture

### 4.1 Shared base model

`backend/utils/models.py` defines `TimeStampedModel`, which adds:

- `created_at`
- `updated_at`

Most business models inherit from it.

### 4.2 Accounts app

Location: `backend/apps/accounts/`

Purpose:

- custom user model
- saved addresses
- authentication
- seller activation and seller profile management

Main models:

- `User`
  - extends `AbstractUser`
  - adds `phone_number`, `avatar_url`, `loyalty_points`, `marketing_opt_in`, and `is_seller`
- `Address`
  - belongs to a user
  - supports default shipping and billing flags
- `SellerProfile`
  - one-to-one with `User`
  - stores `store_name`, `slug`, `bio`, `city`, `payout_email`, `is_verified`, `seller_rating`, `total_sales`, and `escrow_policy`
  - automatically flips `user.is_seller = True` on save

Main API behavior:

- `POST /api/auth/register/`
  - creates a user
  - can optionally create a seller profile when `is_seller` is true
  - returns a token plus serialized user
- `POST /api/auth/login/`
  - authenticates by email + password
- `POST /api/auth/logout/`
  - deletes the active token
- `GET/PATCH /api/auth/me/`
  - returns or updates the signed-in user
- `GET/PATCH /api/auth/seller-profile/`
  - seller-facing profile endpoint
  - auto-creates a default seller profile if one does not exist yet
- `AddressViewSet`
  - CRUD for the signed-in user’s addresses

Why this matters:

- if roles or permissions get more complex, start with `User` and `SellerProfile`
- if seller verification becomes a real workflow, `SellerProfile.is_verified` is the existing hook
- if payout settings need to expand beyond one email field, extend `SellerProfile`

### 4.3 Catalog app

Location: `backend/apps/catalog/`

Purpose:

- browse, search, and listing detail APIs
- seller listing CRUD

Main models:

- `Category`
  - supports nesting and featured placement
- `Brand`
  - marketing metadata for brands
- `Product`
  - now functions as a marketplace listing model
  - belongs to a `seller`
  - stores price, compare-at price, stock, tags, specs, and merchandising flags
  - adds resale-specific fields:
    - `condition`
    - `condition_notes`
    - `authenticity_status`
    - `resale_status`
    - `ships_from`
    - `original_purchase_year`
    - `escrow_required`
  - exposes helper properties such as `seller_name` and `seller_verified`
- `ProductImage`
  - ordered gallery
- `ProductVariant`
  - optional size/color style variants
- `ProductReview`
  - one review per user per listing

Important status fields already in the model:

- `condition`
  - `new`
  - `like_new`
  - `gently_used`
  - `used`
  - `refurbished`
  - `vintage`
- `authenticity_status`
  - `seller_declared`
  - `pending_verification`
  - `verified`
- `resale_status`
  - `draft`
  - `active`
  - `reserved`
  - `sold`
  - `archived`

Main API behavior:

- `GET /api/catalog/home/`
  - homepage feed
  - now markets seller trust, condition context, and escrow messaging
- `GET /api/catalog/categories/`
  - category tree
- `GET /api/catalog/brands/`
  - brand list
- `GET /api/catalog/products/`
  - browse endpoint
  - returns active listings only
  - supports search, category, brand, price range, sort, and condition filtering
- `GET /api/catalog/products/<slug>/`
  - listing detail with images, variants, reviews, seller info, and related listings
- `GET /api/catalog/search-suggestions/`
  - lightweight search suggestions
- `GET/POST /api/catalog/products/<slug>/reviews/`
  - listing reviews
- `GET/POST/PATCH/DELETE /api/catalog/my-listings/`
  - seller listing CRUD
  - seller is always forced to the signed-in user
  - new listings default to escrow-required

Seed support:

- `backend/apps/catalog/management/commands/seed_store.py`
  - creates demo seller accounts and seller profiles
  - seeds listings in sneakers, luxury bags, and tech
  - seeds the `TRADENEST5` coupon

Why this matters:

- new listing attributes usually require changes in `Product`, serializers, seller form UI, and listing cards
- if the team wants offers, bids, or negotiated pricing, `Product` and seller listing endpoints are the starting point
- if authenticity becomes a true workflow, extend `authenticity_status` and add supporting review or moderation models

### 4.4 Commerce app

Location: `backend/apps/commerce/`

Purpose:

- cart and wishlist
- checkout
- order lifecycle
- escrow state
- buyer and seller order actions

Main models:

- `Coupon`
  - percent, fixed, and free-shipping promotions
- `Cart`
  - can belong to an authenticated user or guest `session_key`
- `CartItem`
  - selected listing, variant, quantity, and pricing snapshot
- `WishlistItem`
  - saved listings
- `RecentlyViewedItem`
  - buyer browsing history
- `Order`
  - buyer, seller, totals, address snapshots, tracking number, and status
- `OrderItem`
  - immutable line snapshot of the purchased listing
- `Payment`
  - payment metadata and payload
  - currently defaults to provider `tradenest-escrow`
- `EscrowTransaction`
  - one-to-one with `Order`
  - stores escrow status, held amount, timestamps, dispute reason, and payout reference
- `Shipment`
  - present in the model layer for future expansion
- `OrderStatusHistory`
  - timeline/audit notes
- `NewsletterSubscriber`
  - email capture

Current order statuses:

- `pending`
- `awaiting_shipment`
- `shipped`
- `completed`
- `disputed`
- `cancelled`

Current payment statuses:

- `pending`
- `escrow_held`
- `released_to_seller`
- `disputed`
- `failed`
- `refunded`

Current escrow statuses:

- `funded`
- `in_transit`
- `released`
- `disputed`
- `refunded`
- `cancelled`

Important service helpers in `backend/apps/commerce/services.py`:

- `get_or_create_cart_for_request()`
  - resolves a cart from auth or `X-Session-Key`
  - merges guest cart items into the user cart after login
- `calculate_cart_totals()`
  - computes subtotal, shipping, discounts, tax, and grand total

Main API behavior:

- `GET /api/commerce/cart/`
  - returns current cart and a `session_key`
- `POST /api/commerce/cart/items/`
  - adds an item
  - rejects inactive listings
  - rejects listings without a seller
  - enforces one seller per cart
- `PATCH/DELETE /api/commerce/cart/items/<id>/`
  - quantity changes and removal
- `POST /api/commerce/cart/coupon/`
  - coupon validation and cart refresh
- `GET/POST/DELETE /api/commerce/wishlist/`
  - wishlist CRUD
- `GET/POST /api/commerce/recently-viewed/`
  - recent listing tracking
- `POST /api/commerce/checkout/`
  - requires authentication
  - validates the buyer’s address input
  - builds an `Order`
  - creates `OrderItem` rows
  - creates a `Payment`
  - creates an `EscrowTransaction`
  - writes `OrderStatusHistory`
  - decrements listing stock
  - moves sold-out listings to `reserved`
  - clears cart items and applied coupon
- `GET /api/commerce/orders/`
  - buyer order history
- `GET /api/commerce/orders/<order_number>/`
  - buyer order detail
- `GET /api/commerce/seller/orders/`
  - seller-side order list
- `POST /api/commerce/seller/orders/<order_number>/ship/`
  - seller marks order shipped
  - stores `tracking_number` on the order
  - updates escrow from `funded` to `in_transit`
- `POST /api/commerce/orders/<order_number>/confirm-receipt/`
  - buyer confirms receipt
  - releases escrow to seller
  - updates payment and order status
  - increments seller profile `total_sales`
  - marks purchased listings as `sold`
- `POST /api/commerce/orders/<order_number>/dispute/`
  - buyer or seller can open a dispute
  - puts order, payment, and escrow into `disputed`
- `POST /api/commerce/newsletter/`
  - newsletter signup
- `GET /api/commerce/dashboard/overview/`
  - admin summary metrics

Why this matters:

- real escrow or gateway integration will replace the demo logic in `CheckoutView`, `BuyerConfirmReceiptView`, and `OpenEscrowDisputeView`
- returns, refunds, cancellations, and auto-release timers belong here
- if the team adds seller payouts or moderation queues, `Order`, `Payment`, `EscrowTransaction`, and `OrderStatusHistory` are the correct places to expand

## 5. Request and State Flow

### 5.1 Auth and session storage

Frontend token storage is centralized in `frontend/src/api/client.js`.

Current keys:

- auth token: `tradenest-auth-token`
- guest cart session key: `tradenest-session-key`

Fallback-only frontend persistence keys:

- `tradenest-local-cart`
- `tradenest-local-wishlist`
- `tradenest-local-orders`

### 5.2 Guest cart and login merge

Guest users can still build a cart.

Flow:

1. frontend calls `GET /api/commerce/cart/`
2. backend returns a `session_key`
3. frontend stores it and sends it back in `X-Session-Key`
4. after login, the backend merges guest cart items into the signed-in cart

Important limitation:

- checkout itself requires a signed-in user because escrow needs a buyer identity

### 5.3 Seller onboarding flow

Flow:

1. registration can set `is_seller`
2. backend can create a `SellerProfile` during registration
3. `/api/auth/seller-profile/` lets the seller edit store details
4. `/sell` in the frontend becomes the seller workspace

### 5.4 Listing lifecycle

Flow:

1. seller creates a listing through `/api/catalog/my-listings/`
2. listing becomes visible in browse APIs when `resale_status=active`
3. buyer adds listing to cart
4. checkout reserves the sale and decrements stock
5. sold-out listing becomes `reserved`
6. buyer receipt confirmation marks purchased listing `sold`

### 5.5 Escrow checkout flow

Current implemented flow:

1. buyer signs in
2. buyer checks out a cart containing listings from only one seller
3. backend calculates totals
4. backend creates `Order`, `OrderItem`, `Payment`, `EscrowTransaction`, and `OrderStatusHistory`
5. order status becomes `awaiting_shipment`
6. payment status becomes `escrow_held`
7. escrow status becomes `funded`
8. seller sees the order in seller order list
9. seller marks it shipped
10. escrow moves to `in_transit`
11. buyer either confirms receipt or opens a dispute
12. confirmed receipt releases escrow and completes the order

This is an internal demo escrow workflow, not a real banking or gateway integration yet.

## 6. Frontend Architecture

### 6.1 API client

Location: `frontend/src/api/client.js`

Purpose:

- centralize fetch calls
- attach token and guest session headers
- store returned `session_key`
- normalize backend errors

Important marketplace-specific methods already present:

- `getMyListings`
- `createListing`
- `updateListing`
- `deleteListing`
- `getSellerProfile`
- `saveSellerProfile`
- `getSellerOrders`
- `shipOrder`
- `confirmReceipt`
- `openDispute`

### 6.2 ShopContext

Location: `frontend/src/context/ShopContext.jsx`

This is the main frontend orchestration layer.

It owns:

- current user and token state
- home feed data
- cart
- wishlist
- orders
- flash notices and errors

Marketplace-specific behaviors already in the context:

- local fallback coupon uses `TRADENEST5`
- local fallback checkout creates escrow-shaped orders
- `confirmReceipt(orderNumber)` updates fallback or API orders
- `openDispute(orderNumber, reason)` updates fallback or API orders
- local add-to-cart enforces one seller per cart, matching backend behavior

### 6.3 Fallback data

Location: `frontend/src/data/fallbackStore.js`

Purpose:

- keep the UI usable without the backend
- provide sample listings, categories, seller profiles, and testimonials
- mirror the TradeNest marketplace concept in demo mode

This file is not authoritative backend state. If teammates change the marketplace direction, this file must usually be updated too so offline/demo mode stays consistent.

### 6.4 Routing and pages

Location: `frontend/src/App.jsx` and `frontend/src/pages/`

Page responsibilities:

- `HomePage`
  - marketplace hero, featured categories, listing highlights, seller trust messaging
- `ShopPage`
  - browse listings with search, price, brand, category, and condition filtering
- `ProductPage`
  - listing detail with gallery, seller block, condition notes, reviews, and related listings
- `CartPage`
  - escrow cart summary
- `CheckoutPage`
  - buyer address capture and escrow explanation
- `WishlistPage`
  - saved listings
- `AccountPage`
  - login/register when signed out, profile management and seller entry point when signed in
- `OrdersPage`
  - buyer order history with confirm receipt and dispute actions
- `SellPage`
  - seller workspace for profile editing, listing CRUD, and seller order actions
- `NotFoundPage`
  - fallback route

### 6.5 Reusable components

Main reusable pieces:

- `Header`
  - marketplace nav, search, badges, flash banner, escrow messaging
- `Footer`
  - newsletter and marketplace links
- `ProductCard`
  - reusable listing tile with seller and escrow cues
- `QuantityStepper`
  - quantity controls
- `Icons`
  - inline SVG icons

### 6.6 Styling

Location: `frontend/src/styles/app.css`

The app currently uses a single shared CSS file for layout, hero sections, cards, forms, checkout, listing detail, and seller workspace styling. This keeps handoff simple, but teammates can split styles by component later if the codebase grows.

## 7. Implemented Feature Inventory

Implemented today:

- custom Django user model
- token auth
- saved buyer addresses
- seller profile creation and editing
- seller verification flag and seller trust metadata
- category and brand browsing
- resale listings with condition and authenticity states
- product/listing gallery and optional variants
- related listings
- reviews
- homepage marketplace merchandising feed
- search and filter endpoint
- guest cart session support
- authenticated cart merge after login
- one seller per cart restriction
- wishlist
- recently viewed tracking
- coupon support
- escrow-style checkout
- buyer order history
- seller order list
- seller ship action
- buyer confirm receipt action
- escrow dispute action
- payment records
- escrow transaction records
- shipment model placeholder
- order status history
- newsletter capture
- Django admin registration for major entities
- responsive React marketplace UI
- local fallback/demo mode for frontend

## 8. Known Simplifications and Gaps

These are the main things teammates should know before extending the project:

- escrow is modeled, but payments are still mocked
- there is no real Stripe, Razorpay, PayPal, bank escrow, or webhook flow yet
- seller payout is represented as metadata only, not a real payout integration
- `Shipment` exists as a model, but seller shipment flow currently writes tracking on `Order` rather than creating rich shipment records
- there is no messaging system between buyer and seller yet
- there are no offers, bids, or negotiation flows yet
- there is no automated release timer for escrow after delivery
- cancellation, return, refund, and dispute-resolution workflows are only partially modeled
- email is console-backed in Django settings
- there is no automated test suite yet
- media uses URL fields rather than uploaded file storage
- custom app migrations are still generated during setup/evolution
- some frontend actions can succeed locally in fallback mode even when the backend is unavailable

## 9. Where to Change Things

### Rebrand copy or marketplace messaging

Edit:

- `frontend/src/components/Header.jsx`
- `frontend/src/components/Footer.jsx`
- `frontend/src/pages/HomePage.jsx`
- `frontend/src/data/fallbackStore.js`
- `README.md`

### Add a new listing field

Update in this order:

1. `backend/apps/catalog/models.py`
2. `backend/apps/catalog/serializers.py`
3. `backend/apps/catalog/admin.py`
4. `backend/apps/catalog/management/commands/seed_store.py`
5. seller form in `frontend/src/pages/SellPage.jsx`
6. browse/detail UI in `ShopPage.jsx`, `ProductPage.jsx`, or `ProductCard.jsx`

### Change escrow rules

Start here:

- `backend/apps/commerce/views.py`
- `backend/apps/commerce/models.py`
- `backend/apps/commerce/serializers.py`
- `frontend/src/pages/CheckoutPage.jsx`
- `frontend/src/pages/OrdersPage.jsx`
- `frontend/src/context/ShopContext.jsx`

Typical examples:

- allow multiple sellers per checkout
- add escrow expiration windows
- create moderation states
- add seller payout holds or fees

### Extend seller workspace

Main files:

- `frontend/src/pages/SellPage.jsx`
- `frontend/src/api/client.js`
- `backend/apps/accounts/views.py`
- `backend/apps/catalog/views.py`
- `backend/apps/commerce/views.py`

### Replace demo escrow with a real provider

Minimum starting points:

- `backend/apps/commerce/views.py` in `CheckoutView`
- `backend/apps/commerce/views.py` in `BuyerConfirmReceiptView`
- `backend/apps/commerce/views.py` in `OpenEscrowDisputeView`
- `backend/apps/commerce/models.py` for `Payment` and `EscrowTransaction`
- `frontend/src/pages/CheckoutPage.jsx`

Typical next work:

- create a real payment or escrow intent with the provider
- redirect or confirm payment on the frontend
- receive provider webhooks
- update `Payment.status`
- update `EscrowTransaction.status`
- update `Order.payment_status` and `Order.status`
- persist payout references from the provider

### Update fallback/demo mode

Edit:

- `frontend/src/data/fallbackStore.js`
- `frontend/src/context/ShopContext.jsx`

This is important whenever backend behavior changes, otherwise the frontend will show outdated demo behavior when the API is offline.

## 10. Recommended Next Enhancements

High-value next steps:

- commit real migrations after the schema stabilizes
- add backend unit and API tests
- add frontend component and flow tests
- wire live search suggestions into the header
- add image upload support instead of URL-only media
- add buyer-seller messaging
- add offer and negotiation flows
- add real escrow/payment gateway integration
- add seller verification workflow and moderation tools
- add richer shipment records and delivery confirmation logic
- replace demo payment logic with a gateway
- add inventory reservation and stock decrement on order
- build a true admin dashboard UI
- support promo banners and CMS-managed homepage sections
- add product uploads and media storage
- add return/refund workflows

## 11. Best Files to Read First

If a teammate only has a short onboarding window, start here:

- `backend/config/settings.py`
- `backend/config/urls.py`
- `backend/apps/accounts/models.py`
- `backend/apps/catalog/models.py`
- `backend/apps/catalog/views.py`
- `backend/apps/commerce/models.py`
- `backend/apps/commerce/services.py`
- `backend/apps/commerce/views.py`
- `frontend/src/App.jsx`
- `frontend/src/api/client.js`
- `frontend/src/context/ShopContext.jsx`
- `frontend/src/styles/app.css`

These files provide the clearest understanding of how data, routes, and UI state currently fit together.
