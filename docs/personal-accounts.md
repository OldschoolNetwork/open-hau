# Personal accounts

Open **Personal accounts > Personal accounts**. The list contains the account
number, responsible person, property and status. Use the date and address/name
filters to find a record. Double-click an account, or select it and choose Edit.
The account list is also used by the ellipsis buttons in report and document
filters.

## Account card

The card has six tabs: Main, Residents, Services, Meters, Additional properties
and Characteristics. Select the date at the top to view dated information.
The responsible person's history opens in a separate window. Property, citizen
and reference links open their corresponding records.

Residents show registration, residence status and relationship. Services show
their connection status and tariff type. Meter history offers status, readings
and consumption views. An account-specific connection change for a shared meter
does not disconnect that meter globally or disconnect other accounts.

Use Change status to open a dated document. Main calculation parameters are
changed through an Account information change document. The monthly waste-charge
person count is separate from registration and residence status: changing it in
one month does not replace another month's count.

The Reports menu opens receipts or an account, service or payment report scoped
to the account and selected month. Report filters remain editable.

## Documents

Each journal and document opens in a separate workspace window. Toolbars provide
Add, Copy, Edit, Refresh, Filter, Mark, Post, Cancel posting and Movements where
the document state allows them. Row toolbars provide Add, Copy, Remove, Move,
Selection, Fill and Clear as applicable.

- **Opening an account:** select the property and responsible person, enter the
  account number, then enter residents, services and additional properties.
  Calculation parameters include areas, registration count and waste-charge
  persons for the document month.
- **Closing an account:** select the account, date and comment. Closing preserves
  the financial and meter history.
- **Account information change:** select the account and enable Change responsible
  person when replacing the holder. Earlier holder and area values remain in
  dated history.
- **Account services change:** one document can contain several accounts. Each
  row specifies the service, tariff type, effective date and connection status.
- **Residence status change:** select the property and the registration/residence
  accounting flags, then enter dated resident rows and optional end dates.
- **Opening balances:** enter service balances, existing penalty amounts and any
  initial advance. An advance requires an explicitly selected service. Own
  individual meters without readings can receive initial readings in the second
  tab. This is an initialization operation; use adjustments after financial
  movements exist. Existing penalties become part of opening debt; this form does
  not implement ongoing penalty accrual.

Save stores a draft. OK posts and closes the document. Posting updates the
associated records atomically. Cancel posting restores its saved prior state
only while later movements, closed periods or related edits do not prevent it.
Imported historical documents are read-only and cannot be posted again.

Service dates are retained in history. Monthly billing uses the resulting service
assignment for the month; daily proration of service connection changes is not
implemented. A selected tariff type is retained with the service connection;
the calculation engine continues to use the configured service tariff.

## Saving and leaving a database

Save the database through File > Save, Ctrl/Cmd+S or the desktop Save shortcut.
Applied document changes are also saved automatically. A form's unsaved input
must first be saved or posted before saving the database can include it.

When leaving with unsaved input, choose Save and exit, Exit without saving or
Cancel. Database switching and returning to the catalog offer the same choices.
Continuing without saving discards outstanding input, including open form drafts;
it does not reverse changes already written to the file. Cancel keeps the current
database and forms open. A save error keeps the application open.
