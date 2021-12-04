const path = require('path');
const webpack = require('webpack');

const baseConfig = {
  context: __dirname,
  mode: 'none',
  module: {
    rules: [{
      test: /\.ts$/,
      exclude: /node_modules/,
      use: [{
        loader: "ts-loader"
      }]
    }]
  },
  externals: {
    vscode: 'commonjs vscode' // ignored because it doesn't exist
  },
  performance: {
    hints: false,
  },
  devtool: "nosources-source-map", // create a source map that points to the original source file
};

const nodeConfig = {
  entry: {
    node: "./src/extension.ts" // source of the node extension main file
  },
  output: {
    clean: {
      keep: /web.js(.map)?/    // keep output from webConfig
    },
    filename: "[name].js",
    path: path.join(__dirname, "./dist"),
    libraryTarget: "commonjs"
  },
  target: "node", // extensions run in a node context
  resolve: {
    mainFields: ["module", "main"],
    extensions: [".ts", ".js"]
  }
};

const webConfig = {
  entry: {
    web: "./src/extension.ts" // source of the web extension main file
  },
  output: {
    clean: {
      keep: /node.js(.map)?/  // keep output from nodeConfig
    },
    filename: "[name].js",
    path: path.join(__dirname, "./dist"),
    libraryTarget: "commonjs"
  },
  target: 'webworker', // extensions run in a webworker context
  resolve: {
    mainFields: ['browser', 'module', 'main'], // look for `browser` entry point in imported node modules
    extensions: ['.ts', '.js'],
    alias: {
      // provides alternate implementation for node module and source files
    },
    fallback: {
      // Webpack 5 no longer polyfills Node.js core modules automatically.
      // see https://webpack.js.org/configuration/resolve/#resolvefallback
      // for the list of Node.js core module polyfills.
      assert: require.resolve('assert')
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser' // provide a shim for the global `process` variable
    })
  ]
};


module.exports = [
  { ...baseConfig, ...nodeConfig },
  { ...baseConfig, ...webConfig }
];
