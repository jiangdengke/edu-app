module.exports = function (api) {
  api.cache(true);

  const callerName = api.caller?.((caller) => caller?.name) ?? 'unknown';

  return {
    presets: ['babel-preset-expo'],
    plugins: (() => {
      const plugins = [
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
      ];

      const disallowedCallers = new Set(['config-plugins', 'unknown']);
      const shouldEnableReanimated =
        process.env.DISABLE_REANIMATED_PLUGIN !== '1' && !disallowedCallers.has(callerName);

      if (shouldEnableReanimated) {
        plugins.push('react-native-reanimated/plugin');
      }

      return plugins;
    })()
  };
};
