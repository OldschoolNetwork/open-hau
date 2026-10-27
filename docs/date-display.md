# Date display

General settings provide nine date styles, six explicit billing-month styles and
an automatic month style derived from the date style. Numeric,
short-year, abbreviated-month, long-month, weekday and Roman-month variants are
available. Examples use the interface language. Receipts use their own selected
language, including English and bilingual Russian/Romanian.

The preferences apply to displayed payment dates, document journals, tariff
history, meter-reading history, billing headings, receipt deadlines and report
previews/printable exports. Native date/month editing controls retain the operating
system's calendar presentation. JSON exchange, filenames and machine-readable
ledger exports retain ISO dates. Choosing a display style never reparses stored
dates or changes rates, periods, ordering or financial calculations.

Missing month preferences use automatic presentation; an explicitly selected
month format is retained. No timezone conversion is applied to
calendar-only dates. Invalid or absent source dates are never silently repaired.
