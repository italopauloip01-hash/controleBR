import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.controlefinanceiro.app',
  appName: 'ControleBR',
  webDir: 'dist',
  android: {
    // Ensures session cookies work correctly on Android
    allowMixedContent: true,
  },
  server: {
    // androidScheme helps the WebView correctly scope localStorage
    androidScheme: 'https'
  }
};

export default config;
