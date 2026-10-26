# Bank, cash and reserve funds

The Bank and cash workspace records the organisation's actual money separately
from resident charges, payments and debt. No opening bank/cash or fund balances
are inferred from resident debt or imported spreadsheets.

## Initial setup

Add a bank account or cash account with a name, opening date and confirmed
opening balance in MDL. Add reserve funds with their own opening balances.
Funds describe how existing money is earmarked: they are included in the bank
and cash total, not added to it. Unassigned money equals total cash minus fund
balances. Negative balances and unfunded reserves are shown as warnings.

An opening balance introduced during the selected month is displayed separately
from that month's transactions and is not counted as income. Used opening data
cannot be changed retrospectively through the account editor. Names and active
status remain editable; archived entries retain their history.

## Transactions

- Income increases the selected bank/cash account and, when selected, its fund.
- Expense decreases the selected bank/cash account and, when selected, its fund.
- A bank/cash transfer moves money between two accounts without changing total
  income, expense, cash or reserve balances.
- A fund allocation moves earmarked amounts between a fund and unassigned money,
  or between funds. It does not create cash, income or expense.

Record the date, positive amount with at most two decimal places, document
reference and notes. Income and expense also retain category and counterparty.
The ledger displays transactions and totals for the selected billing month.
Applying a form updates the project; use the main Save button to persist it.

## Match resident payments

Matching is optional and manual. An income entry may reference one or more
existing resident payments. Their sum must equal the recorded income exactly,
and each payment can be linked only once. Select the payment month to find older
payments; already selected links remain visible. This association neither creates
a new resident payment nor changes the resident's debt. An unmatched income entry
must not be interpreted as a resident payment.

## Protect and export

The ledger can be locked through a date inclusively. Entries on or before that
date cannot be added or edited, and an existing locked entry cannot be moved to
a later date to bypass the lock. Unlocking requires an explicit confirmation.
This lock is separate from closing resident charge periods. Changing opening
data across locked history is also blocked.

The transaction CSV includes account/fund names, transfer endpoints, categories,
counterparties, references, notes and linked payment identifiers. It uses the
same UTF-8, semicolon and formula-escaping conventions as other CSV exports.
It exports the transaction list, not a complete backup or opening-balance report.

This is an offline bookkeeping journal. Automatic bank-statement matching,
accounting corrections with reversal documents, payroll and statutory reporting
are not implemented. Browser save/reload checks and calculation tests do not
replace native platform acceptance or review of actual organisation balances.
