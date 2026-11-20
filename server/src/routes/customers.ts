import { Router, Request, Response } from 'express';
import { FinanceService } from '../services/financeService.js';
import { getDb } from '../db/database.js';

const router = Router();

// List all customers with financial summaries
router.get('/', (req: Request, res: Response) => {
  try {
    const q = req.query.q as string | undefined;
    const customers = FinanceService.getCustomers(q);
    res.json({ success: true, count: customers.length, data: customers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check customer ID availability and format
router.get('/check-id/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = FinanceService.validateCustomerId(id);
    if (!validation.valid) {
      res.json({
        success: true,
        valid: false,
        exists: false,
        normalizedId: validation.normalizedId,
        message: validation.error,
      });
      return;
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM customers WHERE id = ?').get(validation.normalizedId);
    if (existing) {
      res.json({
        success: true,
        valid: true,
        exists: true,
        normalizedId: validation.normalizedId,
        message: `Customer ID "${validation.normalizedId}" is already taken.`,
      });
      return;
    }

    res.json({
      success: true,
      valid: true,
      exists: false,
      normalizedId: validation.normalizedId,
      message: `Customer ID "${validation.normalizedId}" is available.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check mobile phone availability
router.get('/check-phone/:phone', (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const validation = FinanceService.validatePhone(phone);
    if (!validation.valid) {
      res.json({
        success: true,
        valid: false,
        exists: false,
        message: validation.error,
      });
      return;
    }

    const db = getDb();
    const existing = db.prepare('SELECT id, name FROM customers WHERE phone = ?').get(validation.normalizedPhone) as any;
    if (existing) {
      res.json({
        success: true,
        valid: true,
        exists: true,
        customer: existing,
        message: `Mobile number "${validation.normalizedPhone}" is already registered to ${existing.id} (${existing.name}).`,
      });
      return;
    }

    res.json({
      success: true,
      valid: true,
      exists: false,
      message: 'Mobile number is available.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new customer
router.post('/', (req: Request, res: Response) => {
  try {
    const { id, name, address, phone, notes } = req.body;
    const customer = FinanceService.createCustomer({
      id,
      name,
      address,
      phone,
      notes,
    });
    res.status(201).json({ success: true, message: 'Customer registered successfully.', data: customer });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get customer profile and complete payment history by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profile = FinanceService.getCustomerProfile(id);
    res.json({ success: true, data: profile });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// Update customer details
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address, phone, notes } = req.body;
    const updated = FinanceService.updateCustomer(id, { name, address, phone, notes });
    res.json({ success: true, message: 'Customer updated successfully.', data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;

