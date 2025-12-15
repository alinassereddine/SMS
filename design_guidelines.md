# SMS (Saleh Management System) - Design Guidelines

## Design Approach: Modern Enterprise System

**Selected Approach:** Design System (Productivity-focused)
**Inspiration:** Linear's clean data density + Notion's organization + modern SaaS dashboards
**Rationale:** Data-heavy business application requiring clarity, efficiency, and scalability across multiple complex modules

## Typography System

**Font Stack:**
- Primary: Inter (400, 500, 600, 700) via Google Fonts
- Monospace: JetBrains Mono (for IMEI codes, numbers)

**Hierarchy:**
- Page Titles: text-2xl font-semibold
- Section Headers: text-lg font-semibold
- Card Titles: text-base font-medium
- Body Text: text-sm font-normal
- Labels: text-xs font-medium uppercase tracking-wide
- Data/Metrics: text-3xl font-bold (dashboard stats)
- Table Headers: text-xs font-medium uppercase
- Table Data: text-sm font-normal
- IMEI/Codes: font-mono text-sm

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4, p-6
- Section spacing: space-y-6, space-y-8
- Card gaps: gap-4, gap-6
- Form fields: space-y-4
- Table cell padding: px-4 py-3

**Grid System:**
- Dashboard metrics: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
- Forms: Two-column layout (lg:grid-cols-2 gap-6)
- Product cards: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4
- Tables: Full-width with fixed columns for critical data

**Container Widths:**
- Main content: max-w-7xl mx-auto
- Forms: max-w-4xl
- Modals: max-w-2xl (standard), max-w-5xl (wide for invoices)

## Core Components

### Navigation
**Sidebar (Desktop):**
- Fixed left sidebar, w-64
- Logo at top (h-16 flex items-center px-6)
- Navigation items with icons (Heroicons) + labels
- Active state: left border indicator
- Grouped sections: Dashboard, Sales, Inventory, Purchases, Customers, Suppliers, Cash Register, Reports, Admin
- User profile at bottom with role badge

**Top Bar:**
- h-16 border-b
- Left: Menu toggle (mobile), breadcrumb navigation
- Right: Search, notifications, user menu
- Breadcrumbs: text-sm with separators (Home > Sales > Invoice #1234)

### Data Tables
**Standard Table:**
- Striped rows (alternate row treatment)
- Sticky header with sort indicators
- Row hover state
- Action column (right-aligned) with icon buttons
- Pagination at bottom (showing "1-20 of 156 items")
- Bulk selection with checkboxes (left column)
- Status badges (Available, Sold, Archived)
- Empty state with icon and "Add" CTA

**Filters:**
- Top row with search input, date range picker, status filter dropdowns
- "Clear all" link on right
- Active filters shown as dismissible chips below

### Forms
**Layout:**
- Two-column grid for related fields
- Full-width for text areas and complex inputs
- Field groups with subtle section dividers
- Labels above inputs (text-sm font-medium mb-1.5)
- Helper text below (text-xs)
- Error messages in error state below input

**Input Types:**
- Text inputs: h-10 rounded-md border px-3
- Select dropdowns: Native with custom arrow
- Date pickers: Calendar popover (Radix UI)
- Number inputs: Monospace font for amounts
- IMEI scanner: Input with scan icon button
- Multi-select: Pills with remove icons

**Actions:**
- Primary action: Right-aligned
- Secondary actions: Left-aligned or adjacent
- Cancel always available
- Loading states with spinner

### Cards

**Metric Cards (Dashboard):**
- Compact design (p-6)
- Icon in top-left corner (12x12 rounded)
- Label (text-xs uppercase tracking-wide)
- Large value (text-3xl font-bold)
- Trend indicator (+12.5% from last month, text-xs)

**Entity Cards (Products/Customers):**
- Image/avatar on left
- Title + metadata stacked
- Status badge in top-right
- Action dropdown (top-right corner)
- Footer with key metrics (Stock: 45, Sales: $12,340)

**Invoice/Sale Cards:**
- Header: Invoice number + date (flex justify-between)
- Customer/Supplier name with avatar
- Line items summary
- Payment status badge
- Total amount (prominent)
- Footer: Actions (View, Edit, Print)

### Modals & Dialogs
- Overlay with backdrop blur
- Slide-in from right for forms (w-full max-w-2xl)
- Centered for confirmations (max-w-md)
- Header with title + close button
- Scrollable content area
- Sticky footer with actions
- Keyboard shortcuts displayed (ESC to close)

### POS Interface
**Special Layout:**
- Split view: Product selection (left 60%) | Cart (right 40%)
- Product grid with large images, name, price
- Cart panel: Sticky top with line items, scrollable
- Bottom bar: Totals + payment buttons (large touch targets)
- IMEI scanner prominent at top
- Quick product search with autocomplete
- Customer selector dropdown at top of cart
- Payment method selector (cash/card/transfer) with large icons

### Cash Register Session
**Opening Flow:**
- Modal with opening balance input (large number pad)
- Current date/time display
- Opened by (user) shown
- Session number auto-generated

**Closing Flow:**
- Expected vs Actual balance comparison
- Difference highlighted if mismatch
- Notes field for discrepancies
- Session summary (total sales, payments, expenses)

### Dashboard Layout
**Top Row:**
- 4 metric cards (Total Sales, Profit, Inventory Value, Outstanding Balance)

**Charts Section:**
- 2-column grid
- Left: Sales trend (line chart, h-80)
- Right: Top products (bar chart, h-80)

**Recent Activity:**
- Mixed table showing recent sales, purchases, payments
- Type indicators with icons
- Quick action links

**Inventory Alerts:**
- List of low stock items with "Reorder" CTA

## Icons
**Library:** Heroicons (via CDN)
**Usage:**
- Navigation: 20x20 outline icons
- Action buttons: 16x16 outline icons
- Status indicators: 12x12 solid icons
- Metric cards: 24x24 outline icons
- Empty states: 48x48 outline icons

## Images
This is a business application - minimal imagery:
- User avatars: 32x32 rounded-full (navigation), 40x40 (profiles)
- Product images: 80x80 (cards), 200x200 (detail view), 64x64 (POS grid)
- Empty state illustrations: Simple line art, max 240x240
- Login page: Optional subtle pattern background

**No hero images** - this is a data-focused business app, not a marketing site.

## Responsive Behavior
- Mobile: Single column, bottom navigation, stacked forms
- Tablet: Collapsible sidebar, optimized tables
- Desktop: Full sidebar, multi-column layouts, expanded tables

## Status & Feedback
**Status Badges:**
- Pill shape (rounded-full px-2.5 py-0.5 text-xs font-medium)
- Available, Sold, Archived, Open, Closed, Paid, Unpaid, Partial

**Notifications:**
- Toast messages (top-right corner)
- Success, error, warning, info variants
- Auto-dismiss after 4s
- Action link if applicable

**Loading States:**
- Skeleton screens for tables/cards
- Spinner for button actions
- Progress bar for bulk operations