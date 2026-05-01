# ArkFinance - Tally Data Mapping Specification
## Complete Excel Column Specification for Middle-Layer Data Processing

---

## 📋 OVERVIEW

This document specifies **exactly which fields and columns** your middle-layer application must generate in Excel format so that ArkFinance can:
1. ✅ Auto-populate all dashboard reports
2. ✅ Generate P&L, Balance Sheet, Cash Flow statements
3. ✅ Calculate Business Health Score
4. ✅ Enable all analytics and forecasting

---

## 🎯 QUICK REFERENCE TABLE

| Sheet Name | Purpose | Mandatory | Records Needed | Priority |
|-----------|---------|-----------|-----------------|----------|
| Bank Accounts | Initialize cash position | YES | 1-5 | P0 |
| Chart of Accounts (CoA) | Expense/Revenue categories | YES | 15-30 | P0 |
| Transactions | Core financial data | YES | 100-500 | P0 |
| Invoices | AR/AP tracking | YES | 20-100 | P0 |
| Vendors & Customers | Party master data | YES | 10-50 | P0 |
| Payroll Register | Salary expenses | NO | 12 | P1 |
| Budget Master | Budget tracking | NO | 1-12 | P1 |
| Bank Mappings | Cash bucket allocation | NO | 1-4 | P2 |

**Minimum Viable Dataset:** Bank Accounts + CoA + Transactions + Invoices + Vendors = **Reports will generate immediately**

---

# 📊 SHEET-BY-SHEET SPECIFICATION

---

## SHEET 1: Bank Accounts
### Purpose
Initialize all bank accounts and their balances. This determines starting cash position.

### Column Specification

| # | Column Name | Data Type | Required | Format | Example | Validation Rules | Notes |
|---|-------------|-----------|----------|--------|---------|------------------|-------|
| 1 | accountId | TEXT | YES | ACC-XXX | ACC-001 | Unique, 6-10 chars | Primary key, used in foreign keys |
| 2 | accountName | TEXT | YES | Free text | Operating Account | 50 chars max | Must be descriptive |
| 3 | bankName | TEXT | YES | Free text | HDFC Bank | 50 chars max | Bank identifier |
| 4 | accountNumber | TEXT | YES | Numbers only | 1234567890123 | 10-18 digits | Masked in UI for security |
| 5 | accountType | TEXT | YES | DROPDOWN | Current | Current/Savings/Tax/Operating/Reserve/CapEx | For categorization |
| 6 | openingBalance | NUMBER | YES | Positive integer | 5000000 | ≥ 0 | Amount in paise (5000000 = ₹50,000) |
| 7 | currentBalance | NUMBER | YES | Positive integer | 14523860 | ≥ 0 | Current balance in paise |
| 8 | currency | TEXT | YES | 3-letter code | INR | Only INR (for now) | ISO currency code |
| 9 | isActive | BOOLEAN | YES | true/false | true | true/false | Active account flag |
| 10 | branchCode | TEXT | NO | 6-11 chars | HDFC0001234 | IFSC format | For fund transfers |
| 11 | notes | TEXT | NO | Free text | Main operating account | 200 chars max | Internal notes |

### Example Data
```
accountId | accountName      | bankName   | accountNumber  | accountType | openingBalance | currentBalance | currency | isActive | branchCode    | notes
----------|-----------------|------------|----------------|-------------|----------------|----------------|----------|----------|---------------|------------------
ACC-001   | Operating       | HDFC Bank  | 1234567890123  | Current     | 5000000        | 14523860       | INR      | true     | HDFC0001234   | Main operating
ACC-002   | Expense Fund    | ICICI Bank | 9876543210456  | Savings     | 2500000        | 3850000        | INR      | true     | ICIC0005678   | For expenses
ACC-003   | GST Reserve     | Axis Bank  | 5432109876543  | Tax         | 1500000        | 1250000        | INR      | true     | UTIB0000123   | GST liability
ACC-004   | Old Dormant     | HDFC Bank  | 1111111111111  | Current     | 500000         | 500000         | INR      | false    | HDFC0001234   | Closed 2023
```

### Critical Notes
- **Opening Balance** should match Tally Trial Balance opening balances
- **Current Balance** should match latest bank statement or trial balance as of import date
- Must have at least 1 active account
- All amounts in **paise** (multiply rupees by 100)

---

## SHEET 2: Chart of Accounts (CoA)
### Purpose
Master list of all revenue, expense, asset, and liability categories. This drives auto-categorization.

### Column Specification

| # | Column Name | Data Type | Required | Format | Example | Validation Rules | Notes |
|---|-------------|-----------|----------|--------|---------|------------------|-------|
| 1 | categoryId | TEXT | YES | CAT-XXX(-X) | CAT-001 or CAT-001-1 | Unique, hierarchical | Primary key |
| 2 | categoryName | TEXT | YES | Free text | Revenue | 50 chars max | User-friendly name |
| 3 | categoryType | TEXT | YES | DROPDOWN | Revenue | Revenue/Expense/Asset/Liability/COGS/Equity | Major account type |
| 4 | parentCategory | TEXT | YES | CAT-XXX or ROOT | CAT-001 | Reference to parent categoryId | For hierarchy |
| 5 | description | TEXT | NO | Free text | All income from services | 200 chars max | Internal documentation |
| 6 | isActive | BOOLEAN | YES | true/false | true | true/false | Active category flag |
| 7 | tally_ledger_name | TEXT | NO | Free text | Service Revenue | 50 chars max | Tally source ledger (for mapping) |
| 8 | autoClassify | BOOLEAN | NO | true/false | true | true/false | Enable keyword matching for auto-categorization |
| 9 | keywords | TEXT | NO | Comma-separated | service,consulting,training | Free text | Keywords for auto-matching in descriptions |

