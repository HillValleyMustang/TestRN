const path = require('path');

module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
          alias: {
            '@mobile': path.resolve(__dirname, './app'),
            '@data': path.resolve(__dirname, '../../packages/data/src'),
            '@features': path.resolve(__dirname, '../../packages/features/src'),
            '@ui': path.resolve(__dirname, '../../packages/ui/src'),
          },
        },
      ],
      'expo-router/babel',
      'react-native-reanimated/plugin',
    ],
  };
};
