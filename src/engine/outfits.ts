// Rider outfits: jersey, bib shorts, socks, shoes and helmet as one choice (Settings, Kit), after the rider's own
// kit: Pas Normal Studios Mechanism Pro jerseys (Grey Moss, PAS Origami) and bibs (Grey Moss, Black), white
// mid-calf socks, white shoes and a Specialized S-Works helmet. Colours sampled from the product photos the rider
// sent (daylight shots); the brand's lettering is left off. "Your colours" keeps the jersey and stripe pickers.

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

// a grey with a little green in it; the bibs in the same colourway are a deeper olive
const GREY_MOSS = '#979c90';
const GREY_MOSS_PANEL = '#878c80';
const GREY_MOSS_BIBS = '#687058';
const BLACK_BIBS = '#141516';
const WHITE_SOCKS = '#f1f1ee';
const WHITE_SHOES = '#efefec';
// white with coral and red triangles
const ORIGAMI: [string, string, string] = ['#ece8e6', '#ef9b8d', '#e5433f'];

export const OUTFITS: Outfit[] = [
  { id: 'grey-moss', label: 'Grey Moss', jersey: GREY_MOSS, panel: GREY_MOSS_PANEL, bibs: GREY_MOSS_BIBS, gripper: '#5c6350', socks: WHITE_SOCKS, shoes: WHITE_SHOES },
  { id: 'grey-moss-black', label: 'Grey Moss and black', jersey: GREY_MOSS, panel: GREY_MOSS_PANEL, bibs: BLACK_BIBS, gripper: '#26282a', socks: WHITE_SOCKS, shoes: WHITE_SHOES },
  { id: 'origami-black', label: 'Origami and black', jersey: ORIGAMI[0], panel: '#e3dfdc', print: ORIGAMI, bibs: BLACK_BIBS, gripper: '#26282a', socks: WHITE_SOCKS, shoes: WHITE_SHOES },
  { id: 'origami-moss', label: 'Origami and Grey Moss', jersey: ORIGAMI[0], panel: '#e3dfdc', print: ORIGAMI, bibs: GREY_MOSS_BIBS, gripper: '#5c6350', socks: WHITE_SOCKS, shoes: WHITE_SHOES },
];

/** S-Works Evade colourways: white with black details as in the rider's photos, white and red, black. */
export const HELMETS: Helmet[] = [
  { id: 'matte-white', label: 'Matte white', shell: '#ecebe7', trim: '#2a2b2d', gloss: false },
  { id: 'white-red', label: 'White and red', shell: '#f2f2ef', trim: '#c8202b', gloss: true },
  { id: 'matte-black', label: 'Matte black', shell: '#1d1e20', trim: '#3a3c3f', gloss: false },
];

export const DEFAULT_OUTFIT = 'grey-moss-black';
export const DEFAULT_HELMET = 'matte-white';

export const outfitById = (id: string | undefined): Outfit | undefined => OUTFITS.find((o) => o.id === id);
export const helmetById = (id: string | undefined): Helmet => HELMETS.find((h) => h.id === id) ?? HELMETS[0];
