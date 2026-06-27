export interface Quote {
  id: string;
  text: string;
  author: string;
  categoryId: string;
  createdAt: number;
  rating?: 'up' | 'down' | null;
  isActive?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  isCustom?: boolean;
}

export interface Category {
  id: string;
  name: string;
  folderId?: string; // Optional parent folder ID
  isCustom?: boolean;
  isShufflable: boolean; // whether this category is ON/OFF for shuffle play
}

export interface QuoteFont {
  id: string;
  name: string;
  family: string;
  cssValue: string;
  category: 'serif' | 'sans-serif' | 'slab' | 'handwritten' | 'display' | 'calligraphy';
  supportsGreek?: boolean;
}

export const QUOTE_FONTS: QuoteFont[] = [
  // --- SERIF ---
  {
    id: "playfair-display",
    name: "Playfair Display",
    family: "Playfair Display",
    cssValue: '"Playfair Display", Georgia, serif',
    category: "serif",
    supportsGreek: true
  },
  {
    id: "eb-garamond",
    name: "EB Garamond",
    family: "EB Garamond",
    cssValue: '"EB Garamond", Georgia, serif',
    category: "serif",
    supportsGreek: true
  },
  {
    id: "lora",
    name: "Lora",
    family: "Lora",
    cssValue: '"Lora", Georgia, serif',
    category: "serif",
    supportsGreek: true
  },
  {
    id: "alegreya",
    name: "Alegreya",
    family: "Alegreya",
    cssValue: '"Alegreya", Georgia, serif',
    category: "serif",
    supportsGreek: true
  },
  {
    id: "noto-serif",
    name: "Noto Serif",
    family: "Noto Serif",
    cssValue: '"Noto Serif", Georgia, serif',
    category: "serif",
    supportsGreek: true
  },
  {
    id: "gfs-didot",
    name: "GFS Didot",
    family: "GFS Didot",
    cssValue: '"GFS Didot", serif',
    category: "serif",
    supportsGreek: true
  },
  {
    id: "cormorant-garamond",
    name: "Cormorant Garamond",
    family: "Cormorant Garamond",
    cssValue: '"Cormorant Garamond", serif',
    category: "serif",
    supportsGreek: true
  },
  {
    id: "merriweather",
    name: "Merriweather",
    family: "Merriweather",
    cssValue: '"Merriweather", serif',
    category: "serif",
    supportsGreek: true
  },
  {
    id: "pt-serif",
    name: "PT Serif",
    family: "PT Serif",
    cssValue: '"PT Serif", serif',
    category: "serif",
    supportsGreek: true
  },
  {
    id: "spectral",
    name: "Spectral",
    family: "Spectral",
    cssValue: '"Spectral", serif',
    category: "serif",
    supportsGreek: true
  },
  {
    id: "cardo",
    name: "Cardo",
    family: "Cardo",
    cssValue: '"Cardo", serif',
    category: "serif",
    supportsGreek: true
  },
  {
    id: "cinzel",
    name: "Cinzel",
    family: "Cinzel",
    cssValue: '"Cinzel", serif',
    category: "serif"
  },

  // --- SANS-SERIF ---
  {
    id: "inter",
    name: "Inter",
    family: "Inter",
    cssValue: '"Inter", sans-serif',
    category: "sans-serif",
    supportsGreek: true
  },
  {
    id: "montserrat",
    name: "Montserrat",
    family: "Montserrat",
    cssValue: '"Montserrat", sans-serif',
    category: "sans-serif",
    supportsGreek: true
  },
  {
    id: "open-sans",
    name: "Open Sans",
    family: "Open Sans",
    cssValue: '"Open Sans", sans-serif',
    category: "sans-serif",
    supportsGreek: true
  },
  {
    id: "roboto",
    name: "Roboto",
    family: "Roboto",
    cssValue: '"Roboto", sans-serif',
    category: "sans-serif",
    supportsGreek: true
  },
  {
    id: "nunito",
    name: "Nunito",
    family: "Nunito",
    cssValue: '"Nunito", sans-serif',
    category: "sans-serif",
    supportsGreek: true
  },
  {
    id: "fira-sans",
    name: "Fira Sans",
    family: "Fira Sans",
    cssValue: '"Fira Sans", sans-serif',
    category: "sans-serif",
    supportsGreek: true
  },
  {
    id: "rubik",
    name: "Rubik",
    family: "Rubik",
    cssValue: '"Rubik", sans-serif',
    category: "sans-serif",
    supportsGreek: true
  },
  {
    id: "jost",
    name: "Jost",
    family: "Jost",
    cssValue: '"Jost", sans-serif',
    category: "sans-serif"
  },
  {
    id: "jura",
    name: "Jura",
    family: "Jura",
    cssValue: '"Jura", sans-serif',
    category: "sans-serif",
    supportsGreek: true
  },
  {
    id: "ubuntu",
    name: "Ubuntu",
    family: "Ubuntu",
    cssValue: '"Ubuntu", sans-serif',
    category: "sans-serif"
  },
  {
    id: "manrope",
    name: "Manrope",
    family: "Manrope",
    cssValue: '"Manrope", sans-serif',
    category: "sans-serif",
    supportsGreek: true
  },
  {
    id: "gfs-neohellenic",
    name: "GFS Neohellenic",
    family: "GFS Neohellenic",
    cssValue: '"GFS Neohellenic", sans-serif',
    category: "sans-serif",
    supportsGreek: true
  },

  // --- SLAB ---
  {
    id: "roboto-slab",
    name: "Roboto Slab",
    family: "Roboto Slab",
    cssValue: '"Roboto Slab", serif',
    category: "slab",
    supportsGreek: true
  },
  {
    id: "arvo",
    name: "Arvo",
    family: "Arvo",
    cssValue: '"Arvo", serif',
    category: "slab"
  },
  {
    id: "alfa-slab-one",
    name: "Alfa Slab One",
    family: "Alfa Slab One",
    cssValue: '"Alfa Slab One", serif',
    category: "slab"
  },
  {
    id: "antic-slab",
    name: "Antic Slab",
    family: "Antic Slab",
    cssValue: '"Antic Slab", serif',
    category: "slab"
  },

  // --- CALLIGRAPHY / HANDWRITTEN / DISPLAY ---
  {
    id: "caveat",
    name: "Caveat",
    family: "Caveat",
    cssValue: '"Caveat", cursive',
    category: "calligraphy",
    supportsGreek: true
  },
  {
    id: "bad-script",
    name: "Bad Script",
    family: "Bad Script",
    cssValue: '"Bad Script", cursive',
    category: "calligraphy"
  },
  {
    id: "neucha",
    name: "Neucha",
    family: "Neucha",
    cssValue: '"Neucha", cursive',
    category: "calligraphy"
  },
  {
    id: "arima",
    name: "Arima",
    family: "Arima",
    cssValue: '"Arima", cursive, serif',
    category: "calligraphy",
    supportsGreek: true
  },
  {
    id: "amatic-sc",
    name: "Amatic SC",
    family: "Amatic SC",
    cssValue: '"Amatic SC", cursive',
    category: "handwritten"
  },
  {
    id: "playpen-sans",
    name: "Playpen Sans",
    family: "Playpen Sans",
    cssValue: '"Playpen Sans", cursive',
    category: "handwritten"
  },
  {
    id: "comic-neue",
    name: "Comic Neue",
    family: "Comic Neue",
    cssValue: '"Comic Neue", cursive',
    category: "handwritten"
  },
  {
    id: "comfortaa",
    name: "Comfortaa",
    family: "Comfortaa",
    cssValue: '"Comfortaa", cursive',
    category: "display",
    supportsGreek: true
  },
  {
    id: "lobster",
    name: "Lobster",
    family: "Lobster",
    cssValue: '"Lobster", cursive',
    category: "display"
  },
  {
    id: "kelly-slab",
    name: "Kelly Slab",
    family: "Kelly Slab",
    cssValue: '"Kelly Slab", cursive',
    category: "display"
  },
  {
    id: "pacifico",
    name: "Pacifico",
    family: "Pacifico",
    cssValue: '"Pacifico", cursive',
    category: "display"
  },
  {
    id: "federo",
    name: "Federo",
    family: "Federo",
    cssValue: '"Federo", sans-serif',
    category: "display",
    supportsGreek: true
  }
];

