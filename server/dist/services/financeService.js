"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceService = void 0;
const database_js_1 = require("../db/database.js");
const loanCalculator_js_1 = require("./loanCalculator.js");
class FinanceService {
    /**
     * Validate Customer ID format: Exactly 1 uppercase English letter + 1 or more digits
     * E.g. A001, B12, C105
     */
    static validateCustomerId(id) {
        if (!id || typeof id !== 'string') {
            return { valid: false, normalizedId: '', error: 'Customer ID is required.' };
        }
        const normalized = id.trim().toUpperCase();
        const regex = /^[A-Z][0-9]+$/;
        if (!regex.test(normalized)) {
            return {
                valid: false,
                normalizedId: normalized,
                error: 'Customer ID must start with exactly one uppercase letter followed by one or more numbers (e.g. A001, B02).',
            };
        }
        return { valid: true, normalizedId: normalized };
    }
    /**
     * Validate mobile phone: at least 10 digits
     */
    static validatePhone(phone) {
        if (!phone || typeof phone !== 'string') {
            return { valid: false, normalizedPhone: '', error: 'Mobile number is required.' };
        }
        const clean = phone.replace(/[\s\-\(\)\+]/g, '');
        if (clean.length < 10 || clean.length > 15 || !/^\d+$/.test(clean)) {
            return {
                valid: false,
                normalizedPhone: clean,
                error: 'Please enter a valid mobile number (10-15 digits).',
            };
        }
        return { valid: true, normalizedPhone: clean };
    }
    // ==========================================
    // CUSTOMER METHODS
    // ==========================================
    static createCustomer(data) {
        const idValidation = this.validateCustomerId(data.id);
        if (!idValidation.valid) {
            throw new Error(idValidation.error);
        }
        const phoneValidation = this.validatePhone(data.phone);
        if (!phoneValidation.valid) {
            throw new Error(phoneValidation.error);
        }
        const customerId = idValidation.normalizedId;
        const phone = phoneValidation.normalizedPhone;
        const name = data.name.trim();
        const address = data.address.trim();
        if (!name)
            throw new Error('Customer name is required.');
        if (!address)
            throw new Error('Full residential address is required.');
        const db = (0, database_js_1.getDb)();
        // Check unique ID
        const existingId = db.prepare('SELECT id FROM customers WHERE id = ?').get(customerId);
        if (existingId) {
            throw new Error(`Customer ID "${customerId}" already exists. Please choose a different ID.`);
        }
        // Check unique Phone
        const existingPhone = db.prepare('SELECT id, name FROM customers WHERE phone = ?').get(phone);
        if (existingPhone) {
            throw new Error(`Mobile number "${phone}" is already registered for customer ${existingPhone.id} (${existingPhone.name}).`);
        }
        const createdAt = new Date().toISOString();
        const insertStmt = db.prepare(`
      INSERT INTO customers (id, name, address, phone, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        insertStmt.run(customerId, name, address, phone, data.notes?.trim() || null, createdAt);
        return {
            id: customerId,
            name,
            address,
            phone,
            notes: data.notes?.trim() || undefined,
            created_at: createdAt,
        };
    }
    static updateCustomer(id, data) {
        const db = (0, database_js_1.getDb)();
        const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
        if (!existing) {
            throw new Error(`Customer with ID ${id} not found.`);
        }
        let phone = existing.phone;
        if (data.phone) {
            const phoneValidation = this.validatePhone(data.phone);
            if (!phoneValidation.valid) {
                throw new Error(phoneValidation.error);
            }
            phone = phoneValidation.normalizedPhone;
            // Check duplicate phone with others
            const dup = db.prepare('SELECT id FROM customers WHERE phone = ? AND id != ?').get(phone, id);
            if (dup) {
                throw new Error(`Mobile number "${phone}" is already in use by another customer.`);
            }
        }
        const name = data.name?.trim() ?? existing.name;
        const address = data.address?.trim() ?? existing.address;
        const notes = data.notes !== undefined ? (data.notes.trim() || null) : existing.notes;
        db.prepare(`
      UPDATE customers
      SET name = ?, address = ?, phone = ?, notes = ?
      WHERE id = ?
    `).run(name, address, phone, notes, id);
        return {
            id,
            name,
            address,
            phone,
            notes: notes || undefined,
            created_at: existing.created_at,
        };
    }
    static getCustomers(searchQuery) {
        const db = (0, database_js_1.getDb)();
        let query = 'SELECT * FROM customers';
        const params = [];
        if (searchQuery && searchQuery.trim()) {
            const q = `%${searchQuery.trim().toUpperCase()}%`;
            const qRaw = `%${searchQuery.trim()}%`;
            query += ' WHERE id LIKE ? OR UPPER(name) LIKE ? OR phone LIKE ?';
            params.push(q, q, qRaw);
        }
        query += ' ORDER BY created_at DESC';
        const customers = (0, database_js_1.queryAll)(query, ...params);
        return customers.map((c) => {
            const summary = this.calculateCustomerSummary(c.id);
            const loans = (0, database_js_1.queryAll)('SELECT * FROM loans WHERE customer_id = ? ORDER BY date_given DESC', c.id);
            return {
                ...c,
                financial_summary: summary,
                loans,
            };
        });
    }
    static getCustomerProfile(customerId) {
        const normalized = customerId.trim().toUpperCase();
        const customer = (0, database_js_1.queryGet)('SELECT * FROM customers WHERE id = ?', normalized);
        if (!customer) {
            throw new Error(`Customer with ID "${normalized}" was not found.`);
        }
        const summary = this.calculateCustomerSummary(normalized);
        // Get loans with installments
        const loans = (0, database_js_1.queryAll)('SELECT * FROM loans WHERE customer_id = ? ORDER BY date_given ASC', normalized);
        const loansWithDetails = loans.map((l) => {
            const repaymentsSum = (0, database_js_1.queryGet)(`
        SELECT COALESCE(SUM(amount), 0) as total_received
        FROM transactions
        WHERE loan_id = ? AND type = 'RECEIVED'
      `, l.id);
            const received = (0, loanCalculator_js_1.round2)(repaymentsSum?.total_received || 0);
            const remaining = (0, loanCalculator_js_1.round2)(l.total_amount_payable - received);
            const rawInstallments = (0, database_js_1.queryAll)(`
        SELECT * FROM installments
        WHERE loan_id = ?
        ORDER BY installment_number ASC
      `, l.id);
            const { updatedInstallments } = (0, loanCalculator_js_1.updateInstallmentsStatus)(rawInstallments, received);
            return {
                ...l,
                amount_received: received,
                remaining_balance: remaining,
                installments: updatedInstallments,
            };
        });
        // Chronological transactions
        const rawTransactions = (0, database_js_1.queryAll)(`
      SELECT t.*, c.name as customer_name, c.phone as customer_phone,
             (SELECT COUNT(*) FROM transaction_audit_logs a WHERE a.transaction_id = t.id) as audit_count
      FROM transactions t
      JOIN customers c ON t.customer_id = c.id
      WHERE t.customer_id = ?
      ORDER BY t.date ASC, t.created_at ASC
    `, normalized);
        return {
            ...customer,
            financial_summary: summary,
            loans: loansWithDetails,
            transactions: rawTransactions,
        };
    }
    /**
     * Helper to calculate aggregate financial summary for a customer
     */
    static calculateCustomerSummary(customerId) {
        const loans = (0, database_js_1.queryAll)('SELECT * FROM loans WHERE customer_id = ?', customerId);
        const totalGiven = (0, loanCalculator_js_1.round2)(loans.reduce((acc, l) => acc + l.principal_amount, 0));
        const totalInterest = (0, loanCalculator_js_1.round2)(loans.reduce((acc, l) => acc + l.total_interest, 0));
        const totalPayable = (0, loanCalculator_js_1.round2)(loans.reduce((acc, l) => acc + l.total_amount_payable, 0));
        const repaymentsSum = (0, database_js_1.queryGet)(`
      SELECT COALESCE(SUM(amount), 0) as total_received
      FROM transactions
      WHERE customer_id = ? AND type = 'RECEIVED'
    `, customerId);
        const totalReceived = (0, loanCalculator_js_1.round2)(repaymentsSum?.total_received || 0);
        const remainingBalance = Math.max(0, (0, loanCalculator_js_1.round2)(totalPayable - totalReceived));
        // Installments status
        const allInstallments = (0, database_js_1.queryAll)(`
      SELECT * FROM installments
      WHERE customer_id = ?
      ORDER BY due_date ASC, installment_number ASC
    `, customerId);
        let totalInstallments = allInstallments.length;
        let installmentsPaid = 0;
        let nextDueDate = null;
        const todayStr = new Date().toISOString().slice(0, 10);
        // Calculate per loan
        for (const loan of loans) {
            const loanInstallments = allInstallments.filter((i) => i.loan_id === loan.id);
            const loanReceived = (0, database_js_1.queryGet)(`
        SELECT COALESCE(SUM(amount), 0) as total_received
        FROM transactions
        WHERE loan_id = ? AND type = 'RECEIVED'
      `, loan.id);
            const { installmentsPaid: paid, nextPaymentDate } = (0, loanCalculator_js_1.updateInstallmentsStatus)(loanInstallments, (0, loanCalculator_js_1.round2)(loanReceived?.total_received || 0), todayStr);
            installmentsPaid += paid;
            if (nextPaymentDate && (!nextDueDate || nextPaymentDate < nextDueDate)) {
                nextDueDate = nextPaymentDate;
            }
        }
        let paymentStatus = 'Pending';
        if (totalPayable > 0 && remainingBalance === 0) {
            paymentStatus = 'Paid';
        }
        else if (totalReceived > 0) {
            paymentStatus = 'Partially paid';
        }
        else if (nextDueDate && nextDueDate < todayStr) {
            paymentStatus = 'Overdue';
        }
        return {
            total_given: totalGiven,
            total_interest: totalInterest,
            total_payable: totalPayable,
            total_received: totalReceived,
            remaining_balance: remainingBalance,
            installments_paid: installmentsPaid,
            total_installments: totalInstallments,
            next_payment_date: nextDueDate,
            payment_status: paymentStatus,
        };
    }
    // ==========================================
    // LOAN METHODS
    // ==========================================
    static createLoan(data) {
        const db = (0, database_js_1.getDb)();
        const customer = db.prepare('SELECT id, name FROM customers WHERE id = ?').get(data.customerId.trim().toUpperCase());
        if (!customer) {
            throw new Error(`Customer ${data.customerId} does not exist.`);
        }
        if (!data.principalAmount || data.principalAmount <= 0) {
            throw new Error('Principal amount must be greater than zero.');
        }
        if (!data.dateGiven || !/^\d{4}-\d{2}-\d{2}$/.test(data.dateGiven)) {
            throw new Error('Valid date given (YYYY-MM-DD) is required.');
        }
        const calcResult = (0, loanCalculator_js_1.calculateLoan)({
            principalAmount: data.principalAmount,
            interestRate: data.interestRate || 0,
            interestType: data.interestType,
            ratePeriod: data.ratePeriod,
            duration: data.duration,
            durationUnit: data.durationUnit,
            repaymentFrequency: data.repaymentFrequency,
            customInstallments: data.customInstallments,
            manualTotalInterest: data.manualTotalInterest,
            manualTotalPayable: data.manualTotalPayable,
        });
        const now = new Date();
        const loanId = `LN-${customer.id}-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        const txId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        const createdAt = now.toISOString();
        const schedule = (0, loanCalculator_js_1.generateSchedule)(loanId, customer.id, calcResult.totalAmountPayable, calcResult.totalInstallments, data.dateGiven, data.repaymentFrequency);
        return (0, database_js_1.runInTransaction)((db) => {
            // 1. Get previous customer total balance
            const prevSummary = this.calculateCustomerSummary(customer.id);
            const prevBalance = prevSummary.remaining_balance;
            const updatedBalance = (0, loanCalculator_js_1.round2)(prevBalance + calcResult.totalAmountPayable);
            // 2. Insert Loan
            db.prepare(`
        INSERT INTO loans (
          id, customer_id, principal_amount, interest_rate, interest_type,
          rate_period, duration, duration_unit, repayment_frequency,
          total_installments, total_interest, total_amount_payable,
          date_given, notes, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `).run(loanId, customer.id, calcResult.principalAmount, calcResult.interestRate, calcResult.interestType, calcResult.ratePeriod, calcResult.duration, calcResult.durationUnit, calcResult.repaymentFrequency, calcResult.totalInstallments, calcResult.totalInterest, calcResult.totalAmountPayable, data.dateGiven, data.notes?.trim() || null, createdAt);
            // 3. Insert Installments
            const insertInst = db.prepare(`
        INSERT INTO installments (
          id, loan_id, customer_id, installment_number, due_date,
          expected_amount, paid_amount, status
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 'pending')
      `);
            for (const inst of schedule) {
                insertInst.run(inst.id, inst.loan_id, inst.customer_id, inst.installment_number, inst.due_date, inst.expected_amount);
            }
            // 4. Record GIVEN transaction (Disbursement)
            db.prepare(`
        INSERT INTO transactions (
          id, type, customer_id, loan_id, amount, date,
          previous_balance, updated_balance, payment_method, notes,
          created_at, updated_at
        ) VALUES (?, 'GIVEN', ?, ?, ?, ?, ?, ?, 'cash', ?, ?, ?)
      `).run(txId, customer.id, loanId, calcResult.principalAmount, data.dateGiven, prevBalance, updatedBalance, data.notes?.trim() ? `Loan Disbursed: ${data.notes.trim()}` : `Loan Disbursed (Principal ₹${calcResult.principalAmount})`, createdAt, createdAt);
            const createdLoan = {
                id: loanId,
                customer_id: customer.id,
                principal_amount: calcResult.principalAmount,
                interest_rate: calcResult.interestRate,
                interest_type: calcResult.interestType,
                rate_period: calcResult.ratePeriod,
                duration: calcResult.duration,
                duration_unit: calcResult.durationUnit,
                repayment_frequency: calcResult.repaymentFrequency,
                total_installments: calcResult.totalInstallments,
                total_interest: calcResult.totalInterest,
                total_amount_payable: calcResult.totalAmountPayable,
                date_given: data.dateGiven,
                notes: data.notes?.trim() || undefined,
                status: 'active',
                created_at: createdAt,
            };
            const createdTx = {
                id: txId,
                type: 'GIVEN',
                customer_id: customer.id,
                loan_id: loanId,
                amount: calcResult.principalAmount,
                date: data.dateGiven,
                previous_balance: prevBalance,
                updated_balance: updatedBalance,
                payment_method: 'cash',
                notes: `Loan Disbursed`,
                created_at: createdAt,
                updated_at: createdAt,
            };
            return { loan: createdLoan, schedule, transaction: createdTx };
        });
    }
    // ==========================================
    // TRANSACTION METHODS
    // ==========================================
    static recordRepayment(data) {
        const customerId = data.customerId.trim().toUpperCase();
        const amount = (0, loanCalculator_js_1.round2)(data.amount);
        if (amount <= 0) {
            throw new Error('Repayment amount must be greater than zero.');
        }
        if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
            throw new Error('Valid transaction date (YYYY-MM-DD) is required.');
        }
        const db = (0, database_js_1.getDb)();
        const customer = db.prepare('SELECT id, name FROM customers WHERE id = ?').get(customerId);
        if (!customer) {
            throw new Error(`Customer ${customerId} not found.`);
        }
        // Determine target loan
        let targetLoanId = data.loanId;
        if (!targetLoanId) {
            // Find active loan with remaining balance
            const loans = (0, database_js_1.queryAll)('SELECT * FROM loans WHERE customer_id = ? ORDER BY date_given ASC', customerId);
            for (const l of loans) {
                const received = (0, database_js_1.queryGet)(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM transactions
          WHERE loan_id = ? AND type = 'RECEIVED'
        `, l.id);
                if ((0, loanCalculator_js_1.round2)(l.total_amount_payable - (received?.total || 0)) > 0) {
                    targetLoanId = l.id;
                    break;
                }
            }
            if (!targetLoanId && loans.length > 0) {
                targetLoanId = loans[loans.length - 1].id;
            }
        }
        if (!targetLoanId) {
            throw new Error(`No loan found for customer ${customerId}. Please create a loan first.`);
        }
        // Duplicate check: Same customer, loan, amount, date within 3 seconds
        const recentDup = db.prepare(`
      SELECT id FROM transactions
      WHERE customer_id = ? AND loan_id = ? AND amount = ? AND date = ? AND type = 'RECEIVED'
      AND (strftime('%s', 'now') - strftime('%s', created_at)) < 3
    `).get(customerId, targetLoanId, amount, data.date);
        if (recentDup) {
            throw new Error('Duplicate payment detected. This transaction was just submitted a moment ago.');
        }
        return (0, database_js_1.runInTransaction)((db) => {
            // Calculate current balance before this repayment
            const prevSummary = this.calculateCustomerSummary(customerId);
            const prevBalance = prevSummary.remaining_balance;
            const updatedBalance = Math.max(0, (0, loanCalculator_js_1.round2)(prevBalance - amount));
            const txId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
            const createdAt = new Date().toISOString();
            db.prepare(`
        INSERT INTO transactions (
          id, type, customer_id, loan_id, amount, date,
          previous_balance, updated_balance, payment_method, notes,
          created_at, updated_at
        ) VALUES (?, 'RECEIVED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(txId, customerId, targetLoanId, amount, data.date, prevBalance, updatedBalance, data.paymentMethod || 'cash', data.notes?.trim() || null, createdAt, createdAt);
            // Re-sync installments and loan status
            this.syncLoanInstallmentsAndStatus(targetLoanId);
            return {
                id: txId,
                type: 'RECEIVED',
                customer_id: customerId,
                loan_id: targetLoanId,
                amount,
                date: data.date,
                previous_balance: prevBalance,
                updated_balance: updatedBalance,
                payment_method: data.paymentMethod || 'cash',
                notes: data.notes?.trim() || undefined,
                created_at: createdAt,
                updated_at: createdAt,
            };
        });
    }
    /**
     * Edit/Correct transaction with mandatory audit logging and automatic balance recalculation
     */
    static editTransaction(transactionId, data) {
        const editReason = data.reason?.trim();
        if (!editReason || editReason.length < 3) {
            throw new Error('A detailed reason for editing this financial record is mandatory for the audit log.');
        }
        const amount = (0, loanCalculator_js_1.round2)(data.amount);
        if (amount <= 0) {
            throw new Error('Transaction amount must be greater than zero.');
        }
        if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
            throw new Error('Valid date (YYYY-MM-DD) is required.');
        }
        const db = (0, database_js_1.getDb)();
        const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId);
        if (!existing) {
            throw new Error(`Transaction ${transactionId} not found.`);
        }
        return (0, database_js_1.runInTransaction)((db) => {
            // 1. Save audit log
            const auditId = `AUD-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
            const oldSnapshot = JSON.stringify({
                amount: existing.amount,
                date: existing.date,
                notes: existing.notes,
                updated_at: existing.updated_at,
            });
            const newSnapshot = JSON.stringify({
                amount,
                date: data.date,
                notes: data.notes?.trim() || null,
                edited_at: new Date().toISOString(),
            });
            db.prepare(`
        INSERT INTO transaction_audit_logs (
          id, transaction_id, action, old_data, new_data, reason, created_at
        ) VALUES (?, ?, 'EDIT', ?, ?, ?, ?)
      `).run(auditId, transactionId, oldSnapshot, newSnapshot, editReason, new Date().toISOString());
            // 2. Update transaction
            const updatedAt = new Date().toISOString();
            db.prepare(`
        UPDATE transactions
        SET amount = ?, date = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `).run(amount, data.date, data.notes?.trim() || null, updatedAt, transactionId);
            // If it was a GIVEN transaction (principal disbursement), update loan principal & recalculate loan
            if (existing.type === 'GIVEN') {
                const loan = (0, database_js_1.queryGet)('SELECT * FROM loans WHERE id = ?', existing.loan_id);
                if (loan) {
                    const recalculated = (0, loanCalculator_js_1.calculateLoan)({
                        principalAmount: amount,
                        interestRate: loan.interest_rate,
                        interestType: loan.interest_type,
                        ratePeriod: loan.rate_period,
                        duration: loan.duration,
                        durationUnit: loan.duration_unit,
                        repaymentFrequency: loan.repayment_frequency,
                        customInstallments: loan.total_installments,
                    });
                    db.prepare(`
            UPDATE loans
            SET principal_amount = ?, total_interest = ?, total_amount_payable = ?, total_installments = ?
            WHERE id = ?
          `).run(recalculated.principalAmount, recalculated.totalInterest, recalculated.totalAmountPayable, recalculated.totalInstallments, loan.id);
                    // Regenerate schedule
                    db.prepare('DELETE FROM installments WHERE loan_id = ?').run(loan.id);
                    const newSchedule = (0, loanCalculator_js_1.generateSchedule)(loan.id, loan.customer_id, recalculated.totalAmountPayable, recalculated.totalInstallments, data.date, loan.repayment_frequency);
                    const insertInst = db.prepare(`
            INSERT INTO installments (
              id, loan_id, customer_id, installment_number, due_date,
              expected_amount, paid_amount, status
            ) VALUES (?, ?, ?, ?, ?, ?, 0, 'pending')
          `);
                    for (const inst of newSchedule) {
                        insertInst.run(inst.id, inst.loan_id, inst.customer_id, inst.installment_number, inst.due_date, inst.expected_amount);
                    }
                }
            }
            // 3. Recalculate chronological running balances for this customer
            this.recalculateCustomerBalances(existing.customer_id);
            // 4. Re-sync installments and status for affected loan
            this.syncLoanInstallmentsAndStatus(existing.loan_id);
            const refreshed = (0, database_js_1.queryGet)('SELECT * FROM transactions WHERE id = ?', transactionId);
            return refreshed;
        });
    }
    /**
     * Recalculates and updates chronological running balance values for a customer's transactions
     */
    static recalculateCustomerBalances(customerId) {
        const db = (0, database_js_1.getDb)();
        const txs = (0, database_js_1.queryAll)(`
      SELECT * FROM transactions
      WHERE customer_id = ?
      ORDER BY date ASC, created_at ASC
    `, customerId);
        let runningBalance = 0;
        const updateStmt = db.prepare(`
      UPDATE transactions
      SET previous_balance = ?, updated_balance = ?
      WHERE id = ?
    `);
        for (const tx of txs) {
            const prev = runningBalance;
            if (tx.type === 'GIVEN') {
                // Loan disbursed adds loan total payable to balance
                const loan = (0, database_js_1.queryGet)('SELECT total_amount_payable FROM loans WHERE id = ?', tx.loan_id);
                const addition = loan ? loan.total_amount_payable : tx.amount;
                runningBalance = (0, loanCalculator_js_1.round2)(runningBalance + addition);
            }
            else {
                // Repayment reduces balance
                runningBalance = Math.max(0, (0, loanCalculator_js_1.round2)(runningBalance - tx.amount));
            }
            updateStmt.run(prev, runningBalance, tx.id);
        }
    }
    /**
     * Re-synchronizes installment records and loan status with actual repayment totals
     */
    static syncLoanInstallmentsAndStatus(loanId) {
        const db = (0, database_js_1.getDb)();
        const loan = (0, database_js_1.queryGet)('SELECT * FROM loans WHERE id = ?', loanId);
        if (!loan)
            return;
        const repaymentsSum = (0, database_js_1.queryGet)(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE loan_id = ? AND type = 'RECEIVED'
    `, loanId);
        const totalReceived = (0, loanCalculator_js_1.round2)(repaymentsSum?.total || 0);
        const installments = (0, database_js_1.queryAll)(`
      SELECT * FROM installments
      WHERE loan_id = ?
      ORDER BY installment_number ASC
    `, loanId);
        const { updatedInstallments, overallStatus } = (0, loanCalculator_js_1.updateInstallmentsStatus)(installments, totalReceived);
        const updateInstStmt = db.prepare(`
      UPDATE installments
      SET paid_amount = ?, status = ?, paid_date = ?
      WHERE id = ?
    `);
        for (const inst of updatedInstallments) {
            updateInstStmt.run(inst.paid_amount, inst.status, inst.paid_date || null, inst.id);
        }
        const newLoanStatus = overallStatus === 'Paid' ? 'closed' : overallStatus === 'Overdue' ? 'overdue' : 'active';
        db.prepare('UPDATE loans SET status = ? WHERE id = ?').run(newLoanStatus, loanId);
    }
    static getAuditHistory(transactionId) {
        return (0, database_js_1.queryAll)(`
      SELECT * FROM transaction_audit_logs
      WHERE transaction_id = ?
      ORDER BY created_at DESC
    `, transactionId);
    }
    static getTransactions(filter) {
        let sql = `
      SELECT t.*, c.name as customer_name, c.phone as customer_phone,
             (SELECT COUNT(*) FROM transaction_audit_logs a WHERE a.transaction_id = t.id) as audit_count
      FROM transactions t
      JOIN customers c ON t.customer_id = c.id
      WHERE 1=1
    `;
        const params = [];
        if (filter?.date) {
            sql += ' AND t.date = ?';
            params.push(filter.date);
        }
        if (filter?.startDate) {
            sql += ' AND t.date >= ?';
            params.push(filter.startDate);
        }
        if (filter?.endDate) {
            sql += ' AND t.date <= ?';
            params.push(filter.endDate);
        }
        if (filter?.type) {
            sql += ' AND t.type = ?';
            params.push(filter.type);
        }
        if (filter?.customerId) {
            sql += ' AND t.customer_id = ?';
            params.push(filter.customerId.trim().toUpperCase());
        }
        if (filter?.search) {
            const q = `%${filter.search.trim()}%`;
            const qUpper = `%${filter.search.trim().toUpperCase()}%`;
            sql += ' AND (t.customer_id LIKE ? OR UPPER(c.name) LIKE ? OR c.phone LIKE ? OR t.notes LIKE ?)';
            params.push(qUpper, qUpper, q, q);
        }
        sql += ' ORDER BY t.date DESC, t.created_at DESC';
        return (0, database_js_1.queryAll)(sql, ...params);
    }
    // ==========================================
    // REPORT METHODS
    // ==========================================
    static getDashboardSummary() {
        const todayStr = new Date().toISOString().slice(0, 10);
        const customerCountRow = (0, database_js_1.queryGet)('SELECT COUNT(*) as count FROM customers');
        const totalCustomers = customerCountRow?.count || 0;
        const loansAggregate = (0, database_js_1.queryGet)(`
      SELECT
        COALESCE(SUM(principal_amount), 0) as total_principal,
        COALESCE(SUM(total_amount_payable), 0) as total_payable
      FROM loans
    `);
        const totalGiven = (0, loanCalculator_js_1.round2)(loansAggregate?.total_principal || 0);
        const totalPayable = (0, loanCalculator_js_1.round2)(loansAggregate?.total_payable || 0);
        const totalReceivedRow = (0, database_js_1.queryGet)(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type = 'RECEIVED'
    `);
        const totalReceived = (0, loanCalculator_js_1.round2)(totalReceivedRow?.total || 0);
        const totalOutstandingBalance = Math.max(0, (0, loanCalculator_js_1.round2)(totalPayable - totalReceived));
        const todayGivenRow = (0, database_js_1.queryGet)(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type = 'GIVEN' AND date = ?
    `, todayStr);
        const todayGiven = (0, loanCalculator_js_1.round2)(todayGivenRow?.total || 0);
        const todayReceivedRow = (0, database_js_1.queryGet)(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type = 'RECEIVED' AND date = ?
    `, todayStr);
        const todayReceived = (0, loanCalculator_js_1.round2)(todayReceivedRow?.total || 0);
        // Recent 10 transactions
        const recentTransactions = this.getTransactions().slice(0, 10);
        return {
            total_customers: totalCustomers,
            total_given: totalGiven,
            total_received: totalReceived,
            total_outstanding_balance: totalOutstandingBalance,
            today_given: todayGiven,
            today_received: todayReceived,
            recent_transactions: recentTransactions,
        };
    }
    static getDailyReport(dateStr) {
        const date = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
            ? dateStr
            : new Date().toISOString().slice(0, 10);
        const moneyGiven = (0, database_js_1.queryAll)(`
      SELECT t.*, c.name as customer_name, c.phone as customer_phone,
             (SELECT COUNT(*) FROM transaction_audit_logs a WHERE a.transaction_id = t.id) as audit_count
      FROM transactions t
      JOIN customers c ON t.customer_id = c.id
      WHERE t.date = ? AND t.type = 'GIVEN'
      ORDER BY t.created_at ASC
    `, date);
        const moneyReceived = (0, database_js_1.queryAll)(`
      SELECT t.*, c.name as customer_name, c.phone as customer_phone,
             (SELECT COUNT(*) FROM transaction_audit_logs a WHERE a.transaction_id = t.id) as audit_count
      FROM transactions t
      JOIN customers c ON t.customer_id = c.id
      WHERE t.date = ? AND t.type = 'RECEIVED'
      ORDER BY t.created_at ASC
    `, date);
        const totalGiven = (0, loanCalculator_js_1.round2)(moneyGiven.reduce((acc, t) => acc + t.amount, 0));
        const totalReceived = (0, loanCalculator_js_1.round2)(moneyReceived.reduce((acc, t) => acc + t.amount, 0));
        const netCashFlow = (0, loanCalculator_js_1.round2)(totalReceived - totalGiven);
        return {
            date,
            summary: {
                total_given: totalGiven,
                total_received: totalReceived,
                net_cash_flow: netCashFlow,
                given_count: moneyGiven.length,
                received_count: moneyReceived.length,
            },
            money_given: moneyGiven,
            money_received: moneyReceived,
        };
    }
    static getWeeklyReport(startDateStr, endDateStr) {
        let startDate;
        let endDate;
        if (startDateStr && endDateStr && /^\d{4}-\d{2}-\d{2}$/.test(startDateStr) && /^\d{4}-\d{2}-\d{2}$/.test(endDateStr)) {
            startDate = startDateStr;
            endDate = endDateStr;
        }
        else {
            // Default to current week Monday through Sunday
            const now = new Date();
            const day = now.getDay(); // 0 is Sunday, 1 is Monday
            const diffToMonday = day === 0 ? -6 : 1 - day;
            const monday = new Date(now);
            monday.setDate(now.getDate() + diffToMonday);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            startDate = monday.toISOString().slice(0, 10);
            endDate = sunday.toISOString().slice(0, 10);
        }
        // Transactions in week
        const transactions = (0, database_js_1.queryAll)(`
      SELECT t.*, c.name as customer_name, c.phone as customer_phone,
             (SELECT COUNT(*) FROM transaction_audit_logs a WHERE a.transaction_id = t.id) as audit_count
      FROM transactions t
      JOIN customers c ON t.customer_id = c.id
      WHERE t.date >= ? AND t.date <= ?
      ORDER BY t.date ASC, t.created_at ASC
    `, startDate, endDate);
        let totalGiven = 0;
        let totalReceived = 0;
        const payingCustomersSet = new Set();
        for (const t of transactions) {
            if (t.type === 'GIVEN') {
                totalGiven += t.amount;
            }
            else {
                totalReceived += t.amount;
                payingCustomersSet.add(t.customer_id);
            }
        }
        totalGiven = (0, loanCalculator_js_1.round2)(totalGiven);
        totalReceived = (0, loanCalculator_js_1.round2)(totalReceived);
        const netCashFlow = (0, loanCalculator_js_1.round2)(totalReceived - totalGiven);
        // Total outstanding balance across all customers
        const loansAggregate = (0, database_js_1.queryGet)(`
      SELECT COALESCE(SUM(total_amount_payable), 0) as total_payable
      FROM loans
    `);
        const totalReceivedAllRow = (0, database_js_1.queryGet)(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type = 'RECEIVED'
    `);
        const totalOutstandingBalance = Math.max(0, (0, loanCalculator_js_1.round2)((loansAggregate?.total_payable || 0) - (totalReceivedAllRow?.total || 0)));
        // Daily breakdown for the weekly chart (Monday to Sunday)
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dailyBreakdown = [];
        const startObj = new Date(startDate);
        for (let i = 0; i < 7; i++) {
            const d = new Date(startObj);
            d.setDate(startObj.getDate() + i);
            const curDateStr = d.toISOString().slice(0, 10);
            const given = (0, loanCalculator_js_1.round2)(transactions
                .filter((t) => t.date === curDateStr && t.type === 'GIVEN')
                .reduce((sum, t) => sum + t.amount, 0));
            const received = (0, loanCalculator_js_1.round2)(transactions
                .filter((t) => t.date === curDateStr && t.type === 'RECEIVED')
                .reduce((sum, t) => sum + t.amount, 0));
            dailyBreakdown.push({
                day: dayNames[i],
                date: curDateStr,
                given,
                received,
                net: (0, loanCalculator_js_1.round2)(received - given),
            });
        }
        return {
            week_start: startDate,
            week_end: endDate,
            summary: {
                total_given: totalGiven,
                total_received: totalReceived,
                net_cash_flow: netCashFlow,
                transaction_count: transactions.length,
                customers_paid_count: payingCustomersSet.size,
                total_outstanding_balance: totalOutstandingBalance,
            },
            daily_breakdown: dailyBreakdown,
            transactions,
        };
    }
}
exports.FinanceService = FinanceService;
