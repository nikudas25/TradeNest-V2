# TradeNest Project Explanation

This document provides a comprehensive overview of the TradeNest project, a full-stack buying and reselling marketplace. It is designed to help AI assistants like ChatGPT understand the project's structure, dependencies, setup, and key components.

## Project Overview

TradeNest is a marketplace platform where independent sellers can publish resale listings, and buyers can browse, purchase, and manage orders through an escrow-style checkout flow. The application supports seller onboarding, product listings with authenticity and condition metadata, cart/wishlist functionality, and order management with states like shipment, confirmation, and disputes.

### Key Features
- Buyer authentication and profile management
- Seller onboarding with store details and escrow policies
- Resale listings with seller attribution, product condition, authenticity status
- Seller workspace for managing listings and orders
- Cart, wishlist, coupons, and order history
- Escrow-oriented checkout (one seller per cart)
- Responsive React UI with fallback demo data

## Technology Stack

### Backend
- **Framework**: Django 5.1+ with Django REST Framework 3.15+
- **Database**: MySQL 8.x (primary) or SQLite (fallback)
- **Authentication**: Token-based authentication via DRF
- **Other Libraries**:
  - django-cors-headers 4.4+ (for CORS support)
  - mysqlclient 2.2+ (MySQL driver)
  - Pillow 10.4+ (image handling)

### Frontend
- **Framework**: React 18.3+ with React Router DOM 6.30+
- **Build Tool**: Vite 5.4+
- **Styling**: Plain CSS (no framework)
- **State Management**: React Context (ShopContext)

### Infrastructure
- **Containerization**: Docker with Docker Compose
- **Database Service**: MySQL 8.4
- **Development Server**: Django dev server and Vite dev server

## Project Structure

```
TradeNest-V2/
├── docker-compose.yml          # Docker services configuration
├── README.md                   # Project overview and setup instructions
├── backend/                    # Django backend application
│   ├── Dockerfile              # Backend container configuration
│   ├── manage.py               # Django management script
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # Environment variables template
│   ├── config/                 # Django project settings
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── settings.py         # Main Django settings
│   │   ├── urls.py             # Root URL configuration
│   │   └── wsgi.py
│   ├── apps/                   # Django apps
│   │   ├── accounts/           # User management, auth, seller profiles
│   │   │   ├── models.py       # User, Address, SellerProfile models
│   │   │   ├── views.py        # Auth and profile API views
│   │   │   ├── serializers.py  # DRF serializers
│   │   │   ├── urls.py         # App URL patterns
│   │   │   └── migrations/     # Database migrations
│   │   ├── catalog/            # Product catalog, listings, reviews
│   │   │   ├── models.py       # Category, Brand, Product, Review models
│   │   │   ├── views.py        # Catalog API views
│   │   │   ├── serializers.py
│   │   │   ├── urls.py
│   │   │   ├── management/commands/seed_store.py  # Data seeding command
│   │   │   └── migrations/
│   │   └── commerce/           # E-commerce functionality
│   │       ├── models.py       # Cart, Order, Payment, Escrow models
│   │       ├── views.py        # Commerce API views
│   │       ├── serializers.py
│   │       ├── services.py     # Business logic services
│   │       ├── urls.py
│   │       └── migrations/
│   └── utils/                  # Shared utilities
│       └── models.py           # TimeStampedModel base class
├── frontend/                   # React frontend application
│   ├── Dockerfile              # Frontend container configuration
│   ├── index.html              # Main HTML template
│   ├── package.json            # Node.js dependencies and scripts
│   ├── vite.config.js          # Vite configuration
│   ├── .env.example            # Frontend environment variables
│   └── src/
│       ├── main.jsx            # React application entry point
│       ├── App.jsx             # Main App component with routing
│       ├── api/
│       │   └── client.js       # API client and auth utilities
│       ├── components/         # Reusable UI components
│       │   ├── Header.jsx      # Site header
│       │   ├── Footer.jsx      # Site footer
│       │   ├── ProductCard.jsx # Product listing card
│       │   ├── QuantityStepper.jsx # Quantity input component
│       │   └── SectionHeading.jsx # Section title component
│       ├── context/
│       │   └── ShopContext.jsx # Global state management
│       ├── data/
│       │   ├── fallbackStore.js # Demo data for offline mode
│       │   └── formatters.js    # Data formatting utilities
│       ├── pages/              # Page components
│       │   ├── HomePage.jsx    # Homepage
│       │   ├── ShopPage.jsx    # Product browsing
│       │   ├── ProductPage.jsx # Individual product details
│       │   ├── CartPage.jsx    # Shopping cart
│       │   ├── CheckoutPage.jsx # Checkout process
│       │   ├── AccountPage.jsx # User account management
│       │   ├── OrdersPage.jsx  # Order history
│       │   ├── WishlistPage.jsx # Wishlist management
│       │   ├── SellPage.jsx    # Seller workspace
│       │   └── NotFoundPage.jsx # 404 page
│       └── styles/
│           └── app.css         # Main stylesheet
└── docs/
    ├── TEAM_HANDOFF.md         # Detailed implementation notes
    └── PROJECT_EXPLANATION.md  # This file
```

