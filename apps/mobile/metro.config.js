const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the workspace root for changes
config.watchFolders = [workspaceRoot];

// Resolve modules from both project and workspace node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Extra node modules for monorepo packages
config.resolver.extraNodeModules = {
  '@data': path.resolve(workspaceRoot, 'packages/data/src'),
  '@features': path.resolve(workspaceRoot, 'packages/features/src'),
  '@ui': path.resolve(workspaceRoot, 'packages/ui/src'),
};

// Enable package exports for better tree-shaking
config.resolver.unstable_enablePackageExports = true;

// Enable condition names for better compatibility
config.resolver.unstable_conditionNames = ['import', 'require', 'default'];

module.exports = config;
