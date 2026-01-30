const appJson = require('./app.json');

/**
 * Expo dynamic config
 *
 * `app.json` is treated as the base config (kept intact), while this file
 * overrides branding fields so the app shows up as "Ledger" on device and web.
 */
module.exports = () => {
  const base = appJson?.expo ?? {};

  return {
    ...base,
    name: 'Ledger',
    slug: 'ledger',
    scheme: 'ledger',
    icon: './public/appicon/appstore.png',
    splash: {
      image: './public/appicon/ledger_splashicon.png',
      resizeMode: 'contain',
      backgroundColor: '#100648',
    },
    ios: {
      ...(base.ios ?? {}),
      bundleIdentifier: 'com.masterpiece-ledger.app',
      infoPlist: {
        ...(base.ios?.infoPlist ?? {}),
        NSFaceIDUsageDescription:
          'Ledger uses Face ID to protect your financial data when you leave the app.',
        NSCalendarsUsageDescription:
          'Ledger uses calendar access to add and display investment events like dividends, maturity dates, and review reminders.',
        NSCalendarsFullAccessUsageDescription:
          'Ledger uses calendar access to add and display investment events like dividends, maturity dates, and review reminders.',
        NSRemindersUsageDescription:
          'Ledger uses reminders to notify you about upcoming investment events and deadlines you choose to track.',
        NSRemindersFullAccessUsageDescription:
          'Ledger uses reminders to notify you about upcoming investment events and deadlines you choose to track.',
        NSCameraUsageDescription:
          'Ledger uses the camera so you can scan or attach documents to your portfolio entries.',
        NSMicrophoneUsageDescription:
          'Ledger uses the microphone when recording video attachments (if you choose to).',
        NSPhotoLibraryUsageDescription:
          'Ledger uses your photo library so you can attach screenshots or documents to your assets.',
        NSPhotoLibraryAddUsageDescription:
          'Ledger can save exported images or documents to your photo library when you choose to.',
        NSContactsUsageDescription:
          'Ledger can access contacts only when you choose to share an export or send information to someone.',
        NSLocationWhenInUseUsageDescription:
          'Ledger can use your location (while the app is in use) to personalize region, currency, and local market context.',
      },
    },
    android: {
      ...(base.android ?? {}),
      package: 'com.kenn69.ledger',
      icon: './public/appicon/playstore.png',
      adaptiveIcon: {
        foregroundImage: './public/appicon/playstore.png',
        backgroundColor: '#100648',
      },
    },
  };
};
