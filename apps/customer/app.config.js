// Dynamic Expo config: injects the Google Maps Android API key from an
// environment variable at build time, so the key is NEVER committed to git.
//
// Set it once with EAS (applies to `eas build` and `eas update`):
//   eas env:create --environment production --name EXPO_PUBLIC_GOOGLE_MAPS_KEY --value "AIzaSy..." --visibility sensitive
//   eas env:create --environment preview    --name EXPO_PUBLIC_GOOGLE_MAPS_KEY --value "AIzaSy..." --visibility sensitive
// (Or set EXPO_PUBLIC_GOOGLE_MAPS_KEY in a local .env for local builds.)
//
// If no key is set, the customer map falls back to the keyless OpenStreetMap view.

module.exports = ({ config }) => {
  const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '';
  config.android = config.android || {};
  if (googleMapsKey) {
    config.android.config = {
      ...(config.android.config || {}),
      googleMaps: { apiKey: googleMapsKey },
    };
  }
  return config;
};
