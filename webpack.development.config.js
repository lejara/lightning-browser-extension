const path = require("path");
// const webpack = require("webpack");
const FilemanagerPlugin = require("filemanager-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const ExtensionReloader = require("webpack-extension-reloader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const WextManifestWebpackPlugin = require("wext-manifest-webpack-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");

const viewsPath = path.join(__dirname, "static", "views");
// const sourcePath = path.join(__dirname, "source");
const nodeEnv = process.env.NODE_ENV || "development";
const destPath = path.join(__dirname, "dist", nodeEnv);

const targetBrowser = process.env.TARGET_BROWSER;

const extensionReloaderPlugin =
  nodeEnv === "development"
    ? new ExtensionReloader({
        port: 9090,
        reloadPage: true,
        entries: {
          // TODO: reload manifest on update
          contentScript: "contentScript",
          background: "background",
          inpageScript: "inpageScript",
          extensionPage: ["popup", "options", "welcome", "lsat"],
        },
      })
    : () => {
        this.apply = () => {};
      };

const getExtensionFileType = (browser) => {
  if (browser === "opera") {
    return "crx";
  }

  if (browser === "firefox") {
    return "xpi";
  }

  return "zip";
};

module.exports = {
  // devtool: "inline-source-map", // https://github.com/webpack/webpack/issues/1194#issuecomment-560382342

  stats: {
    all: false,
    builtAt: true,
    errors: true,
    hash: true,
  },

  // mode: nodeE#nv,
  mode: 'development',

  entry: {
    manifest: './src/manifest.json',
    background: './extension/background-script/index.js',
    contentScript: './extension/content-script/index.js',
    inpageScript:'./src/extension/inpage-script/index.js',
    popup: './src/app/components/Popup/index.jsx',
    prompt: './src/app/components/Prompt/index.jsx',
    options: './src/app/components/Options/index.jsx',
    welcome: './src/app/components/Welcome/index.jsx',
    lsat: './src/extension/ln/lsat/index.js',
  },

  output: {
    path: path.join(destPath, targetBrowser),
    filename: "js/[name].bundle.js",
  },

  resolve: {
    extensions: [".js", ".jsx", ".json"],
    alias: {
      'webextension-polyfill': 'node_modules/webextension-polyfill'
    },
  },

  module: {
    rules: [
      {
        type: "javascript/auto", // prevent webpack handling json with its own loaders,
        test: /manifest\.json$/,
        use: {
          loader: "wext-manifest-loader",
          options: {
            usePackageJSONVersion: true, // set to false to not use package.json version for manifest
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.(js|ts)x?$/,
        loader: "babel-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader, // It creates a CSS file per JS file which contains CSS
          },
          {
            loader: "css-loader", // Takes the CSS files and returns the CSS with imports and url(...) for Webpack
            options: {
              sourceMap: true,
            },
          },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [
                  [
                    "autoprefixer",
                    {
                      // Options
                    },
                  ],
                ],
              },
            },
          },
          "resolve-url-loader", // Rewrites relative paths in url() statements
          "sass-loader", // Takes the Sass/SCSS file and compiles to the CSS
        ],
      },
    ],
  },

  plugins: [
    // Plugin to not generate js bundle for manifest entry
    new WextManifestWebpackPlugin(),
    // Generate sourcemaps
    // TODO: reenable
    // new webpack.SourceMapDevToolPlugin({ filename: false }),
    // environmental variables
    // new EnvironmentPlugin(["NODE_ENV", "TARGET_BROWSER"]),
    // delete previous build files
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [
        path.join(process.cwd(), "dist", nodeEnv, targetBrowser),
        path.join(
          process.cwd(),
          "dist",
          nodeEnv,
          `${targetBrowser}.${getExtensionFileType(targetBrowser)}`
        ),
      ],
      cleanStaleWebpackAssets: false,
      verbose: true,
    }),
    new HtmlWebpackPlugin({
      template: path.join(viewsPath, "popup.html"),
      inject: "body",
      chunks: ["popup"],
      hash: true,
      filename: "popup.html",
    }),
    new HtmlWebpackPlugin({
      template: path.join(viewsPath, "options.html"),
      inject: "body",
      chunks: ["options"],
      hash: true,
      filename: "options.html",
    }),
    new HtmlWebpackPlugin({
      template: path.join(viewsPath, "prompt.html"),
      inject: "body",
      chunks: ["prompt"],
      hash: true,
      filename: "prompt.html",
    }),
    new HtmlWebpackPlugin({
      template: path.join(viewsPath, "welcome.html"),
      inject: "body",
      chunks: ["welcome"],
      hash: true,
      filename: "welcome.html",
    }),
    new HtmlWebpackPlugin({
      template: path.join(viewsPath, "lsat.html"),
      inject: "body",
      chunks: ["lsat"],
      hash: true,
      filename: "lsat.html",
    }),
    // write css file(s) to build folder
    new MiniCssExtractPlugin({ filename: "css/[name].css" }),
    // copy static assets
    new CopyWebpackPlugin({
      patterns: [{ from: "static/assets", to: "assets" }],
    }),
    // plugin to enable browser reloading in development mode
    extensionReloaderPlugin,
  ],

  optimization: {
    minimize: true,
    minimizer: [
      // new TerserPlugin({
        // parallel: true,
        // terserOptions: {
          // format: {
            // comments: false,
          // },
        // },
        // extractComments: false,
      // }),
      new OptimizeCSSAssetsPlugin({
        cssProcessorPluginOptions: {
          preset: ["default", { discardComments: { removeAll: true } }],
        },
      }),
      new FilemanagerPlugin({
        events: {
          onEnd: {
            archive: [
              {
                format: "zip",
                source: path.join(destPath, targetBrowser),
                destination: `${path.join(
                  destPath,
                  targetBrowser
                )}.${getExtensionFileType(targetBrowser)}`,
                options: { zlib: { level: 6 } },
              },
            ],
          },
        },
      }),
    ],
  },
};