### Example Data - Hierarchical Structure
```
categoryId | categoryName      | categoryType | parentCategory | description                  | isActive | tally_ledger_name  | autoClassify | keywords
-----------|------------------|--------------|-----------------|-------------------------------|----------|-------------------|--------------|------------------------------
CAT-001    | Revenue          | Revenue      | ROOT            | All income sources            | true     | Revenue            | true         | income,sales,service
CAT-001-1  | Service Revenue  | Revenue      | CAT-001         | Revenue from services         | true     | Service Revenue    | true         | service,consulting,training
CAT-001-2  | Product Sales    | Revenue      | CAT-001         | Revenue from products         | true     | Product Revenue    | true         | product,sale,goods
CAT-001-3  | Recurring Revenue| Revenue      | CAT-001         | Subscription/recurring income | true     | Subscription       | true         | subscription,recurring,monthly
CAT-002    | Expenses         | Expense      | ROOT            | All expenses                  | true     | Expenses           | false        |
CAT-002-1  | Salaries         | Expense      | CAT-002         | Employee salaries & wages     | true     | Salaries           | true         | salary,wages,payroll,staff
CAT-002-2  | Rent             | Expense      | CAT-002         | Office/facility rent          | true     | Rent               | true         | rent,lease,facility
CAT-002-3  | Utilities        | Expense      | CAT-002         | Electric, water, internet     | true     | Utilities          | true         | electricity,water,internet,phone
CAT-002-4  | Office Supplies  | Expense      | CAT-002         | Supplies & consumables        | true     | Office Supplies    | true         | supplies,stationery,consumables
CAT-002-5  | Marketing        | Expense      | CAT-002         | Advertising & marketing       | true     | Marketing          | true         | marketing,advertising,promotion
CAT-002-6  | Travel           | Expense      | CAT-002         | Travel expenses               | true     | Travel             | true         | travel,flight,hotel,transport
CAT-002-7  | Operations       | Expense      | CAT-002         | Day-to-day operations         | true     | Operations         | false        |
CAT-003    | COGS             | COGS         | ROOT            | Cost of goods sold            | true     | Cost of Goods Sold | false        |
CAT-004    | Assets           | Asset        | ROOT            | Fixed & current assets        | true     | Assets             | false        |
CAT-004-1  | Fixed Assets     | Asset        | CAT-004         | Equipment, machinery          | true     | Fixed Assets       | false        |
CAT-004-2  | Current Assets   | Asset        | CAT-004         | Inventory, receivables        | true     | Current Assets     | false        |
CAT-005    | Liabilities      | Liability    | ROOT            | Loans & payables              | true     | Liabilities        | false        |
CAT-005-1  | Bank Loans       | Liability    | CAT-005         | Loans from banks              | true     | Bank Loan          | false        |
CAT-005-2  | Vendor Payables  | Liability    | CAT-005         | Amounts owed to vendors       | true     | Creditors          | true         | payable,creditor,owing
CAT-006    | Equity           | Equity       | ROOT            | Owner's equity                | true     | Capital            | false        |
```

### Critical Notes
- **Hierarchical structure:** Parent categories help with report grouping
- **Tally mapping:** `tally_ledger_name` helps middle-layer app identify which Tally ledger maps to this category
- **Keywords:** Enable auto-classification when transaction description matches
- Minimum required: 8-10 categories (Revenue, Expense, Salaries, Rent, Utilities, COGS, Assets, Liabilities)
- Must have at least 1 Revenue and 1 Expense category

---

## SHEET 3: Vendors & Customers
### Purpose
Master list of all parties (vendors, customers, service providers, lenders). Used for invoice linking and party identification.

### Column Specification

