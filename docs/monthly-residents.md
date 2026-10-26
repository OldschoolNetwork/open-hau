# Monthly residents and waste charges

The account card's waste-person field edits the total for the selected billing
month. The calculation uses that monthly value. Previous months and the legacy
default remain unchanged. Closed months cannot be edited. Changing this total
replaces any apartment-level entries for the same account and month; leave it
unchanged to retain apartment details or cumulative entry.

The reading workspace supports monthly occupancy for a whole account or for each
of its apartments. Do not mix account totals and apartment details in one month.
When apartment details are used, every apartment must be covered; zero is a valid
explicit count for an unoccupied apartment.

Choose direct entry for the number of residents in that month, or cumulative
entry for an increasing person register. For example, previous 3 and current 7
means 4 people are billed. This register is not a physical utility meter.

Monthly counts are used by per-person services, including waste collection.
They do not change the registered resident count in the account card. Projects
with no monthly occupancy retain the existing default waste-person count. Once
monthly entry is used, a missing later month requires review instead of silently
reverting to that default. Closed charge amounts remain preserved.
