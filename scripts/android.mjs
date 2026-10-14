// Builds the Android app.
//
//   npm run android:apk     → dist/LoanLedger-<version>.apk   (install directly on phones)
//   npm run android:bundle  → dist/LoanLedger-<version>.aab   (upload to Google Play)
//   npm run android:open    → opens the project in Android Studio
//
// Gradle here needs JDK 21. JAVA_HOME / ANDROID_HOME are used when set;
// otherwise the copies installed under ~/Android are picked up.

import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const task = process.argv[2] ?? "apk";
const toolsDir = join(homedir(), "Android");

function javaMajor(javaHome) {
  try {
    const release = readFileSync(join(javaHome, "release"), "utf8");
    return Number(/JAVA_VERSION="(\d+)/.exec(release)?.[1]);
  } catch {
    return NaN;
  }
}

function findJavaHome() {
  if (process.env.JAVA_HOME && javaMajor(process.env.JAVA_HOME) === 21) return process.env.JAVA_HOME;
  const local = existsSync(toolsDir) && readdirSync(toolsDir).find((d) => d.startsWith("jdk-21"));
  if (local) return join(toolsDir, local);
  throw new Error("JDK 21 not found. Install it to ~/Android/jdk-21… or set JAVA_HOME to a JDK 21.");
}

function findAndroidHome() {
  const candidates = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, join(toolsDir, "sdk"),
    join(homedir(), "AppData", "Local", "Android", "Sdk")];
  const sdk = candidates.find((p) => p && existsSync(p));
  if (!sdk) throw new Error("Android SDK not found. Set ANDROID_HOME or install it to ~/Android/sdk.");
  return sdk;
}

const env = { ...process.env, JAVA_HOME: findJavaHome(), ANDROID_HOME: findAndroidHome() };
const run = (cmd, cwd = ".") => execSync(cmd, { stdio: "inherit", cwd, env });
// Explicit path: cmd.exe may be configured not to run programs from the current folder.
const gradlew = process.platform === "win32" ? `"${resolve("android", "gradlew.bat")}"` : "./gradlew";

if (!process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID && !readEnvLocal().includes("NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=")) {
  console.warn("\n⚠  NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set — Google sign-in will be disabled in this build.\n");
}

if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" || /^NEXT_PUBLIC_DEMO_MODE=true/m.test(readEnvLocal())) {
  console.error("\n✖  NEXT_PUBLIC_DEMO_MODE is on. The no-sign-in demo is for the web only; turn it off to build the app.\n");
  process.exit(1);
}

run("npx next build");
run("npx cap sync android");

if (task === "open") {
  run("npx cap open android");
  process.exit(0);
}

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const outputs = {
  apk: { gradle: "assembleRelease", from: "android/app/build/outputs/apk/release/app-release.apk", ext: "apk" },
  bundle: { gradle: "bundleRelease", from: "android/app/build/outputs/bundle/release/app-release.aab", ext: "aab" },
};
const out = outputs[task];
if (!out) throw new Error(`Unknown task "${task}". Use apk, bundle or open.`);
if (!existsSync("android/keystore.properties")) {
  throw new Error("android/keystore.properties is missing, so a release build can't be signed. See README.");
}

run(`${gradlew} ${out.gradle} --console=plain`, "android");
mkdirSync("dist", { recursive: true });
const target = join("dist", `LoanLedger-${version}.${out.ext}`);
copyFileSync(out.from, target);
console.log(`\n✔ Built ${target}`);

function readEnvLocal() {
  try {
    return readFileSync(".env.local", "utf8").replace(/^NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=\s*$/m, "");
  } catch {
    return "";
  }
}
