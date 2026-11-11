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

export type Outfit = [Garment, Garment, Garment];

export type FavOutfit = {
  id: string;
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
