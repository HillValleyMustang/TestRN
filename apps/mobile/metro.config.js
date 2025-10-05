const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.extraNodeModules = {
  '@data': path.resolve(workspaceRoot, 'packages/data/src'),
  '@features': path.resolve(workspaceRoot, 'packages/features/src'),
  '@ui': path.resolve(workspaceRoot, 'packages/ui/src'),
};

module.exports = config;
