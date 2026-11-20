import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { getDb, getDbPath, resetDatabase, closeDb } from '../db/database.js';
import { FinanceService } from '../services/financeService.js';

const router = Router();
const upload = multer({ dest: path.resolve(process.cwd(), 'data', 'temp_uploads') });

/**
 * Download raw SQLite database file
 */
router.get('/download', (req: Request, res: Response) => {
  try {
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) {
      res.status(404).json({ success: false, error: 'Database file not found.' });
      return;
    }

    // Flush WAL checkpoint to ensure database file is completely up-to-date
    const db = getDb();
    try {
      db.exec('PRAGMA wal_checkpoint(FULL);');
    } catch (e) {
      // ignore
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `finance_backup_${timestamp}.sqlite`;
    res.download(dbPath, filename);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Restore SQLite database from uploaded file
 */
router.post('/restore', upload.single('backup_file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No backup file uploaded.' });
      return;
    }

    const uploadedPath = req.file.path;
    const targetDbPath = getDbPath();
    const backupOfCurrent = `${targetDbPath}.before_restore_${Date.now()}`;

    // 1. Close current DB
    closeDb();

    // 2. Backup existing db if present
    if (fs.existsSync(targetDbPath)) {
      fs.copyFileSync(targetDbPath, backupOfCurrent);
    }

    // 3. Move uploaded file to db path
    fs.copyFileSync(uploadedPath, targetDbPath);
    fs.unlinkSync(uploadedPath);

    // Also remove WAL & SHM files of old DB so new DB opens cleanly
    const walPath = `${targetDbPath}-wal`;
    const shmPath = `${targetDbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

    // 4. Verify by opening and checking tables
    try {
      const db = getDb();
      const test = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='customers'").get();
      if (!test) {
        throw new Error('Uploaded file is not a valid Finance App database (missing customers table).');
      }
    } catch (err: any) {
      // Revert if corrupt
      closeDb();
      if (fs.existsSync(backupOfCurrent)) {
        fs.copyFileSync(backupOfCurrent, targetDbPath);
        getDb();
      }
      res.status(400).json({ success: false, error: `Invalid database file: ${err.message}. Previous database restored.` });
      return;
    }

    res.json({ success: true, message: 'Database restored successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Export data to CSV
 */
router.get('/export/csv/:type', (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const db = getDb();

    if (type === 'customers') {
      const customers = FinanceService.getCustomers();
      const headers = ['Customer ID', 'Name', 'Phone', 'Address', 'Total Given (₹)', 'Total Received (₹)', 'Remaining Balance (₹)', 'Status', 'Registered Date'];
      const rows = customers.map((c) => [
        `"${c.id}"`,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.phone}"`,
        `"${c.address.replace(/"/g, '""')}"`,
        c.financial_summary.total_given,
        c.financial_summary.total_received,
        c.financial_summary.remaining_balance,
        `"${c.financial_summary.payment_status}"`,
        `"${c.created_at}"`,
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=customers_${new Date().toISOString().slice(0, 10)}.csv`);
      res.send(csv);
      return;
    }

    if (type === 'transactions') {
      const transactions = FinanceService.getTransactions();
      const headers = ['Transaction ID', 'Date', 'Type', 'Customer ID', 'Customer Name', 'Phone', 'Amount (₹)', 'Previous Balance (₹)', 'Updated Balance (₹)', 'Notes'];
      const rows = transactions.map((t) => [
        `"${t.id}"`,
        `"${t.date}"`,
        `"${t.type}"`,
        `"${t.customer_id}"`,
        `"${t.customer_name.replace(/"/g, '""')}"`,
        `"${t.customer_phone}"`,
        t.amount,
        t.previous_balance,
        t.updated_balance,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=transactions_${new Date().toISOString().slice(0, 10)}.csv`);
      res.send(csv);
      return;
    }

    if (type === 'loans') {
      const loans = db.prepare(`
        SELECT l.*, c.name as customer_name, c.phone as customer_phone
        FROM loans l
        JOIN customers c ON l.customer_id = c.id
        ORDER BY l.date_given DESC
      `).all() as any[];

      const headers = ['Loan ID', 'Customer ID', 'Customer Name', 'Principal Amount (₹)', 'Interest Rate (%)', 'Interest Type', 'Rate Period', 'Duration', 'Repayment Frequency', 'Total Installments', 'Total Interest (₹)', 'Total Amount Payable (₹)', 'Date Given', 'Status'];
      const rows = loans.map((l) => [
        `"${l.id}"`,
        `"${l.customer_id}"`,
        `"${l.customer_name.replace(/"/g, '""')}"`,
        l.principal_amount,
        l.interest_rate,
        `"${l.interest_type}"`,
        `"${l.rate_period}"`,
        `"${l.duration} ${l.duration_unit}"`,
        `"${l.repayment_frequency}"`,
        l.total_installments,
        l.total_interest,
        l.total_amount_payable,
        `"${l.date_given}"`,
        `"${l.status}"`,
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=loans_${new Date().toISOString().slice(0, 10)}.csv`);
      res.send(csv);
      return;
    }

    res.status(400).json({ success: false, error: 'Invalid export type. Use customers, transactions, or loans.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Seed realistic test data for verification
 */
router.post('/seed-test-data', (req: Request, res: Response) => {
  try {
    resetDatabase();

    const today = new Date();
    const formatDate = (offsetDays: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().slice(0, 10);
    };

    // 1. Create customers
    FinanceService.createCustomer({
      id: 'A001',
      name: 'Ramesh Sharma',
      address: 'Shop 14, Main Cloth Market, Hyderabad',
      phone: '9848012345',
      notes: 'Textile shop owner, regular borrower',
    });

    FinanceService.createCustomer({
      id: 'A002',
      name: 'Sunita Patel',
      address: 'Flat 202, Sai Residency, Ameerpet, Hyderabad',
      phone: '9848023456',
      notes: 'Boutique store owner',
    });

    FinanceService.createCustomer({
      id: 'B001',
      name: 'Mohammad Ali',
      address: 'House 4-1-88, Charminar Road, Hyderabad',
      phone: '9848034567',
      notes: 'Footwear retail merchant',
    });

    FinanceService.createCustomer({
      id: 'B002',
      name: 'K. Venkatesh',
      address: 'Plot 45, Industrial Estate, Kukatpally',
      phone: '9848045678',
      notes: 'Small hardware manufacturer',
    });

    FinanceService.createCustomer({
      id: 'C105',
      name: 'Pooja Reddy',
      address: 'Plot 89, Phase 2, Jubilee Hills, Hyderabad',
      phone: '9848056789',
      notes: 'Bakery chain franchisee',
    });

    // 2. Loans & Repayments
    // Customer A001: ₹50,000 for 10 weeks, weekly repayment @ 2% per month
    const l1 = FinanceService.createLoan({
      customerId: 'A001',
      principalAmount: 50000,
      interestRate: 2,
      interestType: 'simple',
      ratePeriod: 'per_month',
      duration: 10,
      durationUnit: 'weeks',
      repaymentFrequency: 'weekly',
      dateGiven: formatDate(-21), // 3 weeks ago
      notes: 'Inventory purchase financing',
    });

    // Repayments for A001
    FinanceService.recordRepayment({
      customerId: 'A001',
      loanId: l1.loan.id,
      amount: 5250,
      date: formatDate(-14),
      notes: 'Week 1 installment received in cash',
    });

    FinanceService.recordRepayment({
      customerId: 'A001',
      loanId: l1.loan.id,
      amount: 5250,
      date: formatDate(-7),
      notes: 'Week 2 installment received',
    });

    FinanceService.recordRepayment({
      customerId: 'A001',
      loanId: l1.loan.id,
      amount: 2500, // Partial payment today
      date: formatDate(0),
      notes: 'Week 3 partial payment received today',
    });

    // Customer A002: Daily loan ₹15,000 for 30 days @ 3% per month
    const l2 = FinanceService.createLoan({
      customerId: 'A002',
      principalAmount: 15000,
      interestRate: 3,
      interestType: 'simple',
      ratePeriod: 'per_month',
      duration: 30,
      durationUnit: 'days',
      repaymentFrequency: 'daily',
      dateGiven: formatDate(-10),
      notes: 'Daily market collection scheme',
    });

    for (let i = 9; i >= 1; i--) {
      FinanceService.recordRepayment({
        customerId: 'A002',
        loanId: l2.loan.id,
        amount: 515,
        date: formatDate(-i),
        notes: `Day ${10 - i} daily collection`,
      });
    }
    // And today's collection
    FinanceService.recordRepayment({
      customerId: 'A002',
      loanId: l2.loan.id,
      amount: 515,
      date: formatDate(0),
      notes: 'Today collection',
    });

    // Customer B001: Flat interest loan ₹100,000 given today
    FinanceService.createLoan({
      customerId: 'B001',
      principalAmount: 100000,
      interestRate: 5,
      interestType: 'flat',
      ratePeriod: 'flat_total',
      duration: 6,
      durationUnit: 'months',
      repaymentFrequency: 'monthly',
      dateGiven: formatDate(0), // Today
      notes: 'Festival seasonal expansion',
    });

    // Customer B002: Loan of ₹30,000 given 14 days ago, fully paid!
    const l4 = FinanceService.createLoan({
      customerId: 'B002',
      principalAmount: 30000,
      interestRate: 2,
      interestType: 'simple',
      ratePeriod: 'per_month',
      duration: 2,
      durationUnit: 'weeks',
      repaymentFrequency: 'weekly',
      dateGiven: formatDate(-14),
      notes: 'Urgent machinery maintenance',
    });

    FinanceService.recordRepayment({
      customerId: 'B002',
      loanId: l4.loan.id,
      amount: 15150,
      date: formatDate(-7),
      notes: 'Installment 1',
    });
    FinanceService.recordRepayment({
      customerId: 'B002',
      loanId: l4.loan.id,
      amount: 15150,
      date: formatDate(-1),
      notes: 'Installment 2 - Full settlement',
    });

    // Customer C105: Loan given 5 days ago, overdue installment
    FinanceService.createLoan({
      customerId: 'C105',
      principalAmount: 20000,
      interestRate: 2.5,
      interestType: 'simple',
      ratePeriod: 'per_month',
      duration: 4,
      durationUnit: 'weeks',
      repaymentFrequency: 'weekly',
      dateGiven: formatDate(-10),
      notes: 'Equipment procurement',
    });

    res.json({
      success: true,
      message: 'Realistic demo test data loaded successfully! All features are populated for verification.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Reset database to completely empty production state
 */
router.post('/reset', (req: Request, res: Response) => {
  try {
    resetDatabase();
    res.json({
      success: true,
      message: 'Database has been reset to an empty, clean production state.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

