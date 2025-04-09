export default {
  expo: {
    name: "PayGo March",
    slug: "paygo-march-app",
    version: "1.2.0",
    orientation: "portrait",
    icon: "./assets/main2.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/main2.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    updates: {
      fallbackToCacheTimeout: 30000,
      enabled: true,
      checkAutomatically: "ON_LOAD"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.paygomarch.app",
      buildNumber: "3",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "This app uses your location to find nearby fitness centers and provide location-based recommendations.",
        NSCameraUsageDescription: "This app uses the camera to scan QR codes for check-in at fitness centers.",
        UIBackgroundModes: ["remote-notification"]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/main2.png",
        backgroundColor: "#ffffff"
      },
      package: "com.paygomarch.app",
      versionCode: 3,
      permissions: [
        "CAMERA",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    },
    web: {
      favicon: "./assets/main2.png"
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow PayGo Fitness to use your location to find nearby fitness centers."
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow PayGo Fitness to access your camera to scan QR codes for check-in."
        }
      ],
      "expo-barcode-scanner"
    ],
    extra: {
      twilioAccountSid: "TWILIO_ACCOUNT_SID_PLACEHOLDER",
      twilioAuthToken: "TWILIO_AUTH_TOKEN_PLACEHOLDER",
      twilioVerifyServiceSid: "TWILIO_VERIFY_SERVICE_SID_PLACEHOLDER",
      devMode: false,
      eas: {
        projectId: "627aa406-983b-41fc-872f-b73f0eb7dcad"
      }
    },
    newArchEnabled: true
  },
}; 