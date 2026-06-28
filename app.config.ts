import { ExpoConfig } from "expo/config";

// EAS project id is injected by `eas build:configure` / `eas init`.
// Until then it is read from the environment so the config stays valid.
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID ?? "";

const config: ExpoConfig = {
  name: "Atrium",
  slug: "atrium",
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
    buildNumber: "1",
    infoPlist: {
      UIUserInterfaceStyle: "Dark",
    },
  },
  assetBundlePatterns: ["**/*"],
  plugins: ["expo-router", "expo-font", "expo-sqlite"],
  experiments: {
    typedRoutes: true,
  },
  // --- Over-the-air updates (EAS Update) ---
  // `fingerprint` ties each OTA update to the exact native runtime it was built
  // against, so any native change (new module, SDK bump) automatically requires
  // a fresh build instead of shipping a broken JS-only update.
  runtimeVersion: {
    policy: "fingerprint",
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
