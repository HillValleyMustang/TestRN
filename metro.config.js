const { getDefaultConfig } = require("@expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add watch folders for monorepo packages
config.watchFolders = [__dirname + "/packages"];

module.exports = config;
