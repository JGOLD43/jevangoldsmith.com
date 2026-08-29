import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('cloud AI service has no vault repository dependency', async () => {
  const ai = await source('src/services/ai.ts');
  assert.doesNotMatch(ai, /storage\/repository|VaultItem|vault_items/);
});

test('publishing service accepts the public manifest contract only', async () => {
  const publishing = await source('src/services/publishing.ts');
  assert.match(publishing, /PublishManifest/);
  assert.doesNotMatch(publishing, /VaultItem|vault_items|attachmentUri/);
});

test('GitHub publisher has no private vault dependency', async () => {
  const github = await source('src/services/github-publishing.ts');
  assert.match(github, /PublishManifest/);
  assert.doesNotMatch(github, /VaultItem|vault_items|attachmentUri|encryptedFileUri|book_annotations|reading_positions|storage\/repository/);
  assert.match(github, /submissions\/\$\{jobId\}\.json/);
  assert.doesNotMatch(github, /data\/essays\.json|data\/books\.json|jevangoldsmith\.com/);
});

test('private book files are encrypted before storage and decrypted only into temporary reader cache', async () => {
  const files = await source('src/storage/book-files.ts');
  assert.match(files, /aesEncryptAsync/);
  assert.match(files, /AESSealedData\.fromCombined/);
  assert.match(files, /aesDecryptAsync/);
  assert.match(files, /Paths\.document, 'private-books'/);
  assert.match(files, /Paths\.cache, 'private-reader'/);
  assert.match(files, /removePreparedBook/);
});

test('book AI access is selection-only and publishing contract excludes local reading state', async () => {
  const reader = await source('src/app/books/[id]/reader.tsx');
  const privacy = await source('src/domain/privacy.ts');
  assert.match(reader, /Send this exact excerpt to AI/);
  assert.match(reader, /Do not assume access to the rest of the book/);
  assert.doesNotMatch(privacy, /encryptedFileUri|fileHash|progress|locator|BookAnnotation/);
});

test('publishing token is stored through SecureStore', async () => {
  const credentials = await source('src/storage/publishing-credentials.ts');
  assert.match(credentials, /SecureStore\.setItemAsync/);
  assert.match(credentials, /jgold-publishing-inbox/);
  assert.match(credentials, /WHEN_UNLOCKED_THIS_DEVICE_ONLY/);
  assert.doesNotMatch(credentials, /EXPO_PUBLIC|AsyncStorage/);
});

test('Android build disables backup and enables SQLCipher', async () => {
  const config = JSON.parse(await source('app.json'));
  assert.equal(config.expo.android.allowBackup, false);
  const sqlite = config.expo.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-sqlite');
  assert.equal(sqlite[1].useSQLCipher, true);
});

test('book import uses Android document picker without broad storage permissions', async () => {
  const config = JSON.parse(await source('app.json'));
  const files = await source('src/storage/book-files.ts');
  assert.match(files, /DocumentPicker\.getDocumentAsync/);
  assert.ok(config.expo.android.blockedPermissions.includes('android.permission.READ_EXTERNAL_STORAGE'));
  assert.ok(config.expo.android.blockedPermissions.includes('android.permission.WRITE_EXTERNAL_STORAGE'));
});

test('screen capture is blocked by default and can only be enabled from the local preference', async () => {
  const context = await source('src/state/app-context.tsx');
  const preference = await source('src/storage/screen-capture-preference.ts');
  const settings = await source('src/app/settings.tsx');

  assert.match(context, /screenshotsAllowed[^\n]*useState\(false\)/);
  assert.match(context, /preventScreenCaptureAsync/);
  assert.match(context, /allowScreenCaptureAsync/);
  assert.match(context, /SCREEN_CAPTURE_PREFERENCE_KEY/);
  assert.match(context, /SCREEN_CAPTURE_LOCK_KEY/);
  assert.match(context, /SCREEN_CAPTURE_BACKGROUND_KEY/);
  assert.match(context, /state !== 'active'[\s\S]*preventScreenCaptureAsync/);
  assert.match(preference, /SecureStore\.getItemAsync/);
  assert.match(preference, /SecureStore\.setItemAsync/);
  assert.match(preference, /WHEN_UNLOCKED_THIS_DEVICE_ONLY/);
  assert.match(settings, /Allow screenshots/);
  assert.match(settings, /Screenshot images can include private vault/);
  assert.match(settings, /App switcher preview[\s\S]*Always protected/);
});

