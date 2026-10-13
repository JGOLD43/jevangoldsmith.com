# Food diary on your phone

Open **Food diary** on Today. Search a familiar food, enter a pack barcode, or add the values from your label. Choose a meal and amount, review the nutrients, then save. Saved foods and recent meals make repeated entries quicker. Archive removes an entry from daily totals while keeping it available to restore.

A reference amount explains what the nutrient values describe. If a pack gives 500 kcal per 100 g and you ate 30 g, the diary records 150 kcal. Confirm whether a barcode result is per 100 g or per 100 ml; the app does not invent a density conversion. Changing a reference unit clears the old values. Blank nutrients mean unknown, and incomplete totals are marked partial.

## Food photos

**Take food photo** opens Android's camera; **Choose food photo** opens its picker. The selected image is resized and re-encoded locally to remove metadata. The camera or picker may keep a temporary copy in the app cache. Your original gallery pictures are never removed.

Both photo choices stay above your meals after saving; use **Choose food photo** when camera access is off. Capture controls stay dimmed while preparing, saving or analysing.

For an immediate estimate, connect your own OpenRouter API key in the photo's **Food photo AI** settings. The key stays in device-only secure storage, outside the encrypted device sync and the local image reader. Trident checks that your chosen model supports images and private routing. **Analyse with OpenRouter** explicitly sends the selected picture and description to OpenRouter and its provider; it uses your account credits. Backgrounding, locking, Stop or Disconnect cancels pending analysis. Reconnecting never automatically submits a photo.

Meal analysis identifies foods, then chooses from bounded USDA reference candidates. The model does not supply a made-up nutrient table. Photo identity and portions still remain estimates: a picture cannot reveal hidden oil, recipes or exact weight. Review the matched food and correct its edible amount. Pack-label mode transcribes label values for your review. Nothing is logged until **Save food**.

You can also choose **Save for Mac review** without an AI connection or internet. That commits a photo packet to the encrypted vault before acknowledging it. Up to five photos can wait, with at most 5 MB of photo text across the queue. After Phone & Mac sync, review the packet in the Mac Food diary. The queue does not add calories. Retrying an interrupted save reuses the same capture identity; reviewed and discarded packets keep a receipt to avoid reappearing after sync.

## Phone & Mac sync

Open **Phone & Mac sync** in Settings. Its GitHub connection is shared with the separate approved publishing queue, but private sync records are encrypted before they enter the private inbox. Enabling sync connects the whole workspace, including writing, books and learning; it is not limited to food. Review the preview before combining devices and resolve any conflicting versions. A recovery snapshot is saved before incoming records replace local ones.

Food logs, saved meals and pending review packets travel through the existing encrypted preference records. Unsaved view drafts and the food AI key stay on this device. Sync waits for pending local saves, pauses when the app backgrounds or locks, and refreshes screens after incoming changes. Software-update restarts also wait for these saves; a failed save keeps the app open. The public source integration retains document history and deletion receipts so bringing in food sync does not discard those records.

The existing essay editor now binds each save to the version it opened. An incoming edit keeps your unsaved writing visible and asks which writing to keep. Keeping your writing preserves the incoming document properties. If an essay is removed elsewhere while you are editing, review the retained writing and choose **Save as a new private essay** or confirm **Discard retained draft**. A recovered essay has a fresh identity, no publishing source and private visibility; retries of the same retained writing reuse its committed copy. Neither choice recreates or deletes the removed record or its history. Failed recovery keeps the draft and save barriers intact. Moving an essay to Trash keeps its encrypted record and history.

This scoped integration does not add the broader Writing or Trash-management screens. Unresolved writing drafts stay in memory while the app runs, so resolve them before closing the app; they are not promised to survive Android terminating it.

## Food sources

Offline references use 7,793 USDA FoodData Central SR Legacy (2018) foods. These are public-domain US government averages, not a match for every brand or recipe. Barcode lookup sends only the printed code to Open Food Facts; check the returned product against your current pack. Food data attribution and barcode reader licences are available from **Food data and photo privacy**.

- [USDA FoodData Central](https://fdc.nal.usda.gov/)
- [Open Food Facts data and licence](https://world.openfoodfacts.org/data)
- [OpenRouter privacy and zero data retention](https://openrouter.ai/docs/guides/features/zdr)

## Current validation boundary

The earlier integrated phone source passed compilation, an Android-only export, a static credential/queue review and a hidden synthetic walkthrough. That walkthrough checked amount scaling, missing nutrients, optical barcode decoding and save/reload/retry without touching a user vault.

The scoped public integration now includes the required save/sync modules and a Food-specific sheet instead of the broader People screen. Source checks cover its local import closure, encryption/transaction wiring and retained record compatibility. Compilation, export and a fresh screen walkthrough have not yet been rerun for this integration while the coordinator's disk hold is active. Actual Android camera, SQLCipher reopen, encrypted phone-to-Mac sync and a live phone provider request still need a connected phone. No unit suites, OTA publication or installation are part of these source checks.
