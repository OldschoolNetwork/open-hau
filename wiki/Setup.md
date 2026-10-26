# Organisation, accounts, services and tariffs

## Organisation

Edit the organisation in settings: name, association code, CF/IDNO, address, bank,
IBAN and notes. Verify them in a receipt preview. Choose the organisation logo in
the receipt workspace.

## Personal accounts

Create an account or edit an existing one. Available fields include:

- Account number and payer.
- Address and comma-separated apartment numbers; one account can cover several apartments.
- Total area, registered residents and a separate person count for waste charges.
- Opening period and opening balance in MDL; a negative balance means an advance.
- Active status, connected services and notes.

The opening balance is an initial debt or advance, not a current payment.
An account does not participate before its opening period. Changes affecting
closed history require reopening the relevant periods.

## Services

Each service has Russian/Romanian names, a unit and a calculation method:

- Metered: current reading minus previous reading.
- Per person: 26.1 uses the account's waste-charge person field, not its registered resident count.
- Area: total account area multiplied by the tariff.
- Fixed: the service's default quantity.
- Manual: a quantity entered for the selected month.

The service must be active and connected to the account. An explicit monthly
quantity override takes precedence over the standard calculation method.

## Tariffs and rounding

Tariffs take effect on the first day of a month. Add a dated record instead of
overwriting an old tariff. The latest applicable record at month start is used.
Splitting a month between tariffs is not supported in the preview.

Each quantity × tariff line is rounded to two decimal places, then rounded lines
and adjustments are summed. Settings offer half up and half even rounding.
Confirm the intended method with the accountant and verify control examples
before starting a real ledger.

[Monthly workflow](Monthly-work) · [User guide](Home)
