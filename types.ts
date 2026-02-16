export enum Shape {
  Rect = 'rect',
  Oval = 'oval',
  Circle = 'circle',
}

export enum Material {
  BrushedBrass = 'brushed-brass',
  PolishedBrass = 'polished-brass',
  AgedBrass = 'aged-brass',
  BrushedSteel = 'brushed-stainless',
  PolishedSteel = 'polished-stainless',
}

export enum Fixing {
  VHB = 'vhb',
  Screws = 'screws',
  Caps = 'caps',
}

export interface PlaqueState {
  width: number;
  height: number;
  shape: Shape;
  material: Material;
  fixing: Fixing;
  capSize: number;
  cornerRadius: number;
  border: boolean;
  wood: boolean;
  woodTone: 'light' | 'dark';
  woodEdge: 'square' | 'bevel';
  ageIntensity: number;
  generatedSvgContent: string | null;
  aiReasoning: string | null;
}

export const INITIAL_STATE: PlaqueState = {
  width: 300,
  height: 200,
  shape: Shape.Rect,
  material: Material.BrushedBrass,
  fixing: Fixing.Caps,
  capSize: 10,
  cornerRadius: 2,
  border: true,
  wood: false,
  woodTone: 'light',
  woodEdge: 'square',
  ageIntensity: 0.5,
  generatedSvgContent: null,
  aiReasoning: null,
};

export const AVAILABLE_FONTS = [
  "Cinzel", "Playfair Display", "EB Garamond", "Merriweather",
  "Montserrat", "Lato", "Open Sans", "Oswald",
  "Roboto Slab", "Bitter",
  "Dancing Script", "Pacifico", "Satisfy", "Caveat",
  "Allura", "Alex Brush", "Great Vibes"
];