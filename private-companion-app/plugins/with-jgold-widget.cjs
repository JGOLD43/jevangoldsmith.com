const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');
module.exports = function withJgoldWidget(config) {
  config = withAndroidManifest(config, config => {
    const app = config.modResults.manifest.application[0];
    app.receiver = (app.receiver || []).filter(r => r.$['android:name'] !== '.JgoldWidgetProvider');
    app.receiver.push({ $: { 'android:name': '.JgoldWidgetProvider', 'android:exported': 'false', 'android:label': 'JGOLD' },
      'intent-filter': [{ action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }] }],
      'meta-data': [{ $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/jgold_widget_info' } }] });
    return config;
  });
  return withDangerousMod(config, ['android', async config => {
    const root = path.join(config.modRequest.platformProjectRoot, 'app/src/main');
    const files = { 'JgoldWidgetProvider.kt': 'java/com/jevangoldsmith/privatecompanion', 'jgold_widget.xml': 'res/layout', 'jgold_widget_info.xml': 'res/xml', 'jgold_widget_background.xml': 'res/drawable', 'jgold_widget_button.xml': 'res/drawable' };
    for (const [file, folder] of Object.entries(files)) {
      await fs.mkdir(path.join(root, folder), { recursive: true });
      await fs.copyFile(path.join(__dirname, 'jgold-widget', file), path.join(root, folder, file));
    }
    return config;
  }]);
};
