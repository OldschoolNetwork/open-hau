# Service balances and payment allocation

The overall balance report and the service balance report share the same monetary
totals. The service report can include all services or a selected service, with
an independent formed preview, CSV, SpreadsheetML XML and printable HTML.
Use the preview's print command to save a PDF through the system print dialog.

## Recording a payment

Open **Payments**, choose an account, payment date and total amount, then use the
payment breakdown. Select the last billing month covered by the payment and the
service representing building maintenance. The suggested month is the preceding
month; it can be changed explicitly. Existing receipts through the payment date
reduce the available debt. The payment being edited is excluded from its own
calculation, and future receipts are excluded.

Automatic allocation is proportional to each service's positive outstanding debt.
Services already in credit receive no proportional share. Integer minor units and
largest remainders preserve the exact payment total. Amounts above the combined
positive debt are allocated to building maintenance.

Only the maintenance share can be entered manually. The remaining payment is
distributed proportionally over the other services' debts. A negative maintenance
share is supported as an explicit redistribution; the remaining allocation must
still fit the other services' positive debts. This changes payment classification,
never the service's charge or tariff. All shares must sum exactly to the receipt.

Recalculate after changing the account, date, amount, billing month, maintenance
service or manual amount. Changes to the project from another window also require
recalculation. Save stores the final shares and, for newly calculated allocations,
the billing month, maintenance service and optional manual amount. Imported shares
without this provenance retain their original amounts without invented metadata.
Closed-period payment amounts and dates remain protected.

## Older data

`service_accounting` preserves opening balances, payment shares and monthly
adjustments by service. Projects without this section remain readable. Unclassified
amounts appear as **Unallocated** rather than being guessed. Resolve those amounts
before automatic allocation. The initial interface does not yet provide a dedicated
editor for classifying older opening balances and adjustments; validated JSON
exchange supports these fields.

Preserved snapshot lines are the authority for closed charges. Corrections already
included in snapshot lines must not be added again as separate adjustments.
Historical signed payment shares are retained when their net agrees with the
original receipt. Cash, bank and reserve-fund records remain separate ledgers.

## Group payment entry

Open **Accounts → Group payment entry**. Create a document, choose its receipt
date, billing month and maintenance service, and fill the rows with active accounts.
Enter the actual receipts; leave unpaid accounts at zero. The payment-method field
is descriptive text, not a bank connection. A manual maintenance share is optional
per row. The eye button shows that row's service allocation.

Saving a draft creates no receipts. Posting validates every row and generates all
receipts and their service shares together. If a row fails, none are applied.
Zero rows remain in the document without creating zero-value receipts. Repeated
accounts and posting into closed periods are rejected. The receipt date comes from
the document; the entry date records the day of posting.

Posted documents are read-only and cannot be posted twice. Their receipts cannot
be changed through the individual payment editor. Cancellation/reversal documents,
bank-file import and historical batch reconstruction are not yet available.
