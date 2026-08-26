const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withInfoPlist,
} = require('expo/config-plugins');

const EXPECTED_ANDROID_BACKUP = false;
const EXPECTED_IOS_BUNDLE_IDENTIFIER = 'com.omerportnoy.chartpath';
const EXPECTED_IOS_TEAM_ID = '9R9UQ6GTQW';
const IOS_BACKUP_POLICY_VERSION = 'ios-sqlite-exclusion-v1';

function assertNativePolicyConfig(config) {
  if (config.ios?.bundleIdentifier !== EXPECTED_IOS_BUNDLE_IDENTIFIER) {
    throw new Error(
      `ChartPath iOS bundle identifier must remain ${EXPECTED_IOS_BUNDLE_IDENTIFIER}.`,
    );
  }
  if (config.ios?.appleTeamId !== EXPECTED_IOS_TEAM_ID) {
    throw new Error(`ChartPath iOS Apple team must remain ${EXPECTED_IOS_TEAM_ID}.`);
  }
  if (config.android?.allowBackup !== EXPECTED_ANDROID_BACKUP) {
    throw new Error('ChartPath Android backup must remain disabled.');
  }
}

function withChartPathNativePolicy(config) {
  assertNativePolicyConfig(config);

  config = withInfoPlist(config, (modConfig) => {
    modConfig.modResults.ChartPathBackupPolicyVersion = IOS_BACKUP_POLICY_VERSION;
    return modConfig;
  });

  return withAndroidManifest(config, (modConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(modConfig.modResults);
    application.$['android:allowBackup'] = 'false';
    return modConfig;
  });
}

module.exports = createRunOncePlugin(
  withChartPathNativePolicy,
  'chartpath-native-policy',
  IOS_BACKUP_POLICY_VERSION,
);
module.exports._internal = {
  EXPECTED_ANDROID_BACKUP,
  EXPECTED_IOS_BUNDLE_IDENTIFIER,
  EXPECTED_IOS_TEAM_ID,
  IOS_BACKUP_POLICY_VERSION,
  assertNativePolicyConfig,
  withChartPathNativePolicy,
};