| # | Column Name | Data Type | Required | Format | Example | Validation Rules | Notes |
|---|-------------|-----------|----------|--------|---------|------------------|-------|
| 1 | partyId | TEXT | YES | PARTY-XXX | PARTY-001 | Unique, 8-12 chars | Primary key |
| 2 | partyName | TEXT | YES | Free text | Acme Corp | 100 chars max | Full legal name |
| 3 | partyType | TEXT | YES | DROPDOWN | Customer | Customer/Vendor/Service Provider/Lender/Employee/Government | Classification |
| 4 | email | EMAIL | NO | Valid email | contact@acme.com | Standard email format | For communications |
| 5 | phone | TEXT | NO | 10 digits | 9876543210 | Numeric only | Mobile or landline |
| 6 | gstIn | TEXT | NO | 15 chars | 22AABCT1234A1Z0 | Format: 2 digits state + 10 chars alphanumeric + 1 check digit | B2B transactions only |
| 7 | panNo | TEXT | NO | 10 chars | ABCPT1234K | Format: 5 letters + 4 digits + 1 letter | Indian tax ID |
| 8 | address | TEXT | NO | Free text | 123 Main Street | 200 chars max | Office address |
| 9 | city | TEXT | NO | Free text | Mumbai | 50 chars max | City name |
| 10 | state | TEXT | NO | 2-letter code | MH | State abbreviation (IN standard codes) | For GST classification |
| 11 | pincode | TEXT | NO | 6 digits | 400001 | Numeric only | Postal code |
| 12 | country | TEXT | NO | 2-letter code | IN | ISO country code | Default: IN |
| 13 | creditDays | NUMBER | NO | Integer | 30 | 0-180 | 0 = cash, 30/45/60 = credit terms |
| 14 | creditLimit | NUMBER | NO | Positive integer | 5000000 | ≥ 0, in paise | Maximum credit allowed |
| 15 | paymentTerms | TEXT | NO | Free text | Net 30 | 50 chars max | Payment terms description |
| 16 | bankName | TEXT | NO | Free text | HDFC Bank | 50 chars max | For vendor payments |
| 17 | bankAccountNo | TEXT | NO | Numeric | 1234567890123 | 10-18 digits | For vendor fund transfers |
| 18 | ifscCode | TEXT | NO | 11 chars | HDFC0001234 | IFSC format | Bank branch code |
| 19 | isActive | BOOLEAN | YES | true/false | true | true/false | Active party flag |
| 20 | tally_ledger_name | TEXT | NO | Free text | Acme Corporation | 100 chars max | Tally source ledger name (for mapping) |
| 21 | notes | TEXT | NO | Free text | Key customer, high priority | 200 chars max | Internal notes |

### Example Data
```
partyId    | partyName          | partyType        | email                | phone      | gstIn               | panNo      | city      | state | creditDays | isActive | tally_ledger_name
-----------|-------------------|------------------|----------------------|------------|---------------------|------------|-----------|-------|------------|----------|-------------------
PARTY-001  | Acme Corporation   | Customer         | contact@acme.com     | 9876543210 | 22AABCT1234A1Z0    | ABCPT1234K | Mumbai    | MH    | 30         | true     | Acme Corp
PARTY-002  | Tech Vendors Inc   | Vendor           | vendor@tech.com      | 8765432109 | 11BBBCT5678B2Z5    | TECHV5678K | Bangalore | KA    | 45         | true     | Tech Supplies
PARTY-003  | John Doe          | Employee         | john@company.com     | 9123456789 | NULL               | JOHND1234K | Mumbai    | MH    | 0          | true     | John Doe
PARTY-004  | HDFC Bank         | Lender           | loan@hdfc.com        | 1860112000 | NULL               | NULL       | Delhi     | DL    | 0          | true     | HDFC Loan Account
PARTY-005  | Income Tax Dept   | Government       | NULL                 | NULL       | NULL               | NULL       | Delhi     | DL    | 0          | true     | Government
PARTY-999  | Internal Transfer | Service Provider | NULL                 | NULL       | NULL               | NULL       | NULL      | NULL  | 0          | true     | Internal
```

### Critical Notes
- **PartyId PARTY-999** is reserved for internal/system transactions
- GSTIN format: State(2) + PAN(10) + Entity(1) + Check(1) = 15 characters
- Credit days: 0 = immediate payment, 30 = monthly, 45 = 45 days, etc.
- Tally mapping: `tally_ledger_name` helps identify which Tally ledgers are customers/vendors
- Must have at least 5-10 parties for meaningful data

---

## SHEET 4: Transactions ⭐ (MOST CRITICAL)
### Purpose
Core financial data. Every money movement (income/expense) is a transaction. This drives all dashboard metrics, P&L, and cash flow.

### Column Specification

| # | Column Name | Data Type | Required | Format | Example | Validation Rules | Notes |
|---|-------------|-----------|----------|--------|---------|------------------|-------|
| 1 | transactionId | TEXT | YES | TXN-XXXXX | TXN-001 | Unique, sequential | Primary key |
| 2 | date | DATE | YES | YYYY-MM-DD | 2024-01-15 | Must be ≤ today | Within fiscal year |
| 3 | description | TEXT | YES | Free text (50-200 chars) | Office Rent - January 2024 | 200 chars max | Used for auto-categorization |
| 4 | amount | NUMBER | YES | Positive integer | 5000000 | > 0 | Amount in paise (5000000 = ₹50,000) |
| 5 | isIncome | BOOLEAN | YES | true/false | false | true/false | true = revenue, false = expense |
| 6 | accountingType | TEXT | YES | DROPDOWN | Expense | OpeningBalance/Revenue/Expense/Asset/Liability/Equity/GST | Classification |
| 7 | categoryId | TEXT | YES | CAT-XXX | CAT-002-2 | Must exist in CoA | Foreign key to categories |
| 8 | vendorCustomerId | TEXT | YES | PARTY-XXX | PARTY-001 | Must exist in Vendors sheet | Foreign key to parties |
| 9 | accountId | TEXT | YES | ACC-XXX | ACC-001 | Must exist in Bank Accounts | Which account debited/credited |
| 10 | invoiceRef | TEXT | NO | INV-XXXXX or VINV-XXXXX | INV-001 | Must exist in Invoices if provided | Links to invoice |
| 11 | gstRate | NUMBER | NO | 0/5/12/18/28 | 18 | Valid GST rate | Percentage |
| 12 | gstAmount | NUMBER | NO | Positive integer | 900000 | ≥ 0 | GST amount in paise |
| 13 | taxableAmount | NUMBER | NO | Positive integer | 5000000 | ≥ 0 | Pre-tax amount |
| 14 | hsn_sac | TEXT | NO | 6-8 digits | 998511 | Numeric only | For B2B GST compliance |
| 15 | paymentMode | TEXT | NO | DROPDOWN | Bank Transfer | Bank Transfer/Check/Cash/UPI/Credit Card/NEFT/RTGS/Crypto | Payment instrument |
| 16 | referenceNo | TEXT | NO | Free text | CHQ-001 or UPI-ABC123 | 50 chars max | Check/UPI/Reference number |
| 17 | status | TEXT | YES | DROPDOWN | Posted | Posted/Pending/Reconciled/Reversed | Transaction state |
| 18 | notes | TEXT | NO | Free text | Monthly office rent | 200 chars max | Internal notes |
| 19 | tally_voucher_type | TEXT | NO | Free text | Contra | Type from Tally (for audit trail) | Source system reference |

