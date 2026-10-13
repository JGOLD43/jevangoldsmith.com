import type { File } from "expo-file-system";

export async function writePrivateFile(file: File, bytes: string | Uint8Array) {
  const desktop =
    typeof window !== "undefined" ? window.jgoldDesktop : undefined;
  if (desktop)
    await desktop.fileAsync(
      "write",
      file.uri,
      typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes,
    );
  else file.write(typeof bytes === "string" ? bytes : new Uint8Array(bytes));
}
