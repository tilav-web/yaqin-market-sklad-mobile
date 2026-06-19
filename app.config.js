// Dynamic Expo config layered on top of app.json.
//
// google-services.json is gitignored (Firebase client config), so EAS Build —
// which only uploads git-tracked files — can't see it. We inject it at build
// time via the EAS file env var GOOGLE_SERVICES_JSON (its value is the path to
// the materialized file). Locally the env var is absent and we fall back to the
// committed-on-disk ./google-services.json.
export default ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile,
  },
  plugins: [
    ...(config.plugins ?? []),
    [
      'expo-widgets',
      {
        bundleIdentifier: 'uz.yaqin.market.widgets',
        groupIdentifier: 'group.uz.yaqin.market',
        enablePushNotifications: false,
        liveActivities: [{ name: 'OrderActivity' }],
      },
    ],
  ],
});
