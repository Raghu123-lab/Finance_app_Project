# Local Personal Finance & Lending Management Application

A secure, offline-first, local personal finance management application built specifically for managing lending operations, customer loan accounts, installment tracking, and payment records.

---

## 🌟 Key Capabilities & Features

1. **Offline-First & 100% Local**:
   - Zero cloud dependency (no Firebase, Supabase, or external server telemetry).
   - Powered by a local SQLite database (`data/finance.db`) running with WAL mode and foreign key enforcement.
   - All amounts rendered in Indian Rupees (**₹**) using standard Indian numbering formatting.

2. **Customer Registration & Verification**:
   - **Customer ID**: Manually entered by user (e.g. `A001`, `A002`, `B001`, `C105`).
   - Format enforced: exactly one uppercase English letter followed by one or more digits (`^[A-Z][0-9]+$`). Lowercase characters are automatically converted to uppercase.
   - Unique ID check before saving with real-time feedback.
   - **Mobile Number**: Strictly unique across customers. Existing customer phone numbers can be selected for multiple loans without duplicate profile creation.

3. **Transparent Financial Calculations**:
   - Principal amount, interest rate (%), interest method (Simple / Flat / Manual total repayment).
   - Rate period selection: `% Per Month`, `% Per Annum`, or `% Flat Total`.
   - Repayment frequencies: `Daily`, `Weekly`, `Monthly`.
   - Installment schedule generated with exact paisa/cent rounding balance on the final installment.
   - Accurate formula: **Remaining Balance = Total Amount Payable - Total Amount Received**.
   - Partial payments supported: Partial repayments are shown separately and are **not** counted as completed installments until paid in full.

4. **Instant Customer ID Search & Comprehensive History**:
   - Global search bar (keyboard shortcut: `Cmd+K` or `Ctrl+K`) for instant jump by Customer ID (e.g. `A001`), name, or phone.
   - Complete customer profile: Financial overview, active loan agreements, expandable installment breakdown, and chronological transaction ledger.

5. **Daily & Weekly Sections**:
   - **Daily Section**: Total money given today, total money received today, net cash flow today (`Received - Given`), separate Given and Received lists, date picker for historical records, printable daily sheet, and CSV export.
   - **Weekly Section**: Monday to Sunday week range picker, summary cards, Given vs. Received bar comparison chart, and weekly ledger table.

6. **Controlled Audit Correction**:
   - Permanent audit history (`transaction_audit_logs`).
   - Any correction to a transaction requires a mandatory audit reason.
   - Editing recalculates running customer balances and updates installment statuses transactionally.

7. **Local Security & Backup**:
   - Configurable 4-6 digit local security PIN protection.
   - Complete `.sqlite` database backup download.
   - Safe restore from backup with automatic integrity check and fallback.
   - CSV exports for Customers, Transactions, and Loan Agreements.
   - One-click "Load Demo Test Data" and "Reset Database" for testing or fresh production setup.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v20+ or v22+ / v24+) and npm installed on your device.

### Installation
Dependencies are already installed. To reinstall anytime:
```bash
npm run install:all
```

### Running the Application

You can run the application in two ways:

#### Option 1: Production Mode (Recommended — Unified Server)
Runs both the backend API and serves the frontend on a single local port:
```bash
npm start
```
Open **`http://localhost:5001`** in your browser.

#### Option 2: Development Mode (Hot-Reload)
Runs the Vite React frontend with hot reloading on port 3000 and the Express API on port 5001:
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🧪 Testing

Run the automated backend test suite:
```bash
npm run test:api
```
Tests verified:
- Customer ID format validation (`^[A-Z][0-9]+$`).
- Duplicate Customer ID rejection.
- Duplicate Mobile Number rejection.
- Loan calculation formulas (Simple interest, flat interest, manual total).
- Automatic disbursement transaction generation.
- Repayment recording and balance recalculation.
- Partial payment handling and installment completion rules.
- Multiple payments on the same date.
- Transaction correction with audit history logging.
- Daily and weekly aggregate report calculations.

---

## 📂 Project Structure

```text
Finance_app_Project/
├── package.json              # Root build & start scripts
├── server/                   # Backend Express & SQLite engine
│   ├── src/
│   │   ├── index.ts          # Express API server & static client hosting
│   │   ├── db/
│   │   │   ├── database.ts   # SQLite connection & transaction helpers
│   │   │   └── schema.sql    # Relational tables & indexes
│   │   ├── routes/
│   │   │   ├── auth.ts       # PIN protection routes
│   │   │   ├── customers.ts  # Customer registration & profiles
│   │   │   ├── loans.ts      # Loan creation & calculation preview
│   │   │   ├── transactions.ts # Disbursements, repayments, & audit logs
│   │   │   ├── reports.ts    # Dashboard, daily, & weekly reports
│   │   │   └── backup.ts     # DB export, restore, CSVs, seed & reset
│   │   ├── services/
│   │   │   ├── financeService.ts # Core accounting business logic
│   │   │   └── loanCalculator.ts # Loan terms & installment schedule engine
│   │   └── types/            # TypeScript data models
│   ├── test/                 # Automated test suite
│   └── data/                 # Local SQLite database directory (finance.db)
└── client/                   # Frontend React + TypeScript + Tailwind
    ├── src/
    │   ├── App.tsx           # Page router & auth gate
    │   ├── components/       # Modals, layout, search, keypad
    │   ├── context/          # Auth & PIN context
    │   ├── pages/            # Dashboard, Customers, Daily, Weekly, Ledger, Settings
    │   ├── services/api.ts   # Typed API client
    │   └── utils/            # Currency (₹) & date formatters
    └── dist/                 # Production-built bundle
```

