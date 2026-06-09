// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// socket.io-client's deps (engine.io-client / engine.io-parser) ship a broken
// "exports" map that points at ESM files which don't exist in the package.
// Prefer the "require" (CJS) condition first so Metro resolves their real
// build files instead of failing the bundle.
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['require', 'react-native', 'browser', 'import'];

// react-native-render-html ships "react-native": "src/" (raw TS) which Metro
// cannot transpile from node_modules. Force it to use the compiled CJS build.
const originalResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-render-html') {
    return {
      filePath: require.resolve('react-native-render-html/lib/commonjs/index.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolve) return originalResolve(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
