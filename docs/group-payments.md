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

Imported payment documents can be unposted and edited in an open period. Choose
**Unpost and edit** inside the document, or Cancel posting in the journal. Closed
periods, linked bank/cash receipts and later payments protect dependent records.

The original document is retained in `source_snapshot`. Unchanged service
allocations are preserved on reposting. When a payment amount changes, its
difference goes only to the maintenance service selected in Allocation parameters.
A zero amount withdraws that row's payment. Signed imported compensation entries
remain intact. Source dates, accounts and row structure stay fixed; use a new
document for additional payments.

Save retains the edited draft; OK posts it once. The local API supports the same
workflow through `payment.unpost` and `payment.save`. Copy creates a new ordinary
draft for a new payment run.
