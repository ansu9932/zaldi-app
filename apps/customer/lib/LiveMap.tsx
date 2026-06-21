import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { radius } from './brand';

interface Pt { lat: number; lng: number }

/**
 * Real map (OpenStreetMap via Leaflet) rendered in a WebView so it works in Expo Go.
 * Shows the shop, the customer's home, and the live rider marker.
 */
export function LiveMap({ shop, home, rider, height = 280 }: { shop: Pt; home: Pt; rider?: Pt | null; height?: number }) {
  const ref = useRef<WebView>(null);
  const riderInit = rider ? `[${rider.lat}, ${rider.lng}]` : `[${shop.lat}, ${shop.lng}]`;

  const html = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0;background:#EAF2EC}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl:false, attributionControl:false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(map);
  function ic(e){ return L.divIcon({ html:'<div style="font-size:26px;line-height:1">'+e+'</div>', className:'', iconSize:[30,30], iconAnchor:[15,15] }); }
  var shop=[${shop.lat},${shop.lng}], home=[${home.lat},${home.lng}];
  L.marker(shop,{icon:ic('🏪')}).addTo(map);
  L.marker(home,{icon:ic('🏠')}).addTo(map);
  L.polyline([shop,home],{color:'#00D16B',weight:3,dashArray:'6'}).addTo(map);
  var rider=L.marker(${riderInit},{icon:ic('🛵')}).addTo(map);
  try { map.fitBounds([shop,home],{padding:[45,45]}); } catch(e){ map.setView(home,14); }
  function updateRider(lat,lng){ rider.setLatLng([lat,lng]); }
</script></body></html>`;

  useEffect(() => {
    if (rider && ref.current) {
      ref.current.injectJavaScript(`updateRider(${rider.lat}, ${rider.lng}); true;`);
    }
  }, [rider?.lat, rider?.lng]);

  return (
    <View style={{ height, borderRadius: radius.xl, overflow: 'hidden' }}>
      <WebView ref={ref} source={{ html }} javaScriptEnabled domStorageEnabled scrollEnabled={false} />
    </View>
  );
}
