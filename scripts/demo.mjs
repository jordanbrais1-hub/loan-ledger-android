// The public web demo: the same app with no sign-in (NEXT_PUBLIC_DEMO_MODE=true).
//   npm run demo         → dev server
//   npm run build:demo   → static build into out/ (what Vercel deploys)
// Setting the variable here keeps it working on Windows, macOS and Linux alike.
import { spawnSync } from "node:child_process";

const command = process.argv[2] === "build" ? "build" : "dev";
// Anything after the command is passed on, e.g. `npm run demo -- -p 4000`.
const result = spawnSync("npx", ["next", command, ...process.argv.slice(3)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NEXT_PUBLIC_DEMO_MODE: "true" },
});
process.exit(result.status ?? 1);
