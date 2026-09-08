import { useEffect, useMemo, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import { atlasJson, contactMapHtml, type AtlasPoint } from '@/services/contact-map-html';
import vendor from '@/vendor/atlas-leaflet.json';

export function ContactAtlasMap({ points, onSelect }: { points: AtlasPoint[]; onSelect: (ids: string[]) => void }) {
  const web = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const source = useMemo(() => ({ html: contactMapHtml(vendor) }), []);
  useEffect(() => {
    if (ready) web.current?.injectJavaScript(`window.setAtlasPoints(${atlasJson(points)});true;`);
  }, [points, ready]);
  return <WebView ref={web} source={source} originWhitelist={['*']} javaScriptEnabled scrollEnabled={false}
    style={{ flex: 1, backgroundColor: '#17202a' }} geolocationEnabled={false} allowFileAccess={false}
    onShouldStartLoadWithRequest={request => request.url === 'about:blank'}
    onLoadStart={() => setReady(false)}
    onMessage={event => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'ready') setReady(true);
        if (data.type === 'select' && Array.isArray(data.ids)) {
          onSelect(data.ids.filter((id: unknown): id is string => typeof id === 'string' && points.some(point => point.id === id)));
        }
      } catch { /* Ignore malformed bridge messages. */ }
    }} />;
}
