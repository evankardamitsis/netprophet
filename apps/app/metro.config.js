// Metro config for the pnpm monorepo (node-linker=hoisted).
// Legacy apps (web, mobile) pin React 18 / RN 0.72 and get hoisted to the repo root, while this
// app needs React 19 / RN 0.86 from apps/app/node_modules. We watch the workspace root so the
// @netprophet/* packages resolve, and pin the React family to this app's copies so a single
// instance of React is bundled.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

const PINNED = ['react', 'react-dom', 'react-native', 'react-native-web'];
const origin = path.join(projectRoot, 'index.js');
const upstreamResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const root = moduleName.split('/')[0];
  const pinned = PINNED.includes(root);
  const ctx = pinned ? { ...context, originModulePath: origin } : context;
  if (upstreamResolve) return upstreamResolve(ctx, moduleName, platform);
  return ctx.resolveRequest(ctx, moduleName, platform);
};

module.exports = config;
