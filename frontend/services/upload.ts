import { Platform } from 'react-native';
import { File } from 'expo-file-system';

/**
 * Adds a local file to a multipart form.
 * The fetch of Expo SDK 57 (installed as the global fetch on phones) rejects React Native's old
 * `{ uri, name, type }` descriptor and the request then failed before it was sent, which the app
 * reported as "no internet". It accepts any part that has `bytes()`, so the file is read here.
 * The web gets a real Blob (from a data: or blob: URL, or the picked File itself).
 */
export async function appendFile(
  form: FormData,
  field: string,
  file: { uri: string; name: string; type: string; webFile?: Blob }
): Promise<void> {
  if (Platform.OS === 'web') {
    form.append(field, file.webFile ?? (await (await fetch(file.uri)).blob()), file.name);
    return;
  }
  const part = {
    name: file.name,
    type: file.type,
    bytes: async () => new Uint8Array(await new File(file.uri).arrayBuffer()),
  };
  form.append(field, part as unknown as Blob);
}
