// apps/mobile/metro.config.cjs
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo bits (keep if needed)
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
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['import', 'require', 'default'];

// 👇 Expo Router integration is now built into expo/metro-config (SDK 50+)
module.exports = config;
