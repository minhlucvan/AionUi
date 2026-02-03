#!/usr/bin/env node

/**
 * Build Script for AionUi Plugins
 *
 * Uses webpack to bundle each plugin with all dependencies included.
 * Each plugin is built as a standalone package similar to a monorepo setup.
 */

const webpack = require('webpack');
const path = require('path');

// Load the webpack configurations for all plugins
const configs = require('./webpack.plugin.config.js');

console.log(`\nBuilding ${configs.length} plugins with webpack...\n`);

// Run webpack for all plugin configs
webpack(configs, (err, stats) => {
  if (err) {
    console.error('❌ Webpack compilation failed:');
    console.error(err.stack || err);
    if (err.details) {
      console.error(err.details);
    }
    process.exit(1);
  }

  const info = stats.toJson();

  if (stats.hasErrors()) {
    console.error('❌ Compilation errors:');
    info.errors.forEach(error => {
      console.error(error.message);
    });
    process.exit(1);
  }

  if (stats.hasWarnings()) {
    console.warn('⚠️  Compilation warnings:');
    info.warnings.forEach(warning => {
      console.warn(warning.message);
    });
  }

  // Print summary for each plugin
  console.log('\n✅ All plugins built successfully!\n');

  info.children.forEach((child, index) => {
    const config = configs[index];
    const pluginName = path.basename(path.dirname(config.output.path));
    const buildTime = child.time;
    const outputPath = config.output.path;

    console.log(`  ${pluginName}:`);
    console.log(`    - Built in ${buildTime}ms`);
    console.log(`    - Output: ${outputPath}/index.js`);
  });

  console.log('\n✨ Plugins are ready to load!\n');
});
