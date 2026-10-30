// Rider outfits: jersey, bib shorts, socks, shoes and helmet as one choice (Settings, Kit), after the rider's own
// kit: Pas Normal Studios Mechanism Pro jerseys (Grey Moss, PAS Origami) and bibs (Grey Moss, Black), white
// mid-calf socks, white shoes and a Specialized S-Works Evade 4 helmet. The colours are taken from the
// colourways' names, not from the products (their pages could not be opened); "Custom colours" keeps the
// jersey and stripe pickers.

export interface Outfit {
  id: string;
  label: string;
  /** Jersey body; its side panels and sleeve ends, in the ribbed fabric, a shade darker. */
  jersey: string;
  panel: string;
  /** Folded-paper print over the jersey: its three facet tones. */
  print?: [string, string, string];
  bibs: string;
  gripper: string;
  socks: string;
  shoes: string;
}

export interface Helmet {
  id: string;
  label: string;
  shell: string;
  /** Vent edges and the tail's inner line. */
  trim: string;
  gloss: boolean;
}

const GREY_MOSS = '#7d8376';
const GREY_MOSS_PANEL = '#6c7266';
const GREY_MOSS_BIBS = '#5f6559';
const BLACK_BIBS = '#141516';
const WHITE_SOCKS = '#f1f1ee';
const WHITE_SHOES = '#efefec';
const ORIGAMI: [string, string, string] = ['#e9e7e1', '#cfcdc6', '#a7aa9f'];

export const OUTFITS: Outfit[] = [
  { id: 'grey-moss', label: 'Grey Moss', jersey: GREY_MOSS, panel: GREY_MOSS_PANEL, bibs: GREY_MOSS_BIBS, gripper: '#555a50', socks: WHITE_SOCKS, shoes: WHITE_SHOES },
  { id: 'grey-moss-black', label: 'Grey Moss and black', jersey: GREY_MOSS, panel: GREY_MOSS_PANEL, bibs: BLACK_BIBS, gripper: '#26282a', socks: WHITE_SOCKS, shoes: WHITE_SHOES },
  { id: 'origami-black', label: 'Origami and black', jersey: ORIGAMI[0], panel: '#bdbbb4', print: ORIGAMI, bibs: BLACK_BIBS, gripper: '#26282a', socks: WHITE_SOCKS, shoes: WHITE_SHOES },
  { id: 'origami-moss', label: 'Origami and Grey Moss', jersey: ORIGAMI[0], panel: '#bdbbb4', print: ORIGAMI, bibs: GREY_MOSS_BIBS, gripper: '#555a50', socks: WHITE_SOCKS, shoes: WHITE_SHOES },
];

/** The S-Works Evade 4's colourways sold in Europe. */
export const HELMETS: Helmet[] = [
  { id: 'matte-white', label: 'Matte white', shell: '#ecebe7', trim: '#2a2b2d', gloss: false },
  { id: 'white-red', label: 'White and red', shell: '#f2f2ef', trim: '#c8202b', gloss: true },
  { id: 'matte-black', label: 'Matte black', shell: '#1d1e20', trim: '#3a3c3f', gloss: false },
];

export const DEFAULT_OUTFIT = 'grey-moss-black';
export const DEFAULT_HELMET = 'matte-white';

export const outfitById = (id: string | undefined): Outfit | undefined => OUTFITS.find((o) => o.id === id);
export const helmetById = (id: string | undefined): Helmet => HELMETS.find((h) => h.id === id) ?? HELMETS[0];
