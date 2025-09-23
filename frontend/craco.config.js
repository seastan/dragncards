const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add Node.js polyfills for webpack 5
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "http": require.resolve("stream-http"),
        "constants": require.resolve("constants-browserify"),
        "buffer": require.resolve("buffer/"),
        "timers": require.resolve("timers-browserify"),
        "stream": require.resolve("stream-browserify"),
        "util": require.resolve("util/"),
        "assert": require.resolve("assert/"),
        "url": require.resolve("url/"),
        "fs": false,
        "net": false,
        "tls": false
      };

      // Provide Buffer globally
      webpackConfig.plugins = [
        ...webpackConfig.plugins,
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser'
        })
      ];

      return webpackConfig;
    }
  }
};