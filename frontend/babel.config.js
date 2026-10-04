module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin', // TENTO ŘÁDEK PŘIDEJ (pokud už tam není)
    ],
  };
};