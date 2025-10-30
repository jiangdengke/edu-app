module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        alias: {
          '@': './src'
        }
      }],
      ['tamagui', {
        config: './tamagui.config.ts',
        components: ['tamagui'],
        disableExtraction: process.env.NODE_ENV === 'development'
      }],
      'react-native-reanimated/plugin'
    ]
  };
};