test('developer access is an explicit local toggle that bypasses biometrics only while enabled', async () => {
  const context = await source('src/state/app-context.tsx');
  const preference = await source('src/storage/developer-access-preference.ts');
  const settings = await source('src/app/settings.tsx');

  assert.match(context, /developerAccessEnabled[^\n]*useState\(false\)/);
  assert.match(context, /if \(!developerAccessEnabled && hasHardware && enrolled\)[\s\S]*LocalAuthentication\.authenticateAsync/);
  assert.match(context, /loadDeveloperAccessEnabled\(\)[\s\S]*if \(enabled\)[\s\S]*setLocked\(false\)/);
  assert.match(preference, /SecureStore\.getItemAsync/);
  assert.match(preference, /SecureStore\.setItemAsync/);
  assert.match(preference, /WHEN_UNLOCKED_THIS_DEVICE_ONLY/);
  assert.match(settings, /Developer Access/);
  assert.match(settings, /Skip fingerprint while developing/);
  assert.match(settings, /Anyone holding this unlocked phone/);
});

test('private screens use one persistent routed navigation shell', async () => {
  const tabs = await source('src/components/app-tabs.tsx');
  assert.match(tabs, /Slot[\s\S]*useRouter/);
  assert.match(tabs, /router\.navigate/);
  assert.match(tabs, /Home[\s\S]*People[\s\S]*Library[\s\S]*Studio[\s\S]*Site/);
  assert.doesNotMatch(tabs, /label="Settings"/);
  const home = await source('src/app/index.tsx');
  assert.match(home, /accessibilityLabel="Settings"[\s\S]*router\.push\('\/settings'\)/);
  assert.match(tabs, /label="Studio" icon=\{\{ ios: 'square\.and\.pencil', android: 'edit_note' \}\}/);
  assert.match(tabs, /label="Site" icon=\{\{ ios: 'globe', android: 'language' \}\}/);
  assert.match(tabs, /backgroundColor:\s*colors\.navBackground/);
  assert.match(tabs, /backgroundColor:\s*colors\.backgroundElement/);
  assert.match(tabs, /bottomInset=\{insets\.bottom\}/);
  assert.match(tabs, /height:\s*80 \+ insets\.bottom/);
  assert.match(tabs, /marginTop:\s*8/);
  assert.match(tabs, /marginBottom:\s*Math\.max\(8,\s*bottomInset \+ 6\)/);
  assert.doesNotMatch(tabs, /hiddenTab|TabTrigger/);
  assert.doesNotMatch(tabs, /unstable-native-tabs|NativeTabs/);
});

test('the Vault tab is replaced by the on-device book library', async () => {
  const tabs = await source('src/components/app-tabs.tsx');
  const library = await source('src/app/books/index.tsx');
  const home = await source('src/app/index.tsx');

  assert.match(tabs, /label="Library"/);
  assert.match(tabs, /android:\s*'library_books'/);
  assert.match(tabs, /onPress=\{\(\) => go\('\/books'\)\}/);
  assert.doesNotMatch(tabs, /label="Vault"/);
  assert.match(library, /numColumns=\{3\}/);
  assert.match(library, /coverMosaic/);
  assert.match(library, /`Search \$\{mediaKind\}`/);
  assert.match(library, /readingStats\.highlightCount/);
  assert.match(home, /Continue reading/);
});

