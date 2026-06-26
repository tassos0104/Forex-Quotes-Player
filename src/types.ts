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

