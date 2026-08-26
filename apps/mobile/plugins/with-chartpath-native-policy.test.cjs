const assert = require('node:assert/strict');
const test = require('node:test');

const { _internal } = require('./with-chartpath-native-policy.cjs');

const validConfig = {
  android: { allowBackup: false },
  ios: {
    appleTeamId: '9R9UQ6GTQW',
    bundleIdentifier: 'com.omerportnoy.chartpath',
  },
};

test('accepts the exact ChartPath native identity and backup boundary', () => {
  assert.doesNotThrow(() => _internal.assertNativePolicyConfig(validConfig));
});

test('rejects a changed iOS bundle identifier', () => {
  assert.throws(
    () =>
      _internal.assertNativePolicyConfig({
        ...validConfig,
        ios: { ...validConfig.ios, bundleIdentifier: 'com.example.changed' },
      }),
    /bundle identifier/,
  );
});

test('rejects a changed Apple team', () => {
  assert.throws(
    () =>
      _internal.assertNativePolicyConfig({
        ...validConfig,
        ios: { ...validConfig.ios, appleTeamId: 'WRONGTEAM' },
      }),
    /Apple team/,
  );
});

test('rejects Android backup enablement or omission', () => {
  assert.throws(
    () =>
      _internal.assertNativePolicyConfig({
        ...validConfig,
        android: { allowBackup: true },
      }),
    /backup must remain disabled/,
  );
  assert.throws(
    () => _internal.assertNativePolicyConfig({ ...validConfig, android: {} }),
    /backup must remain disabled/,
  );
});
