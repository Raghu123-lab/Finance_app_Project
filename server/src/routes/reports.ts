import { Router, Request, Response } from 'express';
import { FinanceService } from '../services/financeService.js';

const router = Router();

// Dashboard overview
router.get('/dashboard', (req: Request, res: Response) => {
  try {
    const summary = FinanceService.getDashboardSummary();
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Daily report
router.get('/daily', (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const dailyData = FinanceService.getDailyReport(date);
    res.json({ success: true, data: dailyData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Weekly report
router.get('/weekly', (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const weeklyData = FinanceService.getWeeklyReport(startDate, endDate);
    res.json({ success: true, data: weeklyData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

