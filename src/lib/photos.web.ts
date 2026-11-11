// The web build has no app file system: camera and picker already hand back data: URIs,
// which are stored as-is.
export async function persistPhoto(uri: string): Promise<string> {
  return uri;
}

export function deletePhoto(_uri?: string) {}
