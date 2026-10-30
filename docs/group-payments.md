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

`I`m`p`o`r`t`e`d` `p`a`y`m`e`n`t` `d`o`c`u`m`e`n`t`s` `c`a`n` `b`e` `u`n`p`o`s`t`e`d` `a`n`d` `e`d`i`t`e`d` `i`n` `a`n` `o`p`e`n` `p`e`r`i`o`d`.` `C`h`o`o`s`e` `*`*`U`n`p`o`s`t` `a`n`d` `e`d`i`t`*`*` `i`n`s`i`d`e` `t`h`e` `d`o`c`u`m`e`n`t`,` `o`r` `C`a`n`c`e`l` `p`o`s`t`i`n`g` `i`n` `t`h`e` `j`o`u`r`n`a`l`.` `C`l`o`s`e`d` `p`e`r`i`o`d`s`,` `l`i`n`k`e`d` `b`a`n`k`/`c`a`s`h` `r`e`c`e`i`p`t`s` `a`n`d` `l`a`t`e`r` `p`a`y`m`e`n`t`s` `s`t`i`l`l` `p`r`o`t`e`c`t` `d`e`p`e`n`d`e`n`t` `r`e`c`o`r`d`s`.`
`
`T`h`e` `o`r`i`g`i`n`a`l` `d`o`c`u`m`e`n`t` `i`s` `r`e`t`a`i`n`e`d` `i`n` `s`o`u`r`c`e`_`s`n`a`p`s`h`o`t`.` `U`n`c`h`a`n`g`e`d` `s`e`r`v`i`c`e` `a`l`l`o`c`a`t`i`o`n`s` `a`r`e` `p`r`e`s`e`r`v`e`d` `o`n` `r`e`p`o`s`t`i`n`g`.` `W`h`e`n` `a` `p`a`y`m`e`n`t` `a`m`o`u`n`t` `c`h`a`n`g`e`s`,` `i`t`s` `d`i`f`f`e`r`e`n`c`e` `g`o`e`s` `o`n`l`y` `t`o` `t`h`e` `m`a`i`n`t`e`n`a`n`c`e` `s`e`r`v`i`c`e` `s`e`l`e`c`t`e`d` `i`n` `A`l`l`o`c`a`t`i`o`n` `p`a`r`a`m`e`t`e`r`s`.` `A` `z`e`r`o` `a`m`o`u`n`t` `w`i`t`h`d`r`a`w`s` `t`h`a`t` `r`o`w`'`s` `p`a`y`m`e`n`t`.` `S`i`g`n`e`d` `i`m`p`o`r`t`e`d` `c`o`m`p`e`n`s`a`t`i`o`n` `e`n`t`r`i`e`s` `r`e`m`a`i`n` `i`n`t`a`c`t`.` `S`o`u`r`c`e` `d`a`t`e`s`,` `a`c`c`o`u`n`t`s` `a`n`d` `r`o`w` `s`t`r`u`c`t`u`r`e` `s`t`a`y` `f`i`x`e`d`;` `u`s`e` `a` `n`e`w` `d`o`c`u`m`e`n`t` `f`o`r` `a`d`d`i`t`i`o`n`a`l` `p`a`y`m`e`n`t`s`.`
`
`S`a`v`e` `r`e`t`a`i`n`s` `t`h`e` `e`d`i`t`e`d` `d`r`a`f`t`;` `O`K` `p`o`s`t`s` `i`t` `o`n`c`e`.` `T`h`e` `s`a`m`e` `w`o`r`k`f`l`o`w` `i`s` `a`v`a`i`l`a`b`l`e` `t`h`r`o`u`g`h` `t`h`e` `l`o`c`a`l` `A`P`I` `u`s`i`n`g` `p`a`y`m`e`n`t`.`u`n`p`o`s`t` `a`n`d` `p`a`y`m`e`n`t`.`s`a`v`e` `a`c`t`i`o`n`s`.` `C`o`p`y` `c`r`e`a`t`e`s` `a` `n`e`w` `o`r`d`i`n`a`r`y` `d`r`a`f`t` `f`o`r` `a` `n`e`w` `p`a`y`m`e`n`t` `r`u`n`.`
`