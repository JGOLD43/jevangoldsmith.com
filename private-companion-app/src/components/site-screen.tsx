import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useCallback, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import type { ShouldStartLoadRequest, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';

import { Button } from '@/components/ui';
import { Fonts, type AppColors, type ThemeMode } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { freshSiteUrl, isInternalSiteUrl, isSafeExternalUrl } from '@/services/site-navigation';
import { useAppTheme } from '@/state/theme-context';

const SITE_URL = 'https://jevangoldsmith.com/';

// The public site still contains a hidden navigation fallback for older app
// builds. The native shell owns navigation now, so keep that fallback hidden
// even if stale WebView session storage survives an Android process restore.
const NATIVE_SHELL_SCRIPT = `
  (() => {
    try { sessionStorage.removeItem('jg-private-companion'); } catch (_) {}
    document.documentElement.removeAttribute('data-private-companion');
    let style = document.getElementById('private-companion-native-shell');
    if (!style) {
      style = document.createElement('style');
      style.id = 'private-companion-native-shell';
    }
    style.textContent =
      '.private-companion-nav{display:none!important}' +
      '.collection-mobile-toggle,.adventures-mobile-toggle{padding-bottom:0!important}' +
      '@media(max-width:968px){.adventures-page-split{height:calc(100dvh - 58px - 54px)!important}}' +
      '@view-transition{navigation:none}' +
      '*{view-transition-name:none!important}';
    const styleParent = document.head || document.documentElement;
    if (style.parentNode !== styleParent) styleParent.appendChild(style);

    const reportTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      if (theme !== 'light' && theme !== 'dark') return;
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'private-companion-theme',
          theme,
        }));
      } catch (_) {}
    };
    if (!window.__privateCompanionThemeObserver) {
      window.__privateCompanionThemeObserver = new MutationObserver(reportTheme);
      window.__privateCompanionThemeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
    }
    reportTheme();

    // The public site uses a service worker to make normal browser visits
    // faster. An installed app has a longer-lived WebView profile, where that
    // worker can keep an old HTML/script set after a deployment. Disable it in
    // this first-party shell and perform one versioned cleanup so navigation
    // always uses the live site's matching files.
    try {
      const policyKey = 'private-companion-web-cache-policy';
      const policyVersion = '2';
      const serviceWorker = navigator.serviceWorker;

      if (serviceWorker) {
        const disabledRegistration = () => Promise.resolve(null);
        try {
          Object.defineProperty(serviceWorker, 'register', {
            configurable: true,
            value: disabledRegistration,
          });
        } catch (_) {
          try { serviceWorker.register = disabledRegistration; } catch (_) {}
        }
      }

      if (localStorage.getItem(policyKey) !== policyVersion && !window.__privateCompanionCacheReset) {
        window.__privateCompanionCacheReset = true;
        const unregisterWorkers = serviceWorker
          ? serviceWorker.getRegistrations().then((registrations) =>
              Promise.all(registrations.map((registration) => registration.unregister())))
          : Promise.resolve();
        const clearSiteCaches = typeof caches !== 'undefined'
          ? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          : Promise.resolve();

        Promise.allSettled([unregisterWorkers, clearSiteCaches]).then(() => {
          localStorage.setItem(policyKey, policyVersion);
          location.reload();
        });
      }
    } catch (_) {}
  })();
  true;
`;

export function SiteScreen() {
  const params = useLocalSearchParams<{ url?: string; refresh?: string }>();
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const { setThemeMode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const webViewRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);
  const currentUrlRef = useRef(SITE_URL);
  const navigationRevision = useRef(String(Date.now()));
  const consumedRequest = useRef('');
  const [sourceUrl, setSourceUrl] = useState(() => freshSiteUrl(SITE_URL, navigationRevision.current));
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [webViewKey, setWebViewKey] = useState(0);

  const reload = useCallback(() => {
    setError(null);
    setLoading(true);
    setProgress(0);
    navigationRevision.current = String(Date.now());
    setSourceUrl(freshSiteUrl(currentUrlRef.current, navigationRevision.current));
  }, []);

  const recoverRenderer = useCallback(() => {
    canGoBackRef.current = false;
    setError(null);
    setLoading(true);
    setProgress(0);
    setWebViewKey((current) => current + 1);
  }, []);

  const handleNavigationRequest = useCallback((request: ShouldStartLoadRequest) => {
    if (isInternalSiteUrl(request.url)) {
      if (request.url !== 'about:blank' && request.isTopFrame !== false && !new URL(request.url).searchParams.has('jg_refresh')) {
        // A page can change its route without changing WebView's source prop.
        // Always give a new link its own revision so returning to Now still
        // navigates after the map's in-page transition. Keep history URLs intact.
        navigationRevision.current = String(Math.max(Date.now(), Number(navigationRevision.current) + 1));
        setSourceUrl(freshSiteUrl(request.url, navigationRevision.current));
        return false;
      }
      return true;
    }

    if (isSafeExternalUrl(request.url)) {
      void Linking.openURL(request.url).catch(() => {
        setError('That external link could not be opened.');
      });
    }
    return false;
  }, []);

  const handleNavigationState = useCallback((navigation: WebViewNavigation) => {
    canGoBackRef.current = navigation.canGoBack;
    if (navigation.url !== 'about:blank' && isInternalSiteUrl(navigation.url)) currentUrlRef.current = navigation.url;
  }, []);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string; theme?: ThemeMode };
      if (message.type === 'private-companion-theme' && (message.theme === 'light' || message.theme === 'dark')) {
        setThemeMode(message.theme);
      }
    } catch {
      // Ignore unrelated or malformed messages from public-site scripts.
    }
  }, [setThemeMode]);

  useFocusEffect(
    useCallback(() => {
      const requestKey = `${params.url || ''}:${params.refresh || ''}`;
      if (params.url && requestKey !== consumedRequest.current && params.url !== 'about:blank' && isInternalSiteUrl(params.url)) {
        currentUrlRef.current = params.url;
        consumedRequest.current = requestKey;
      }
      navigationRevision.current = String(Date.now());
      setSourceUrl(freshSiteUrl(currentUrlRef.current, navigationRevision.current));
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!canGoBackRef.current) return false;
        webViewRef.current?.goBack();
        return true;
      });
      return () => subscription.remove();
    }, [params.url, params.refresh]),
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.siteFrame, { paddingTop: insets.top }]}>
        <View style={styles.browserFrame}>
          <WebView
            key={webViewKey}
            ref={webViewRef}
            style={styles.webView}
            source={{ uri: sourceUrl, headers: { 'Cache-Control': 'no-cache' } }}
            originWhitelist={['*']}
            onShouldStartLoadWithRequest={handleNavigationRequest}
            onNavigationStateChange={handleNavigationState}
            onMessage={handleMessage}
            onLoadStart={() => {
              setError(null);
              setLoading(true);
              setProgress(0);
            }}
            onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
            onLoadEnd={() => {
              setLoading(false);
              setProgress(1);
            }}
            onError={({ nativeEvent }) => {
              setLoading(false);
              setError(nativeEvent.description || 'The website could not be loaded.');
            }}
            onRenderProcessGone={recoverRenderer}
            onContentProcessDidTerminate={recoverRenderer}
            injectedJavaScriptBeforeContentLoaded={NATIVE_SHELL_SCRIPT}
            injectedJavaScript={NATIVE_SHELL_SCRIPT}
            javaScriptEnabled
            domStorageEnabled
            cacheEnabled
            cacheMode="LOAD_DEFAULT"
            pullToRefreshEnabled
            setSupportMultipleWindows={false}
            mixedContentMode="never"
            thirdPartyCookiesEnabled={false}
            sharedCookiesEnabled={false}
            allowFileAccess={false}
            allowFileAccessFromFileURLs={false}
            allowUniversalAccessFromFileURLs={false}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            allowsBackForwardNavigationGestures
            applicationNameForUserAgent="JGOLD/1.5.3"
            overScrollMode="content"
            webviewDebuggingEnabled={__DEV__}
          />

          {loading && progress < 1 ? (
            <View pointerEvents="none" style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${Math.max(8, progress * 100)}%` }]} />
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorOverlay}>
              <View style={styles.errorCard}>
                <Text style={styles.errorKicker}>WEBSITE UNAVAILABLE</Text>
                <Text style={styles.errorTitle}>The live site did not load.</Text>
                <Text style={styles.errorBody}>{error}</Text>
                <Button label="Try again" onPress={reload} />
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  siteFrame: {
    flex: 1,
  },
  browserFrame: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.line,
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.accent,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: colors.background,
  },
  errorCard: {
    width: '100%',
    maxWidth: 420,
    gap: 14,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.backgroundElement,
  },
  errorKicker: {
    color: colors.accent,
    fontFamily: Fonts.extraBold,
    fontSize: 12,
    letterSpacing: 1.3,
  },
  errorTitle: {
    color: colors.text,
    fontFamily: Fonts.bold,
    fontSize: 28,
  },
  errorBody: {
    color: colors.textSecondary,
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 22,
  },
});
}
