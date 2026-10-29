# Benefits, charges and recalculation

Benefits are optional. A database without benefit assignments calculates charges
without a benefit deduction. Benefit categories and supporting-document types are
ordinary editable reference catalogs.

## Assign a benefit

Create an assignment under Citizens. Select the citizen, category, start date and
optional inclusive expiry date. Supporting-document fields are available in the
main tab. In the calculation tab select the account and service for each row.
Choose a percentage of the service charge or a fixed monthly amount in MDL.
Save retains a draft; OK applies the document. A draft does not affect charges.

The partial-month rule is explicit:

- **Calendar days** (default): apply the monthly percentage or fixed amount in
  proportion to eligible calendar days, including leap days.
- **Whole month**: apply the monthly amount if eligibility overlaps any day in
  the month.
- **First day**: apply the monthly amount only if eligibility exists on day 1.

The expiry date is included. A termination document names the first day without
eligibility. For example, a 50% benefit on a 310 MDL October service charge,
starting October 17 and ending October 31, deducts 75 MDL under calendar-day
proration. Terminating it on October 20 reduces the deduction to 15 MDL.

For overlapping assignments, the highest eligible benefit is used by default.
Rows explicitly set to Add are added to that amount. The daily combined benefit
is capped at the service charge for that day. The final service deduction is
rounded once using the database rounding setting. Benefits cannot create a
negative service charge or transfer a deduction to an unrelated service.

An applied assignment affects new calculations. Already saved calculations must
be recalculated explicitly. Changing an assignment that affects a closed month
is rejected. Undo requires dependent calculations and termination documents to
be undone first. Supporting records and all benefit settings are stored in the
portable database file.

## Calculate and recalculate

Individual charge documents preserve calculations for selected accounts without
closing the entire month. Group calculation prepares the selected accounts as
one atomic operation. Missing inputs prevent posting; no partial batch is kept.

Recalculation provides separate service and benefit switches. Recalculating the
current open month replaces its saved calculation using the selected components.
A previous-month recalculation preserves the historical snapshot and posts only
the difference in the current month. Its comparison records retain the previous
amount, revised amount and difference per service. Repeating a recalculation
accounts for previously posted differences and does not post them again.

Corrections are dated balance adjustments. Positive charge or penalty corrections
increase debt. Positive benefit, advance or payment corrections reduce debt;
negative values reverse those effects. A payment correction does not record a
new bank or cash receipt. Record actual received funds through Payments.

Penalty documents require an explicit debt base, daily percentage and day count:
`base × daily percentage / 100 × days`. No statutory rate or eligibility rule is
assumed automatically.

## Reports and legacy journals

Beneficiary reports show assignments active at the selected end date. The
beneficiary register includes assignments overlapping the selected date range.
The account ledger shows dated charges, corrections, payments and running balance.
Reports offer preview and separate Print, PDF, XLSX, CSV and HTML actions.

Legacy administration journal import adds read-only source entries to a new file.
It preserves the existing organization, settings and financial collections and
does not repost source transactions. Imported entries have no fabricated undo
state. Their movement view can show preserved monthly charges or source correction
rows; a monthly snapshot is not proof of an individual document's original
posting movements. Imported journals do not establish complete feature parity
with the source application.
