const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Workspace packages use NodeNext-style explicit `.js` specifiers in TypeScript.
 * Metro consumes their source directly, so retry those relative imports without
 * the output extension and let its standard resolver select `.ts`/`.tsx`.
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    try {
      return context.resolveRequest(context, moduleName.slice(0, -3), platform);
    } catch {
      // Preserve Metro's original diagnostic when an extensionless target is absent.
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
