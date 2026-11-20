"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const financeService_js_1 = require("../services/financeService.js");
const router = (0, express_1.Router)();
// Dashboard overview
router.get('/dashboard', (req, res) => {
    try {
        const summary = financeService_js_1.FinanceService.getDashboardSummary();
        res.json({ success: true, data: summary });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Daily report
router.get('/daily', (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const dailyData = financeService_js_1.FinanceService.getDailyReport(date);
        res.json({ success: true, data: dailyData });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Weekly report
router.get('/weekly', (req, res) => {
    try {
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const weeklyData = financeService_js_1.FinanceService.getWeeklyReport(startDate, endDate);
        res.json({ success: true, data: weeklyData });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
