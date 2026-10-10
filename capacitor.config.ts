import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jordanbrais.loanledger",
  appName: "Loan Ledger",
  // `next build` writes the static app here (output: "export").
  webDir: "out",
  plugins: {
    SocialLogin: {
      // Only Google is used; leaving the others out keeps their SDKs out of the APK.
      providers: { google: true, facebook: false, apple: false, twitter: false },
      logLevel: 1,
    },
  },
};

export default config;
