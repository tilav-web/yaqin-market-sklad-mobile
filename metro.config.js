// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// socket.io-client's deps (engine.io-client / engine.io-parser) ship a broken
// "exports" map that points at ESM files which don't exist in the package.
// Prefer the "require" (CJS) condition first so Metro resolves their real
// build files instead of failing the bundle.
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['require', 'react-native', 'browser', 'import'];

module.exports = config;
