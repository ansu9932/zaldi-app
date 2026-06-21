import { View } from 'react-native';
import { radius } from './brand';
import { LiveMap } from './LiveMap';

interface Pt { lat: number; lng: number }

// Native maps (react-native-maps) only exist in a real build, not in Expo Go.
// We require it guardedly and fall back to the OpenStreetMap WebView map when
// it isn't available, so the app works everywhere.
let Maps: any = null;
try { Maps = require('react-native-maps'); } catch {}

/**
 * Shows the store, the delivery home, and the live rider on a real map.
 * Uses native maps (Apple Maps on iOS / Google Maps on Android) in a build,
 * and the Leaflet WebView map in Expo Go.
 */
export function RouteMap({ shop, home, rider, height = 280 }: { shop: Pt; home: Pt; rider?: Pt | null; height?: number }) {
  if (!Maps?.default) {
    return <LiveMap shop={shop} home={home} rider={rider} height={height} />;
  }

  const MapView = Maps.default;
  const { Marker, Polyline } = Maps;

  const region = {
    latitude: (shop.lat + home.lat) / 2,
    longitude: (shop.lng + home.lng) / 2,
    latitudeDelta: Math.max(0.02, Math.abs(shop.lat - home.lat) * 2.4),
    longitudeDelta: Math.max(0.02, Math.abs(shop.lng - home.lng) * 2.4),
  };

  return (
    <View style={{ height, borderRadius: radius.xl, overflow: 'hidden' }}>
      <MapView style={{ flex: 1 }} initialRegion={region}>
        <Marker coordinate={{ latitude: shop.lat, longitude: shop.lng }} title="Store" description="Pickup point" />
        <Marker coordinate={{ latitude: home.lat, longitude: home.lng }} title="Delivery" description="Your address" />
        {rider && (
          <Marker coordinate={{ latitude: rider.lat, longitude: rider.lng }} title="Rider" pinColor="#00D16B" />
        )}
        <Polyline
          coordinates={[
            { latitude: shop.lat, longitude: shop.lng },
            { latitude: home.lat, longitude: home.lng },
          ]}
          strokeColor="#00D16B"
          strokeWidth={3}
        />
      </MapView>
    </View>
  );
}
