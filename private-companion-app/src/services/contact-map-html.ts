export type AtlasPoint = { id: string; name: string; location: string; latitude: number; longitude: number };

// Contact text is data, never executable markup inside the embedded map.
export function atlasJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export function contactMapHtml(vendor: { css: string; js: string }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https://server.arcgisonline.com https://*.basemaps.cartocdn.com data:; connect-src 'none';"><style>${vendor.css}
html,body,#map{height:100%;width:100%;margin:0;background:#17202a;font-family:Arial,sans-serif}
.atlas-pin{border:2px solid #f7e9b7;border-radius:50%;background:#b89858;color:#111b20;display:flex;align-items:center;justify-content:center;font-weight:700;box-shadow:0 3px 12px #0008}
.leaflet-bar a,.leaflet-bar a:hover,.leaflet-control-layers{background:#17202a;color:#f5f1e7;border-color:#43504b}.leaflet-control-attribution{font-size:9px}.leaflet-control-layers-toggle{background-image:none!important;display:flex;align-items:center;justify-content:center}.leaflet-control-layers-toggle:after{content:"◈";font-size:26px}
#fit{position:absolute;top:12px;left:56px;z-index:1000;background:#17202a;color:#f5f1e7;border:1px solid #647065;border-radius:8px;padding:12px;font-weight:bold}
#status{position:absolute;bottom:26px;left:12px;right:12px;z-index:1000;background:#17202ae8;color:#eee;padding:10px;border-radius:8px;font-size:12px;pointer-events:none}
</style></head><body><div id="map" aria-label="People by saved city"></div><button id="fit">All people</button><div id="status" hidden></div><script>${vendor.js}</script><script>
const map=L.map('map',{zoomControl:true,minZoom:0,maxZoom:12,worldCopyJump:true}).setView([15,30],2);
const satellite=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',maxZoom:12}).addTo(map);
const dark=L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',{attribution:'&copy; OpenStreetMap contributors &copy; CARTO',subdomains:'abcd',maxZoom:12});
L.control.layers({'Satellite':satellite,'Dark':dark},null,{collapsed:true}).addTo(map);
const pins=L.layerGroup().addTo(map);let points=[],first=true;
function send(value){window.ReactNativeWebView?.postMessage(JSON.stringify(value));}
function status(text){const el=document.getElementById('status');el.textContent=text;el.hidden=!text;}
[satellite,dark].forEach(layer=>{layer.on('tileerror',()=>status('Map imagery unavailable. Check your connection; saved people are still available below.'));layer.on('tileload',()=>status(''));});
function fit(){if(points.length)map.fitBounds(points.map(p=>[p.latitude,p.longitude]),{padding:[48,48],maxZoom:6});else map.setView([15,30],2);}
window.setAtlasPoints=function(next){points=next;pins.clearLayers();const groups=new Map();points.forEach(p=>{const key=p.latitude.toFixed(2)+','+p.longitude.toFixed(2);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);});groups.forEach(group=>{const p=group[0];const label=group.length>1?String(group.length):p.name.split(/\\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase()||'?';const el=document.createElement('span');el.textContent=label;const marker=L.marker([p.latitude,p.longitude],{icon:L.divIcon({className:'atlas-pin',html:el,iconSize:[38,38],iconAnchor:[19,19]}),title:group.map(p=>p.name).join(', ')+' — '+p.location}).addTo(pins);marker.on('click',()=>send({type:'select',ids:group.map(p=>p.id)}));});if(first&&points.length){fit();first=false;}};
document.getElementById('fit').onclick=fit;send({type:'ready'});
</script></body></html>`;
}
