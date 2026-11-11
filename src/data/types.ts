export type Cat = 'torso' | 'piernas' | 'calzado';

export type Kind =
  | 'tee'
  | 'sweater'
  | 'jacket'
  | 'pants'
  | 'skirt'
  | 'shorts'
  | 'sneaker'
  | 'boot'
  | 'loafer';

export type Garment = {
  id: string;
  name: string;
  cat: Cat;
  kind: Kind;
  fill: string;
  bg: string;
  imageUri?: string;
  createdAt: number;
};

export type FavOutfit = {
  id: string;
  name?: string;
  when: number;
  items: Garment[];
};

/** A photo waiting to be sorted in the Selector. */
export type PendingPhoto = {
  id: string;
  name: string;
  kind: Kind;
  fill: string;
  bg: string;
  imageUri?: string;
};

export type Profile = {
  id: string;
  name: string;
  photoUri?: string;
  color: string;
  createdAt: number;
};

/** Everything that belongs to one profile. */
export type Closet = {
  items: Garment[];
  favs: FavOutfit[];
  photos: PendingPhoto[];
};

export type Prefs = {
  /** Show the profile picker on every launch instead of reopening the last profile. */
  askProfileOnOpen: boolean;
};
