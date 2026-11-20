import { Directory, File, Paths } from 'expo-file-system';
import { manipulateAsync, SaveFormat, type Action } from 'expo-image-manipulator';

import { uid } from '@/data/catalog';

const dir = new Directory(Paths.document, 'prendas');
const MAX_DIMENSION = 1080;

/**
 * Camera and picker URIs live in the cache and can vanish. Standardize the photo
 * dimensions (max 1080px) and quality with expo-image-manipulator, save into the
 * app's documents folder and return the permanent URI stored in the database.
 */
export async function persistPhoto(uri: string): Promise<string> {
  if (uri.startsWith(dir.uri)) return uri;
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });

  let sourceUri = uri;
  try {
    const info = await manipulateAsync(uri, [], {});
    const actions: Action[] = [];
    if (info.width > MAX_DIMENSION || info.height > MAX_DIMENSION) {
      if (info.width >= info.height) {
        actions.push({ resize: { width: MAX_DIMENSION } });
      } else {
        actions.push({ resize: { height: MAX_DIMENSION } });
      }
    }
    const optimized = await manipulateAsync(uri, actions, {
      compress: 0.85,
      format: SaveFormat.JPEG,
    });
    sourceUri = optimized.uri;
  } catch {
    // If manipulation fails, use original source file
  }

  const dest = new File(dir, `${uid('img')}.jpg`);
  await new File(sourceUri).copy(dest);
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