## Dependencies

### Backend Dependencies (requirements.txt)
```
Django>=5.1,<5.3              # Web framework
djangorestframework>=3.15,<3.16  # REST API framework
django-cors-headers>=4.4,<4.5   # CORS support for frontend
mysqlclient>=2.2,<2.3          # MySQL database driver
Pillow>=10.4,<11.0             # Image processing
```

### Frontend Dependencies (package.json)
**Runtime Dependencies:**
```
react: ^18.3.1                 # UI framework
react-dom: ^18.3.1             # React DOM renderer
react-router-dom: ^6.30.1      # Client-side routing
```

**Development Dependencies:**
```
@vitejs/plugin-react: ^4.3.4   # React plugin for Vite
vite: ^5.4.10                 # Build tool and dev server
```

## Environment Configuration

### Backend Environment Variables (.env.example)
```
DJANGO_SECRET_KEY=change-me           # Django secret key
DJANGO_DEBUG=true                     # Debug mode
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost,0.0.0.0,backend
CORS_ALLOWED_ORIGINS=http://localhost:5173  # Frontend URL for CORS
CSRF_TRUSTED_ORIGINS=http://localhost:5173

DB_ENGINE=mysql                       # Database engine (mysql/sqlite)
DB_NAME=ecommerce_db                  # Database name
DB_USER=ecommerce_user                # Database user
DB_PASSWORD=ecommerce_password        # Database password
DB_HOST=mysql                         # Database host
DB_PORT=3306                          # Database port

DEFAULT_FROM_EMAIL=store@example.com  # Email sender
FRONTEND_BASE_URL=http://localhost:5173  # Frontend base URL
```

### Frontend Environment Variables (.env.example)
```
VITE_API_BASE_URL=http://localhost:8000/api  # Backend API base URL
```

## Setup and Installation

### Docker Setup (Recommended)
1. Ensure Docker and Docker Compose are installed
2. Run `docker compose up --build`
3. Access the application:
   - Frontend: http://localhost:5173
   - Backend Admin: http://localhost:8000/admin
   - Backend API: http://localhost:8000/api

The Docker setup automatically:
- Starts MySQL database
- Runs Django migrations
- Seeds demo data
- Starts Django and Vite dev servers

### Manual Backend Setup
1. Create and activate a Python virtual environment
2. Install dependencies: `pip install -r backend/requirements.txt`
3. Copy `backend/.env.example` to `backend/.env` and configure
4. Set up database (MySQL or use `DB_ENGINE=sqlite`)
5. Run migrations:
   ```bash
   cd backend
   python manage.py makemigrations accounts catalog commerce
   python manage.py migrate
   python manage.py seed_store
   python manage.py createsuperuser
   python manage.py runserver
   ```

### Manual Frontend Setup
1. Install Node.js 20+
2. Copy `frontend/.env.example` to `frontend/.env`
3. Install dependencies and start dev server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## API Structure

The backend provides REST APIs under `/api/` prefix:

- `/api/auth/` - Authentication, user profiles, addresses, seller profiles
- `/api/catalog/` - Product catalog, categories, brands, listings, reviews, search
- `/api/commerce/` - Cart, wishlist, checkout, orders, escrow, newsletter

## Key Models

### Accounts App
- **User**: Custom user model extending Django's AbstractUser
- **Address**: User shipping/billing addresses
- **SellerProfile**: Seller-specific information (store name, payout email, etc.)

### Catalog App
- **Category**: Product categories
- **Brand**: Product brands
- **Product**: Marketplace listings with condition, authenticity, seller info
- **Review**: Product reviews

### Commerce App
- **Cart**: Shopping cart items
- **Order**: Purchase orders with escrow status
- **Payment**: Payment records
- **Escrow**: Escrow management for seller payouts

## Frontend Architecture

- **Routing**: React Router for client-side navigation
- **State Management**: React Context (ShopContext) for global state
- **API Integration**: Centralized API client in `src/api/client.js`
- **Fallback Mode**: Frontend works with demo data when backend is unavailable
- **Styling**: Single CSS file with custom styles

## Development Notes

- The project uses token-based authentication
- Escrow is currently a demo implementation (not connected to real payment processors)
- Checkout requires buyer authentication and supports one seller per cart
- Database can fallback to SQLite for quick demos
- Frontend includes comprehensive fallback data for offline development
- Custom Django apps follow standard structure with models, views, serializers, URLs

## Seeded Data

The `seed_store` management command creates:
- Sample seller profiles
- Demo product listings
- Featured categories (sneakers, luxury bags, tech)
- Coupon code: `TRADENEST5`

This setup provides a complete marketplace environment for development and testing.