/**
 * Webpack configuration for bundling AionUi plugins
 *
 * Bundles each plugin as a standalone package with all dependencies included.
 * Output is a single CommonJS module that can be loaded via require() at runtime.
 */

const path = require('path');
const fs = require('fs');

/**
 * Create webpack config for a single plugin
 * @param {string} pluginName - Name of the plugin directory (e.g., 'plugin-pdf')
 * @param {string} pluginsDir - Path to plugins directory
 * @returns {object} Webpack configuration
 */
function createPluginConfig(pluginName, pluginsDir) {
  const pluginDir = path.join(pluginsDir, pluginName);
  const entryPoint = path.join(pluginDir, 'src', 'index.ts');
  const outputDir = path.join(pluginDir, 'dist');

  return {
    mode: 'production',
    target: 'node',
    entry: entryPoint,
    output: {
      path: outputDir,
      filename: 'index.js',
      libraryTarget: 'commonjs2',
      clean: true, // Clean dist directory before build
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@': path.join(__dirname, '..', 'src'),
        '@common': path.join(__dirname, '..', 'src', 'common'),
        '@process': path.join(__dirname, '..', 'src', 'process'),
        '@renderer': path.join(__dirname, '..', 'src', 'renderer'),
        '@worker': path.join(__dirname, '..', 'src', 'worker'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: path.join(__dirname, '..', 'tsconfig.json'),
              transpileOnly: true, // Faster builds
            },
          },
          exclude: /node_modules/,
        },
      ],
    },
    externals: {
      // Don't bundle these - they're available in the main app
      'electron': 'commonjs2 electron',
      'better-sqlite3': 'commonjs2 better-sqlite3',
      'sharp': 'commonjs2 sharp',

      // Common dependencies that should be shared
      'react': 'commonjs2 react',
      'react-dom': 'commonjs2 react-dom',
    },
    optimization: {
      minimize: false, // Keep readable for debugging
    },
    stats: {
      warnings: false,
      errors: true,
      errorDetails: true,
    },
    devtool: 'source-map',
  };
}

/**
 * Generate webpack configs for all plugins
 */
function generateConfigs() {
  const pluginsDir = path.join(__dirname, '..', 'plugins');

  // Find all plugin directories
  const plugins = fs.readdirSync(pluginsDir).filter(name => {
    const pluginPath = path.join(pluginsDir, name);
    return (
      fs.statSync(pluginPath).isDirectory() &&
      fs.existsSync(path.join(pluginPath, 'src', 'index.ts')) &&
      name !== 'plugin-example' // Skip example plugin
    );
  });

  console.log(`Found ${plugins.length} plugins to bundle:`, plugins.join(', '));

  return plugins.map(pluginName => createPluginConfig(pluginName, pluginsDir));
}

module.exports = generateConfigs();
