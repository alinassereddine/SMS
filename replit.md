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
- **Payments**: Payment records linked to customers or suppliers
- **Cash Register Sessions**: Daily cash management with opening/closing balances
- **Expenses**: Business expense tracking by category

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