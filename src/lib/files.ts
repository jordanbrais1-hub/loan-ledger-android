import { Capacitor } from "@capacitor/core";

/**
 * Hands a generated file to the user. In the Android app that opens the share
 * sheet (save to Drive or Files, email it, …); in a browser it downloads.
 */
export async function saveFile(filename: string, content: string, mimeType: string) {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: filename, files: [uri] });
    return;
  }

  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
