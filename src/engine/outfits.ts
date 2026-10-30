// Rider outfits: jersey, bib shorts, socks, shoes and helmet as one choice (Settings, Kit), after the rider's own
// kit: Pas Normal Studios Mechanism Pro jerseys (Grey Moss, PAS Origami) and bibs (Grey Moss, Black), white
// mid-calf socks, white shoes and a Specialized S-Works Evade 4. Colours sampled from the product photos (the
// rider's daylight shots and the makers' pages), with the kit's big "PAS" on the chest, back, sleeves and thighs
// and the helmet's wordmark. "Your colours" keeps the jersey and stripe pickers.

export interface Outfit {
  id: string;
  label: string;
  /** Jersey body; its side panels and sleeve ends, in the ribbed fabric, a shade darker. */
  jersey: string;
  panel: string;
  /** Folded-paper print over the jersey: its three facet tones. */
  print?: [string, string, string];
  /** The jersey's lettering. */
  ink: string;
  bibs: string;
  bibsInk: string;
  gripper: string;
  socks: string;
  shoes: string;
}

export interface Helmet {
  id: string;
  label: string;
  shell: string;
  /** The brow band, the tail's lower lip and the V inside the exhaust. */
  trim: string;
  logo: string;
  gloss: boolean;
}

// a mid grey with a little green in it, kept greyer and lighter than the bibs of the same colourway (deep olive)
const GREY_MOSS = '#a3a79d';
const GREY_MOSS_PANEL = '#93978d';
const GREY_MOSS_BIBS = '#687058';
const BLACK_BIBS = '#141516';
const WHITE_SOCKS = '#f1f1ee';
const WHITE_SHOES = '#efefec';
// white with coral and red triangles, lettered in navy
const ORIGAMI: [string, string, string] = ['#ece8e6', '#ef9b8d', '#e5433f'];
const NAVY = '#2a4480';
// the lettering on Grey Moss and on the bibs is an off-white
const CHALK = '#e6e6df';

export const OUTFITS: Outfit[] = [
  { id: 'grey-moss', label: 'Grey Moss', jersey: GREY_MOSS, panel: GREY_MOSS_PANEL, ink: CHALK, bibs: GREY_MOSS_BIBS, bibsInk: CHALK, gripper: '#5c6350', socks: WHITE_SOCKS, shoes: WHITE_SHOES },
  { id: 'grey-moss-black', label: 'Grey Moss and black', jersey: GREY_MOSS, panel: GREY_MOSS_PANEL, ink: CHALK, bibs: BLACK_BIBS, bibsInk: CHALK, gripper: '#26282a', socks: WHITE_SOCKS, shoes: WHITE_SHOES },
  { id: 'origami-black', label: 'Origami and black', jersey: ORIGAMI[0], panel: '#e3dfdc', print: ORIGAMI, ink: NAVY, bibs: BLACK_BIBS, bibsInk: CHALK, gripper: '#26282a', socks: WHITE_SOCKS, shoes: WHITE_SHOES },
  { id: 'origami-moss', label: 'Origami and Grey Moss', jersey: ORIGAMI[0], panel: '#e3dfdc', print: ORIGAMI, ink: NAVY, bibs: GREY_MOSS_BIBS, bibsInk: CHALK, gripper: '#5c6350', socks: WHITE_SOCKS, shoes: WHITE_SHOES },
];

/** S-Works Evade 4 colourways: white with black details as in the rider's photos, White/Red, black. */
export const HELMETS: Helmet[] = [
  { id: 'matte-white', label: 'Matte white', shell: '#ecebe7', trim: '#1d1e20', logo: '#1a1b1d', gloss: false },
  { id: 'white-red', label: 'White and red', shell: '#f2f2ef', trim: '#c8202b', logo: '#1a1b1d', gloss: true },
  { id: 'matte-black', label: 'Matte black', shell: '#1d1e20', trim: '#3a3c3f', logo: '#56585c', gloss: false },
];

export const DEFAULT_OUTFIT = 'grey-moss-black';
export const DEFAULT_HELMET = 'matte-white';

export const outfitById = (id: string | undefined): Outfit | undefined => OUTFITS.find((o) => o.id === id);
export const helmetById = (id: string | undefined): Helmet => HELMETS.find((h) => h.id === id) ?? HELMETS[0];
