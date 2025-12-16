# Product Requirements Document (PRD)
# SMS - Saleh Management System

## Executive Summary

SMS is a comprehensive business management system designed for retail operations with a focus on mobile phone inventory. The system provides complete IMEI-level tracking, point-of-sale functionality, and financial management capabilities suitable for small to medium retail businesses.

## Product Vision

To provide an intuitive, reliable, and comprehensive inventory and sales management solution that ensures data integrity and simplifies daily business operations for mobile phone retailers.

## Target Users

- Small to medium mobile phone retail businesses
- Electronics retailers requiring IMEI tracking
- Business owners who need real-time inventory and financial tracking

## Core Features

### 1. Product Catalog Management
**Description**: Maintain a catalog of products with detailed specifications.

**Requirements**:
- Create, edit, and archive products
- Track brand, category, model, and specifications
- Support for product images (future)
- Product search and filtering

### 2. Inventory Management with IMEI Tracking
**Description**: Track individual items by unique IMEI numbers throughout their lifecycle.

**Requirements**:
- Each item has a unique IMEI
- Items linked to purchase invoices (source)
- Status tracking: available, sold, reserved, archived
- Items cannot be directly added - only through purchase invoices
- Automatic status updates on sale/return

### 3. Customer Management
**Description**: Maintain customer records with balance tracking and transaction history.

**Requirements**:
- Customer profile with contact information
- Real-time balance tracking
- Transaction ledger showing sales and payments
- Support for both walk-in and registered customers
- Soft delete (archive) capability
- Restoration from archive

### 4. Supplier Management
**Description**: Maintain supplier records with balance tracking and purchase history.

**Requirements**:
- Supplier profile with contact information
- Real-time balance tracking (what we owe)
- Purchase history and payment ledger
- Soft delete (archive) capability
- Restoration from archive

### 5. Sales Processing
**Description**: Create and manage sales transactions with inventory integration.

**Requirements**:
- Create sales with one or more items
- Support for discounts
- Multiple payment methods (cash, card, transfer, check)
- Partial payment support with balance tracking
- Automatic inventory status updates
- Edit sales (customer, items, amounts, date)
- Delete sales with balance reversal
- Requires open cash register session

**Business Rules**:
- Cannot delete sale if customer balance would go negative
- Cannot delete sale linked to closed cash register session
- Deleting sale returns items to "available" status

### 6. Purchase Invoice Management
**Description**: Record purchases from suppliers and automatically create inventory.

**Requirements**:
- Create purchase invoices with multiple items
- Each item requires IMEI for tracking
- Automatic inventory item creation
- Support for discounts and partial payments
- Edit purchases (supplier, items, amounts, date)
- Delete purchases with inventory cleanup

**Business Rules**:
- Cannot delete if any items have been sold
- Cannot delete if supplier balance would go negative
- Deletion removes associated inventory items

### 7. Payment Processing
**Description**: Record payments and refunds for customers and suppliers.

**Requirements**:
- Support for payments and refunds
- Multiple payment methods
- Link to cash register session
- Reference number tracking
- Edit payment details (date, amount, method, reference, notes)
- Automatic balance updates on modification

**Payment Flow**:
- Customer payment: reduces customer balance
- Customer refund: increases customer balance
- Supplier payment: reduces our debt to supplier
- Supplier refund: credited back to us

### 8. Cash Register Sessions
**Description**: Manage daily cash sessions with balance tracking.

**Requirements**:
- Open session with opening balance
- Track all cash transactions during session
- Calculate expected closing balance
- Record actual closing balance and discrepancy
- Session notes for discrepancy explanation
- Edit session opening date
- Only one active session at a time

### 9. Balance Breakdown / Ledger
**Description**: Chronological view of all transactions affecting entity balances.

**Requirements**:
- Show date, description, debit, credit, running balance
- Distinguish between sales/purchases and payments
- Show payment type (Payment vs Refund) in description
- Proper sign indicators for transaction direction

### 10. Archive Management
**Description**: Manage archived (soft-deleted) records.

**Requirements**:
- View archived customers, suppliers, sales, purchases
- Restore archived records
- Permanently delete archived records (hard delete)
- Accessible from Settings page

### 11. Multi-Currency Support
**Description**: Support multiple currencies with exchange rate management.

**Requirements**:
- Define currencies with symbol and decimal places
- Set exchange rates relative to base currency
- Set default currency
- Currency conversion for display

### 12. Expense Tracking
**Description**: Record and categorize business expenses.

**Requirements**:
- Record expenses with category and amount
- Link to cash register session
- Date and note tracking

## Data Integrity Requirements

### Balance Consistency
- All balance updates must be atomic
- Payment/refund modifications must adjust entity balances
- Deletion safeguards prevent negative balances

### Transaction Safety
- Sales and purchases require open cash register
- Closed sessions are immutable
- Sold items cannot be removed from inventory

### Audit Trail
- All transactions maintain date records
- Dates can be edited for correction purposes
- Balance ledger provides full history

## Technical Requirements

### Performance
- Page load time < 2 seconds
- Real-time inventory updates
- Support for 10,000+ items

### Security
- Session-based authentication
- Role-based permissions
- Secure password storage

### Reliability
- PostgreSQL for data persistence
- Automatic data validation
- Graceful error handling

## Future Enhancements

1. **Reporting Dashboard**: Sales reports, profit analysis, inventory reports
2. **Barcode/QR Scanning**: Quick item lookup by scanning
3. **Multi-location Support**: Track inventory across multiple stores
4. **User Management**: Multiple users with role-based access
5. **Export/Import**: Data export to Excel, import from spreadsheets
6. **Print Receipts**: Generate printable receipts and invoices
7. **SMS/Email Notifications**: Customer payment reminders
8. **Mobile App**: Companion mobile application

## Success Metrics

- Zero data integrity issues
- All transactions properly tracked
- Accurate balance calculations
- Intuitive user experience
- Fast daily operations

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial release with core features |
| 1.1 | Dec 2025 | Added payment/refund transaction types |
| 1.2 | Dec 2025 | Added date editing for all transaction types |
| 1.3 | Dec 2025 | Fixed balance breakdown ledger signs |
