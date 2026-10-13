# Food diary on your phone

Open **Food diary** on Today. Search a familiar food, enter a pack barcode, or add the values from your label. Choose a meal and amount, review the nutrients, then save. Saved foods and recent meals make repeated entries quicker. Archive removes an entry from daily totals while keeping it available to restore.

A reference amount explains what the nutrient values describe. If a pack gives 500 kcal per 100 g and you ate 30 g, the diary records 150 kcal. Confirm whether a barcode result is per 100 g or per 100 ml; the app does not invent a density conversion. Changing a reference unit clears the old values. Blank nutrients mean unknown, and incomplete totals are marked partial.

## Food photos

**Take food photo** opens Android's camera; **Choose food photo** opens its picker. The selected image is resized and re-encoded locally to remove metadata. The camera or picker may keep a temporary copy in the app cache. Your original gallery pictures are never removed.

For an immediate estimate, connect your own OpenRouter API key in the photo's **Food photo AI** settings. The key stays in device-only secure storage, outside the encrypted device sync and the local image reader. Trident checks that your chosen model supports images and private routing. **Analyse with OpenRouter** explicitly sends the selected picture and description to OpenRouter and its provider; it uses your account credits. Backgrounding, locking, Stop or Disconnect cancels pending analysis. Reconnecting never automatically submits a photo.

Meal analysis identifies foods, then chooses from bounded USDA reference candidates. The model does not supply a made-up nutrient table. Photo identity and portions still remain estimates: a picture cannot reveal hidden oil, recipes or exact weight. Review the matched food and correct its edible amount. Pack-label mode transcribes label values for your review. Nothing is logged until **Save food**.

You can also choose **Save for Mac review** without an AI connection or internet. That commits a photo packet to the encrypted vault before acknowledging it. Up to five photos can wait, with at most 5 MB of photo text across the queue. After Phone & Mac sync, review the packet in the Mac Food diary. The queue does not add calories. Retrying an interrupted save reuses the same capture identity; reviewed and discarded packets keep a receipt to avoid reappearing after sync.

## Food sources

Offline references use 7,793 USDA FoodData Central SR Legacy (2018) foods. These are public-domain US government averages, not a match for every brand or recipe. Barcode lookup sends only the printed code to Open Food Facts; check the returned product against your current pack. Food data attribution and barcode reader licences are available from **Food data and photo privacy**.

- [USDA FoodData Central](https://fdc.nal.usda.gov/)
- [Open Food Facts data and licence](https://world.openfoodfacts.org/data)
- [OpenRouter privacy and zero data retention](https://openrouter.ai/docs/guides/features/zdr)

## Current validation boundary

Compilation, the Android-only export, a static credential/queue review, and a hidden synthetic walkthrough cover the implemented flow. The walkthrough checks amount scaling, missing nutrients, optical barcode decoding, and save/reload/retry without touching a user vault. Actual Android camera, SQLCipher reopen, encrypted phone-to-Mac sync and a live phone provider request still need a connected phone. A preview update is separate from installation and production promotion.