### Example Data (12 months, mixed transactions)
```
transactionId | date       | description                    | amount   | isIncome | accountingType | categoryId  | vendorCustomerId | accountId | invoiceRef | gstRate | gstAmount | taxableAmount | hsn_sac | paymentMode    | referenceNo | status      | notes
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
TXN-001       | 2024-01-01 | Opening Balance               | 500000   | true     | OpeningBalance | CAT-004-2   | PARTY-999        | ACC-001   | N/A        | 0       | 0         | 500000        | N/A     | N/A            | N/A         | Posted      | Initial balance
TXN-002       | 2024-01-05 | Service Revenue - Project A   | 15000000 | true     | Revenue        | CAT-001-1   | PARTY-001        | ACC-001   | INV-001    | 18      | 2700000   | 12741573      | 998511  | Bank Transfer  | NEFT-123    | Reconciled  | Invoiced
TXN-003       | 2024-01-08 | Salary Payment - January      | 25000000 | false    | Expense        | CAT-002-1   | PARTY-003        | ACC-002   | N/A        | 0       | 0         | 25000000      | N/A     | Bank Transfer  | NEFT-456    | Reconciled  | Monthly payroll
TXN-004       | 2024-01-10 | Office Rent                   | 5000000  | false    | Expense        | CAT-002-2   | PARTY-050        | ACC-001   | N/A        | 0       | 0         | 5000000       | N/A     | Check          | CHQ-001     | Posted      | Monthly rent
TXN-005       | 2024-01-15 | Internet & Utilities          | 750000   | false    | Expense        | CAT-002-3   | PARTY-051        | ACC-001   | N/A        | 18      | 135000    | 650000        | 998212  | Bank Transfer  | UPI-ABC     | Posted      | Monthly utilities
TXN-006       | 2024-01-20 | Purchase - Inventory         | 7500000  | false    | Expense        | CAT-003     | PARTY-002        | ACC-002   | VINV-001   | 5       | 375000    | 7142857       | 940520  | Bank Transfer  | NEFT-789    | Reconciled  | Stock purchase
TXN-007       | 2024-02-01 | GST Payment (Q1 Liability)   | 12500000 | false    | GST            | CAT-005-3   | PARTY-005        | ACC-003   | N/A        | 0       | 0         | 12500000      | N/A     | Bank Transfer  | GST-Q1-2024 | Posted      | Q1 GST filing
TXN-008       | 2024-02-05 | Service Revenue - Project B   | 12000000 | true     | Revenue        | CAT-001-1   | PARTY-002        | ACC-001   | INV-002    | 18      | 2160000   | 10169492      | 998511  | Bank Transfer  | NEFT-111    | Posted      | Invoiced
TXN-009       | 2024-02-10 | Office Supplies             | 500000   | false    | Expense        | CAT-002-4   | PARTY-008        | ACC-001   | N/A        | 18      | 90000     | 423729        | 949810  | Bank Transfer  | UPI-DEF     | Posted      | Stationery
TXN-010       | 2024-02-15 | Marketing Campaign          | 2000000  | false    | Expense        | CAT-002-5   | PARTY-009        | ACC-001   | N/A        | 18      | 360000    | 1694915       | 998312  | Bank Transfer  | NEFT-222    | Posted      | Digital ads
... (repeat for 12 months with similar pattern)
```

### Critical Business Rules for Transactions
- **Opening Balance transaction** must be first (date = 1st of fiscal year)
- **Amount always positive** - isIncome flag determines debit/credit
- **GST calculation**: gstAmount should = taxableAmount × gstRate / 100
- **Running balance** auto-calculated: balance = previous_balance + amount (if isIncome) - amount (if !isIncome)
- **Minimum required**: 100-150 transactions across 12 months for meaningful reports
- **Monthly breakdown**: ~12-15 transactions per month (4-5 income + 8-10 expense)

### GST Validation Rules
- If gstRate > 0, then gstAmount must be populated
- If gstRate = 0, then gstAmount must = 0
- taxableAmount + gstAmount should = amount (approximately)
- HSN/SAC code required for B2B transactions with GST

---

## SHEET 5: Invoices
### Purpose
Track sales (invoices raised) and purchases (bills received). Enables AR/AP tracking, overdue detection, and invoice aging.

### Column Specification

