import { manipulateAsync, SaveFormat, type Action } from 'expo-image-manipulator';

const MAX_DIMENSION = 1080;

// The web build has no native documents folder, but we standardize photo dimensions
// and compress them with expo-image-manipulator to keep storage and memory footprint light.
export async function persistPhoto(uri: string): Promise<string> {
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
    return optimized.uri;
  } catch {
    return uri;
  }
}

export function deletePhoto(_uri?: string) {}
