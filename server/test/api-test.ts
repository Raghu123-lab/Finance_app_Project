import { FinanceService } from '../src/services/financeService.js';
import { resetDatabase, getDb } from '../src/db/database.js';
import { calculateLoan } from '../src/services/loanCalculator.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ${message}`);
  }
}

async function runTests() {
  console.log('--- Starting Backend Financial Engine Tests ---');

  // Reset to clean test state
  resetDatabase();

  // 1. Customer ID format validation
  console.log('\n--- 1. Testing Customer ID Validation ---');
  const valid1 = FinanceService.validateCustomerId('A001');
  assert(valid1.valid && valid1.normalizedId === 'A001', 'A001 is valid');

  const validLower = FinanceService.validateCustomerId('b105');
  assert(validLower.valid && validLower.normalizedId === 'B105', 'b105 is normalized to uppercase B105');

  const invalid1 = FinanceService.validateCustomerId('1001');
  assert(!invalid1.valid, '1001 is rejected (missing uppercase letter)');

  const invalid2 = FinanceService.validateCustomerId('AB01');
  assert(!invalid2.valid, 'AB01 is rejected (more than one uppercase letter)');

  const invalid3 = FinanceService.validateCustomerId('A');
  assert(!invalid3.valid, 'A without numbers is rejected');

  // 2. Customer Registration
  console.log('\n--- 2. Testing Customer Registration & Duplicate Prevention ---');
  const c1 = FinanceService.createCustomer({
    id: 'A001',
    name: 'Ramesh Sharma',
    address: 'Shop 14, Main Market, Hyderabad',
    phone: '9848011111',
    notes: 'Textile vendor',
  });
  assert(c1.id === 'A001', 'Customer A001 registered successfully');

  // Duplicate ID
  try {
    FinanceService.createCustomer({
      id: 'A001',
      name: 'Duplicate Ramesh',
      address: 'Somewhere',
      phone: '9848022222',
    });
    assert(false, 'Should have failed on duplicate ID');
  } catch (err: any) {
    assert(err.message.includes('already exists'), 'Duplicate customer ID correctly rejected');
  }

  // Duplicate Phone
  try {
    FinanceService.createCustomer({
      id: 'A002',
      name: 'Another Customer',
      address: 'Somewhere',
      phone: '9848011111', // same phone as A001
    });
    assert(false, 'Should have failed on duplicate phone');
  } catch (err: any) {
    assert(err.message.includes('already registered'), 'Duplicate phone correctly rejected');
  }

  // Register second customer
  const c2 = FinanceService.createCustomer({
    id: 'A002',
    name: 'Sunita Patel',
    address: 'Flat 202, Ameerpet',
    phone: '9848022222',
  });
  assert(c2.id === 'A002', 'Customer A002 registered with different phone');

  // 3. Loan Calculations & Creation
  console.log('\n--- 3. Testing Loan Calculations & Creation ---');
  // Simple interest: ₹20,000 for 4 weeks @ 2% per month (duration in months = 4/4 = 1 month)
  // Interest = 20000 * 0.02 * 1 = 400. Total payable = 20400. Installments = 4 * 5100.
  const calc1 = calculateLoan({
    principalAmount: 20000,
    interestRate: 2,
    interestType: 'simple',
    ratePeriod: 'per_month',
    duration: 4,
    durationUnit: 'weeks',
    repaymentFrequency: 'weekly',
  });
  assert(calc1.totalInterest === 400, 'Total interest calculated correctly (₹400)');
  assert(calc1.totalAmountPayable === 20400, 'Total payable calculated correctly (₹20,400)');
  assert(calc1.totalInstallments === 4, 'Total installments is 4');
  assert(calc1.installmentAmount === 5100, 'Each installment is ₹5,100');

  const loanResult = FinanceService.createLoan({
    customerId: 'A001',
    principalAmount: 20000,
    interestRate: 2,
    interestType: 'simple',
    ratePeriod: 'per_month',
    duration: 4,
    durationUnit: 'weeks',
    repaymentFrequency: 'weekly',
    dateGiven: '2026-11-01',
    notes: 'First business loan',
  });

  assert(loanResult.loan.customer_id === 'A001', 'Loan recorded for A001');
  assert(loanResult.schedule.length === 4, 'Installment schedule generated with 4 installments');
  assert(loanResult.transaction.type === 'GIVEN', 'Disbursement transaction automatically created');
  assert(loanResult.transaction.amount === 20000, 'Disbursement amount matches principal');

  // 4. Customer Balance Check
  console.log('\n--- 4. Testing Customer Financial Summary ---');
  let profile = FinanceService.getCustomerProfile('A001');
  assert(profile.financial_summary.total_given === 20000, 'Total given is ₹20,000');
  assert(profile.financial_summary.total_payable === 20400, 'Total payable is ₹20,400');
  assert(profile.financial_summary.total_received === 0, 'Total received is 0');
  assert(profile.financial_summary.remaining_balance === 20400, 'Remaining balance is ₹20,400');
  assert(profile.financial_summary.installments_paid === 0, '0 installments paid');

  // 5. Repayments (Partial and Full)
  console.log('\n--- 5. Testing Repayments & Balance Updates ---');
  // Partial payment of ₹3000 (installment is ₹5100)
  const rep1 = FinanceService.recordRepayment({
    customerId: 'A001',
    loanId: loanResult.loan.id,
    amount: 3000,
    date: '2026-11-08',
    notes: 'Partial payment installment 1',
  });
  assert(rep1.updated_balance === 17400, 'Updated balance after ₹3000 payment is ₹17,400 (20400 - 3000)');

  profile = FinanceService.getCustomerProfile('A001');
  assert(profile.financial_summary.total_received === 3000, 'Total received is ₹3,000');
  assert(profile.financial_summary.remaining_balance === 17400, 'Remaining balance is ₹17,400');
  assert(profile.financial_summary.installments_paid === 0, 'Installment not counted as completed because it is partial');

  // Pay remaining ₹2100 for installment 1 + ₹5100 for installment 2 on same day
  FinanceService.recordRepayment({
    customerId: 'A001',
    loanId: loanResult.loan.id,
    amount: 2100,
    date: '2026-11-08',
    notes: 'Remaining installment 1 balance',
  });

  profile = FinanceService.getCustomerProfile('A001');
  assert(profile.financial_summary.installments_paid === 1, 'Installment 1 is now counted as completed');
  assert(profile.financial_summary.remaining_balance === 15300, 'Remaining balance is ₹15,300');

  // 6. Chronological Transaction History
  console.log('\n--- 6. Testing Chronological Transaction History ---');
  assert(profile.transactions.length === 3, 'Profile has 3 chronological transactions (1 disbursement, 2 repayments)');
  assert(profile.transactions[0].type === 'GIVEN', 'First transaction is GIVEN');
  assert(profile.transactions[1].type === 'RECEIVED', 'Second transaction is RECEIVED');
  assert(profile.transactions[2].type === 'RECEIVED', 'Third transaction is RECEIVED');

  // 7. Transaction Edit with Mandatory Audit History
  console.log('\n--- 7. Testing Transaction Edit & Audit Trail ---');
  const txToEdit = profile.transactions[1]; // the ₹3000 payment
  const edited = FinanceService.editTransaction(txToEdit.id, {
    amount: 3500, // corrected to ₹3500
    date: txToEdit.date,
    notes: 'Corrected receipt amount',
    reason: 'Typo in receipt entry, customer paid 3500 not 3000',
  });
  assert(edited.amount === 3500, 'Transaction amount updated to 3500');

  const auditHistory = FinanceService.getAuditHistory(txToEdit.id);
  assert(auditHistory.length === 1, 'Audit log created for edited transaction');
  assert(auditHistory[0].reason.includes('Typo in receipt'), 'Audit reason stored accurately');

  profile = FinanceService.getCustomerProfile('A001');
  assert(profile.financial_summary.total_received === 5600, 'Total received recalculated accurately (3500 + 2100 = 5600)');
  assert(profile.financial_summary.remaining_balance === 14800, 'Remaining balance recalculated accurately (20400 - 5600 = 14800)');

  // 8. Daily and Weekly Reports
  console.log('\n--- 8. Testing Daily and Weekly Reports ---');
  const daily = FinanceService.getDailyReport('2026-11-08');
  assert(daily.summary.total_received === 5600, 'Daily report total received on 2026-11-08 is ₹5,600');
  assert(daily.summary.net_cash_flow === 5600, 'Net cash flow on 2026-11-08 is ₹5,600');

  const weekly = FinanceService.getWeeklyReport('2026-11-02', '2026-11-08');
  assert(weekly.summary.total_received === 5600, 'Weekly report total received is ₹5,600');
  assert(weekly.summary.customers_paid_count === 1, '1 customer paid during the week');

  // Dashboard summary
  const dash = FinanceService.getDashboardSummary();
  assert(dash.total_customers === 2, '2 total registered customers');
  assert(dash.total_given === 20000, 'Total given is ₹20,000');
  assert(dash.total_received === 5600, 'Total received is ₹5,600');
  assert(dash.total_outstanding_balance === 14800, 'Total outstanding is ₹14,800');

  console.log('\n🎉 ALL BACKEND LOGIC AND ACCURACY TESTS PASSED PERFECTLY!\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

