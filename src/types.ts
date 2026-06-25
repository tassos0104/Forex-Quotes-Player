export interface Quote {
  id: string;
  text: string;
  author: string;
  categoryId: string;
  createdAt: number;
  rating?: 'up' | 'down' | null;
}

export interface Category {
  id: string;
  name: string;
  isCustom?: boolean;
  isShufflable: boolean; // whether this category is ON/OFF for shuffle play
}
