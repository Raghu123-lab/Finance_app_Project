import { Router, Request, Response } from 'express';
import { FinanceService } from '../services/financeService.js';
import { calculateLoan, generateSchedule } from '../services/loanCalculator.js';
import { getDb } from '../db/database.js';

const router = Router();

// Preview/Calculate loan calculations before saving
router.post('/calculate', (req: Request, res: Response) => {
  try {
    const {
      principalAmount,
      interestRate,
      interestType,
      ratePeriod,
      duration,
      durationUnit,
      repaymentFrequency,
      customInstallments,
      manualTotalInterest,
      manualTotalPayable,
      startDate,
    } = req.body;

    if (!principalAmount || Number(principalAmount) <= 0) {
      res.status(400).json({ success: false, error: 'Principal amount must be greater than zero.' });
      return;
    }

    const calcResult = calculateLoan({
      principalAmount: Number(principalAmount),
      interestRate: Number(interestRate) || 0,
      interestType: interestType || 'flat',
      ratePeriod: ratePeriod || 'per_month',
      duration: Number(duration) || 1,
      durationUnit: durationUnit || 'months',
      repaymentFrequency: repaymentFrequency || 'monthly',
      customInstallments: customInstallments ? Number(customInstallments) : undefined,
      manualTotalInterest: manualTotalInterest !== undefined ? Number(manualTotalInterest) : undefined,
      manualTotalPayable: manualTotalPayable !== undefined ? Number(manualTotalPayable) : undefined,
    });

    const dateStr = startDate || new Date().toISOString().slice(0, 10);
    const schedulePreview = generateSchedule(
      'PREVIEW',
      'CUSTOMER',
      calcResult.totalAmountPayable,
      calcResult.totalInstallments,
      dateStr,
      calcResult.repaymentFrequency
    );

    res.json({
      success: true,
      calculation: calcResult,
      schedule_preview: schedulePreview,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Create and record a new loan
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      customerId,
      principalAmount,
      interestRate,
      interestType,
      ratePeriod,
      duration,
      durationUnit,
      repaymentFrequency,
      customInstallments,
      manualTotalInterest,
      manualTotalPayable,
      dateGiven,
      notes,
    } = req.body;

    const result = FinanceService.createLoan({
      customerId,
      principalAmount: Number(principalAmount),
      interestRate: Number(interestRate) || 0,
      interestType: interestType || 'flat',
      ratePeriod: ratePeriod || 'per_month',
      duration: Number(duration) || 1,
      durationUnit: durationUnit || 'months',
      repaymentFrequency: repaymentFrequency || 'monthly',
      customInstallments: customInstallments ? Number(customInstallments) : undefined,
      manualTotalInterest: manualTotalInterest !== undefined ? Number(manualTotalInterest) : undefined,
      manualTotalPayable: manualTotalPayable !== undefined ? Number(manualTotalPayable) : undefined,
      dateGiven: dateGiven || new Date().toISOString().slice(0, 10),
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Loan recorded successfully with disbursement.',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get loan by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id) as any;
    if (!loan) {
      res.status(404).json({ success: false, error: 'Loan not found.' });
      return;
    }
    const installments = db.prepare('SELECT * FROM installments WHERE loan_id = ? ORDER BY installment_number ASC').all(id);
    const transactions = db.prepare('SELECT * FROM transactions WHERE loan_id = ? ORDER BY date ASC, created_at ASC').all(id);

    res.json({
      success: true,
      data: {
        ...loan,
        installments,
        transactions,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