| # | Column Name | Data Type | Required | Format | Example | Validation Rules | Notes |
|---|-------------|-----------|----------|--------|---------|------------------|-------|
| 1 | invoiceId | TEXT | YES | INV-XXXXX or VINV-XXXXX | INV-001 | Unique per type | Primary key |
| 2 | invoiceNo | TEXT | YES | Custom format | INV/2024/0001 | Alphanumeric | Client-facing invoice number |
| 3 | date | DATE | YES | YYYY-MM-DD | 2024-01-15 | Must be ≤ today | Issue date |
| 4 | dueDate | DATE | YES | YYYY-MM-DD | 2024-02-15 | ≥ date | Payment due date |
| 5 | type | TEXT | YES | DROPDOWN | Sales | Sales/Purchase | Outgoing or incoming |
| 6 | partyName | TEXT | YES | Free text | Acme Corp | 100 chars max | Customer/Vendor name |
| 7 | partyId | TEXT | YES | PARTY-XXX | PARTY-001 | Must exist in Vendors sheet | Foreign key |
| 8 | invoiceAmount | NUMBER | YES | Positive integer | 15000000 | > 0, in paise | Total including GST |
| 9 | taxableAmount | NUMBER | NO | Positive integer | 12741573 | ≥ 0 | Pre-tax amount |
| 10 | gstAmount | NUMBER | NO | Positive integer | 2287356 | ≥ 0 | Total tax |
| 11 | gstRate | NUMBER | NO | 0/5/12/18/28 | 18 | Valid GST rate | Percentage |
| 12 | paidAmount | NUMBER | YES | Positive integer | 15000000 | ≥ 0, ≤ invoiceAmount | Amount received/paid |
| 13 | balanceAmount | NUMBER | YES | Positive integer | 0 | invoiceAmount - paidAmount | Outstanding amount |
| 14 | status | TEXT | YES | DROPDOWN | Paid | Paid/Pending/Partial/Overdue/Cancelled | Current invoice state |
| 15 | linkedTransactionId | TEXT | YES | TXN-XXXXX | TXN-002 | Must exist in Transactions | Links to transaction |
| 16 | paymentDate | DATE | NO | YYYY-MM-DD | 2024-01-25 | ≤ today if populated | When payment received |
| 17 | paymentMode | TEXT | NO | DROPDOWN | Bank Transfer | Bank Transfer/Check/Cash/UPI | Payment instrument |
| 18 | invoiceItems | TEXT | NO | JSON or CSV | [{description: "Service", qty: 1, rate: 15000000}] | Structured | Line-item details |
| 19 | notes | TEXT | NO | Free text | Project completion | 200 chars max | Internal notes |
| 20 | tally_invoice_number | TEXT | NO | Free text | INV-001 | Original Tally reference | For audit trail |

### Example Data
```
invoiceId  | invoiceNo        | date       | dueDate    | type     | partyName     | partyId    | invoiceAmount | taxableAmount | gstAmount | gstRate | paidAmount | balanceAmount | status   | linkedTransactionId | paymentDate | notes
-----------|------------------|------------|------------|----------|---------------|------------|---------------|---------------|-----------|---------|-----------|---------------|----------|---------------------|-------------|------------------------
INV-001    | INV/2024/0001    | 2024-01-15 | 2024-02-15 | Sales    | Acme Corp     | PARTY-001  | 15000000      | 12741573      | 2287356   | 18      | 15000000  | 0             | Paid     | TXN-002             | 2024-01-25  | Project completion
INV-002    | INV/2024/0002    | 2024-02-01 | 2024-03-01 | Sales    | Tech Corp     | PARTY-002  | 12000000      | 10169492      | 1830508   | 18      | 5000000   | 7000000       | Partial  | TXN-008             | 2024-02-10  | Consulting
INV-003    | INV/2024/0003    | 2024-02-10 | 2024-03-10 | Sales    | Global Inc    | PARTY-006  | 20000000      | 16949153      | 3050847   | 18      | 0         | 20000000      | Pending  | NULL                | NULL        | Awaiting approval
INV-004    | INV/2024/0004    | 2024-01-05 | 2024-02-05 | Sales    | RetailCo     | PARTY-007  | 8000000       | 6779661       | 1220339   | 18      | 0         | 8000000       | Overdue  | NULL                | NULL        | Payment 25 days late
VINV-001   | VINV/2024/0001   | 2024-01-12 | 2024-02-12 | Purchase | Tech Vendor   | PARTY-002  | 7500000       | 7142857       | 357143    | 5       | 7500000   | 0             | Paid     | TXN-006             | 2024-01-20  | Monthly inventory
VINV-002   | VINV/2024/0002   | 2024-01-25 | 2024-02-25 | Purchase | Supplies Co   | PARTY-008  | 4500000       | 4500000       | 0         | 0       | 0         | 4500000       | Overdue  | NULL                | NULL        | Payment pending 35 days
```

### Critical Notes
- **Status automation:** 
  - Paid = paidAmount ≥ invoiceAmount AND paymentDate ≤ today
  - Overdue = dueDate < today AND status != Paid AND paidAmount < invoiceAmount
  - Pending = paidAmount = 0 AND dueDate ≥ today
  - Partial = paidAmount > 0 AND paidAmount < invoiceAmount
- **LinkedTransactionId**: Must link to exactly one transaction in Transactions sheet (for reconciliation)
- **Minimum required**: 20-30 invoices (15 sales + 10-15 purchase) including mix of statuses
- **Overdue detection**: At least 3-5 invoices with dueDate < import_date and status != Paid

