"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const financeService_js_1 = require("../services/financeService.js");
const loanCalculator_js_1 = require("../services/loanCalculator.js");
const database_js_1 = require("../db/database.js");
const router = (0, express_1.Router)();
// Preview/Calculate loan calculations before saving
router.post('/calculate', (req, res) => {
    try {
        const { principalAmount, interestRate, interestType, ratePeriod, duration, durationUnit, repaymentFrequency, customInstallments, manualTotalInterest, manualTotalPayable, startDate, } = req.body;
        if (!principalAmount || Number(principalAmount) <= 0) {
            res.status(400).json({ success: false, error: 'Principal amount must be greater than zero.' });
            return;
        }
        const calcResult = (0, loanCalculator_js_1.calculateLoan)({
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
        const schedulePreview = (0, loanCalculator_js_1.generateSchedule)('PREVIEW', 'CUSTOMER', calcResult.totalAmountPayable, calcResult.totalInstallments, dateStr, calcResult.repaymentFrequency);
        res.json({
            success: true,
            calculation: calcResult,
            schedule_preview: schedulePreview,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
// Create and record a new loan
router.post('/', (req, res) => {
    try {
        const { customerId, principalAmount, interestRate, interestType, ratePeriod, duration, durationUnit, repaymentFrequency, customInstallments, manualTotalInterest, manualTotalPayable, dateGiven, notes, } = req.body;
        const result = financeService_js_1.FinanceService.createLoan({
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
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
// Get loan by ID
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const db = (0, database_js_1.getDb)();
        const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
