# Meter reading documents

Open **Meters > Individual meter readings** or **Shared meter readings**.
The first window is the document journal. Double-click a row to open its editor;
**Add** creates a new document in a separate window.

Set its date and period. **Fill** adds connected meters for that date, optionally
limited to the selected service. **Selection** opens the account lookup; selected
accounts contribute their connected meters. Adding a row also permits selecting
a meter explicitly. Disconnected meters remain available in historical records.

The editor places account and meter first, followed by the previous reading,
new reading, difference and reading date. Each row may have its own reading date
within the document period. Empty readings are not posted; zero is a value.
The difference is calculated with decimal arithmetic. A decreasing reading needs
correction or a meter replacement recorded separately.

**Save** preserves a draft. **OK** posts and closes the document. Posting validates
all rows before updating the database. Applied documents are read-only, and
closed accounting periods cannot be changed through new reading documents.

Portable files that contain readings without document headers display them in
explicitly labelled read-only history groups. Displaying this history does not
create new meter values, accounting movements or charges. Imported original
headers retain their source numbers and comments when available.
