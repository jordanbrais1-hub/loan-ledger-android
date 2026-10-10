// Renders assets/icon.svg into the Android launcher icons and splash screens.
// Run after changing the icon: `node scripts/android-assets.mjs`
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const RES = "android/app/src/main/res";
const BRAND = "#4f46e5";

const svg = await readFile("assets/icon.svg", "utf8");
// The artwork without its square background, to place on other backgrounds.
const artwork = svg.replace(/<svg[^>]*>|<\/svg>/g, "").replace(/<rect width="1024" height="1024"[^>]*\/>/, "");
const wrap = (size, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${body}</svg>`;

// Legacy (square) icon, round icon, and the adaptive-icon foreground. The
// adaptive foreground keeps the artwork inside the 66% safe zone.
const square = wrap(1024, `<rect width="1024" height="1024" rx="180" fill="${BRAND}"/>${artwork}`);
const round = wrap(1024, `<circle cx="512" cy="512" r="512" fill="${BRAND}"/>${artwork}`);
const foreground = wrap(1024, `<g transform="translate(512 512) scale(0.62) translate(-512 -512)">${artwork}</g>`);

const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const png = (source, w, h, file) => sharp(Buffer.from(source)).resize(w, h ?? w).png().toFile(join(RES, file));

const jobs = [];
for (const [name, scale] of Object.entries(densities)) {
  jobs.push(png(square, 48 * scale, null, `mipmap-${name}/ic_launcher.png`));
  jobs.push(png(round, 48 * scale, null, `mipmap-${name}/ic_launcher_round.png`));
  jobs.push(png(foreground, 108 * scale, null, `mipmap-${name}/ic_launcher_foreground.png`));
}

// Splash screens: the icon centred on the app background, at each existing size.
const splashFiles = ["drawable/splash.png"];
for (const name of Object.keys(densities)) splashFiles.push(`drawable-port-${name}/splash.png`, `drawable-land-${name}/splash.png`);
for (const file of splashFiles) {
  const { width, height } = await sharp(join(RES, file)).metadata();
  const icon = Math.round(Math.min(width, height) * 0.28);
  const body =
    `<rect width="${width}" height="${height}" fill="#f8fafc"/>` +
    `<g transform="translate(${(width - icon) / 2} ${(height - icon) / 2}) scale(${icon / 1024})">` +
    `<rect width="1024" height="1024" rx="220" fill="${BRAND}"/>${artwork}</g>`;
  const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`;
  jobs.push(sharp(Buffer.from(splash)).png().toBuffer().then((buf) => sharp(buf).toFile(join(RES, file))));
}

await Promise.all(jobs);
console.log(`Wrote ${jobs.length} Android icon and splash images.`);
