# JGOLD mobile security review

## Executive summary

The app has a strong on-device privacy baseline: SQLCipher storage, a Keystore-held key, encrypted attachments, biometric unlock, disabled Android backup, protected app-switcher previews, narrow publishing contracts, and no advertising or analytics SDK. This pass closed the two material application-level gaps found in review: a development authentication bypass could remain enabled in a production update, and transitive native packages could retain unnecessary Android permissions.

No known high- or critical-severity production dependency advisory was reported by `npm audit --omit=dev --audit-level=high` on 29 August 2026. The audit reports a moderate `uuid` advisory in Expo's Apple build/configuration tooling. Its offered automatic remediation would force an incompatible Expo downgrade, so it is documented rather than applied to the Android runtime.

## Resolved findings

### High — development authentication bypass available in production

The hardened production-only block was implemented, then intentionally reverted at the phone owner's explicit request. The app exposes a clearly labelled local “Skip fingerprint while developing” switch with a warning that anyone holding the unlocked phone can open JGOLD. This is an accepted residual risk, not an unnoticed gap.

### Medium — unnecessary Android permissions inherited from native packages

Resolved in `app.json` around lines 56–68. Microphone, system-overlay, and legacy broad-storage permissions are explicitly blocked. Android prebuild confirms `tools:node="remove"` for each. Contacts read/write access remains because it is required for the user-approved sync feature.

### Medium — contact sync could accidentally broaden the privacy boundary

Resolved by a dedicated boundary in `src/services/phone-contact-sync.ts`. Only name, company, role, favorite status, primary email, phone, and website move to the Android address book. Private notes, tags, reminder cadence, first-meeting context, and conversation history remain local and encrypted. Sync mode is stored with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`.

### Low — contact locations could leak through third-party geocoding

Resolved in `src/services/contact-locations.ts`. The contact atlas uses offline coarse city coordinates and sends no address to a map or geocoding service.

### Low — unsafe contact URLs could invoke arbitrary schemes

Resolved in `src/app/contacts/[id].tsx`. Contact links now pass the same allowlist used by the guarded Site WebView; phone numbers are reduced to dial-safe characters and email values are encoded.

## Residual risks

- A rooted or compromised Android operating system is outside the protection model.
- A person holding an already-unlocked phone can see data until the app backgrounds long enough to relock.
- Contact sync necessarily copies ordinary address-book fields into Android's contacts provider, which may itself sync through the phone owner's configured Google or Samsung account. JGOLD shows this as an explicit opt-in action.
- The moderate Expo tooling advisory should be rechecked when Expo publishes a compatible dependency update; forcing the suggested downgrade would create greater compatibility risk.
- An independent penetration test and physical-device backup/transfer test are still recommended before treating the app as a sole store for irreplaceable information.