test('Library switches between books, website movies, essays and skill trees', async () => {
  const library = await source('src/app/books/index.tsx');
  const movies = await source('src/services/public-movies.ts');
  const tabs = await source('src/components/app-tabs.tsx');

  assert.match(library, /type MediaKind = 'books' \| 'movies' \| 'essays' \| 'skills'/);
  assert.match(library, /accessibilityRole="tablist"/);
  assert.match(library, /kind === 'books' \? 'Books' : kind === 'movies' \? 'Movies' : kind === 'essays' \? 'Essays' : 'Skills'/);
  assert.match(library, /movieStats\.hours/);
  assert.match(library, /CollectionTile group=\{item\} mediaKind=\{mediaKind\}/);
  assert.match(library, /EssayDocumentCard/);
  assert.match(library, /numColumns=\{mediaKind === 'essays' \? 1 : 2\}/);
  assert.match(library, /Edit document/);
  assert.match(library, /Open to edit/);
  assert.match(movies, /https:\/\/jevangoldsmith\.com/);
  assert.match(movies, /\/data\/movies\.json/);
  assert.match(tabs, /pathname\.startsWith\('\/movies'\)/);
  assert.match(tabs, /pathname\.startsWith\('\/essays'\)/);
  assert.match(tabs, /pathname\.startsWith\('\/skills'\)/);
});

test('custom skill trees are encrypted, prerequisite-aware and directly practiceable', async () => {
  const migrations = await source('src/storage/learning-migrations.ts');
  const repository = await source('src/storage/skill-tree-repository.ts');
  const library = await source('src/app/books/index.tsx');
  const editor = await source('src/app/skills/[id].tsx');
  const map = await source('src/components/skill-tree-map.tsx');
  const practice = await source('src/app/skills/[id]/practice.tsx');
  assert.match(migrations, /CREATE TABLE IF NOT EXISTS skill_trees/);
  assert.match(migrations, /CREATE TABLE IF NOT EXISTS skill_tree_nodes/);
  assert.match(migrations, /prerequisites_json/);
  assert.match(repository, /validatePrerequisites/);
  assert.match(repository, /recordSkillTreeAttempt/);
  assert.match(library, /French conversation/);
  assert.match(library, /Create a skill tree/);
  assert.match(editor, /SkillTreeMap/);
  assert.match(map, /FOUNDATIONS/);
  assert.match(map, /BranchConnector/);
  assert.match(editor, /Prerequisites/);
  assert.match(practice, /How did that go/);
});

