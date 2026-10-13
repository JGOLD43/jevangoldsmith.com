# Keeping phone food captures safe during sync

A pending capture is an immutable request to review a food photo or description. It contributes no food or nutrition to the diary. Reviewing it on the Mac saves one food record and a receipt together; discarding it saves a receipt without food. Current receipts carry no photo.

The sync boundary now treats the capture as one packet, including its update stamp. The preference key must match the JSON capture ID, and the SQL and JSON update stamps must match. Invalid types, unsupported fields, malformed photos, terminal photos and mismatched review IDs stop the import. A reviewed receipt requires an existing, valid food record at its stable ID; the merge never invents a food record or nutrition to satisfy a receipt. Pending text-only packets already supported by the Mac remain readable on the phone.

Original ID, creation time, date, meal, mode and description cannot change. Pending copies must also agree on the original photo. Changed details need a new capture. Reviewed and discarded receipts survive a missing or stale pending copy, even when a generic conflict choice selects that copy. A reviewed receipt wins a racing discard when the original details agree, preserving the explicitly logged food. Its existing food value and update stamp travel together; conflicting later edits to that food still require the normal sync choice.

The merged queue is limited to five pending captures, with the existing 900,000-character JPEG limit per photo and 5 MiB combined encoded-photo limit. Overflow stops syncing and retains both devices' data. Review or discard a capture before retrying; the merge does not delete captures to fit the limit. First pairing uses the actual capture packets and foods, without inventing JSON ancestors.

Recovery is deliberately stricter. A recovery point cannot remove a current capture, replay a pending photo, downgrade a receipt or replace one terminal status with another. Validation occurs before attachment mapping and the write transaction, then current local tables are rechecked before applying it. Choose a recovery point that preserves the current receipts.

The guard validates before attachment import and again before applying SQL changes. Mac extended-column wire compatibility is preserved. Receipt erasure cannot prove the original photo's bytes once no pending copy or ancestor remains; earlier encrypted sync history and recovery points may still contain photos.

## Acceptance still pending

The current evidence is source inspection and mirrored implementation only. Native acceptance must exercise a real pending save, atomic review, stale pending and racing discard merges, malformed ID/stamp/original-detail rejection, queue overflow, encrypted reopen with one food, and recovery refusal without local changes. No native or live sync check has run for this guard, and this document does not establish successful delivery or ordinary-use acceptance.
