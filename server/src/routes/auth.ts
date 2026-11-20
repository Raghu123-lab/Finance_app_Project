import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { getDb } from '../db/database.js';

const router = Router();

function hashPin(pin: string, salt: string): string {
  return crypto.scryptSync(pin, salt, 32).toString('hex');
}

/**
 * Get PIN protection status (whether a PIN is configured)
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const pinRow = db.prepare("SELECT value FROM app_settings WHERE key = 'security_pin_hash'").get() as any;
    res.json({
      success: true,
      pin_enabled: Boolean(pinRow && pinRow.value),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Setup new PIN (when not set yet)
 */
router.post('/setup-pin', (req: Request, res: Response) => {
  try {
    const { pin } = req.body;
    if (!pin || typeof pin !== 'string' || pin.trim().length < 4 || pin.trim().length > 6 || !/^\d+$/.test(pin.trim())) {
      res.status(400).json({ success: false, error: 'PIN must be 4 to 6 numeric digits.' });
      return;
    }

    const db = getDb();
    const existing = db.prepare("SELECT value FROM app_settings WHERE key = 'security_pin_hash'").get() as any;
    if (existing && existing.value) {
      res.status(400).json({ success: false, error: 'PIN is already set. Use change PIN instead.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPin(pin.trim(), salt);

    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('security_pin_salt', ?)").run(salt);
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('security_pin_hash', ?)").run(hash);

    res.json({ success: true, message: 'Security PIN set successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Verify PIN for login/unlock
 */
router.post('/verify-pin', (req: Request, res: Response) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      res.status(400).json({ success: false, error: 'PIN is required.' });
      return;
    }

    const db = getDb();
    const hashRow = db.prepare("SELECT value FROM app_settings WHERE key = 'security_pin_hash'").get() as any;
    const saltRow = db.prepare("SELECT value FROM app_settings WHERE key = 'security_pin_salt'").get() as any;

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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Change or disable PIN
 */
router.post('/change-pin', (req: Request, res: Response) => {
  try {
    const { currentPin, newPin, disable } = req.body;
    const db = getDb();

    const hashRow = db.prepare("SELECT value FROM app_settings WHERE key = 'security_pin_hash'").get() as any;
    const saltRow = db.prepare("SELECT value FROM app_settings WHERE key = 'security_pin_salt'").get() as any;

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

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPin(newPin.trim(), salt);

    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('security_pin_salt', ?)").run(salt);
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('security_pin_hash', ?)").run(hash);

    res.json({ success: true, message: 'PIN updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

