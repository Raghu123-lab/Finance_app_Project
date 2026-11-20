"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_js_1 = require("./db/database.js");
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const customers_js_1 = __importDefault(require("./routes/customers.js"));
const loans_js_1 = __importDefault(require("./routes/loans.js"));
const transactions_js_1 = __importDefault(require("./routes/transactions.js"));
const reports_js_1 = __importDefault(require("./routes/reports.js"));
const backup_js_1 = __importDefault(require("./routes/backup.js"));
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Initialize DB on boot
try {
    (0, database_js_1.getDb)();
    console.log('✅ SQLite database initialized successfully.');
}
catch (error) {
    console.error('❌ Failed to initialize SQLite database:', error);
    process.exit(1);
}
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        app: 'Local Finance Management Backend',
    });
});
// API Routes
app.use('/api/auth', auth_js_1.default);
app.use('/api/customers', customers_js_1.default);
app.use('/api/loans', loans_js_1.default);
app.use('/api/transactions', transactions_js_1.default);
app.use('/api/reports', reports_js_1.default);
app.use('/api/backup', backup_js_1.default);
// Static client serving for production
const clientDistPath = node_path_1.default.resolve(process.cwd(), '../client/dist');
const altClientDistPath = node_path_1.default.resolve(process.cwd(), 'client/dist');
const distPath = node_fs_1.default.existsSync(altClientDistPath) ? altClientDistPath : clientDistPath;
if (node_fs_1.default.existsSync(distPath)) {
    app.use(express_1.default.static(distPath));
    app.get('*', (req, res, next) => {
        if (req.url.startsWith('/api'))
            return next();
        res.sendFile(node_path_1.default.resolve(distPath, 'index.html'));
    });
}
// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: `Route ${req.method} ${req.url} not found.` });
});
// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error occurred.',
    });
});
app.listen(PORT, () => {
    console.log(`🚀 Finance Server running locally at http://localhost:${PORT}`);
});
exports.default = app;
