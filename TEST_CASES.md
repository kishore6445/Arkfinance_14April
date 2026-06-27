# ARKFINANCE (WARRIOR FINANCE) - COMPREHENSIVE TEST CASES

## Document Info
- **Application:** ArkFinance Financial Management System
- **Version:** 1.0
- **Date:** April 2024
- **Scope:** Full application testing (excluding Tally/Zoho integration)
- **Environment:** Staging/QA

---

## TABLE OF CONTENTS
1. [Authentication & Access Control](#1-authentication--access-control)
2. [Dashboard & Snapshot Screen](#2-dashboard--snapshot-screen)
3. [Bank Account Management](#3-bank-account-management)
4. [Transaction Management](#4-transaction-management)
5. [Invoice Management](#5-invoice-management)
6. [Budget Management](#6-budget-management)
7. [Cash Flow & Runway](#7-cash-flow--runway)
8. [Payroll Management](#8-payroll-management)
9. [Reconciliation](#9-reconciliation)
10. [Reports & Analytics](#10-reports--analytics)
11. [Data Validation & Error Handling](#11-data-validation--error-handling)
12. [Business Logic & Calculations](#12-business-logic--calculations)
13. [UI/UX & User Experience](#13-uiux--user-experience)
14. [Performance & Load Testing](#14-performance--load-testing)
15. [Security & Data Protection](#15-security--data-protection)

---

## 1. AUTHENTICATION & ACCESS CONTROL

### 1.1 Signup & Account Creation
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_AUTH_001 | Valid signup with email | 1. Navigate to /signup<br>2. Enter valid email, password (8+ chars)<br>3. Confirm password<br>4. Click "Sign Up" | Account created, email verification sent, redirected to login | P0 |
| TC_AUTH_002 | Signup with weak password | 1. Enter email<br>2. Enter password < 8 chars<br>3. Click Sign Up | Error message: "Password must be at least 8 characters" | P1 |
| TC_AUTH_003 | Signup with invalid email | 1. Enter invalid email format<br>2. Enter valid password<br>3. Click Sign Up | Error: "Invalid email format" | P1 |
| TC_AUTH_004 | Signup with existing email | 1. Enter email already registered<br>2. Enter password<br>3. Click Sign Up | Error: "Email already registered" | P1 |
| TC_AUTH_005 | Signup with mismatched passwords | 1. Enter password<br>2. Enter different password in confirm field<br>3. Click Sign Up | Error: "Passwords do not match" | P1 |
| TC_AUTH_006 | Signup without accepting terms | 1. Leave "I agree to terms" unchecked<br>2. Click Sign Up | Button disabled OR error message displayed | P2 |

### 1.2 Login & Authentication
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_AUTH_007 | Valid login with correct credentials | 1. Navigate to /signin<br>2. Enter registered email<br>3. Enter correct password<br>4. Click "Sign In" | User logged in, redirected to /dashboard | P0 |
| TC_AUTH_008 | Login with incorrect password | 1. Enter registered email<br>2. Enter wrong password<br>3. Click Sign In | Error: "Invalid email or password" | P1 |
| TC_AUTH_009 | Login with unregistered email | 1. Enter non-existent email<br>2. Enter any password<br>3. Click Sign In | Error: "Invalid email or password" | P1 |
| TC_AUTH_010 | Login with empty fields | 1. Leave email field empty<br>2. Leave password field empty<br>3. Click Sign In | Button disabled OR error message | P1 |
| TC_AUTH_011 | Persistent login session | 1. Login successfully<br>2. Refresh page<br>3. Navigate to different pages | User remains logged in, no redirect to login | P0 |
| TC_AUTH_012 | Logout functionality | 1. Login successfully<br>2. Click logout/profile menu<br>3. Click "Log Out" | User logged out, redirected to /signin, session cleared | P0 |
| TC_AUTH_013 | Session timeout | 1. Login<br>2. Leave app idle for configured time<br>3. Try to perform action | Session expired message, redirected to login | P2 |
| TC_AUTH_014 | Login with email case variations | 1. Register with "User@Email.com"<br>2. Login with "user@email.com" | Login successful (email is case-insensitive) | P2 |

### 1.3 Set Password
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_AUTH_015 | Set initial password | 1. Access /auth/set-password with valid token<br>2. Enter new password (8+ chars)<br>3. Confirm password<br>4. Click "Set Password" | Password set successfully, redirected to dashboard | P0 |
| TC_AUTH_016 | Set password with invalid token | 1. Access /auth/set-password with invalid/expired token<br>2. Try to set password | Error: "Invalid or expired token" | P1 |
| TC_AUTH_017 | Set password with weak password | 1. Enter password < 8 characters<br>2. Click "Set Password" | Error: "Password must be at least 8 characters" | P1 |

### 1.4 Organization Access Control
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_AUTH_018 | Create new organization | 1. Login as new user<br>2. Navigate to /create-organization<br>3. Enter organization name, GST number<br>4. Click "Create" | Organization created, user added as owner, redirected to dashboard | P0 |
| TC_AUTH_019 | Access organization dashboard | 1. Login with multiple organizations<br>2. Select org from switcher<br>3. Access /dashboard | Dashboard loaded with org-specific data | P0 |
| TC_AUTH_020 | Org-specific data isolation | 1. Create Org A, add transactions<br>2. Switch to Org B<br>3. Check transactions list | Only Org B transactions visible, Org A data hidden | P0 |

---

## 2. DASHBOARD & SNAPSHOT SCREEN

### 2.1 Dashboard Load & Rendering
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_DASH_001 | Dashboard page loads | 1. Login<br>2. Navigate to /dashboard | Page loads within 3 seconds, all elements visible | P0 |
| TC_DASH_002 | Dashboard renders hero section | 1. Access dashboard<br>2. Check Business Health card | Shows: Score (0-100), status badge, progress gauge, insight text | P0 |
| TC_DASH_003 | Dashboard renders KPI cards | 1. Access dashboard<br>2. Check right side KPI cards | Shows: Cash Available, Runway (months), Net Cash Flow | P0 |
| TC_DASH_004 | Dashboard renders charts | 1. Access dashboard<br>2. Check chart sections | All 5 charts render: Rev vs Exp, Cash Flow, Revenue Source, Expense Breakdown, Invoice Status | P0 |
| TC_DASH_005 | Empty dashboard with no data | 1. Create new org<br>2. Access dashboard | Default placeholder data shown, no crashes | P1 |

### 2.2 Business Health Score
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_DASH_006 | Health score displays correctly | 1. Access dashboard with transactions | Health score between 0-100 displayed | P0 |
| TC_DASH_007 | Health score color coding | 1. Check health score | Score ≥80 = Green, 60-79 = Amber, <60 = Red | P0 |
| TC_DASH_008 | Health score status label | 1. Check status badge | Shows: "Healthy" (≥80), "Fair" (60-79), "At Risk" (<60) | P0 |
| TC_DASH_009 | Health score calculation (Runway) | 1. Set runway to 8 months<br>2. Check health contribution | Runway component = 100 points | P1 |
| TC_DASH_010 | Health score calculation (Loan Ratio) | 1. Set loan payments < 10% of revenue<br>2. Check health | Loan ratio component = 100 points | P1 |
| TC_DASH_011 | Health score updates on transaction | 1. Note current health score<br>2. Add new expense transaction<br>3. Refresh dashboard | Health score recalculated, may decrease | P1 |

### 2.3 Cash Position & Runway
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_DASH_012 | Cash Available displays correctly | 1. Access dashboard<br>2. Check "Cash Available" KPI | Shows formatted rupees (₹1.45L format) | P0 |
| TC_DASH_013 | Runway calculation | 1. Check "Runway" KPI<br>2. Manual calc: Cash ÷ Monthly Burn | Value matches expected calculation | P1 |
| TC_DASH_014 | Runway color indicator | 1. Check runway card | ≥6 months = Green, 3-5 = Amber, <3 = Red | P0 |
| TC_DASH_015 | Runway recalculates on new transaction | 1. Note runway value<br>2. Add expense transaction<br>3. Refresh | Runway updates based on new monthly burn | P1 |

### 2.4 Revenue vs Expenses Chart
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_DASH_016 | Vertical bar chart renders | 1. Access dashboard<br>2. Locate Revenue vs Expenses section | Chart displays with 4 weeks, green (revenue) + red (expense) bars | P0 |
| TC_DASH_017 | Chart shows correct data | 1. Add transactions for different weeks<br>2. View chart | Bars update with transaction amounts | P1 |
| TC_DASH_018 | Chart has time filter | 1. Look for filter dropdown<br>2. Change from Monthly to Weekly | Chart data granularity updates | P1 |

### 2.5 Invoice Status Card
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_DASH_019 | Invoice status breakdown displays | 1. Access dashboard<br>2. Check "Invoice Status" card | Shows stacked bar with Paid (green), Pending (amber), Overdue (red) | P0 |
| TC_DASH_020 | Invoice counts match data | 1. Create 10 paid, 5 pending, 2 overdue invoices<br>2. Check dashboard | Counts and percentages correct (62.5% paid, 31.25% pending, 6.25% overdue) | P1 |

### 2.6 Expense Breakdown Donut
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_DASH_021 | Expense donut chart renders | 1. Access dashboard<br>2. Check "Expense Breakdown" | Donut chart displays with 5 categories (Salaries, Operations, Infrastructure, Marketing, Other) | P0 |
| TC_DASH_022 | Expense categories show percentages | 1. View expense donut<br>2. Hover over segments | Percentage values displayed in labels | P0 |
| TC_DASH_023 | Insight text appears below donut | 1. Check expense breakdown card | Insight: "Salaries contribute 45% of total expenses this month" | P1 |

### 2.7 Cash Flow Trend Chart
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_DASH_024 | Line chart renders | 1. Access dashboard<br>2. Locate "Cash Flow Trend" | 3-line chart shows: Cash In (green), Cash Out (red), Net (blue) | P0 |
| TC_DASH_025 | Chart shows 7-day data | 1. View chart<br>2. Count x-axis labels | Shows Mon-Sun labels | P0 |

### 2.8 Action Center Alerts
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_DASH_026 | Overdue invoices alert | 1. Create 2 overdue invoices<br>2. Check Action Center | "Overdue Invoices: 2 invoices overdue" shown | P0 |
| TC_DASH_027 | Pending approvals alert | 1. Create pending approvals<br>2. Check Action Center | Shows total pending amount and count | P1 |
| TC_DASH_028 | Compliance alert | 1. Check Action Center<br>2. Verify compliance message | Shows relevant compliance deadline | P1 |
| TC_DASH_029 | Budget alert | 1. Set Marketing budget to 100k<br>2. Spend 85k<br>3. Check Action Center | "Marketing budget 85% used" shown | P1 |
| TC_DASH_030 | Alert card click navigation | 1. Click alert card button<br>2. E.g., click "Overdue Invoices" | Navigate to /invoices with overdue filter applied | P1 |

### 2.9 Cash & Accounts Section
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_DASH_031 | Bank accounts card displays | 1. Access dashboard<br>2. Check Cash & Accounts section | Shows account count and top 2 accounts with balances | P0 |
| TC_DASH_032 | Bucket allocation card displays | 1. Check bucket allocation card | Shows allocation count and distribution percentages | P1 |
| TC_DASH_033 | Recent transfers card displays | 1. Create inter-account transfers<br>2. Check dashboard | Shows last 2 transfers | P1 |

### 2.10 Time Period Filtering
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_DASH_034 | Time period selector | 1. Access dashboard<br>2. Check date filter in header | Dropdown shows: Today, This Week, This Month, This Quarter, This Year | P1 |
| TC_DASH_035 | Dashboard updates on time period change | 1. Change time period<br>2. Verify metrics recalculate | All KPIs and charts update based on period | P1 |

---

## 3. BANK ACCOUNT MANAGEMENT

### 3.1 Create Bank Account
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_BANK_001 | Create account with all required fields | 1. Navigate to /bank<br>2. Click "Add Account"<br>3. Enter: Name, Bank Name, Account Number, Type, Opening Balance<br>4. Click "Save" | Account created, appears in list | P0 |
| TC_BANK_002 | Create account without required field | 1. Leave account name empty<br>2. Try to save | Error: "Account name is required" | P1 |
| TC_BANK_003 | Create account with duplicate number | 1. Create account with number 1234567890<br>2. Try to create another with same number | Error: "Account number already exists" | P1 |
| TC_BANK_004 | Create account with invalid account number | 1. Enter invalid account number format<br>2. Try to save | Error: "Invalid account number" | P1 |
| TC_BANK_005 | Create account with negative opening balance | 1. Enter negative opening balance<br>2. Try to save | Error: "Opening balance cannot be negative" | P1 |
| TC_BANK_006 | Create multiple accounts | 1. Create 3 accounts<br>2. Check list | All 3 accounts listed with correct details | P1 |

### 3.2 View & List Bank Accounts
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_BANK_007 | View all bank accounts | 1. Navigate to /bank | List shows all created accounts with: Name, Bank, Balance, Account Type | P0 |
| TC_BANK_008 | Account details display | 1. Click on account<br>2. View details | Shows: Account name, bank, number, type, opening balance, current balance, transactions | P1 |
| TC_BANK_009 | Account balance updates on transaction | 1. Create transaction for account<br>2. Refresh account view | Current balance updated correctly | P1 |
| TC_BANK_010 | Sort accounts list | 1. Check if sort options available<br>2. Sort by name/balance/date | Accounts sorted correctly | P2 |

### 3.3 Edit Bank Account
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_BANK_011 | Edit account details | 1. Select account<br>2. Click "Edit"<br>3. Change account name<br>4. Click "Save" | Account name updated | P1 |
| TC_BANK_012 | Edit with invalid data | 1. Click Edit<br>2. Enter invalid account number<br>3. Try to save | Error message displayed | P1 |
| TC_BANK_013 | Cannot edit account number | 1. Open account for edit<br>2. Check if account number field is editable | Account number field disabled (read-only) | P2 |

### 3.4 Delete Bank Account
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_BANK_014 | Delete account with no transactions | 1. Create account with no transactions<br>2. Click "Delete"<br>3. Confirm | Account deleted from list | P1 |
| TC_BANK_015 | Delete account with transactions | 1. Create account with transactions<br>2. Try to delete | Error: "Cannot delete account with existing transactions" | P1 |
| TC_BANK_016 | Delete confirmation dialog | 1. Click delete on any account<br>2. Check dialog | Shows: "Are you sure?" with cancel/confirm buttons | P1 |

### 3.5 Reconciliation
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_BANK_017 | Account reconciliation page loads | 1. Navigate to /reconciliation<br>2. Select account | Shows: Reconciliation form with statement entries | P1 |
| TC_BANK_018 | Mark transaction as reconciled | 1. Check transaction from bank statement<br>2. System matches with account transaction | Transaction marked reconciled, balance verified | P1 |
| TC_BANK_019 | Reconciliation discrepancy detection | 1. Bank balance in statement ≠ system balance<br>2. Check reconciliation | Warning displayed with difference amount | P1 |

### 3.6 Bucket Allocation
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_BANK_020 | View bucket allocation | 1. Navigate to /buckets or bank account details<br>2. Check allocation section | Shows: Buckets with percentages (Operating, GST, Reserve, CapEx) | P1 |
| TC_BANK_021 | Edit bucket allocation | 1. Click "Edit Allocation"<br>2. Change percentage distribution<br>3. Save | Allocation updated, total must = 100% | P1 |
| TC_BANK_022 | Allocation percentage validation | 1. Try to set allocation totaling 95%<br>2. Try to save | Error: "Total allocation must equal 100%" | P1 |
| TC_BANK_023 | View cash distribution pie chart | 1. Check dashboard pie chart<br>2. Verify data matches allocation | Pie chart shows correct account distribution | P1 |

---

## 4. TRANSACTION MANAGEMENT

### 4.1 Create Transaction
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_TXN_001 | Create income transaction | 1. Navigate to transactions<br>2. Click "Add Transaction"<br>3. Select Type: Income<br>4. Enter: Amount, Date, Description, Category<br>5. Save | Transaction created, appears in list | P0 |
| TC_TXN_002 | Create expense transaction | 1. Select Type: Expense<br>2. Fill required fields<br>3. Save | Expense transaction created | P0 |
| TC_TXN_003 | Create transaction without amount | 1. Leave amount field empty<br>2. Try to save | Error: "Amount is required" | P1 |
| TC_TXN_004 | Create transaction without date | 1. Leave date field empty<br>2. Try to save | Error: "Date is required" | P1 |
| TC_TXN_005 | Create transaction with negative amount | 1. Enter negative amount<br>2. Try to save | Treat as income/expense reversal OR error | P1 |
| TC_TXN_006 | Create transaction with future date | 1. Enter date in future (2025)<br>2. Save | Transaction created with future date (if allowed) | P2 |
| TC_TXN_007 | Create transaction with past date | 1. Enter date from 12 months ago<br>2. Save | Transaction created with historical date | P0 |
| TC_TXN_008 | Create transaction with vendor reference | 1. Select vendor/customer from dropdown<br>2. Save | Vendor linked to transaction | P1 |
| TC_TXN_009 | Create GST transaction | 1. Enable GST checkbox<br>2. Enter HSN/SAC, GST rate (18%)<br>3. Verify tax calculated | GST amount auto-calculated: Amount × Rate | P1 |
| TC_TXN_010 | Create transaction with payment mode | 1. Select payment mode (UPI, Check, Bank Transfer, etc.)<br>2. Enter reference number<br>3. Save | Payment mode and reference stored | P1 |

### 4.2 View Transactions
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_TXN_011 | List all transactions | 1. Navigate to transactions page<br>2. Check list | Shows all transactions with: Date, Description, Amount, Category, Status | P0 |
| TC_TXN_012 | Filter by transaction type | 1. Click "Income" filter<br>2. Check list | Only income transactions shown | P1 |
| TC_TXN_013 | Filter by category | 1. Select category filter<br>2. Check list | Only transactions in that category shown | P1 |
| TC_TXN_014 | Filter by date range | 1. Select date range (Jan-Mar)<br>2. Check list | Only transactions within range shown | P1 |
| TC_TXN_015 | Sort transactions by date | 1. Check sort dropdown<br>2. Sort by oldest/newest | Transactions ordered correctly | P1 |
| TC_TXN_016 | Search transactions | 1. Enter search term in search box (e.g., "Salary")<br>2. Check results | Matching transactions displayed | P1 |
| TC_TXN_017 | Transaction detail view | 1. Click on transaction<br>2. Check detail panel | Shows all fields: Amount, Date, Description, Category, GST, Vendor, Status | P1 |
| TC_TXN_018 | Pagination works | 1. Navigate to last page<br>2. Create new transaction<br>3. Check pagination | New transaction appears on correct page | P2 |

### 4.3 Edit Transaction
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_TXN_019 | Edit transaction amount | 1. Open transaction<br>2. Click "Edit"<br>3. Change amount from 50000 to 60000<br>4. Save | Amount updated, cash balance recalculated | P1 |
| TC_TXN_020 | Edit transaction category | 1. Change category from Salaries to Bonuses<br>2. Save | Category updated | P1 |
| TC_TXN_021 | Edit reconciled transaction | 1. Open reconciled transaction<br>2. Try to edit | Either allow edit with warning OR prevent edit | P1 |
| TC_TXN_022 | Edit with invalid data | 1. Change amount to negative/invalid<br>2. Try to save | Error: "Invalid amount" | P1 |
| TC_TXN_023 | Audit trail on edit | 1. Edit transaction<br>2. Check edit history/audit log | Shows: Original values, new values, timestamp, user | P2 |

### 4.4 Delete Transaction
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_TXN_024 | Delete transaction | 1. Select transaction<br>2. Click "Delete"<br>3. Confirm | Transaction removed from list, cash balance updated | P1 |
| TC_TXN_025 | Delete reconciled transaction | 1. Try to delete reconciled transaction | Error: "Cannot delete reconciled transaction" OR allow with confirmation | P1 |
| TC_TXN_026 | Undo delete (within time window) | 1. Delete transaction<br>2. Click "Undo" within 5 minutes<br>3. Check list | Transaction restored | P2 |

### 4.5 Transaction Calculations
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_TXN_027 | Running cash balance | 1. Create transactions: +100k, -30k, +50k<br>2. Check running balance | Balance updates: 100k → 70k → 120k | P0 |
| TC_TXN_028 | GST calculation | 1. Create transaction for ₹10000 @ 18% GST<br>2. Check GST amount | GST = 10000 × 18% = ₹1800, Total = ₹11800 | P0 |
| TC_TXN_029 | Monthly aggregation | 1. Create 5 transactions in January<br>2. Check month summary | Shows total income, total expense, net for month | P1 |
| TC_TXN_030 | Category-wise expense breakdown | 1. Create expenses across multiple categories<br>2. Check breakdown | Shows % distribution by category | P1 |

---

## 5. INVOICE MANAGEMENT

### 5.1 Create Sales Invoice
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_INV_001 | Create sales invoice with all fields | 1. Navigate to /invoices/create<br>2. Select Type: Sales<br>3. Enter: Invoice Number, Party Name, Date, Due Date, Amount, GST Rate<br>4. Save | Invoice created with status "Pending", appears in list | P0 |
| TC_INV_002 | Create invoice without invoice number | 1. Leave invoice number field empty<br>2. Try to save | Auto-generate invoice number OR error | P1 |
| TC_INV_003 | Create invoice with duplicate number | 1. Create invoice with "INV-001"<br>2. Try to create another with same number | Error: "Invoice number already exists" | P1 |
| TC_INV_004 | Create invoice without due date | 1. Leave due date field empty<br>2. Save | Either auto-set based on credit days OR error | P1 |
| TC_INV_005 | Create invoice with zero amount | 1. Enter amount as 0<br>2. Try to save | Error: "Amount must be greater than 0" | P1 |
| TC_INV_006 | Create invoice with future date | 1. Enter invoice date as future date<br>2. Save | Allow or error based on business rules | P2 |
| TC_INV_007 | Create invoice with GST | 1. Enter amount 10000, GST rate 18%<br>2. Check calculated amount | Total = 10000 + (10000 × 18%) = 11800 | P0 |
| TC_INV_008 | Create invoice with line items | 1. If applicable, add multiple line items<br>2. Each with rate, qty, tax<br>3. Save | Line items summed correctly to invoice total | P1 |

### 5.2 Create Purchase Invoice
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_INV_009 | Create purchase invoice | 1. Navigate to /invoices/create<br>2. Select Type: Purchase<br>3. Fill fields<br>4. Save | Purchase invoice created (VINV-001 format) | P0 |
| TC_INV_010 | Create purchase invoice with vendor | 1. Select vendor from dropdown<br>2. Save | Vendor linked to purchase invoice | P1 |

### 5.3 View Invoices
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_INV_011 | List all invoices | 1. Navigate to /invoices<br>2. Check list | Shows all invoices: Number, Party, Amount, Due Date, Status | P0 |
| TC_INV_012 | Filter by type (Sales/Purchase) | 1. Click "Sales" filter | Only sales invoices shown | P1 |
| TC_INV_013 | Filter by status | 1. Select status filter: Paid/Pending/Overdue<br>2. Check list | Only invoices with that status shown | P1 |
| TC_INV_014 | Sort by due date | 1. Sort by "Due Date"<br>2. Check order | Invoices ordered by due date (earliest first) | P1 |
| TC_INV_015 | Invoice aging report | 1. Navigate to /invoices/aging<br>2. Check report | Shows invoices grouped by age: 0-30, 31-60, 61-90, 90+ days | P1 |
| TC_INV_016 | Invoice detail view | 1. Click on invoice<br>2. Check details | Shows: All fields, line items, payment history, linked transaction | P1 |

### 5.4 Invoice Status Updates
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_INV_017 | Mark invoice as paid | 1. Open pending invoice<br>2. Click "Record Payment"<br>3. Enter payment amount & date<br>4. Save | Invoice status changed to "Paid", balance = 0 | P0 |
| TC_INV_018 | Partial payment | 1. Create invoice for 100k<br>2. Record payment of 60k<br>3. Check status | Status = "Partial", balance = 40k, balanceAmount field updated | P0 |
| TC_INV_019 | Invoice becomes overdue | 1. Create invoice with due date = yesterday<br>2. Status not marked paid<br>3. Check status | Status automatically changes to "Overdue" | P0 |
| TC_INV_020 | Mark invoice as cancelled | 1. Open pending invoice<br>2. Click "Cancel"<br>3. Confirm | Invoice status = "Cancelled", appears in cancelled filter | P1 |

### 5.5 Edit Invoice
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_INV_021 | Edit unpaid invoice | 1. Open pending invoice<br>2. Edit amount<br>3. Save | Amount updated, balance recalculated | P1 |
| TC_INV_022 | Cannot edit paid invoice | 1. Open paid invoice<br>2. Try to edit | Warning: "Cannot edit paid invoice" OR prevent edit | P1 |
| TC_INV_023 | Edit due date | 1. Change due date<br>2. Save | Due date updated | P1 |

### 5.6 Invoice Payment Tracking
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_INV_024 | Record full payment | 1. Open invoice<br>2. Click "Record Payment"<br>3. Enter full amount, payment date, mode<br>4. Save | Payment recorded, linked transaction created | P0 |
| TC_INV_025 | Record multiple partial payments | 1. Record payment 1: 40k<br>2. Record payment 2: 30k<br>3. Record payment 3: 30k | All 3 payments tracked, status moves to "Paid" after final payment | P1 |
| TC_INV_026 | Payment reconciliation | 1. Create invoice & record payment<br>2. Check linked transaction | Payment transaction appears in transaction list | P1 |
| TC_INV_027 | Payment history | 1. Open invoice with payments<br>2. Check payment history section | Shows all payment records: Amount, Date, Mode, Reference | P1 |

### 5.7 Invoice Report Integration
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_INV_028 | Invoice status appears in dashboard | 1. Create invoices: 5 paid, 3 pending, 1 overdue<br>2. Check dashboard "Invoice Status" card | Card shows: 5 paid (62.5%), 3 pending (37.5%), 1 overdue (12.5%) | P1 |
| TC_INV_029 | Overdue invoices trigger alert | 1. Create 2 overdue invoices<br>2. Check dashboard alerts | "Overdue Invoices: 2 invoices overdue" alert shown | P0 |
| TC_INV_030 | Invoice aging report | 1. Navigate to /invoices/aging<br>2. Check age categories | Invoices correctly grouped by days outstanding | P1 |

---

## 6. BUDGET MANAGEMENT

### 6.1 Create Budget
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_BUDG_001 | Create annual budget | 1. Navigate to /budgets<br>2. Click "Create Budget"<br>3. Enter: Category, Budget Amount, Period (Annual)<br>4. Save | Budget created for year, appears in list | P0 |
| TC_BUDG_002 | Create monthly budget | 1. Select Period: Monthly<br>2. Set amount<br>3. Save | Budget created for current month | P1 |
| TC_BUDG_003 | Create budget without amount | 1. Leave amount empty<br>2. Try to save | Error: "Budget amount is required" | P1 |
| TC_BUDG_004 | Create budget with zero amount | 1. Enter amount as 0<br>2. Try to save | Error: "Budget amount must be greater than 0" | P1 |
| TC_BUDG_005 | Create budget for multiple categories | 1. Create budgets for: Salaries, Rent, Operations<br>2. Check list | All 3 budgets listed with amounts | P1 |

### 6.2 View Budgets
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_BUDG_006 | List all budgets | 1. Navigate to /budgets<br>2. Check list | Shows: Category, Budget Amount, Spent Amount, Remaining, % Used | P0 |
| TC_BUDG_007 | Budget vs Actual chart | 1. Navigate to /budgets/vs-actual<br>2. Check chart | Shows budgeted vs actual spend side-by-side bars | P1 |
| TC_BUDG_008 | Budget utilization % | 1. Create budget of 100k, spend 75k<br>2. Check utilization | Shows "75% used" OR "75k of 100k" | P1 |

### 6.3 Budget Tracking
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_BUDG_009 | Budget auto-calculation on expense | 1. Create Marketing budget of 100k<br>2. Create expense of 50k in Marketing category<br>3. Check budget | Spent amount = 50k, Remaining = 50k, % = 50% | P0 |
| TC_BUDG_010 | Budget alert at 75% usage | 1. Create budget of 100k<br>2. Spend 75k<br>3. Check alerts | Alert: "Marketing budget 75% used" | P1 |
| TC_BUDG_011 | Budget alert at 100% | 1. Spend to reach 100%<br>2. Try to add more expense | Warning: "Budget exceeded" OR error | P1 |
| TC_BUDG_012 | Over-budget spending | 1. Budget = 100k, spend 120k<br>2. Check status | Marked as "Over Budget", shows +20k overage | P1 |

### 6.4 Edit Budget
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_BUDG_013 | Edit budget amount | 1. Open budget<br>2. Change amount from 100k to 150k<br>3. Save | Budget amount updated | P1 |
| TC_BUDG_014 | Edit budget period | 1. Change period from Monthly to Annual<br>2. Save | Period updated | P1 |

### 6.5 Budget vs Actual Analysis
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_BUDG_015 | Budget vs Actual page loads | 1. Navigate to /budgets/vs-actual | Shows comparison table/chart with Budget vs Actual for each category | P1 |
| TC_BUDG_016 | Variance calculation | 1. Budget 100k, Actual 75k<br>2. Check variance | Variance = -25k (favorable), shown as negative/green | P1 |
| TC_BUDG_017 | Budget tracking details | 1. Navigate to /budgets/tracking | Shows detailed tracking with budget, spent, committed, remaining | P1 |

---

## 7. CASH FLOW & RUNWAY

### 7.1 Cash Flow Analysis
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_CF_001 | Cash flow page loads | 1. Navigate to /cash-flow | Page shows cash flow summary and charts | P0 |
| TC_CF_002 | Daily cash flow chart | 1. Check chart<br>2. Verify last 30 days data | Chart shows daily inflows and outflows | P1 |
| TC_CF_003 | Net cash flow calculation | 1. Revenue: 150k, Expenses: 100k<br>2. Check net | Net = 50k (positive, green) | P0 |
| TC_CF_004 | Negative cash flow | 1. Revenue: 50k, Expenses: 100k<br>2. Check net | Net = -50k (negative, red) | P0 |

### 7.2 Runway Calculation
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_CF_005 | Runway page loads | 1. Navigate to /cash-flow/runway | Shows runway calculation and projection | P0 |
| TC_CF_006 | Runway = Cash / Monthly Burn | 1. Cash: 1000k, Monthly Burn: 200k<br>2. Expected Runway: 5 months<br>3. Check displayed value | Runway = 5 months | P0 |
| TC_CF_007 | Runway with no burn | 1. Monthly Burn = 0 (no expenses)<br>2. Check runway | Runway = ∞ or "N/A" or very high value | P1 |
| TC_CF_008 | Runway color indicator | 1. Check runway value<br>2. ≥6 months | Color = Green | P0 |
| TC_CF_009 | Runway color at 3-5 months | 1. Set runway to 4 months<br>2. Check color | Color = Amber/Yellow | P0 |
| TC_CF_010 | Runway color <3 months | 1. Set runway to 2 months<br>2. Check color | Color = Red | P0 |
| TC_CF_011 | Runway recalculation | 1. Note current runway<br>2. Add large expense<br>3. Check runway | Runway decreases | P1 |

### 7.3 Cash Flow Projection
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_CF_012 | Outlook page loads | 1. Navigate to /cash-flow/outlook | Shows 30-day or 90-day cash flow projection | P1 |
| TC_CF_013 | Projection chart | 1. Check chart<br>2. Verify future dates | Chart shows projected cash balance for next 30 days | P1 |
| TC_CF_014 | Projection based on average burn | 1. Monthly avg burn = 200k<br>2. Current cash = 400k<br>3. Check projection | Day 60: projected balance ≈ 0 (2 months runway) | P1 |

---

## 8. PAYROLL MANAGEMENT

### 8.1 Salary Structure
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_PAYROLL_001 | Navigate to salary structure | 1. Go to /payroll/salary-structure | Page loads showing salary components | P1 |
| TC_PAYROLL_002 | Create salary structure | 1. Click "Add Structure"<br>2. Enter: Component Name, Type (Basic/Allowance/Deduction)<br>3. Save | Structure created | P1 |
| TC_PAYROLL_003 | Add basic salary component | 1. Add "Basic Salary" - 50000<br>2. Save | Component added | P1 |
| TC_PAYROLL_004 | Add allowances (HRA, DA, etc.) | 1. Add "HRA" - 10000, "DA" - 5000<br>2. Save | Multiple allowances added | P1 |
| TC_PAYROLL_005 | Add deductions (PF, TDS, etc.) | 1. Add "PF" - 2500, "TDS" - 5000<br>2. Save | Deductions added | P1 |

### 8.2 Payroll Register
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_PAYROLL_006 | Navigate to payroll register | 1. Go to /payroll/register | Shows list of payroll entries | P1 |
| TC_PAYROLL_007 | Create payroll entry | 1. Click "Create Payroll"<br>2. Select month/year<br>3. Fill salary details<br>4. Save | Payroll entry created | P1 |
| TC_PAYROLL_008 | Auto-fill from salary structure | 1. Create payroll<br>2. Check if components auto-filled | All components from structure pre-populated | P1 |

### 8.3 Salary Slip
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_PAYROLL_009 | Generate salary slip | 1. Navigate to /payroll/salary-slip<br>2. Select employee/month<br>3. Click "Generate" | Salary slip generated (PDF format) | P1 |
| TC_PAYROLL_010 | Salary slip includes all components | 1. View slip<br>2. Check fields | Shows: Basic, Allowances, Deductions, Gross, Net | P1 |
| TC_PAYROLL_011 | Download salary slip | 1. Generate slip<br>2. Click "Download"<br>3. Check file | PDF downloaded with correct filename | P1 |

### 8.4 Payroll Settings
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_PAYROLL_012 | Navigate to payroll settings | 1. Go to /payroll/settings | Settings page loads | P1 |
| TC_PAYROLL_013 | Set salary processing date | 1. Set "Salary Processing Date" to 25th<br>2. Save | Setting saved | P1 |
| TC_PAYROLL_014 | Set currency | 1. Select "INR" as currency<br>2. Save | Currency setting saved | P1 |

---

## 9. RECONCILIATION

### 9.1 Bank Reconciliation
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_RECON_001 | Navigate to reconciliation | 1. Go to /reconciliation<br>2. Select account | Reconciliation page loads | P1 |
| TC_RECON_002 | Load bank statement | 1. Import/input bank statement entries<br>2. Check list | Statement entries loaded and listed | P1 |
| TC_RECON_003 | Match transaction to statement | 1. Select statement entry<br>2. Click "Match"<br>3. Select corresponding transaction<br>4. Confirm | Transaction marked as reconciled | P1 |
| TC_RECON_004 | Auto-matching transactions | 1. Enable auto-match (by amount & date)<br>2. Click "Auto-match"<br>3. Check results | System auto-matches transactions where amount & date exactly match | P1 |
| TC_RECON_005 | Reconciliation discrepancy | 1. Statement balance: 500k<br>2. System balance: 495k<br>3. Check difference | Displays: "Discrepancy: 5k" | P1 |
| TC_RECON_006 | Mark reconciliation complete | 1. Match all entries<br>2. Click "Complete Reconciliation" | Reconciliation saved, month marked as reconciled | P1 |
| TC_RECON_007 | Unreconciled items | 1. Leave some entries unmatched<br>2. Try to complete<br>3. Check alert | Alert: "X items still unmatched" | P1 |

---

## 10. REPORTS & ANALYTICS

### 10.1 Dashboard/Snapshot Report
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_REPORT_001 | Dashboard loads with data | 1. Access /dashboard | All KPIs and charts display with current month data | P0 |
| TC_REPORT_002 | Health score calculation | 1. Check Business Health metric<br>2. Manual verify calculation | Score accurately reflects: Runway, Loan Ratio, Cash Position, DSO | P1 |
| TC_REPORT_003 | Revenue vs Expense data | 1. Check chart data<br>2. Verify amounts | Weekly breakdown matches transaction totals | P1 |
| TC_REPORT_004 | Invoice aging data | 1. Check invoice aging card<br>2. Manual count | Counts match filtered invoices | P1 |

### 10.2 P&L Statement (if available)
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_REPORT_005 | P&L report loads | 1. Navigate to reports section<br>2. Select "P&L Statement" | Report generates with Revenue, Expenses, Net Profit | P1 |
| TC_REPORT_006 | P&L calculation | 1. Generate for January<br>2. Manual verify<br>3. Revenue - Expenses = Net | Calculation correct | P1 |

### 10.3 Balance Sheet (if available)
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_REPORT_007 | Balance Sheet loads | 1. Navigate to reports<br>2. Select "Balance Sheet" | Report shows Assets, Liabilities, Equity | P1 |
| TC_REPORT_008 | Balance Sheet equation | 1. Check Assets = Liabilities + Equity | Equation balances | P1 |

### 10.4 Cash Flow Statement (if available)
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_REPORT_009 | Cash Flow Statement | 1. Navigate to reports<br>2. Select "Cash Flow" | Shows Operating, Investing, Financing activities | P1 |

### 10.5 Report Export
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_REPORT_010 | Export report as PDF | 1. Generate any report<br>2. Click "Export PDF" | PDF file downloads with correct data | P1 |
| TC_REPORT_011 | Export report as Excel | 1. Generate any report<br>2. Click "Export Excel" | Excel file downloads with formatted data | P1 |

---

## 11. DATA VALIDATION & ERROR HANDLING

### 11.1 Input Validation
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_VALID_001 | Empty amount field | 1. Try to submit form with empty amount | Error: "Amount is required" | P1 |
| TC_VALID_002 | Negative amount | 1. Enter negative amount (e.g., -5000)<br>2. Submit | Error: "Amount cannot be negative" OR accept as reversal | P1 |
| TC_VALID_003 | Non-numeric amount | 1. Enter "abc" in amount field<br>2. Submit | Error: "Amount must be numeric" | P1 |
| TC_VALID_004 | Amount with special characters | 1. Enter "50,000" or "50k"<br>2. Submit | Parse correctly (50000) OR error | P1 |
| TC_VALID_005 | Invalid email format | 1. Enter "not-an-email" in email field<br>2. Submit | Error: "Invalid email format" | P1 |
| TC_VALID_006 | Future date validation | 1. Try to create transaction with date 1 year from now<br>2. Submit | Allow OR error based on rules | P2 |
| TC_VALID_007 | Date before account creation | 1. Create account on Apr 1<br>2. Try transaction on Mar 1<br>3. Submit | Error: "Date cannot be before account opening" OR allow | P2 |

### 11.2 Duplicate Prevention
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_VALID_008 | Duplicate invoice number | 1. Create invoice "INV-001"<br>2. Try to create another "INV-001"<br>3. Submit | Error: "Invoice number already exists" | P1 |
| TC_VALID_009 | Duplicate account number | 1. Create account with "1234567890"<br>2. Try another with same number<br>3. Submit | Error: "Account number already exists" | P1 |

### 11.3 Error Messages
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_VALID_010 | Error message clarity | 1. Trigger various errors<br>2. Check messages | Error messages are clear, actionable, user-friendly | P1 |
| TC_VALID_011 | Error message placement | 1. Trigger field validation error<br>2. Check location | Error message displayed next to/below field | P1 |
| TC_VALID_012 | Multiple errors displayed | 1. Submit form with multiple empty required fields<br>2. Check errors | All errors listed, not just first one | P1 |

### 11.4 Network Error Handling
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_VALID_013 | Timeout during save | 1. Submit transaction<br>2. Network fails mid-save<br>3. Check response | Error message: "Connection timeout, please try again" OR auto-retry | P2 |
| TC_VALID_014 | Server error (500) | 1. Server returns 500 error<br>2. Check response | User-friendly error: "Something went wrong, please try again" | P2 |

---

## 12. BUSINESS LOGIC & CALCULATIONS

### 12.1 Cash Balance Calculations
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_CALC_001 | Running cash balance | 1. Account opening: 100k<br>2. Transaction 1: +50k<br>3. Transaction 2: -20k<br>4. Check balance after each | 100k → 150k → 130k | P0 |
| TC_CALC_002 | Multiple accounts total | 1. Account A: 100k<br>2. Account B: 50k<br>3. Account C: 25k<br>4. Dashboard cash available | Total: 175k | P0 |
| TC_CALC_003 | Cash after invoice payment | 1. Invoice amount: 50k<br>2. Record full payment<br>3. Check account balance | Balance decreases by 50k | P1 |

### 12.2 Monthly Aggregations
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_CALC_004 | Monthly revenue sum | 1. Create 3 revenue transactions in January: 50k, 30k, 20k<br>2. Check monthly total | Total: 100k | P0 |
| TC_CALC_005 | Monthly expense sum | 1. Create 4 expense transactions: 40k, 30k, 20k, 10k<br>2. Check monthly total | Total: 100k | P0 |
| TC_CALC_006 | Monthly net cash flow | 1. Revenue: 100k, Expenses: 60k<br>2. Check net | Net: 40k | P0 |
| TC_CALC_007 | Monthly burn rate | 1. Expenses in January: 620k<br>2. Dashboard shows "Monthly Burn"<br>3. Check value | Shows: 620k | P1 |

### 12.3 GST Calculations
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_CALC_008 | GST @ 18% | 1. Amount: 10000<br>2. GST Rate: 18%<br>3. Check GST amount | GST: 1800, Total: 11800 | P0 |
| TC_CALC_009 | GST @ 5% | 1. Amount: 10000<br>2. GST Rate: 5%<br>3. Check GST | GST: 500, Total: 10500 | P0 |
| TC_CALC_010 | GST @ 0% (exempt) | 1. Amount: 10000<br>2. GST: 0%<br>3. Check total | GST: 0, Total: 10000 | P1 |
| TC_CALC_011 | Taxable vs gross amount | 1. Create invoice: Taxable 100k @ 18%<br>2. Check breakdown | Taxable: 100k, GST: 18k, Gross: 118k | P1 |

### 12.4 Health Score Components
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_CALC_012 | Runway component | 1. Runway ≥ 6 months<br>2. Check score | Runway score = 100 | P1 |
| TC_CALC_013 | Runway component (warning) | 1. Runway = 3 months<br>2. Check score | Runway score = 60 | P1 |
| TC_CALC_014 | Runway component (critical) | 1. Runway < 1 month<br>2. Check score | Runway score = 20 | P1 |
| TC_CALC_015 | Loan ratio component | 1. Monthly loan payment: 50k<br>2. Monthly revenue: 500k<br>3. Ratio: 10%<br>4. Check score | Loan ratio score = 100 | P1 |
| TC_CALC_016 | Cash position component | 1. Cash ≥ 3 months expenses<br>2. Check score | Cash position score = 100 | P1 |
| TC_CALC_017 | DSO component | 1. Days Sales Outstanding: 45 days<br>2. Check score | DSO score = 100 | P1 |

### 12.5 Invoice Status Automation
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_CALC_018 | Invoice auto-overdue | 1. Create invoice with due date = today<br>2. Status = Pending<br>3. Next day, check status | Status auto-changes to "Overdue" | P1 |
| TC_CALC_019 | Partial payment status | 1. Invoice: 100k<br>2. Payment: 60k<br>3. Check status | Status: "Partial", Balance: 40k | P1 |
| TC_CALC_020 | Invoice mark as paid on full payment | 1. Invoice: 100k<br>2. Record payment 100k<br>3. Check status | Status: "Paid" | P1 |

---

## 13. UI/UX & USER EXPERIENCE

### 13.1 Navigation
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_UX_001 | Sidebar navigation works | 1. Check sidebar menu<br>2. Click each menu item | Navigates to correct page | P1 |
| TC_UX_002 | Breadcrumb navigation | 1. Navigate to nested page<br>2. Check breadcrumbs<br>3. Click breadcrumb | Navigates back correctly | P1 |
| TC_UX_003 | Back button functionality | 1. Navigate to detail page<br>2. Click back<br>3. Check state | Returns to list view, maintains scroll position if possible | P1 |
| TC_UX_004 | Page refresh state | 1. Fill form partially<br>2. Refresh page<br>3. Check data | Data preserved OR warning before refresh | P1 |

### 13.2 Responsiveness
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_UX_005 | Desktop view (1920x1080) | 1. Access on desktop<br>2. Check layout | All elements visible, no horizontal scroll | P1 |
| TC_UX_006 | Tablet view (768x1024) | 1. Resize to tablet width<br>2. Check layout | Layout adjusts, readable, elements stack if needed | P1 |
| TC_UX_007 | Mobile view (375x667) | 1. Resize to mobile width<br>2. Check layout | Mobile-friendly, no horizontal scroll, hamburger menu | P1 |
| TC_UX_008 | Table responsiveness | 1. View transaction table on mobile<br>2. Check if scrollable/collapsible | Table adapted for mobile (horizontal scroll or stacked rows) | P1 |

### 13.3 Loading States
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_UX_009 | Loading skeleton/spinner | 1. Navigate to page with data load<br>2. Observe before data appears | Loading indicator shown (skeleton or spinner) | P1 |
| TC_UX_010 | Fast load no flicker | 1. Navigate to cached page<br>2. Observe render | No skeleton/spinner if data instant | P2 |

### 13.4 Form UX
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_UX_011 | Form field focus styling | 1. Click form field<br>2. Check focus state | Field highlighted with border/shadow change | P1 |
| TC_UX_012 | Form validation on blur | 1. Fill field<br>2. Blur (leave field)<br>3. Check error | Validation runs on blur if applicable | P1 |
| TC_UX_013 | Form submit button state | 1. Check form with all fields empty<br>2. Check submit button | Button disabled/grayed out | P1 |
| TC_UX_014 | Form submit button loading | 1. Click submit on valid form<br>2. Observe button | Button shows loading spinner/text | P1 |

### 13.5 Accessibility
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_UX_015 | Keyboard navigation | 1. Use Tab key to navigate<br>2. Check focusable elements | All interactive elements accessible via Tab | P2 |
| TC_UX_016 | Color contrast | 1. Use contrast checker<br>2. Check all text | WCAG AA standard contrast met (4.5:1 for text) | P2 |
| TC_UX_017 | Screen reader labels | 1. Use screen reader<br>2. Navigate form | All fields have accessible labels | P2 |
| TC_UX_018 | Alt text on images | 1. Inspect images<br>2. Check alt attributes | All images have descriptive alt text | P2 |

### 13.6 Visual Design
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_UX_019 | Color coding consistency | 1. Check positive amounts (green)<br>2. Negative amounts (red)<br>3. Neutral (gray) | Consistent across all pages | P1 |
| TC_UX_020 | Font sizes readable | 1. Check body text size | Minimum 14px, comfortable to read | P1 |
| TC_UX_021 | Chart readability | 1. View all charts<br>2. Check labels, legends | All charts clearly labeled with units | P1 |

---

## 14. PERFORMANCE & LOAD TESTING

### 14.1 Page Load Performance
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_PERF_001 | Dashboard page load | 1. Clear browser cache<br>2. Navigate to /dashboard<br>3. Measure load time | Page loads < 3 seconds | P1 |
| TC_PERF_002 | Transaction list load (100 records) | 1. Navigate to transactions<br>2. 100 records loaded<br>3. Check time | Page loads < 2 seconds | P1 |
| TC_PERF_003 | Invoice list load (50 records) | 1. Navigate to invoices<br>2. 50 records loaded<br>3. Check time | Page loads < 2 seconds | P1 |
| TC_PERF_004 | Chart rendering performance | 1. Dashboard with 5 charts<br>2. Measure render time | All charts rendered < 2 seconds | P2 |

### 14.2 Database Query Performance
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_PERF_005 | Monthly aggregation query | 1. Run monthly revenue/expense query<br>2. Measure execution | Query completes < 500ms | P2 |
| TC_PERF_006 | Health score calculation | 1. Calculate health score<br>2. Measure time | Calculation < 1 second | P2 |

### 14.3 Large Dataset Handling
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_PERF_007 | 1000 transactions | 1. Load page with 1000 transactions<br>2. Check pagination<br>3. Verify performance | Page loads, pagination works, no crashes | P2 |
| TC_PERF_008 | 500 invoices | 1. Load invoice list with 500 records<br>2. Apply filters<br>3. Check performance | Filters apply within 1 second | P2 |

---

## 15. SECURITY & DATA PROTECTION

### 15.1 Authentication Security
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_SEC_001 | Password not visible on login | 1. Enter password in login form<br>2. Check visibility | Password masked with bullets/dots | P1 |
| TC_SEC_002 | No plain-text password storage | 1. Check browser storage/network tab<br>2. Look for password | Password not visible in network requests | P0 |
| TC_SEC_003 | Session token stored securely | 1. Check browser cookies/localStorage<br>2. Verify secure flag | Token has HttpOnly, Secure, SameSite flags | P0 |
| TC_SEC_004 | Login brute force protection | 1. Try 10 wrong passwords rapidly<br>2. Check response | Account locked OR rate limiting applied | P1 |

### 15.2 Authorization & Access Control
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_SEC_005 | User cannot access other org data | 1. User A in Org A<br>2. Try to access Org B data directly<br>3. Check response | Error: "Unauthorized" OR redirects to Org A | P0 |
| TC_SEC_006 | API endpoints require auth | 1. Call API without token<br>2. Check response | Error 401: Unauthorized | P0 |
| TC_SEC_007 | API endpoints validate ownership | 1. Get transaction ID from Org A<br>2. From Org B, try to modify transaction<br>3. Check response | Error: "Transaction not found" or "Forbidden" | P0 |

### 15.3 Data Encryption
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_SEC_008 | HTTPS in production | 1. Check URL<br>2. Access application | URL uses https://, not http:// | P0 |
| TC_SEC_009 | Network encryption | 1. Check network tab<br>2. View request headers | HSTS header present | P1 |

### 15.4 SQL Injection Prevention
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_SEC_010 | Parameterized queries | 1. Enter SQL injection payload in search: "' OR '1'='1"<br>2. Submit<br>3. Check result | Query treated as literal string, no code execution | P0 |

### 15.5 XSS Prevention
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_SEC_011 | Script tags in input | 1. Enter `<script>alert('xss')</script>` in transaction description<br>2. Save<br>3. View transaction | Script not executed, text displayed as-is (escaped) | P0 |
| TC_SEC_012 | HTML tags sanitization | 1. Enter `<img src=x onerror="alert('xss')">` in note field<br>2. Save<br>3. View | HTML tags removed/escaped, no execution | P0 |

### 15.6 CSRF Protection
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_SEC_013 | CSRF token on forms | 1. Inspect HTML form<br>2. Look for CSRF token | CSRF token present in form | P1 |

### 15.7 Data Privacy
| Test Case ID | Test Scenario | Steps | Expected Result | Priority |
|---|---|---|---|---|
| TC_SEC_014 | Sensitive data not logged | 1. Check application logs<br>2. Search for passwords/tokens | Sensitive data (passwords) not in logs | P0 |
| TC_SEC_015 | Account number masking | 1. View bank account in UI<br>2. Check account number display | Account number last 4 digits only: ****1234 | P1 |

---

## TEST EXECUTION CHECKLIST

### Before Testing:
- [ ] Environment setup complete
- [ ] Test account created
- [ ] Test data prepared (sample transactions, invoices)
- [ ] Test tools ready (browser, network inspector, screen reader)
- [ ] Browser cache cleared
- [ ] Cookies cleared

### During Testing:
- [ ] Log test results in test management tool
- [ ] Screenshot failures
- [ ] Note browser/OS version
- [ ] Mark pass/fail for each test case
- [ ] Log bugs with severity

### After Testing:
- [ ] Generate test summary report
- [ ] Calculate pass/fail percentage
- [ ] Document recurring issues
- [ ] Prioritize bugs by severity
- [ ] Schedule re-testing

---

## BUG REPORTING TEMPLATE

```
Bug ID: [AUTO]
Title: [Concise description]
Severity: P0 (Blocker) | P1 (High) | P2 (Medium) | P3 (Low)
Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected Result:
[What should happen]

Actual Result:
[What actually happened]

Screenshots:
[Attach screenshot]

Environment:
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux]
- Resolution: [1920x1080]
- URL: [Page URL]
```

---

## SIGN-OFF

- **Test Lead:** ___________________
- **Date:** ___________________
- **Pass Rate:** _____ %
- **Approved for Release:** YES / NO
