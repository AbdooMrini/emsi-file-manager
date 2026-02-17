import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.emsi.filemanager',
  appName: 'EMSI File Manager',
  webDir: 'dist',
  server: {
    url: 'https://emsi-file.me',
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0a0e1a',
      showSpinner: false,
    },
  },
};

export default config;
