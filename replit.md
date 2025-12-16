# SMS (Saleh Management System)

## Overview

SMS is a comprehensive business management system for retail operations, specifically designed for mobile phone inventory with IMEI-level tracking. It provides point-of-sale functionality, inventory management, purchase/sales tracking, customer and supplier management, payment processing, and cash register operations.

The application follows a modern full-stack architecture with a React frontend, Express backend, and PostgreSQL database. It emphasizes data integrity through ACID transactions, making it suitable for financial operations where balance calculations and transaction consistency are critical.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite with HMR support

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints under `/api/*` prefix
- **Server**: HTTP server with Vite dev middleware in development, static file serving in production
- **Build**: esbuild for server bundling with selective dependency bundling

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Centralized in `shared/schema.ts` with Drizzle-Zod integration for validation
- **Migrations**: Drizzle Kit for database migrations (`migrations/` directory)

### Key Design Patterns
- **Shared Types**: Schema definitions in `shared/` directory are used by both frontend and backend
- **Path Aliases**: `@/` for client source, `@shared/` for shared code
- **Component Structure**: Reusable UI components in `components/ui/`, feature components in `components/`
- **Page Organization**: One file per route in `pages/` directory

### Core Business Entities
- **Products**: Catalog items with brand, category, specifications
- **Items**: Individual inventory units with IMEI tracking, purchase/sale lifecycle
- **Customers/Suppliers**: Contact management with balance tracking
- **Sales/Purchases**: Transaction records with line items
- **Payments**: Payment and refund records linked to customers or suppliers with transaction type tracking
- **Cash Register Sessions**: Daily cash management with opening/closing balances
- **Expenses**: Business expense tracking by category
- **Currencies**: Multi-currency support with exchange rate management

### Business Rules & Data Integrity

#### Inventory Management
- Inventory items are managed exclusively through purchase invoices - no direct add/edit/delete from inventory page
- Each item tracks IMEI, status (available, sold, reserved, archived), and links back to purchase invoice

#### Transaction Requirements
- All sales and purchases require an open cash register session
- Cash register must be opened before creating transactions

#### Payment Types
- **Payment**: Money flowing in normal direction (customer pays us, we pay supplier)
- **Refund**: Money flowing in reverse direction (we refund customer, supplier refunds us)
- Balance adjustments are calculated based on transaction type

#### Deletion Safeguards
- **Purchase Invoice Delete**: 
  - Blocked if any items from the purchase have been sold
  - Blocked if supplier balance would go negative (indicating payments were made)
  - Deletes associated inventory items and reverses supplier balance
  
- **Sale Delete**:
  - Blocked if linked to a closed cash register session
  - Blocked if customer balance would go negative (indicating payments were made)
  - Returns items to "available" status and reverses customer balance

#### Date Editing
- Sales, purchases, payments, and cash register sessions all support date editing
- Payment amount changes automatically adjust entity balances

### Multi-Currency Support
The system supports multiple currencies with exchange rate conversion:
- **Currency Schema**: `currencies` table with code, name, symbol, exchangeRate (fixed-point 10000 = 1.0), decimals, isDefault
- **Exchange Rates**: Stored as integers scaled by 10000 (e.g., USD=10000, EUR=11000 means 1 EUR = 1.10 USD)
- **CurrencyProvider**: React context providing `formatCurrency(cents)` and `convertCurrency(cents, fromCode, toCode)`
- **Conversion Logic**: `result = cents * toCurrency.exchangeRate / fromCurrency.exchangeRate`
- **Settings Page**: Currency tab for CRUD operations on currencies, including setting default currency

### Archive Management
- Soft delete (archive) for customers, suppliers, sales, and purchases
- Archive tab in Settings page shows all archived records
- Restore functionality to bring archived records back
- Hard delete option for permanent removal

### Balance Ledger
- Chronological view of all transactions affecting entity balances
- Customer ledger: Sales (debit), Payments (credit), Refunds (debit)
- Supplier ledger: Purchases (debit), Payments (credit), Refunds (credit)
- Running balance calculation with proper sign indicators

## External Dependencies

### Database
- **PostgreSQL**: Primary database, required via `DATABASE_URL` environment variable
- **connect-pg-simple**: PostgreSQL session storage for Express sessions

### UI/Component Libraries
- **Radix UI**: Full suite of accessible, unstyled primitives (dialog, dropdown, select, etc.)
- **shadcn/ui**: Pre-built component patterns using Radix + Tailwind
- **Recharts**: Data visualization for dashboard charts
- **Embla Carousel**: Carousel component
- **cmdk**: Command palette component
- **Vaul**: Drawer component

### Form & Validation
- **React Hook Form**: Form state management
- **Zod**: Schema validation (shared between frontend and backend)
- **@hookform/resolvers**: Zod resolver for React Hook Form
- **drizzle-zod**: Auto-generate Zod schemas from Drizzle tables

### Utilities
- **date-fns**: Date formatting and manipulation
- **class-variance-authority**: Component variant management
- **clsx/tailwind-merge**: Conditional className utilities
- **nanoid**: Unique ID generation

### Development Tools
- **Vite**: Frontend build and development server
- **tsx**: TypeScript execution for Node.js
- **drizzle-kit**: Database migration tooling
- **@replit/vite-plugin-***: Replit-specific development enhancements

## Key Files

### Schema and Types
- `shared/schema.ts` - Database schema definitions and Zod validation schemas
- `shared/types.ts` - Additional TypeScript type definitions

### Backend
- `server/routes.ts` - All API route definitions
- `server/storage.ts` - Database access layer (IStorage interface and implementation)
- `server/index.ts` - Server entry point

### Frontend Pages
- `client/src/pages/dashboard.tsx` - Main dashboard
- `client/src/pages/products.tsx` - Product catalog management
- `client/src/pages/inventory.tsx` - Inventory item listing
- `client/src/pages/customers.tsx` - Customer management
- `client/src/pages/customer-details.tsx` - Customer detail view with ledger
- `client/src/pages/suppliers.tsx` - Supplier management
- `client/src/pages/supplier-details.tsx` - Supplier detail view with ledger
- `client/src/pages/sales.tsx` - Sales management
- `client/src/pages/purchases.tsx` - Purchase invoice management
- `client/src/pages/payments.tsx` - Payment recording
- `client/src/pages/cash-register.tsx` - Cash register session management
- `client/src/pages/settings.tsx` - App settings and archive management
