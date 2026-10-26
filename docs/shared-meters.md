# Shared meters and monthly exceptions

In 26.2 development, create a physical shared meter and the individual meters
connected to it. A dated group connects meters of the same service. Multiple
meters belonging to one account still represent one participating account.

For the selected month:

1. Calculate consumption as the change in each meter's cumulative readings.
2. Subtract the consumption of all linked individual meters from shared consumption.
3. Exclude the accounts marked exempt for that month from the sharing count.
4. Divide the difference equally among the remaining accounts.

An exempt account's individual consumption remains in step 2. Exemption only
removes its share of the difference. With no monthly exemptions, all linked
accounts participate. Exceptions do not carry into another month.

Decimal shares conserve the entire difference. When equal division is recurring,
some shares differ by one last decimal unit using a stable account-ID order.
The selected precision is a minimum; source precision is retained when necessary
to avoid silently discarding volume. Monetary lines use the project's rounding.

The preview shows shared consumption, individual consumption, the difference,
participating count and per-account shares. Charges show the shared difference
as a separate service line. Missing readings, unit mismatches or a difference
with no eligible participants produce warnings. Negative differences require
an explicit reviewed setting before allocation. A manual billed-volume override
requires review rather than silently adding the same difference again.

Closed charge snapshots retain their financial amounts. Changing a group's
connections across closed history requires a new dated configuration; overlapping
groups cannot reuse the same physical meters.
