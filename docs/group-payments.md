# Group payment documents

Open **Personal accounts > Group payment input**. The journal and each editor
are separate workspace windows. Select a row and use the toolbar, or double-click
to edit. The toolbar provides Add, Copy, Edit, Refresh, Filter, Mark for deletion,
Post, Cancel posting and Movements where the document state permits them.

In the editor, set the date and payment method. The method's ellipsis button
opens its reference lookup. **Fill** adds accounts open in the payment month;
**Selection** opens the account lookup for a chosen set. Row commands add, copy,
remove and reorder rows. Copying a row selects an unused account.

Enter the amount for each account. Select its row and choose **Payment breakdown**
to open the allocation in a separate window. Automatic allocation follows the
positive debt of each service and preserves the exact receipt total. The
allocation parameters contain the explicit debt-through month and the building
maintenance service. Payment excess is assigned to that selected service.

Turning off automatic allocation permits changing only the maintenance amount.
The remaining payment is distributed among the other services by debt. Apply
the breakdown with OK to update the editor; this does not post the document.
If the parent row or its allocation parameters changed while the breakdown was
open, reopen the breakdown before applying it.

**Save** stores a draft without creating payments. **OK** posts and closes the
document. Posting validates the whole batch before creating any receipts.
Zero-value rows do not create receipts. The editor, breakdown and lookup windows
participate in unsaved-change protection.

**Movements** shows the linked service payments in another window. Cancel posting
returns a native document to draft and removes its linked receipts and service
shares. It is blocked for closed periods, bank/cash links, or subsequent account
payments that must be handled first. A marked draft cannot be posted; use
**Service > Delete marked objects** to review and remove marked drafts.

Imported documents retain their original recorded allocations, including signed
corrections and legacy flags. They are read-only and cannot be unposted through
the native document command. Historical metadata does not generate new receipts
or recalculate preserved accounting history. Copy creates a new draft; review its
date, amounts and allocation parameters before posting.