---

## SHEET 6: Payroll Register (Optional but Recommended)
### Purpose
Track salary expenses for all employees. Enables payroll analytics and salary reconciliation.

### Column Specification

| # | Column Name | Data Type | Required | Format | Example | Validation Rules | Notes |
|---|-------------|-----------|----------|--------|---------|------------------|-------|
| 1 | payrollId | TEXT | YES | PAY-XXXXX | PAY-001 | Unique | Primary key |
| 2 | month | DATE | YES | YYYY-MM | 2024-01 | Start of month | Payroll month |
| 3 | employeeId | TEXT | YES | EMP-XXX | EMP-001 | Unique | Employee identifier |
| 4 | employeeName | TEXT | YES | Free text | John Doe | 100 chars max | Full name |
| 5 | baseSalary | NUMBER | YES | Positive integer | 2500000 | > 0, in paise | Monthly base salary |
| 6 | hra | NUMBER | NO | Positive integer | 500000 | ≥ 0 | House Rent Allowance |
| 7 | da | NUMBER | NO | Positive integer | 250000 | ≥ 0 | Dearness Allowance |
| 8 | conveyance | NUMBER | NO | Positive integer | 100000 | ≥ 0 | Conveyance allowance |
| 9 | bonus | NUMBER | NO | Positive integer | 0 | ≥ 0 | Bonus if any |
| 10 | grossSalary | NUMBER | YES | Positive integer | 3350000 | > 0, sum of above | Total earning |
| 11 | pf | NUMBER | NO | Positive integer | 302500 | ≥ 0 | Provident fund deduction |
| 12 | esi | NUMBER | NO | Positive integer | 0 | ≥ 0 | ESI deduction |
| 13 | it | NUMBER | NO | Positive integer | 200000 | ≥ 0 | Income tax deduction |
| 14 | otherDeductions | NUMBER | NO | Positive integer | 0 | ≥ 0 | Other deductions |
| 15 | totalDeductions | NUMBER | YES | Positive integer | 502500 | = sum of deductions | Total deductions |
| 16 | netSalary | NUMBER | YES | Positive integer | 2847500 | = grossSalary - totalDeductions | Amount paid to employee |
| 17 | status | TEXT | YES | DROPDOWN | Paid | Paid/Pending/Draft | Salary status |
| 18 | paymentDate | DATE | NO | YYYY-MM-DD | 2024-01-31 | Last day of month | When salary paid |
| 19 | linkedTransactionId | TEXT | YES | TXN-XXXXX | TXN-003 | Must exist in Transactions | Links to expense transaction |

### Example Data
```
payrollId | month   | employeeId | employeeName | baseSalary | hra    | da     | grossSalary | pf     | esi | it     | totalDeductions | netSalary | status | linkedTransactionId
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
PAY-001   | 2024-01 | EMP-001    | John Doe     | 2500000    | 500000 | 250000 | 3250000     | 302500 | 0   | 200000 | 502500          | 2747500   | Paid   | TXN-003
PAY-002   | 2024-01 | EMP-002    | Jane Smith   | 2000000    | 400000 | 200000 | 2600000     | 242000 | 0   | 150000 | 392000          | 2208000   | Paid   | TXN-003
PAY-003   | 2024-01 | EMP-003    | Bob Wilson   | 1500000    | 300000 | 150000 | 1950000     | 182000 | 0   | 100000 | 282000          | 1668000   | Paid   | TXN-003
... (repeat for 12 months)
```

### Notes
- Optional sheet but essential for salary/payroll analytics
- All amounts in paise
- Salary expense is usually a large transaction, so payroll details help verify accuracy
- One payroll record per employee per month (12-36 records for 3 employees × 12 months)

---

## SHEET 7: Budget Master (Optional)
### Purpose
Track budgeted vs actual expenses for variance analysis.

### Column Specification

| # | Column Name | Data Type | Required | Format | Example | Validation Rules | Notes |
|---|-------------|-----------|----------|--------|---------|------------------|-------|
| 1 | budgetId | TEXT | YES | BUD-XXXXX | BUD-001 | Unique | Primary key |
| 2 | budgetPeriod | DATE | YES | YYYY-MM | 2024-01 | Start of month | Budget month |
| 3 | categoryId | TEXT | YES | CAT-XXX | CAT-002-1 | Must exist in CoA | Foreign key |
| 4 | categoryName | TEXT | YES | Free text | Salaries | 50 chars max | Category name |
| 5 | budgetedAmount | NUMBER | YES | Positive integer | 25000000 | > 0, in paise | Budgeted spend |
| 6 | actualAmount | NUMBER | YES | Positive integer | 24500000 | ≥ 0 | Actual spend (auto-calculated) |
| 7 | variance | NUMBER | YES | Integer (can be negative) | 500000 | = budgetedAmount - actualAmount | Positive = under budget |
| 8 | variancePercentage | NUMBER | YES | Decimal | 2 | Percentage variance | (variance / budgetedAmount) × 100 |
| 9 | status | TEXT | YES | DROPDOWN | Within | Within/Exceeded/Alert | Budget status |
| 10 | notes | TEXT | NO | Free text | Conservative estimate | 200 chars max | Notes |

