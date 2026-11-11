import { Directory, File, Paths } from 'expo-file-system';

import { uid } from '@/data/catalog';

const dir = new Directory(Paths.document, 'prendas');

/**
 * Camera and picker URIs live in the cache and can vanish. Copy the photo into the
 * app's documents folder and return the permanent URI we store in the database.
 */
export async function persistPhoto(uri: string): Promise<string> {
  if (uri.startsWith(dir.uri)) return uri;
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  const dest = new File(dir, `${uid('img')}.${ext && ext.length <= 4 ? ext : 'jpg'}`);
  await new File(uri).copy(dest);
  return dest.uri;
}

export function deletePhoto(uri?: string) {
  if (!uri || !uri.startsWith(dir.uri)) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // A missing file is already the state we want.
  }
}
