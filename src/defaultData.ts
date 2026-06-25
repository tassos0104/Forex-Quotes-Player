import { Category, Quote } from "./types";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "inspiration", name: "Inspiration", isShufflable: true },
  { id: "mindfulness", name: "Mindfulness", isShufflable: true },
  { id: "creativity", name: "Creativity", isShufflable: true },
  { id: "wisdom", name: "Wisdom", isShufflable: true },
];

export const DEFAULT_QUOTES: Quote[] = [
  // Inspiration
  {
    id: "insp-1",
    categoryId: "inspiration",
    text: "The only limit to our realization of tomorrow will be our doubts of today.",
    author: "Franklin D. Roosevelt",
    createdAt: 1719111000000,
  },
  {
    id: "insp-2",
    categoryId: "inspiration",
    text: "Act as if what you do makes a difference. It does.",
    author: "William James",
    createdAt: 1719111001000,
  },
  {
    id: "insp-3",
    categoryId: "inspiration",
    text: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
    createdAt: 1719111002000,
  },
  {
    id: "insp-4",
    categoryId: "inspiration",
    text: "What you get by achieving your goals is not as important as what you become by achieving your goals.",
    author: "Zig Ziglar",
    createdAt: 1719111003000,
  },

  // Mindfulness
  {
    id: "mind-1",
    categoryId: "mindfulness",
    text: "The present moment is filled with joy and happiness. If you are attentive, you will see it.",
    author: "Thich Nhat Hanh",
    createdAt: 1719111100000,
  },
  {
    id: "mind-2",
    categoryId: "mindfulness",
    text: "Be here now.",
    author: "Ram Dass",
    createdAt: 1719111101000,
  },
  {
    id: "mind-3",
    categoryId: "mindfulness",
    text: "Mindfulness isn't difficult, we just need to remember to do it.",
    author: "Sharon Salzberg",
    createdAt: 1719111102000,
  },
  {
    id: "mind-4",
    categoryId: "mindfulness",
    text: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.",
    author: "Buddha",
    createdAt: 1719111103000,
  },

  // Creativity
  {
    id: "creative-1",
    categoryId: "creativity",
    text: "Creativity is intelligence having fun.",
    author: "Albert Einstein",
    createdAt: 1719111200000,
  },
  {
    id: "creative-2",
    categoryId: "creativity",
    text: "You can't use up creativity. The more you use, the more you have.",
    author: "Maya Angelou",
    createdAt: 1719111201000,
  },
  {
    id: "creative-3",
    categoryId: "creativity",
    text: "The chief enemy of creativity is 'good' sense.",
    author: "Pablo Picasso",
    createdAt: 1719111202000,
  },

  // Wisdom
  {
    id: "wisdom-1",
    categoryId: "wisdom",
    text: "The only true wisdom is in knowing you know nothing.",
    author: "Socrates",
    createdAt: 1719111300000,
  },
  {
    id: "wisdom-2",
    categoryId: "wisdom",
    text: "Knowing yourself is the beginning of all wisdom.",
    author: "Aristotle",
    createdAt: 1719111301000,
  },
  {
    id: "wisdom-3",
    categoryId: "wisdom",
    text: "In the end, it's not the years in your life that count. It's the life in your years.",
    author: "Abraham Lincoln",
    createdAt: 1719111302000,
  },
];