### Example Data
```
budgetId | budgetPeriod | categoryId | categoryName | budgetedAmount | actualAmount | variance | variancePercentage | status     | notes
|---|---|---|---|---|---|---|---|---|---|
BUD-001  | 2024-01      | CAT-002-1  | Salaries     | 25000000       | 24500000     | 500000   | 2.0                | Within     | Tight month
BUD-002  | 2024-01      | CAT-002-2  | Rent         | 5000000        | 5000000      | 0        | 0.0                | Within     | Fixed cost
BUD-003  | 2024-01      | CAT-002-3  | Utilities    | 1000000        | 750000       | 250000   | 25.0               | Within     | Good month
BUD-004  | 2024-01      | CAT-002-5  | Marketing    | 3000000        | 3500000      | -500000  | -16.7              | Exceeded   | Extra spend on ads
... (repeat for 12 months)
```

### Notes
- Optional but helps with budget vs actual analysis
- Budget periods typically align with months (12 records per year per category)
- Actual amounts auto-calculated from Transactions matching the category

---

## SHEET 8: Bank Account Mappings (Bucket Allocation) - Optional
### Purpose
Define how cash is distributed across different "buckets" (operating, GST, reserve, CapEx).

### Column Specification

| # | Column Name | Data Type | Required | Format | Example | Validation Rules | Notes |
|---|-------------|-----------|----------|--------|---------|------------------|-------|
| 1 | mappingId | TEXT | YES | MAP-XXXXX | MAP-001 | Unique | Primary key |
| 2 | accountId | TEXT | YES | ACC-XXX | ACC-001 | Must exist in Bank Accounts | Foreign key |
| 3 | bucketId | TEXT | YES | DROPDOWN | operating | operating/gst/reserve/capex | Bucket type |
| 4 | bucketName | TEXT | YES | Free text | Operating Expenses | 50 chars max | Display name |
| 5 | allocationPercentage | NUMBER | YES | 0-100 | 60 | Whole number, sum per account = 100 | Percentage allocation |

### Example Data
```
mappingId | accountId | bucketId   | bucketName           | allocationPercentage
|---|---|---|---|---|
MAP-001   | ACC-001   | operating  | Operating Expenses   | 60
MAP-002   | ACC-001   | gst        | GST Reserve          | 20
MAP-003   | ACC-001   | reserve    | Cash Reserve         | 15
MAP-004   | ACC-001   | capex      | CapEx Fund           | 5
MAP-005   | ACC-002   | operating  | Operating Expenses   | 100
```

---

# 🎯 DATA MAPPING SUMMARY TABLE

## Minimum Data Requirements to Auto-Generate All Reports

| Entity | Min Count | Critical Fields | Business Impact |
|--------|-----------|-----------------|-----------------|
| **Bank Accounts** | 1 | accountId, name, opening balance, current balance | Starting cash position |
| **CoA Categories** | 10 | categoryId, categoryType, parent, isActive | Auto-categorization |
| **Vendors/Customers** | 5 | partyId, name, type, GSTIN | Invoice linking |
| **Transactions** | 100 | id, date, amount, isIncome, categoryId, accountId | Core P&L |
| **Invoices** | 20 | id, date, dueDate, amount, status, linkedTxnId | AR/AP tracking |
| **Payroll** | 0 | employeeId, month, salary, net, linkedTxnId | Optional: Salary analytics |
| **Budget** | 0 | period, categoryId, budgetedAmount | Optional: Budget analysis |
| **Mappings** | 1-4 | accountId, bucketId, percentage | Optional: Cash distribution |

---

# ⚠️ CRITICAL VALIDATION RULES

## Before Uploading to ArkFinance, Your Middle-Layer App Must Verify:

### 1. Referential Integrity
```
✓ All categoryId in Transactions must exist in CoA
✓ All partyId in Transactions/Invoices must exist in Vendors sheet
✓ All accountId must exist in Bank Accounts sheet
✓ All invoiceRef must exist in Invoices (if populated)
✓ All linkedTransactionId in Invoices must exist in Transactions
```

### 2. Financial Integrity
```
✓ Opening Balance transaction exists on date = fiscal year start
✓ Sum of all Income transactions - Sum of all Expense transactions = Current Balance
✓ For each invoice: invoiceAmount = taxableAmount + gstAmount
✓ For each transaction: If gstRate > 0, then gstAmount must = taxableAmount × gstRate ÷ 100
```

### 3. Date Integrity
```
✓ All dates in YYYY-MM-DD format
✓ All dates ≥ opening date AND ≤ today
✓ Invoice dueDate ≥ invoiceDate
✓ For paid invoices: paymentDate ≥ invoiceDate AND paymentDate ≤ dueDate (ideally)
```

### 4. Data Completeness
```
✓ No NULL values in Required columns
✓ All amounts > 0 (amounts should never be negative in Excel; use isIncome flag)
✓ Descriptions are not empty (used for auto-categorization)
✓ At least 12 months of transaction data (monthly recurring transactions)
```

---

# 📝 EXAMPLE IMPORT WORKFLOW

## Step 1: Middle-Layer App Processes Tally Export
```
Tally Day Book (CSV) 
    ↓
Middle-layer app:
  - Parse dates, amounts
  - Map Tally ledgers → ArkFinance categories
  - Map Tally debtors/creditors → ArkFinance vendors
  - Generate transaction records
    ↓
Output: Transactions sheet
```

