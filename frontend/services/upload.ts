import { Platform } from 'react-native';
import { File } from 'expo-file-system';

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
