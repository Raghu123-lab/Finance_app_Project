"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SCHEMA_SQL = void 0;
exports.getDb = getDb;
exports.closeDb = closeDb;
exports.getDbPath = getDbPath;
exports.runInTransaction = runInTransaction;
exports.resetDatabase = resetDatabase;
exports.queryAll = queryAll;
exports.queryGet = queryGet;
const node_sqlite_1 = require("node:sqlite");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const DB_DIR = node_path_1.default.resolve(process.cwd(), 'data');
const DB_PATH = node_path_1.default.resolve(DB_DIR, 'finance.db');
exports.DEFAULT_SCHEMA_SQL = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    notes TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    principal_amount REAL NOT NULL,
    interest_rate REAL NOT NULL,
    interest_type TEXT NOT NULL,
    rate_period TEXT NOT NULL,
    duration INTEGER NOT NULL,
    duration_unit TEXT NOT NULL,
    repayment_frequency TEXT NOT NULL,
    total_installments INTEGER NOT NULL,
    total_interest REAL NOT NULL,
    total_amount_payable REAL NOT NULL,
    date_given TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS installments (
    id TEXT PRIMARY KEY,
    loan_id TEXT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    due_date TEXT NOT NULL,
    expected_amount REAL NOT NULL,
    paid_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    paid_date TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('GIVEN', 'RECEIVED')),
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    loan_id TEXT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    amount REAL NOT NULL CHECK(amount > 0),
    date TEXT NOT NULL,
    previous_balance REAL NOT NULL DEFAULT 0,
    updated_balance REAL NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transaction_audit_logs (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    action TEXT NOT NULL DEFAULT 'EDIT',
    old_data TEXT NOT NULL,
    new_data TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_loans_customer ON loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_installments_loan ON installments(loan_id);
CREATE INDEX IF NOT EXISTS idx_installments_customer ON installments(customer_id);
CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_loan ON transactions(loan_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_audit_transaction ON transaction_audit_logs(transaction_id);
`;
let dbInstance = null;
function loadSchemaSql() {
    const candidatePaths = [
        node_path_1.default.resolve(__dirname, 'schema.sql'),
        node_path_1.default.resolve(__dirname, '../../src/db/schema.sql'),
        node_path_1.default.resolve(__dirname, '../src/db/schema.sql'),
        node_path_1.default.resolve(process.cwd(), 'src/db/schema.sql'),
        node_path_1.default.resolve(process.cwd(), 'server/src/db/schema.sql'),
    ];
    for (const p of candidatePaths) {
        if (node_fs_1.default.existsSync(p)) {
            try {
                return node_fs_1.default.readFileSync(p, 'utf-8');
            }
            catch (e) {
                // continue
            }
        }
    }
    return exports.DEFAULT_SCHEMA_SQL;
}
function getDb() {
    if (!dbInstance) {
        if (!node_fs_1.default.existsSync(DB_DIR)) {
            node_fs_1.default.mkdirSync(DB_DIR, { recursive: true });
        }
        dbInstance = new node_sqlite_1.DatabaseSync(DB_PATH);
        dbInstance.exec('PRAGMA foreign_keys = ON;');
        dbInstance.exec('PRAGMA journal_mode = WAL;');
        // Initialize tables safely
        const schemaSql = loadSchemaSql();
        dbInstance.exec(schemaSql);
    }
    return dbInstance;
}
function closeDb() {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}
function getDbPath() {
    return DB_PATH;
}
/**
 * Execute a callback within an atomic SQLite transaction
 */
function runInTransaction(fn) {
    const db = getDb();
    db.exec('BEGIN IMMEDIATE;');
    try {
        const result = fn(db);
        db.exec('COMMIT;');
        return result;
    }
    catch (error) {
        db.exec('ROLLBACK;');
        throw error;
    }
}
/**
 * Reset database completely (for testing or user-initiated clear)
 */
function resetDatabase() {
    closeDb();
    if (node_fs_1.default.existsSync(DB_PATH)) {
        node_fs_1.default.unlinkSync(DB_PATH);
    }
    // Also remove WAL / SHM files if any
    const walPath = `${DB_PATH}-wal`;
    const shmPath = `${DB_PATH}-shm`;
    if (node_fs_1.default.existsSync(walPath))
        node_fs_1.default.unlinkSync(walPath);
    if (node_fs_1.default.existsSync(shmPath))
        node_fs_1.default.unlinkSync(shmPath);
    // Re-open and reinitialize
    getDb();
}
function queryAll(sql, ...params) {
    const db = getDb();
    return db.prepare(sql).all(...params);
}
function queryGet(sql, ...params) {
    const db = getDb();
    return db.prepare(sql).get(...params);
}
