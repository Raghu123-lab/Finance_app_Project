"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const node_crypto_1 = __importDefault(require("node:crypto"));
const database_js_1 = require("../db/database.js");
const router = (0, express_1.Router)();
function hashPin(pin, salt) {
    return node_crypto_1.default.scryptSync(pin, salt, 32).toString('hex');
}
/**
 * Get PIN protection status (whether a PIN is configured)
 */
router.get('/status', (req, res) => {
    try {
        const db = (0, database_js_1.getDb)();
        const pinRow = db.prepare("SELECT value FROM app_settings WHERE key = 'security_pin_hash'").get();
        res.json({
            success: true,
            pin_enabled: Boolean(pinRow && pinRow.value),
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * Setup new PIN (when not set yet)
 */
router.post('/setup-pin', (req, res) => {
    try {
        const { pin } = req.body;
        if (!pin || typeof pin !== 'string' || pin.trim().length < 4 || pin.trim().length > 6 || !/^\d+$/.test(pin.trim())) {
            res.status(400).json({ success: false, error: 'PIN must be 4 to 6 numeric digits.' });
            return;
        }
        const db = (0, database_js_1.getDb)();
        const existing = db.prepare("SELECT value FROM app_settings WHERE key = 'security_pin_hash'").get();
        if (existing && existing.value) {
            res.status(400).json({ success: false, error: 'PIN is already set. Use change PIN instead.' });
            return;
        }
        const salt = node_crypto_1.default.randomBytes(16).toString('hex');
        const hash = hashPin(pin.trim(), salt);
        db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('security_pin_salt', ?)").run(salt);
        db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('security_pin_hash', ?)").run(hash);
        res.json({ success: true, message: 'Security PIN set successfully.' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * Verify PIN for login/unlock
 */
router.post('/verify-pin', (req, res) => {
    try {
        const { pin } = req.body;
        if (!pin) {
            res.status(400).json({ success: false, error: 'PIN is required.' });
            return;
        }
        const db = (0, database_js_1.getDb)();
        const hashRow = db.prepare("SELECT value FROM app_settings WHERE key = 'security_pin_hash'").get();
        const saltRow = db.prepare("SELECT value FROM app_settings WHERE key = 'security_pin_salt'").get();
        if (!hashRow || !saltRow) {
            // No PIN configured, allow access
            res.json({ success: true, verified: true, message: 'No PIN is configured.' });
            return;
        }
        const computed = hashPin(pin.trim(), saltRow.value);
        const isValid = computed === hashRow.value;
        if (!isValid) {
            res.status(401).json({ success: false, verified: false, error: 'Incorrect PIN. Please try again.' });
            return;
        }
        res.json({ success: true, verified: true, message: 'Access granted.' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * Change or disable PIN
 */
router.post('/change-pin', (req, res) => {
    try {
        const { currentPin, newPin, disable } = req.body;
        const db = (0, database_js_1.getDb)();
        const hashRow = db.prepare("SELECT value FROM app_settings WHERE key = 'security_pin_hash'").get();
        const saltRow = db.prepare("SELECT value FROM app_settings WHERE key = 'security_pin_salt'").get();
        if (hashRow && saltRow) {
            if (!currentPin) {
                res.status(400).json({ success: false, error: 'Current PIN is required.' });
                return;
            }
            const computed = hashPin(currentPin.trim(), saltRow.value);
            if (computed !== hashRow.value) {
                res.status(401).json({ success: false, error: 'Current PIN is incorrect.' });
                return;
            }
        }
        if (disable) {
            db.prepare("DELETE FROM app_settings WHERE key IN ('security_pin_hash', 'security_pin_salt')").run();
            res.json({ success: true, message: 'Security PIN has been disabled.' });
            return;
        }
        if (!newPin || typeof newPin !== 'string' || newPin.trim().length < 4 || newPin.trim().length > 6 || !/^\d+$/.test(newPin.trim())) {
            res.status(400).json({ success: false, error: 'New PIN must be 4 to 6 numeric digits.' });
            return;
        }
        const salt = node_crypto_1.default.randomBytes(16).toString('hex');
        const hash = hashPin(newPin.trim(), salt);
        db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('security_pin_salt', ?)").run(salt);
        db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('security_pin_hash', ?)").run(hash);
        res.json({ success: true, message: 'PIN updated successfully.' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
