# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SMS (Saleh Management System) is a comprehensive business management system for retail operations, specifically designed for mobile phone inventory with IMEI-level tracking. It's a full-stack TypeScript application with Express.js backend, React frontend, and PostgreSQL database using Drizzle ORM.

## Development Commands

### Environment Setup
```bash
npm install
# Copy .env.example to .env and configure DATABASE_URL and SESSION_SECRET
npm run db:push  # Push schema changes to database
```

### Development
```bash
npm run dev      # Start dev server on port 5000 (runs tsx server/index.ts)
npm run check    # Type check with TypeScript compiler
```

### Build & Production
```bash
npm run build    # Build both client (Vite) and server (esbuild) to dist/
npm start        # Run production build from dist/index.cjs
```

### Database
```bash
npm run db:push  # Push Drizzle schema changes to PostgreSQL (uses drizzle-kit)
```

### Deployment
Deploy to Google Cloud Run with either:
```powershell
# PowerShell (Windows)
$env:GCP_PROJECT="sms-management-system-481511"
$env:GCP_REGION="us-central1"
$env:CLOUD_RUN_SERVICE="sms"
.\script\deploy-cloudrun.ps1
```
```bash
# Bash (macOS/Linux)
export GCP_PROJECT="sms-management-system-481511"
export GCP_REGION="us-central1"
export CLOUD_RUN_SERVICE="sms"
./script/deploy-cloudrun.sh
```

## Architecture

### Monorepo Structure

