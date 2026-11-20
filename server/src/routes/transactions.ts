import { Router, Request, Response } from 'express';
import { FinanceService } from '../services/financeService.js';

const router = Router();

// Get transactions with filters
router.get('/', (req: Request, res: Response) => {
  try {
    const { date, startDate, endDate, type, customerId, search } = req.query;
    const transactions = FinanceService.getTransactions({
      date: date as string,
      startDate: startDate as string,
      endDate: endDate as string,
      type: type as any,
      customerId: customerId as string,
      search: search as string,
    });
    res.json({ success: true, count: transactions.length, data: transactions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Record customer repayment
router.post('/repayment', (req: Request, res: Response) => {
  try {
    const { customerId, loanId, amount, date, paymentMethod, notes } = req.body;
    const transaction = FinanceService.recordRepayment({
      customerId,
      loanId,
      amount: Number(amount),
      date: date || new Date().toISOString().slice(0, 10),
      paymentMethod,
      notes,
    });
    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully.',
      data: transaction,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Edit/Correct a transaction with audit history
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, date, notes, reason } = req.body;

    const updated = FinanceService.editTransaction(id, {
      amount: Number(amount),
      date,
      notes,
      reason,
    });

    res.json({
      success: true,
      message: 'Transaction updated successfully with audit trail.',
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get audit history for a transaction
router.get('/:id/audit', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const auditLogs = FinanceService.getAuditHistory(id);
    res.json({ success: true, count: auditLogs.length, data: auditLogs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

