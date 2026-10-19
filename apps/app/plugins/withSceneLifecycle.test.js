import { describe, expect, it } from 'vitest';
import { adoptScenes } from './withSceneLifecycle';

// The AppDelegate.swift that `expo prebuild` generates for SDK 57 (trimmed after the
// universal-links override, which the plugin does not touch).
const TEMPLATE = `internal import Expo
import React
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }
}
`;

describe('adoptScenes', () => {
  const out = adoptScenes(TEMPLATE);

  it('makes the app delegate a React Native factory provider', () => {
    expect(out).toContain('class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
  });

  it('leaves window creation and startReactNative to the scene delegate', () => {
    expect(out).not.toContain('UIWindow(frame:');
    expect(out).not.toContain('startReactNative(');
    expect(out).toContain('    reactNativeFactory = factory\n\n    return super.application(');
  });

  it('keeps the factory, the window property and the linking override', () => {
    expect(out).toContain('var window: UIWindow?');
    expect(out).toContain('let factory = ExpoReactNativeFactory(delegate: delegate)');
    expect(out).toContain('RCTLinkingManager.application(app, open: url, options: options)');
  });

  it('is idempotent', () => {
    expect(adoptScenes(out)).toBe(out);
  });

  it('fails loudly when the template changes shape', () => {
    expect(() => adoptScenes('class AppDelegate: UIResponder {}')).toThrow(/withSceneLifecycle/);
  });
});