## Step 2: Generate Excel File
```
Middle-layer app generates 8-sheet Excel:
  1. Bank Accounts (from Tally trial balance opening balances)
  2. Chart of Accounts (from Tally ledger master)
  3. Vendors & Customers (from Tally debtors/creditors)
  4. Transactions (from Tally day book + trial balance)
  5. Invoices (from Tally sales/purchase register)
  6. Payroll Register (from Tally salary transactions) - Optional
  7. Budget (if Tally has budget data) - Optional
  8. Bank Mappings (user-defined) - Optional
```

## Step 3: Upload to ArkFinance
```
User uploads Excel → /api/import/bulk-upload
  ↓
ArkFinance validates all sheets:
  - Referential integrity
  - Financial integrity
  - Date integrity
  - Data completeness
  ↓
If valid: Batch insert all data → Auto-calculate metrics
  ↓
Dashboard refreshes → All reports auto-generate
  ↓
Snapshot shows:
  - Cash: ₹14.5L
  - Runway: 2.3 months
  - Revenue: ₹8.5L
  - Burn: ₹6.2L
  - Health Score: 52/100
  - All charts populated ✓
```

---

# 🔗 FIELD MAPPING: TALLY → ARKFINANCE

## Common Tally Exports to ArkFinance Fields

| Tally Concept | Tally Field | ArkFinance Sheet | ArkFinance Field | Mapping Logic |
|---------------|-------------|-----------------|------------------|---------------|
| Ledger Master | Ledger Name | CoA | categoryName | Direct 1:1 map to category |
| Ledger Type | Ledger Category (P&L/Balance Sheet) | CoA | categoryType | P&L expense → Expense, P&L income → Revenue, BS asset → Asset, etc. |
| Party Master | Party Name (Debtor/Creditor) | Vendors | partyName | Direct 1:1 map |
| Party GSTIN | GSTIN | Vendors | gstIn | Direct copy, validate format |
| Party PAN | PAN | Vendors | panNo | Direct copy, validate format |
| Day Book | Voucher Date | Transactions | date | Direct copy, validate YYYY-MM-DD |
| Day Book | Voucher Ref | Transactions | referenceNo | Direct copy for check numbers, UPI refs |
| Day Book | Narration | Transactions | description | Direct copy, use for auto-categorization |
| Day Book | Debit Amount | Transactions | amount | If debit: amount = debit, isIncome = false |
| Day Book | Credit Amount | Transactions | amount | If credit: amount = credit, isIncome = true |
| Day Book | Ledger Name | Transactions | categoryId | Match against CoA categoryName |
| Day Book | Party Name (if present) | Transactions | vendorCustomerId | Match against Vendors partyName → get partyId |
| Sales Register | Invoice No | Invoices | invoiceNo | Direct copy |
| Sales Register | Invoice Date | Invoices | date | Direct copy |
| Sales Register | Party Name | Invoices | partyName | Direct copy |
| Sales Register | Invoice Amount | Invoices | invoiceAmount | Direct copy |
| Sales Register | Tax Amount | Invoices | gstAmount | Direct copy |
| Sales Register | Invoice Status (Paid/Unpaid) | Invoices | status | Unpaid → Pending, Paid → Paid |
| Trial Balance | Opening Balance | Bank Accounts | openingBalance | Aggregate all bank account ledgers |
| Trial Balance | Closing Balance | Bank Accounts | currentBalance | Latest balance from trial balance |
| Bank Reconciliation | Cleared Amount | Transactions | status | Mark as Reconciled |

---

# ✅ SIGN-OFF CHECKLIST FOR MIDDLE-LAYER APP

Before uploading Excel to ArkFinance, your middle-layer app should verify:

- [ ] All 8 sheets created (at minimum: 1, 2, 3, 4, 5)
- [ ] No duplicate transactionIds
- [ ] No duplicate invoiceIds
- [ ] No duplicate partyIds
- [ ] All dates in YYYY-MM-DD format
- [ ] All amounts in paise (multiply rupees by 100)
- [ ] Opening balance transaction exists
- [ ] Running balance verified (Opening + Income - Expense = Current)
- [ ] All foreign keys valid (categoryId, partyId, accountId exist in their respective sheets)
- [ ] At least 100 transactions across 12 months
- [ ] At least 20 invoices with mix of statuses
- [ ] GST amounts calculated correctly
- [ ] No NULL values in Required columns
- [ ] At least 3-5 Overdue invoices for alerts to show
- [ ] Revenue and Expense categories properly balanced
- [ ] Export file size < 10MB

---

# 📞 SUPPORT REFERENCE

If your middle-layer app encounters mapping challenges:

**Common Tally Mappings:**
- Revenue Ledgers → CAT-001-X (Revenue subcategories)
- Expense Ledgers → CAT-002-X (Expense subcategories)
- Asset Ledgers → CAT-004-X
- Liability Ledgers → CAT-005-X
- Debtors (Customers) → partyType = "Customer"
- Creditors (Vendors) → partyType = "Vendor"
- Bank Accounts (Cash/Bank) → Bank Accounts sheet

**Questions to Ask When Mapping:**
- Is this a revenue or expense transaction?
- Who is the party involved? (Customer/Vendor/Employee/Government)
- Is GST applicable? What is the rate?
- Which bank account is affected?
- Does this relate to an invoice?

---

This specification is **complete and production-ready**. Your middle-layer app should use these exact field names and formats to ensure 100% compatibility with ArkFinance's bulk upload API.
