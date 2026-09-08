# JGOLD Android widget

A resizable 4 × 2 home screen widget with an app-opening header and Home, Library, Studio and Site shortcuts. It displays static labels only; each shortcut opens the normal app route through the existing lock gate.

`../with-jgold-widget.cjs` installs the Kotlin provider, Android resources and manifest registration during `expo prebuild --platform android`. Keep these sources here because the Android directory is generated.

This feature requires native app version 1.5.5 (Android version code 18) or later. An OTA update cannot register an Android widget provider.

After installing the new APK without uninstalling the existing app, long-press the home screen, choose Widgets, find JGOLD, and drag the panel into place. Test every shortcut with the app both running and closed, and verify the normal unlock screen still protects private content.
