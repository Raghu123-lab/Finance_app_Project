"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const financeService_js_1 = require("../services/financeService.js");
const database_js_1 = require("../db/database.js");
const router = (0, express_1.Router)();
// List all customers with financial summaries
router.get('/', (req, res) => {
    try {
        const q = req.query.q;
        const customers = financeService_js_1.FinanceService.getCustomers(q);
        res.json({ success: true, count: customers.length, data: customers });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Check customer ID availability and format
router.get('/check-id/:id', (req, res) => {
    try {
        const { id } = req.params;
        const validation = financeService_js_1.FinanceService.validateCustomerId(id);
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
        const db = (0, database_js_1.getDb)();
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Check mobile phone availability
router.get('/check-phone/:phone', (req, res) => {
    try {
        const { phone } = req.params;
        const validation = financeService_js_1.FinanceService.validatePhone(phone);
        if (!validation.valid) {
            res.json({
                success: true,
                valid: false,
                exists: false,
                message: validation.error,
            });
            return;
        }
        const db = (0, database_js_1.getDb)();
        const existing = db.prepare('SELECT id, name FROM customers WHERE phone = ?').get(validation.normalizedPhone);
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Create new customer
router.post('/', (req, res) => {
    try {
        const { id, name, address, phone, notes } = req.body;
        const customer = financeService_js_1.FinanceService.createCustomer({
            id,
            name,
            address,
            phone,
            notes,
        });
        res.status(201).json({ success: true, message: 'Customer registered successfully.', data: customer });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
// Get customer profile and complete payment history by ID
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const profile = financeService_js_1.FinanceService.getCustomerProfile(id);
        res.json({ success: true, data: profile });
    }
    catch (error) {
        res.status(404).json({ success: false, error: error.message });
    }
});
// Update customer details
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, phone, notes } = req.body;
        const updated = financeService_js_1.FinanceService.updateCustomer(id, { name, address, phone, notes });
        res.json({ success: true, message: 'Customer updated successfully.', data: updated });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
exports.default = router;
