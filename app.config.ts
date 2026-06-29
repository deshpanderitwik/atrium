import { ExpoConfig } from "expo/config";

// EAS project, created via `eas init` under the ritwikdesh account.
const EAS_PROJECT_ID =
  process.env.EAS_PROJECT_ID ?? "442ada72-7308-45a2-94e6-a853f52d1e61";

const config: ExpoConfig = {
  name: "Atrium",
  slug: "atrium",
  owner: "ritwikdesh",
  scheme: "atrium",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  newArchEnabled: true,
  splash: {
    resizeMode: "contain",
    backgroundColor: "#14110d",
  },
  ios: {
    bundleIdentifier: "com.ritwikdeshpande.atrium",
    supportsTablet: false,
    infoPlist: {
      UIUserInterfaceStyle: "Dark",
      // App uses only standard HTTPS (exempt) — no custom/non-exempt crypto.
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  assetBundlePatterns: ["**/*"],
  plugins: ["expo-router", "expo-font", "expo-sqlite"],
  experiments: {
    typedRoutes: true,
  },
  // --- Over-the-air updates (EAS Update) ---
  // The runtime version gates which builds an OTA update can land on. We key it
  // to the app version: it's computed identically on a laptop and on EAS (no
  // native-dir fingerprint drift), so updates always match the build. Bump
  // `version` when native code changes so old binaries don't pull incompatible JS.
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    enabled: true,
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 0,
    url: EAS_PROJECT_ID
      ? `https://u.expo.dev/${EAS_PROJECT_ID}`
      : undefined,
  },
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID || undefined,
    },
  },
};

export default config;
