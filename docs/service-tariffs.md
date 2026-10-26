# Services and tariffs

Each service has an independent tariff history. The Tariffs workspace filters
records by service and displays their effective dates. The service card displays
its tariff history and associated individual/shared meter identities, including
inactive and retired meters. Meter types and physical meter identities are
different concepts; a type catalog is still pending.

## Manually entered transition price

When using an accountant-supplied average price for a transition month, choose
the average-price entry mode. Enter the service, transition month, average price
and subsequent full rate. Saving creates two tariff records atomically: the
average from the first day of the transition month and the full rate from the
first day of the following month. Decimal tariff precision is retained; billed
amounts use the configured monetary rounding.

Existing entries on either effective date are not overwritten. Edit those
existing records explicitly instead. The combined action is blocked if it would
affect closed history. No average is calculated automatically.

## Remaining workflows

Splitting consumption at an intra-month tariff change requires dated readings
and a separate reviewed calculation workflow. It is not implemented by the
average-price mode. Ordinary tariffs currently start on month boundaries.

A tariff-change document journal is available alongside the applied rate history.
Documents retain a number, date, comment, multiple service/rate rows and an
explicit draft/applied state. Drafts can be edited without changing charges.
Applying validates the entire document before adding rates; a collision or a
closed affected month blocks the whole application. Applied documents are read
only and their linked rates must match their rows. Reversal/correction documents
are not yet implemented. Ordinary tariff records are not automatically converted
into document history or assigned invented metadata.

Separate base-consumption and shared-difference tariffs can be recorded as
independent services. A shared-meter group can select a dedicated difference
service, whose own dated tariff determines that line's charge. The selected
service must use the meter's volume unit and have no physical meters of its own.
The group assigns this billing service to its linked consumers; adding the same
service to an account does not generate a duplicate charge. Missing/inactive
services or missing tariffs produce a warning rather than falling back to the
base price. Conflicting manual difference quantities block automatic billing.
Leaving the selector empty preserves the base-service tariff behavior.

Supplier data,
service ordering, permitted meter types, norms and excess rates require separate
configuration; an excess rate must not be interpreted as the shared-meter
difference rate without an explicit rule.