**client/** - React SPA with Vite
- `src/pages/` - Page components (dashboard, POS, sales, purchases, etc.)
- `src/components/` - Reusable UI components (shadcn/ui based)
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions
- Uses wouter for routing, TanStack Query for data fetching, React Hook Form with Zod validation

**server/** - Express.js API server
- `index.ts` - Server entry point with Express setup, sessions, static file serving
- `routes.ts` - All API route handlers (4,000+ lines - the main business logic)
- `storage.ts` - Database access layer abstracting Drizzle queries
- `auth.ts` - Passport.js authentication setup with local strategy
- `import.ts` - Excel file import parsers (XLSX)
- `db.ts` - Drizzle database connection
- `vite.ts` - Vite dev middleware for development
- `static.ts` - Static file serving for production

**shared/** - Code shared between client and server
- `schema.ts` - Drizzle database schema definitions and Zod validation schemas
- `permissions.ts` - Role-based permission definitions

### Database Schema Architecture

All tables use UUID primary keys with `gen_random_uuid()`. The schema follows these patterns:

**Core Entities:**
- `products` - Product catalog (brand, category, specifications)
- `items` - IMEI-level inventory tracking with status (available, sold, archived)
- `customers` & `suppliers` - Contact management with balance tracking
- `users` - Authentication with role-based permissions

**Transaction Entities:**
- `purchase_invoices` & `purchase_invoice_items` - Supplier purchases
- `sales` & `sale_items` - Customer sales
- `payments` - Payments/refunds for customers and suppliers
- `expenses` - Business expense tracking
- `cash_register_sessions` - Daily cash management

**Key Relationships:**
- Items link to products, purchases, and sales via foreign keys
- Purchases/sales link to suppliers/customers
- All monetary transactions link to cash register sessions
- Balance fields are denormalized but recomputed on transaction changes

### Critical Business Logic

**Balance Calculation System** (server/routes.ts):
- Customer balance = (unpaid sales) + (payments/refunds)
- Supplier balance = (unpaid purchases) - (payments/refunds)
- Balance recomputation functions: `computeCustomerBalanceCents()`, `computeSupplierBalanceCents()`
- Called after any sale, purchase, payment, or transaction deletion/update

**Transaction Safeguards:**
- Sales/purchases cannot be deleted if it would cause negative balances
- Items sold from a purchase prevent purchase deletion
- Sales and purchases require an open cash register session
- Inventory status transitions: available → sold (cannot reverse without deletion)

**IMEI Tracking Flow:**
1. Purchase invoice created → Items auto-generated with IMEIs
2. Items marked as "available" and linked to purchase/supplier
3. POS sale → Items marked as "sold" and linked to sale/customer
4. Items can be archived but not permanently deleted if sold

### Build Process (script/build.ts)

**Client Build:**
- Vite builds React app to `dist/public/`
- Path aliases: `@/` → client/src, `@shared/` → shared/, `@assets/` → attached_assets/

**Server Build:**
- esbuild bundles server/index.ts to `dist/index.cjs`
- Bundles select dependencies (listed in allowlist) to reduce cold start times
- Externalizes most dependencies for faster builds
- Minifies for production

### API Patterns

**Route Structure** (server/routes.ts):
- All routes prefixed with `/api/`
- RESTful conventions: GET (list/detail), POST (create), PATCH (update), DELETE
- Auth middleware: `requireAuth()` on all authenticated routes
- Permission checks: `requirePermission()` for role-based access

**Data Flow:**
1. Route handler validates request body with Zod schemas
2. Calls storage layer methods (IStorage interface)
3. Storage layer executes Drizzle queries
4. Balance recomputation if transaction affects balances
5. Returns JSON response

**Error Handling:**
- Validation errors return 400 with Zod error details
- Not found errors return 404
- Business logic violations return 400 with descriptive messages
- Server errors return 500

### Authentication & Sessions

- Passport.js with local strategy (username/password)
- Express sessions stored in PostgreSQL via connect-pg-simple
- Session cookie: secure in production, httpOnly, sameSite: lax
- Trust proxy enabled for Cloud Run deployment
- Roles: admin, manager, cashier, viewer (defined in shared/permissions.ts)

### Import/Export System

**Import Functionality** (server/import.ts):
- Excel file parsing with XLSX library
- Supported imports: customers, suppliers, products, sales, purchases, payments, expenses
- Each import type has dedicated parser function
- Row-by-row processing with error collection
- Validation with Zod schemas before database insertion

**Export:**
- Sales, purchases, payments exportable via API endpoints
- Excel file generation for reports

### Frontend State Management

- TanStack Query for server state (queries and mutations)
- React Hook Form for form state with Zod validation
- No global state management library (props/context where needed)
- Optimistic updates for better UX

### UI Component Architecture (design_guidelines.md)

**Design System:**
- Based on shadcn/ui (Radix UI primitives + Tailwind CSS)
- Typography: Inter font family
- Spacing: Tailwind units (2, 4, 6, 8, 12, 16)
- Layout: Sidebar navigation (desktop), responsive breakpoints

**Key UI Patterns:**
- Data tables with sorting, filtering, pagination
- Modal forms for create/edit operations
- Toast notifications for feedback
- Status badges for entity states
- Dashboard metrics cards
- POS split-view interface (products left, cart right)

### Development Practices

**Type Safety:**
- Shared types generated from Drizzle schema
- Zod schemas for runtime validation matching database schema
- Strict TypeScript configuration

**Code Organization:**
- Route handlers in server/routes.ts (may need refactoring into modules as it grows)
- Database queries abstracted in storage layer
- Business logic centralized in route handlers
- Client pages are self-contained with local components

**Monetary Values:**
- All amounts stored in cents (integers) to avoid floating-point issues
- Convert to dollars for display only
- Helper functions for formatting currency

### Path Aliases (vite.config.ts)

```typescript
"@" → client/src
"@shared" → shared
"@assets" → attached_assets
```

### Deployment Architecture

**Production Setup:**
- Single Cloud Run service serves both API and static frontend
- Express serves built client from `dist/public/`
- Neon PostgreSQL with pooled connection string
- Environment variables: `DATABASE_URL`, `SESSION_SECRET`, `PORT` (auto-set by Cloud Run)

**Git-based Deployments:**
- Deploy scripts tag images with git commit SHA
- Ensures each deployment is uniquely identifiable
- Prevents "old version" issues with revision management