test('Library refreshes public movies on focus without accepting a stale website cache', async () => {
  const library = await source('src/app/books/index.tsx');
  const movies = await source('src/services/public-movies.ts');
  assert.match(library, /useFocusEffect/);
  assert.match(library, /mediaKind === 'movies'[\s\S]*reloadMovies/);
  assert.match(movies, /movies\.json\?fresh=\$\{Date\.now\(\)\}/);
  assert.match(movies, /Cache-Control': 'no-cache'/);
});

test('Library uses high-density covers and the website rating tiers', async () => {
  const library = await source('src/app/books/index.tsx');
  const books = await source('src/services/public-books.ts');
  const movies = await source('src/services/public-movies.ts');
  const cover = await source('src/components/book-cover.tsx');
  assert.match(books, /raw\.coverImage \|\| raw\.coverImageMedium/);
  assert.match(books, /Cache-Control': 'no-cache'/);
  assert.match(movies, /-0-1000-0-1500-crop/);
  assert.match(cover, /cachePolicy="memory-disk"/);
  assert.match(cover, /recyclingKey=\{uri\}/);
  assert.match(library, /RATING_TIERS/);
  assert.match(library, /Collections/);
  assert.match(library, /Tiers/);
  assert.match(library, /tierBadge/);
});

test('essays have private-public separation and append-only encrypted writing history', async () => {
  const library = await source('src/app/books/index.tsx');
  const editor = await source('src/app/essays/[id].tsx');
  const database = await source('src/storage/database.ts');
  const repository = await source('src/storage/repository.ts');
  const context = await source('src/state/app-context.tsx');
  const publishing = await source('src/services/publishing.ts');

  assert.match(library, /loadSiteCollection\('essay'\)/);
  assert.match(library, /public:\$\{essay\.id\}/);
  assert.match(library, /local:\$\{essay\.id\}/);
  assert.match(library, /Create an essay/);
  assert.match(editor, /Private/);
  assert.match(editor, /PUBLIC ESSAY/);
  assert.match(editor, /Writing timeline/);
  assert.match(editor, /setTimeout\(\(\) => \{ void persist\('autosave'\); \}, 1400\)/);
  assert.match(editor, /Publish to website/);
  assert.match(editor, /Edit this essay/);
  assert.match(editor, /Every change will autosave/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS essay_documents/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS essay_revisions/);
  assert.match(database, /UNIQUE\(essay_id, sequence\)/);
  assert.match(repository, /INSERT INTO essay_revisions/);
  assert.match(repository, /character_count/);
  assert.match(repository, /change_size/);
  assert.match(context, /listEssayDocuments/);
  assert.doesNotMatch(publishing, /essay_documents|essay_revisions|EssayRevision/);
});

test('approved public copies use an encrypted retryable outbox without private fields', async () => {
  const database = await source('src/storage/database.ts');
  const outbox = await source('src/services/publication-outbox.ts');
  const repository = await source('src/storage/publication-repository.ts');
  const book = await source('src/app/books/[id].tsx');
  const essay = await source('src/app/essays/[id].tsx');
  const settings = await source('src/app/settings.tsx');

  assert.match(database, /CREATE TABLE IF NOT EXISTS publication_jobs/);
  assert.match(database, /status IN \('queued', 'submitted', 'failed'\)/);
  assert.match(repository, /JSON\.stringify\(manifest\)/);
  assert.doesNotMatch(repository, /vault_items|book_annotations|reading_sessions|encrypted_file_uri/);
  assert.match(outbox, /retryPendingPublications/);
  assert.match(outbox, /hasPublishingConnection/);
  assert.doesNotMatch(outbox, /VaultItem|vault_items|BookAnnotation|reading_sessions/);
  assert.match(book, /queueAndAttemptPublication/);
  assert.match(book, /toPublicBookFields\(book\)/);
  assert.match(essay, /Only the title, summary and essay text will be submitted/);
  assert.match(settings, /retryPendingPublications/);
});

test('approved publications retry automatically while the unlocked app is active', async () => {
  const layout = await source('src/app/_layout.tsx');
  assert.match(layout, /AutomaticPublicSync/);
  assert.match(layout, /retryPendingPublications/);
  assert.match(layout, /setInterval\(sync, 60_000\)/);
  assert.match(layout, /state === 'active'/);
});

test('Library opens detailed local reading and website watching insights', async () => {
  const library = await source('src/app/books/index.tsx');
  const insights = await source('src/app/insights.tsx');
  const heatmap = await source('src/components/activity-heatmap.tsx');
  const analytics = await source('src/storage/reading-analytics.ts');
  const tabs = await source('src/components/app-tabs.tsx');

  assert.match(library, /pathname:\s*'\/insights'/);
  assert.match(library, /Reading insights/);
  assert.match(library, /Watching insights/);
  assert.match(insights, /Watching Insights/);
  assert.match(insights, /Reading Insights/);
  assert.match(insights, /Weeks in a row/);
  assert.match(insights, /Days in a row/);
  assert.match(insights, /ActivityHeatmap/);
  assert.match(heatmap, /Last 52 weeks|weekCount = 52/);
  assert.match(heatmap, /style=\{styles\.monthSlot\}/);
  assert.match(heatmap, /numberOfLines=\{1\}/);
  assert.match(heatmap, /const WEEKDAY_LABELS = \['', 'Mon', '', 'Wed', '', 'Fri', ''\]/);
  assert.match(heatmap, /style=\{styles\.chart\}[\s\S]*style=\{styles\.dayLabels\}[\s\S]*<ScrollView/);
  assert.match(heatmap, /dayLabelSlot:\s*\{\s*height:\s*12,[\s\S]*paddingRight:\s*6/);
  assert.doesNotMatch(heatmap, /dayLabels:\s*\{[^}]*position:\s*'absolute'/);
  assert.match(heatmap, /Less/);
  assert.match(heatmap, /More/);
  assert.match(analytics, /dailyActivity/);
  assert.doesNotMatch(analytics, /fetch\(|publishManifest|askFrontierModel/);
  assert.match(tabs, /pathname === '\/insights'/);
});

test('the visible app identity is JGOLD while the existing Android package is preserved', async () => {
  const config = JSON.parse(await source('app.json'));
  const strings = await source('android/app/src/main/res/values/strings.xml');
  const lockGate = await source('src/components/lock-gate.tsx');
  const settings = await source('src/app/settings.tsx');

  assert.equal(config.expo.name, 'JGOLD');
  assert.equal(config.expo.android.package, 'com.jevangoldsmith.privatecompanion');
  assert.match(config.expo.icon, /jgold-icon\.png$/);
  assert.match(config.expo.android.adaptiveIcon.foregroundImage, /jgold-icon-foreground\.png$/);
  assert.match(strings, />JGOLD</);
  assert.match(lockGate, /JGOLD sailing ship/);
  assert.match(lockGate, />JGOLD</);
  assert.doesNotMatch(`${lockGate}\n${settings}`, /private companion|companion app/i);
});

test('the website theme is the persisted theme source for every native screen', async () => {
  const site = await source('src/components/site-screen.tsx');
  const context = await source('src/state/theme-context.tsx');
  const preference = await source('src/storage/theme-preference.ts');
  const layout = await source('src/app/_layout.tsx');

  assert.match(site, /MutationObserver\(reportTheme\)/);
  assert.match(site, /attributeFilter:\s*\['data-theme'\]/);
  assert.match(site, /type:\s*'private-companion-theme'/);
  assert.match(site, /onMessage=\{handleMessage\}/);
  assert.match(site, /setThemeMode\(message\.theme\)/);
  assert.match(context, /Colors\[mode\]/);
  assert.match(context, /saveThemePreference\(nextMode\)/);
  assert.match(preference, /SecureStore\.getItemAsync/);
  assert.match(preference, /SecureStore\.setItemAsync/);
  assert.match(preference, /WHEN_UNLOCKED_THIS_DEVICE_ONLY/);
  assert.match(layout, /mode === 'dark' \? 'light' : 'dark'/);
});

test('native UI uses shared website-aligned colors instead of a fixed light palette', async () => {
  const paths = [
    'src/app/index.tsx',
    'src/app/website.tsx',
    'src/app/vault.tsx',
    'src/app/ai.tsx',
    'src/app/settings.tsx',
    'src/components/site-screen.tsx',
    'src/components/ui.tsx',
    'src/components/composers.tsx',
    'src/components/lock-gate.tsx',
    'src/components/app-tabs.tsx',
  ];
  const files = await Promise.all(paths.map(source));

  for (const file of files) assert.doesNotMatch(file, /Colors\.light/);
  const theme = await source('src/constants/theme.ts');
  assert.match(theme, /background:\s*'#F5F3ED'/);
  assert.match(theme, /background:\s*'#121212'/);
  assert.match(theme, /accent:\s*'#C9A86C'/);
  assert.match(theme, /accent:\s*'#D4B87A'/);
  assert.match(theme, /Chivo_700Bold/);
});

test('the complete public website is the Site tab without an injected app homepage', async () => {
  const site = await source('src/components/site-screen.tsx');
  const siteRoute = await source('src/app/ai.tsx');
  const home = await source('src/app/index.tsx');
  const studio = await source('src/app/website.tsx');
  assert.match(site, /react-native-webview/);
  assert.match(site, /<WebView/);
  assert.match(site, /https:\/\/jevangoldsmith\.com/);
  assert.doesNotMatch(site, /privatecompanionsite:\/\/open|Linking\.openURL\(SITE_ACTIVITY_URL\)/);
  assert.doesNotMatch(site, /private-companion=1/);
  assert.doesNotMatch(site, /private-companion-owner-strip/);
  assert.doesNotMatch(site, /Your live website/);
  assert.doesNotMatch(site, /Your dashboard/);
  assert.match(siteRoute, /SiteScreen/);
  assert.match(home, /What matters today/);
  assert.match(home, /focused feed/);
  assert.match(home, /YOUR PUBLIC SITE/);
  assert.match(studio, /router\.push\('\/ai'\)/);
});

test('Studio is a focused publishing queue without duplicate Library content', async () => {
  const studio = await source('src/app/website.tsx');
  const home = await source('src/app/index.tsx');
  const composer = await source('src/components/composers.tsx');

  assert.match(studio, /Publishing queue/);
  assert.match(studio, /Edit existing/);
  assert.match(studio, /activeDrafts/);
  assert.match(studio, /<FlatList/);
  assert.match(studio, /router\.push\('\/essays\/new'\)/);
  assert.match(studio, /lockedType/);
  assert.doesNotMatch(studio, /Website Books|What is live|Edit public copy/);
  assert.match(studio, /Add website change/);
  assert.match(studio, /createMenuOpen/);
  assert.doesNotMatch(home, /Website draft[\s\S]*Open Studio/);
  assert.doesNotMatch(home, /draftComposerOpen/);
  assert.match(composer, /lockedType\?: boolean/);
  assert.match(composer, /Selected in Studio/);
});

test('Home is a functional encrypted life dashboard rather than placeholder UI', async () => {
  const home = await source('src/app/index.tsx');
  const composer = await source('src/components/life-item-composer.tsx');
  const areas = await source('src/constants/life-areas.ts');
  const database = await source('src/storage/database.ts');
  const repository = await source('src/storage/repository.ts');
  const context = await source('src/state/app-context.tsx');
  const publishing = await source('src/services/publishing.ts');

  assert.match(areas, /Goals/);
  assert.match(areas, /Fucket List/);
  assert.match(areas, /Learning/);
  assert.match(areas, /Interests/);
  assert.match(areas, /Trips/);
  assert.match(home, /LifeItemComposer/);
  assert.match(home, /editLifeItem/);
  assert.match(home, /deleteLifeItem/);
  assert.match(composer, /Target date/);
  assert.match(composer, /Progress/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS life_items/);
  assert.match(repository, /addLifeItem/);
  assert.match(repository, /updateLifeItem/);
  assert.match(repository, /removeLifeItem/);
  assert.match(context, /listLifeItems/);
  assert.doesNotMatch(publishing, /life_items|LifeItem|lifeItems/);
});

test('Android keeps the public site in the guarded in-app WebView', async () => {
  const site = await source('src/components/site-screen.tsx');
  assert.match(site, /<WebView/);
  assert.match(site, /onShouldStartLoadWithRequest/);
  assert.match(site, /mixedContentMode="never"/);
  assert.match(site, /isInternalSiteUrl/);
  assert.match(site, /isSafeExternalUrl/);
});

test('trusted website handoff does not immediately relock private screens', async () => {
  const context = await source('src/state/app-context.tsx');
  assert.match(context, /beginTrustedSiteSession/);
  assert.match(context, /TRUSTED_SITE_HANDOFF_MS/);
});

test('the inline website has loading, failure, process recovery, and Android back handling', async () => {
  const site = await source('src/components/site-screen.tsx');

  assert.match(site, /onLoadProgress/);
  assert.match(site, /onError/);
  assert.match(site, /onRenderProcessGone/);
  assert.match(site, /BackHandler/);
  assert.match(site, /canGoBack/);
});

test('the inline website respects Android chrome and avoids stale public-site caches', async () => {
  const site = await source('src/components/site-screen.tsx');

  assert.match(site, /useSafeAreaInsets/);
  assert.match(site, /paddingTop:\s*insets\.top/);
  assert.match(site, /\.collection-mobile-toggle,\.adventures-mobile-toggle\{padding-bottom:0!important\}/);
  assert.match(site, /@media\(max-width:968px\)\{\.adventures-page-split\{height:calc\(100dvh - 58px - 54px\)!important\}\}/);
  assert.match(site, /serviceWorker\.getRegistrations/);
  assert.match(site, /registration\.unregister/);
  assert.match(site, /caches\.keys/);
  assert.match(site, /location\.reload/);
  assert.match(site, /policyVersion = '2'/);
  assert.match(site, /Object\.defineProperty\(serviceWorker,\s*'register'/);
  assert.match(site, /serviceWorker\.register = disabledRegistration/);
  assert.match(site, /@view-transition\s*\{\s*navigation:\s*none/);
  assert.match(site, /view-transition-name:\s*none!important/);
  assert.doesNotMatch(site, /androidLayerType="hardware"/);
});

test('remote updates are enabled on a version-scoped production channel', async () => {
  const config = JSON.parse(await source('app.json'));
  const eas = JSON.parse(await source('eas.json'));
  const manifest = await source('android/app/src/main/AndroidManifest.xml');
  const dependencies = JSON.parse(await source('package.json'));

  assert.equal(dependencies.dependencies['expo-updates'], '~57.0.16');
  assert.equal(config.expo.runtimeVersion.policy, 'appVersion');
  assert.equal(config.expo.updates.checkAutomatically, 'ON_LOAD');
  assert.equal(config.expo.updates.requestHeaders['expo-channel-name'], 'production');
  assert.equal(eas.build.preview.channel, 'preview');
  assert.equal(eas.build.production.channel, 'production');
  assert.match(manifest, /expo\.modules\.updates\.ENABLED" android:value="true"/);
  assert.match(manifest, /EXPO_UPDATE_URL[^\n]*https:\/\/u\.expo\.dev\/eea043e0-b61b-4cf7-8134-5f82ab54a35a/);
  assert.match(manifest, /EXPO_RUNTIME_VERSION/);
  assert.match(manifest, /expo-channel-name[^\n]*production/);
});

test('downloaded remote updates apply automatically without a connected laptop', async () => {
  const layout = await source('src/app/_layout.tsx');
  const settings = await source('src/app/settings.tsx');
  assert.match(layout, /AutomaticRemoteUpdates/);
  assert.match(layout, /Updates\.useUpdates\(\)/);
  assert.match(layout, /isUpdatePending/);
  assert.match(layout, /Updates\.reloadAsync\(\)/);
  assert.match(layout, /becameActive/);
  assert.match(layout, /checkForRemoteUpdate/);
  assert.match(settings, /without a cable/);
});

test('remote updater configuration has no private vault dependency or endpoint', async () => {
  const config = JSON.parse(await source('app.json'));
  const manifest = await source('android/app/src/main/AndroidManifest.xml');
  const updater = await source('src/services/remote-updates.ts');

  assert.deepEqual(Object.keys(config.expo.updates.requestHeaders), ['expo-channel-name']);
  assert.doesNotMatch(manifest, /vault|sqlite|attachment|finance/i);
  assert.doesNotMatch(updater, /storage\/repository|storage\/database|storage\/attachments|VaultItem|finance/i);
});
