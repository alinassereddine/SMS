# SMS (Saleh Management System)

A comprehensive business management system for retail operations, specifically designed for mobile phone inventory with IMEI-level tracking.

## Features

### Core Functionality
- **Point of Sale (POS)**: Create sales with real-time inventory updates
- **Inventory Management**: Track individual items by IMEI with status tracking (available, sold, reserved, archived)
- **Purchase Management**: Record supplier purchases and automatically create inventory items
- **Customer Management**: Track customer information, balances, and transaction history
- **Supplier Management**: Track supplier information, balances, and purchase history
- **Payment Processing**: Record payments and refunds for both customers and suppliers
- **Cash Register**: Manage daily cash sessions with opening/closing balances

### Business Features
- **Balance Tracking**: Real-time balance calculations for customers and suppliers
- **Multi-Currency Support**: Configure multiple currencies with exchange rates
- **Expense Tracking**: Record business expenses by category
- **Soft Delete/Archive**: Archive records instead of permanent deletion for data integrity
- **Detailed Ledger**: View chronological transaction history for customers and suppliers
- **Date Editing**: Edit dates on sales, purchases, payments, and cash register sessions

### Data Integrity
- **Transaction Safeguards**: Deletion blocked when it would cause negative balances
- **Inventory Protection**: Items sold from a purchase prevent purchase deletion
- **Cash Register Enforcement**: Sales and purchases require an open cash register session
- **Balance Reconciliation**: Automatic balance updates when transactions are modified

## Technology Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- shadcn/ui component library
- TanStack React Query for data fetching
- React Hook Form with Zod validation
- Wouter for routing

### Backend
- Express.js with TypeScript
- Drizzle ORM with PostgreSQL
- RESTful API design
- Session-based authentication

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```
   DATABASE_URL=postgresql://...
   SESSION_SECRET=your-secret-key
   ```
   For local development you can copy `.env.example` to `.env` and fill in values.
4. Run database migrations:
   ```bash
   npm run db:push
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## Deploy (Single Cloud Run Service + Neon Postgres)

This repo already serves the built frontend from the Express server in production, so you can deploy **one** Cloud Run service that hosts both the API and the static frontend.

### 1) Create Neon DB (pooled connection string)
- Create a Neon project/database.
- Copy the **pooled/transaction** connection string and use it as `DATABASE_URL` (this helps avoid connection spikes when Cloud Run scales).

### 2) Build & deploy to Cloud Run

This repo includes a `Dockerfile` that builds the client + server and runs `dist/index.cjs`.

Recommended: deploy with a unique image tag (git SHA) every time. This avoids “old version” issues that happen when redeploying the same tag or accidentally routing traffic to an older revision.

#### Option A: Deploy from your terminal (recommended)

PowerShell (Windows):
```powershell
$env:GCP_PROJECT="sms-management-system-481511"
$env:GCP_REGION="us-central1"
$env:CLOUD_RUN_SERVICE="sms"
.\script\deploy-cloudrun.ps1
```

Bash (macOS/Linux):
```bash
export GCP_PROJECT="sms-management-system-481511"
export GCP_REGION="us-central1"
export CLOUD_RUN_SERVICE="sms"
./script/deploy-cloudrun.sh
```

Both scripts:
- build a new image tagged with your current git commit SHA
- deploy a new Cloud Run revision using that image
- (optionally) use `-NoTraffic` (PowerShell) or `NO_TRAFFIC=1` (bash) for a canary deploy

#### Option B: Manual commands (same idea)

```bash
PROJECT_ID="sms-management-system-481511"
REGION="us-central1"
SERVICE="sms"
TAG="$(git rev-parse --short HEAD)"
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/$SERVICE:$TAG"

gcloud config set project "$PROJECT_ID"
gcloud builds submit --tag "$IMAGE"
gcloud run deploy "$SERVICE" --image "$IMAGE" --region "$REGION" --platform managed
```

#### If Cloud Run still shows an old version
- Ensure the newest revision has **100% traffic** (Cloud Run → Service → Revisions).
- Ensure the revision’s **image digest** matches the image you just built (Artifact Registry → the tag/digest).

Set Cloud Run environment variables:
- `DATABASE_URL` = Neon pooled connection string
- `SESSION_SECRET` = long random string
- (Cloud Run provides `PORT=8080` automatically)

Notes:
- `server/index.ts` sets `app.set("trust proxy", 1)` so `cookie.secure: true` sessions work correctly behind Cloud Run’s proxy.

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
├── server/                 # Backend Express application
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Database access layer
│   └── index.ts            # Server entry point
├── shared/                 # Shared code between frontend and backend
│   └── schema.ts           # Database schema and types
└── migrations/             # Database migrations
```

## API Endpoints

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create a product
- `PATCH /api/products/:id` - Update a product
- `DELETE /api/products/:id` - Delete a product

### Items (Inventory)
- `GET /api/items` - List all inventory items
- `GET /api/items/:id` - Get item details

### Customers
- `GET /api/customers` - List all customers
- `GET /api/customers/:id/summary` - Get customer with transaction history
- `POST /api/customers` - Create a customer
- `PATCH /api/customers/:id` - Update a customer
- `DELETE /api/customers/:id` - Archive a customer

### Suppliers
- `GET /api/suppliers` - List all suppliers
- `GET /api/suppliers/:id/summary` - Get supplier with transaction history
- `POST /api/suppliers` - Create a supplier
- `PATCH /api/suppliers/:id` - Update a supplier
- `DELETE /api/suppliers/:id` - Archive a supplier

### Sales
- `GET /api/sales` - List all sales
- `POST /api/sales` - Create a sale
- `PATCH /api/sales/:id` - Update a sale
- `DELETE /api/sales/:id` - Delete a sale (with safeguards)

### Purchases
- `GET /api/purchases` - List all purchase invoices
- `POST /api/purchases` - Create a purchase invoice
- `PATCH /api/purchases/:id` - Update a purchase invoice
- `DELETE /api/purchases/:id` - Delete a purchase (with safeguards)

### Payments
- `GET /api/payments` - List all payments
- `POST /api/payments` - Record a payment
- `PATCH /api/payments/:id` - Update a payment

### Cash Register
- `GET /api/cash-register` - List all sessions
- `GET /api/cash-register/active` - Get active session
- `POST /api/cash-register` - Open a new session
- `POST /api/cash-register/:id/close` - Close a session
- `PATCH /api/cash-register/:id/date` - Edit session date

## License

MIT License
