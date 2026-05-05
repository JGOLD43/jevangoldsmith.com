// @ts-nocheck — Phase 3.1 split: leaflet + cluster vendor injection. The
// scripts come from /vendor/, not npm — load via injected <script> tags so
// they don't bloat the initial bundle. Both promises are cached on
// state.{leafletPromise,markerClusterPromise} so concurrent callers share
// one fetch.
import { state } from './adventures-state';

export function injectVendorBundle({ cssHrefs = [], scriptSrc, marker }: {
  cssHrefs?: string[];
  scriptSrc: string;
  marker?: string;
}) {
  return new Promise<void>((resolve, reject) => {
    if (marker && !document.querySelector(`link[${marker}]`)) {
      cssHrefs.forEach((href, index) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        if (index === 0) link.setAttribute(marker, 'true');
        document.head.appendChild(link);
      });
    } else if (!marker) {
      cssHrefs.forEach((href) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      });
    }
    const script = document.createElement('script');
    script.src = scriptSrc;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (state.leafletPromise) return state.leafletPromise;
  state.leafletPromise = injectVendorBundle({
    cssHrefs: ['vendor/leaflet/leaflet.css'],
    scriptSrc: 'vendor/leaflet/leaflet.js',
    marker: 'data-leaflet-css'
  }).then(() => window.L);
  return state.leafletPromise;
}

export function loadMarkerCluster() {
  if (window.L && window.L.markerClusterGroup) return Promise.resolve();
  if (state.markerClusterPromise) return state.markerClusterPromise;
  state.markerClusterPromise = injectVendorBundle({
    cssHrefs: [
      'vendor/leaflet.markercluster/MarkerCluster.css',
      'vendor/leaflet.markercluster/MarkerCluster.Default.css'
    ],
    scriptSrc: 'vendor/leaflet.markercluster/leaflet.markercluster.js'
  });
  return state.markerClusterPromise;
}
