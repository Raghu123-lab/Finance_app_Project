import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { getDb } from './db/database.js';
import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customers.js';
import loanRoutes from './routes/loans.js';
import transactionRoutes from './routes/transactions.js';
import reportRoutes from './routes/reports.js';
import backupRoutes from './routes/backup.js';
import path from 'node:path';
import fs from 'node:fs';

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize DB on boot
try {
  getDb();
  console.log('✅ SQLite database initialized successfully.');
} catch (error) {
  console.error('❌ Failed to initialize SQLite database:', error);
  process.exit(1);
}

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    app: 'Local Finance Management Backend',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/backup', backupRoutes);

// Static client serving for production
const clientDistPath = path.resolve(process.cwd(), '../client/dist');
const altClientDistPath = path.resolve(process.cwd(), 'client/dist');
const distPath = fs.existsSync(altClientDistPath) ? altClientDistPath : clientDistPath;

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.url.startsWith('/api')) return next();
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.url} not found.` });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error occurred.',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Finance Server running locally at http://localhost:${PORT}`);
});

export default app;
