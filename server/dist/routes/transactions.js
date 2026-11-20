"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const financeService_js_1 = require("../services/financeService.js");
const router = (0, express_1.Router)();
// Get transactions with filters
router.get('/', (req, res) => {
    try {
        const { date, startDate, endDate, type, customerId, search } = req.query;
        const transactions = financeService_js_1.FinanceService.getTransactions({
            date: date,
            startDate: startDate,
            endDate: endDate,
            type: type,
            customerId: customerId,
            search: search,
        });
        res.json({ success: true, count: transactions.length, data: transactions });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Record customer repayment
router.post('/repayment', (req, res) => {
    try {
        const { customerId, loanId, amount, date, paymentMethod, notes } = req.body;
        const transaction = financeService_js_1.FinanceService.recordRepayment({
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
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
// Edit/Correct a transaction with audit history
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { amount, date, notes, reason } = req.body;
        const updated = financeService_js_1.FinanceService.editTransaction(id, {
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
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
// Get audit history for a transaction
router.get('/:id/audit', (req, res) => {
    try {
        const { id } = req.params;
        const auditLogs = financeService_js_1.FinanceService.getAuditHistory(id);
        res.json({ success: true, count: auditLogs.length, data: auditLogs });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
