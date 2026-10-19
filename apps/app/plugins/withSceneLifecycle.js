// Adopts the UIScene life cycle on iOS. Since iOS 27 UIKit stops the app at launch
// (EXC_BREAKPOINT in _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption)
// unless it declares a scene manifest. Expo ships the scene delegate
// (ExpoAppSceneDelegate, objc name EXExpoAppSceneDelegate): it creates the window from
// the connecting scene, starts React Native into it with the app delegate's factory and
// forwards URL, user-activity, life-cycle and quick-action events back to the app
// delegate. The Expo templates (SDK 57) do not wire it up yet, so this plugin does:
//   1. Info.plist gets a UIApplicationSceneManifest pointing at EXExpoAppSceneDelegate.
//   2. AppDelegate conforms to ExpoReactNativeFactoryProvider and stops creating and
//      starting its own window (the scene delegate does that now).
// Idempotent: running prebuild again leaves the files unchanged.
const { withInfoPlist, withAppDelegate } = require('expo/config-plugins');

const SCENE_DELEGATE_CLASS = 'EXExpoAppSceneDelegate';
const PROVIDER = 'ExpoReactNativeFactoryProvider';

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: SCENE_DELEGATE_CLASS,
          },
        ],
      },
    };
    return cfg;
  });
}

function fail(reason) {
  throw new Error(
    `withSceneLifecycle: ${reason}. The Expo AppDelegate template changed; update apps/app/plugins/withSceneLifecycle.js.`,
  );
}

function adoptScenes(src) {
  let out = src;

  // 1. Conform to ExpoReactNativeFactoryProvider.
  if (!new RegExp(`class\\s+AppDelegate\\s*:[^{]*\\b${PROVIDER}\\b`).test(out)) {
    const decl = /class\s+AppDelegate\s*:\s*ExpoAppDelegate\b/;
    if (!decl.test(out)) fail('could not find `class AppDelegate: ExpoAppDelegate`');
    out = out.replace(decl, (m) => `${m}, ${PROVIDER}`);
  }

  // 2. Drop the window the app delegate creates and starts React Native into.
  const windowBlock =
    /\n[ \t]*#if os\(iOS\) \|\| os\(tvOS\)\s*\n[ \t]*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*\n[ \t]*factory\.startReactNative\([\s\S]*?\)\s*\n[ \t]*#endif[ \t]*\n/;
  if (windowBlock.test(out)) {
    out = out.replace(windowBlock, '');
  } else if (/UIWindow\(frame:/.test(out) || /\.startReactNative\(/.test(out)) {
    fail('found the app delegate window setup but not in the expected shape');
  }

  // Sanity: the factory must still be created and stored for the scene delegate.
  if (!/reactNativeFactory\s*=\s*factory/.test(out)) {
    fail('the app delegate no longer stores `reactNativeFactory = factory`');
  }
  return out;
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') fail('expected a Swift AppDelegate');
    cfg.modResults.contents = adoptScenes(cfg.modResults.contents);
    return cfg;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withSceneAppDelegate(withSceneManifest(config));
};
module.exports.adoptScenes = adoptScenes;
