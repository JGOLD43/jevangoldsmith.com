// Initializes the Leaflet world map on /adventures.html. Reads the marker
// payload from <script type="application/json" id="adventures-map-data">.
(function initWorldMap() {
  var el = document.getElementById('world-map');
  if (!el || !window.L) return;
  var dataEl = document.getElementById('adventures-map-data');
  var markers = [];
  try { markers = dataEl ? JSON.parse(dataEl.textContent || '[]') : []; } catch (_) { markers = []; }
  var L = window.L;
  var map = L.map(el, {
    center: [20, 0],
    zoom: 2,
    worldCopyJump: true,
    scrollWheelZoom: true
  });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);
  for (var i = 0; i < markers.length; i++) {
    var m = markers[i];
    var marker = L.marker([m.lat, m.lng]).addTo(map);
    marker.bindPopup(
      '<strong>' + m.title + '</strong><br>' + m.location +
      '<br><a href="' + m.href + '">View adventure &rarr;</a>'
    );
  }
  if (markers.length > 0) {
    var bounds = L.latLngBounds(markers.map(function (m) { return [m.lat, m.lng]; }));
    map.fitBounds(bounds.pad(0.3));
  }
})();
