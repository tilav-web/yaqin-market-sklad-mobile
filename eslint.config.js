// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // An HTML rule with nothing to guard in React Native: <Text> renders
      // natively, so there are no entities to be ambiguous about. All it did
      // here was flag the apostrophe in ordinary Uzbek words — do'kon, so'm,
      // o'zgartirish — in every screen that hardcodes a string.
      "react/no-unescaped-entities": "off",
    },
  },
]);
