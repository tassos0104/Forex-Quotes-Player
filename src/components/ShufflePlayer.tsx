import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Quote, Category, QUOTE_FONTS, QuoteFont } from "../types";
import {
  Play,
  Pause,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Volume2,
  Sparkles,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  Keyboard,
  ThumbsUp,
  ThumbsDown,
  Palette,
  PictureInPicture2,
  Tv,
  Search,
  X,
  Trash2,
  Pencil,
  ArrowRight,
  Eraser,
  Bold,
  Italic,
  Type,
  Underline,
  Highlighter,
  AlertTriangle,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { renderFormattedText, stripFormatTags, isGreekText } from "../utils/textFormatter";

// Contrast check utility for custom hex backgrounds using YIQ formula
const getYIQ = (hexColor: string): number => {
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6 && hex.length !== 3) return 255;
  
  let r = 0, g = 0, b = 0;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  return ((r * 299) + (g * 587) + (b * 114)) / 1000;
};

const parseGradient = (gradientStr: string) => {
  const hexMatches = gradientStr.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g);
  let color1 = "#554023";
  let color2 = "#c99846";
  let color3: string | undefined = undefined;
  if (hexMatches) {
    if (hexMatches.length >= 3) {
      color1 = hexMatches[0];
      color2 = hexMatches[1];
      color3 = hexMatches[2];
    } else if (hexMatches.length >= 2) {
      color1 = hexMatches[0];
      color2 = hexMatches[1];
    } else if (hexMatches.length === 1) {
      color1 = hexMatches[0];
    }
  }

  let angleDeg = 135; // default
  const degMatch = gradientStr.match(/(-?\d+)deg/);
  if (degMatch) {
    angleDeg = parseInt(degMatch[1], 10);
  } else if (gradientStr.includes("to top right")) {
    angleDeg = 45;
  } else if (gradientStr.includes("to bottom right")) {
    angleDeg = 135;
  } else if (gradientStr.includes("to bottom left")) {
    angleDeg = 225;
  } else if (gradientStr.includes("to top left")) {
    angleDeg = 315;
  } else if (gradientStr.includes("to top")) {
    angleDeg = 0;
  } else if (gradientStr.includes("to right")) {
    angleDeg = 90;
  } else if (gradientStr.includes("to bottom")) {
    angleDeg = 180;
  } else if (gradientStr.includes("to left")) {
    angleDeg = 270;
  }

  return { color1, color2, color3, angleDeg };
};

const getGradientCoords = (angleDeg: number, w: number, h: number) => {
  const angleRad = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(angleRad);
  const dy = -Math.cos(angleRad);
  const halfL = Math.abs((w / 2) * dx) + Math.abs((h / 2) * dy);
  const x0 = w / 2 - halfL * dx;
  const y0 = h / 2 - halfL * dy;
  const x1 = w / 2 + halfL * dx;
  const y1 = h / 2 + halfL * dy;
  return { x0, y0, x1, y1 };
};

const getContrastColor = (bgColor: string): "light" | "dark" => {
  if (bgColor.startsWith("linear-gradient")) {
    const { color1, color2, color3 } = parseGradient(bgColor);
    const yiq1 = getYIQ(color1);
    const yiq2 = getYIQ(color2);
    if (color3) {
      const yiq3 = getYIQ(color3);
      const averageYiq = (yiq1 + yiq2 + yiq3) / 3;
      return averageYiq >= 135 ? "dark" : "light";
    } else {
      const averageYiq = (yiq1 + yiq2) / 2;
      return averageYiq >= 135 ? "dark" : "light";
    }
  }
  return getYIQ(bgColor) >= 135 ? "dark" : "light"; // slightly adjusted threshold for crisp contrast on pastels
};

// Safe wrapper utility functions for SpeechSynthesis to prevent DOM/Security errors in sandboxed iframes
const isSpeechSupported = (): boolean => {
  try {
    return typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis !== undefined;
  } catch (e) {
    return false;
  }
};

const safeCancelSpeech = () => {
  try {
    if (isSpeechSupported()) {
      window.speechSynthesis.cancel();
    }
  } catch (e) {
    console.warn("Speech synthesis cancel failed:", e);
  }
};

const safeSpeak = (utterance: SpeechSynthesisUtterance) => {
  try {
    if (isSpeechSupported()) {
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.warn("Speech synthesis speak failed:", e);
  }
};

interface ShufflePlayerProps {
  categories: Category[];
  quotes: Quote[];
  allQuotes: Quote[]; // all quotes regardless of active categories
  onRateQuote?: (id: string, rating: 'up' | 'down' | null) => void;
  onUpdateQuote?: (id: string, text: string, author: string, categoryId?: string, fontSize?: number) => void;
  onDeleteQuote?: (id: string) => void;
  shuffleFavoritesOnly: boolean;
  setShuffleFavoritesOnly: (val: boolean) => void;
  searchPlayList?: Quote[] | null;
  searchQuery?: string;
  onClearSearchPlay?: () => void;
  initialQuoteId?: string;
  onClearInitialQuoteId?: () => void;
  onExitZenMode?: () => void;
  selectedFontId?: string;
  selectedGreekFontId?: string;
  onSelectFontId?: (id: string) => void;
  onSelectGreekFontId?: (id: string) => void;
  onDeleteFont?: (id: string) => void;
  favoriteFontIds?: string[];
  onToggleFavoriteFont?: (id: string) => void;
  fonts?: QuoteFont[];
  zenTextWidth?: number;
}

export default function ShufflePlayer({
  categories,
  quotes,
  allQuotes,
  onRateQuote,
  onUpdateQuote,
  onDeleteQuote,
  shuffleFavoritesOnly,
  setShuffleFavoritesOnly,
  searchPlayList = null,
  searchQuery = "",
  onClearSearchPlay,
  initialQuoteId,
  onClearInitialQuoteId,
  onExitZenMode,
  selectedFontId,
  selectedGreekFontId,
  onSelectFontId,
  onSelectGreekFontId,
  onDeleteFont,
  favoriteFontIds = [],
  onToggleFavoriteFont,
  fonts = QUOTE_FONTS,
  zenTextWidth = 85,
}: ShufflePlayerProps) {
  // Filter quotes. If searchPlayList is active, we play those results.
  // If shuffleFavoritesOnly is active, we play ALL thumbs-up quotes in the system.
  // Otherwise, we filter by shufflable categories.
  const shufflePool = useMemo(() => {
    const shufflableCategories = categories.filter((c) => c.isShufflable);
    const shufflableCatIds = shufflableCategories.map((c) => c.id);
    let pool: Quote[] = [];
    if (searchPlayList) {
      pool = searchPlayList.filter((q) => q.isActive !== false);
    } else if (shuffleFavoritesOnly) {
      // Also filter thumbs-up quotes by selected categories so that favorites only play from selected categories
      const filtered = allQuotes.filter((q) => q.rating === "up" && shufflableCatIds.includes(q.categoryId) && q.isActive !== false);
      pool = [...filtered].sort((a, b) => b.createdAt - a.createdAt);
    } else {
      const filtered = allQuotes.filter((q) =>
        shufflableCatIds.includes(q.categoryId) && q.isActive !== false
      );
      // Sort shufflePool by createdAt descending so sequential (In Order) mode matches the Quote Catalog's visual layout
      pool = [...filtered].sort((a, b) => b.createdAt - a.createdAt);
    }

    // Ensure the initialQuoteId is included in the shufflePool if specified
    if (initialQuoteId) {
      const exists = pool.some((q) => q.id === initialQuoteId);
      if (!exists) {
        const targetQuote = allQuotes.find((q) => q.id === initialQuoteId);
        if (targetQuote) {
          pool = [targetQuote, ...pool];
        }
      }
    }
    return pool;
  }, [allQuotes, categories, shuffleFavoritesOnly, searchPlayList, initialQuoteId]);

  const shufflableCategories = categories.filter((c) => c.isShufflable);
  const selectedCategoriesCount = shufflableCategories.length;
  const isSequentialDisabled = selectedCategoriesCount < 1;

  const isAlternatingFoldersDisabled = selectedCategoriesCount < 2;

  // States
  const [categoryIndexMap, setCategoryIndexMap] = useState<Record<string, number>>({});
  const [alternatingFolders, setAlternatingFolders] = useState<boolean>(() => {
    try {
      const currentSelStr = categories
        .filter((c) => c.isShufflable)
        .map((c) => c.id)
        .sort()
        .join(",");
      const prevSelStr = localStorage.getItem("quote_shuffle_prev_selection");
      if (currentSelStr !== prevSelStr) {
        // It's a new selection! Default to true
        return true;
      } else {
        // It's the same selection! Remember the last option
        const remembered = localStorage.getItem("quote_shuffle_alternating_folders");
        return remembered !== null ? remembered === "true" : true;
      }
    } catch {
      return true;
    }
  });

  // Make sure we save the selection string in localStorage once the component mounts
  useEffect(() => {
    const currentSelStr = categories
      .filter((c) => c.isShufflable)
      .map((c) => c.id)
      .sort()
      .join(",");
    localStorage.setItem("quote_shuffle_prev_selection", currentSelStr);
  }, [categories]);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState<number>(-1);
  const [history, setHistory] = useState<number[]>([]); // array of indexes in the shufflePool
  const [historyPos, setHistoryPos] = useState<number>(-1); // current position in history array
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(30); // seconds
  const [timerTrigger, setTimerTrigger] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [errorSpeech, setErrorSpeech] = useState<string>("");

  // Refs for double-tap and click-delay in Zen mode
  const lastTapRef = useRef<number>(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Playback Order state
  const [playMode, setPlayMode] = useState<"shuffle" | "sequential">("shuffle");

  // Editing Quote states
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editText, setEditText] = useState<string>("");
  const [editAuthor, setEditAuthor] = useState<string>("");
  const [wasPlayingBeforeEdit, setWasPlayingBeforeEdit] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [wasPlayingBeforeDelete, setWasPlayingBeforeDelete] = useState<boolean>(false);
  const [overwriteTarget, setOverwriteTarget] = useState<{ index: number; newGrad: any } | null>(null);

  // Context Menu state for right-click text formatting in edit popup
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
    selectionStart: number;
    selectionEnd: number;
    targetId: string;
  } | null>(null);

  // Zen Mode states
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [zenTheme, setZenTheme] = useState<"dark" | "warm">("dark");
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [showFontPicker, setShowFontPicker] = useState<boolean>(false);
  const [randomizeFontMode, setRandomizeFontMode] = useState<'none' | 'all' | 'favorites'>(() => {
    try {
      return (localStorage.getItem("quote_shuffle_randomize_font_mode") as any) || "none";
    } catch (e) {
      return "none";
    }
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [zenBgColor, setZenBgColor] = useState<string>(() => {
    try {
      return localStorage.getItem("quote_shuffle_zen_bg_color") || "#ffffff";
    } catch (e) {
      return "#ffffff";
    }
  });

  const [zenContextMenu, setZenContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);

  // Helper to determine quote font size in px
  const getQuoteFontSize = useCallback((quote: Quote, isZen: boolean) => {
    if (quote.fontSize) {
      return isZen ? quote.fontSize : Math.max(14, Math.round(quote.fontSize * 0.65));
    }
    
    const textLength = quote.text.length;
    if (isZen) {
      // Base size is larger if the container width preference is larger (less restricted)
      const baseSize = zenTextWidth >= 80 ? 58 : 52;
      if (textLength <= 150) {
        return baseSize;
      }
      // A gentler scaling exponent of 0.32 instead of 0.4 ensures longer texts aren't aggressively shrunk
      return Math.max(18, Math.min(baseSize, Math.round(baseSize * Math.pow(180 / textLength, 0.32))));
    } else {
      const baseSize = 32;
      if (textLength <= 150) {
        return baseSize;
      }
      return Math.max(14, Math.min(baseSize, Math.round(baseSize * Math.pow(150 / textLength, 0.4))));
    }
  }, [zenTextWidth]);

  // Close Zen context menu on click anywhere
  useEffect(() => {
    const handleGlobalClick = () => {
      if (zenContextMenu?.visible) {
        setZenContextMenu(null);
      }
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [zenContextMenu]);

  // Close Zen context menu on quote index change
  useEffect(() => {
    setZenContextMenu(null);
  }, [currentQuoteIndex]);

  // Custom Gradient states
  const [activeColorTab, setActiveColorTab] = useState<"solid" | "gradient">(() => {
    try {
      const stored = localStorage.getItem("quote_shuffle_zen_bg_color");
      if (stored && stored.startsWith("linear-gradient")) {
        return "gradient";
      }
    } catch (e) {}
    return "solid";
  });
  const [gradientColor1, setGradientColor1] = useState<string>(() => {
    try {
      const storedColor = localStorage.getItem("quote_shuffle_zen_bg_color");
      if (storedColor && storedColor.startsWith("linear-gradient")) {
        const { color1 } = parseGradient(storedColor);
        return color1;
      }
    } catch (e) {}
    return "#554023";
  });
  const [gradientColor2, setGradientColor2] = useState<string>(() => {
    try {
      const storedColor = localStorage.getItem("quote_shuffle_zen_bg_color");
      if (storedColor && storedColor.startsWith("linear-gradient")) {
        const { color2 } = parseGradient(storedColor);
        return color2;
      }
    } catch (e) {}
    return "#c99846";
  });
  const [gradientColor3, setGradientColor3] = useState<string>(() => {
    try {
      const storedColor = localStorage.getItem("quote_shuffle_zen_bg_color");
      if (storedColor && storedColor.startsWith("linear-gradient")) {
        const { color3 } = parseGradient(storedColor);
        return color3 || "#854d0e";
      }
    } catch (e) {}
    return "#854d0e";
  });
  const [useColor3, setUseColor3] = useState<boolean>(() => {
    try {
      const storedColor = localStorage.getItem("quote_shuffle_zen_bg_color");
      if (storedColor && storedColor.startsWith("linear-gradient")) {
        const { color3 } = parseGradient(storedColor);
        return !!color3;
      }
    } catch (e) {}
    return false;
  });
  const [newGradientName, setNewGradientName] = useState<string>(() => {
    try {
      const storedColor = localStorage.getItem("quote_shuffle_zen_bg_color");
      if (storedColor && storedColor.startsWith("linear-gradient")) {
        const storedGradientsStr = localStorage.getItem("quote_shuffle_saved_gradients");
        let list = storedGradientsStr ? JSON.parse(storedGradientsStr) : [
          { name: "Olive Gold", color1: "#554023", color2: "#c99846", angle: 135 },
          { name: "Twilight Aura", color1: "#1e1b4b", color2: "#4c1d95", angle: 135 },
          { name: "Deep Forest", color1: "#064e3b", color2: "#15803d", angle: 135 },
          { name: "Cosmic Nebula", color1: "#311042", color2: "#831843", angle: 135 },
          { name: "Sunset Horizon", color1: "#fdba74", color2: "#f97316", color3: "#b91c1c", angle: 135 },
          { name: "Cotton Candy", color1: "#fbcfe8", color2: "#f5d0fe", color3: "#e0f2fe", angle: 135 },
          { name: "Ocean Breeze", color1: "#1e3a8a", color2: "#0d9488", angle: 135 }
        ];
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        const matched = list.find((grad: any) => {
          const angle = grad.angle !== undefined ? grad.angle : 135;
          const gradStr = grad.color3
            ? `linear-gradient(${angle}deg, ${grad.color1}, ${grad.color2}, ${grad.color3})`
            : `linear-gradient(${angle}deg, ${grad.color1}, ${grad.color2})`;
          return storedColor.toLowerCase() === gradStr.toLowerCase();
        });
        if (matched) return matched.name;
      }
    } catch (e) {}
    return "";
  });
  const color1InputRef = useRef<HTMLInputElement>(null);
  const [savedGradients, setSavedGradients] = useState<{name: string; color1: string; color2: string; color3?: string; angle?: number; textColor?: "black" | "white";}[]>(() => {
    let list = [
      { name: "Olive Gold", color1: "#554023", color2: "#c99846", angle: 135, textColor: "white" as const },
      { name: "Twilight Aura", color1: "#1e1b4b", color2: "#4c1d95", angle: 135, textColor: "white" as const },
      { name: "Deep Forest", color1: "#064e3b", color2: "#15803d", angle: 135, textColor: "white" as const },
      { name: "Cosmic Nebula", color1: "#311042", color2: "#831843", angle: 135, textColor: "white" as const },
      { name: "Sunset Horizon", color1: "#fdba74", color2: "#f97316", color3: "#b91c1c", angle: 135, textColor: "white" as const },
      { name: "Cotton Candy", color1: "#fbcfe8", color2: "#f5d0fe", color3: "#e0f2fe", angle: 135, textColor: "black" as const },
      { name: "Ocean Breeze", color1: "#1e3a8a", color2: "#0d9488", angle: 135, textColor: "white" as const }
    ];
    try {
      const stored = localStorage.getItem("quote_shuffle_saved_gradients");
      if (stored) {
        list = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load saved gradients from localStorage:", e);
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  });

  const [customGradientTextColor, setCustomGradientTextColor] = useState<"black" | "white" | undefined>(() => {
    try {
      const storedColor = localStorage.getItem("quote_shuffle_zen_bg_color");
      if (storedColor && storedColor.startsWith("linear-gradient")) {
        const storedGradientsStr = localStorage.getItem("quote_shuffle_saved_gradients");
        const list = storedGradientsStr ? JSON.parse(storedGradientsStr) : [];
        const matched = list.find((grad: any) => {
          const angle = grad.angle !== undefined ? grad.angle : 135;
          const gradStr = grad.color3
            ? `linear-gradient(${angle}deg, ${grad.color1}, ${grad.color2}, ${grad.color3})`
            : `linear-gradient(${angle}deg, ${grad.color1}, ${grad.color2})`;
          return storedColor.toLowerCase() === gradStr.toLowerCase();
        });
        if (matched) return matched.textColor;
      }
    } catch (e) {}
    return undefined;
  });

  const handleUpdateTextColorPreference = (textColor: "black" | "white" | undefined) => {
    setCustomGradientTextColor(textColor);
    if (selectedGradIndex !== null && selectedGradIndex < savedGradients.length) {
      const updated = [...savedGradients];
      if (textColor) {
        updated[selectedGradIndex] = {
          ...updated[selectedGradIndex],
          textColor
        };
      } else {
        const copy = { ...updated[selectedGradIndex] };
        delete copy.textColor;
        updated[selectedGradIndex] = copy;
      }
      setSavedGradients(updated);
      try {
        localStorage.setItem("quote_shuffle_saved_gradients", JSON.stringify(updated));
      } catch (err) {
        console.warn("Failed to save text color preference:", err);
      }
    }
  };

  const saveGradient = (newGrad: { name: string; color1: string; color2: string; color3?: string; angle: number; textColor?: "black" | "white" }, overwriteIndex?: number) => {
    let updated = [...savedGradients];
    if (overwriteIndex !== undefined && overwriteIndex !== -1) {
      updated[overwriteIndex] = newGrad;
    } else {
      updated.push(newGrad);
    }

    // Sort alphabetically by name
    updated.sort((a, b) => a.name.localeCompare(b.name));

    setSavedGradients(updated);
    try {
      localStorage.setItem("quote_shuffle_saved_gradients", JSON.stringify(updated));
    } catch (err) {
      console.warn("Failed to save gradients to localStorage:", err);
    }

    const gradStr = newGrad.color3
      ? `linear-gradient(${newGrad.angle}deg, ${newGrad.color1}, ${newGrad.color2}, ${newGrad.color3})`
      : `linear-gradient(${newGrad.angle}deg, ${newGrad.color1}, ${newGrad.color2})`;
    setZenBgColor(gradStr);

    // Find the new index of the saved gradient in the sorted array
    const newIdx = updated.findIndex((g) => g.name.toLowerCase() === newGrad.name.toLowerCase());
    setSelectedGradIndex(newIdx);

    setIsRandomColorsMode(false);
    setIsRandomGradientsMode(false);
    setNewGradientName("");

    setTimeout(() => {
      if (color1InputRef.current) {
        color1InputRef.current.focus();
        color1InputRef.current.select();
      }
    }, 50);
  };

  useEffect(() => {
    if (!overwriteTarget) return;

    const handleModalKeys = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveGradient(overwriteTarget.newGrad, overwriteTarget.index);
        setOverwriteTarget(null);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOverwriteTarget(null);
      }
    };

    window.addEventListener("keydown", handleModalKeys);
    return () => {
      window.removeEventListener("keydown", handleModalKeys);
    };
  }, [overwriteTarget, saveGradient]);

  const [recentColors, setRecentColors] = useState<string[]>(["#ffffff", "#0c0a09", "#fafaf9", "#111827", "#1e1b4b", "#064e3b"]);
  const [hexInput, setHexInput] = useState<string>(() => {
    try {
      const stored = localStorage.getItem("quote_shuffle_zen_bg_color") || "#ffffff";
      return stored.startsWith("linear-gradient") ? "#ffffff" : stored;
    } catch (e) {
      return "#ffffff";
    }
  });
  const [isRandomColorsMode, setIsRandomColorsMode] = useState<boolean>(false);
  const [isRandomGradientsMode, setIsRandomGradientsMode] = useState<boolean>(false);
  const [selectedGradIndex, setSelectedGradIndex] = useState<number | null>(() => {
    try {
      const storedColor = localStorage.getItem("quote_shuffle_zen_bg_color");
      if (storedColor && storedColor.startsWith("linear-gradient")) {
        const storedGradientsStr = localStorage.getItem("quote_shuffle_saved_gradients");
        const list = storedGradientsStr ? JSON.parse(storedGradientsStr) : [
          { name: "Olive Gold", color1: "#554023", color2: "#c99846", angle: 135 },
          { name: "Twilight Aura", color1: "#1e1b4b", color2: "#4c1d95", angle: 135 },
          { name: "Deep Forest", color1: "#064e3b", color2: "#15803d", angle: 135 },
          { name: "Cosmic Nebula", color1: "#311042", color2: "#831843", angle: 135 },
          { name: "Sunset Horizon", color1: "#fdba74", color2: "#f97316", color3: "#b91c1c", angle: 135 },
          { name: "Cotton Candy", color1: "#fbcfe8", color2: "#f5d0fe", color3: "#e0f2fe", angle: 135 },
          { name: "Ocean Breeze", color1: "#1e3a8a", color2: "#0d9488", angle: 135 }
        ];
        const idx = list.findIndex((grad: any) => {
          const angle = grad.angle !== undefined ? grad.angle : 135;
          const gradStr = grad.color3
            ? `linear-gradient(${angle}deg, ${grad.color1}, ${grad.color2}, ${grad.color3})`
            : `linear-gradient(${angle}deg, ${grad.color1}, ${grad.color2})`;
          return storedColor.toLowerCase() === gradStr.toLowerCase();
        });
        return idx !== -1 ? idx : null;
      }
    } catch (e) {}
    return null;
  });
  const [customGradientAngle, setCustomGradientAngle] = useState<number>(() => {
    try {
      const storedColor = localStorage.getItem("quote_shuffle_zen_bg_color");
      if (storedColor && storedColor.startsWith("linear-gradient")) {
        const { angleDeg } = parseGradient(storedColor);
        return angleDeg;
      }
    } catch (e) {}
    return 135;
  });
  const [isControlsVisible, setIsControlsVisible] = useState<boolean>(true);

  const getRandomAestheticColor = () => {
    // Helper to convert HSL values to a valid Hex string
    const hslToHex = (h: number, s: number, l: number): string => {
      const lightnessVal = l / 100;
      const saturationVal = s / 100;
      const a = saturationVal * Math.min(lightnessVal, 1 - lightnessVal);
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = lightnessVal - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, "0");
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };

    // 1. Pick a random hue from the full 360-degree color wheel to guarantee variety
    const hue = Math.floor(Math.random() * 360);
    
    // 2. Choose a robust, beautiful saturation value for vivid but elegant tones
    const saturation = Math.floor(Math.random() * 21) + 65; // 65% to 85%
    
    // 3. Alternate between Light Pastel/Cream backgrounds and Deep Jewel backgrounds
    const isLight = Math.random() > 0.5;
    const lightness = isLight 
      ? Math.floor(Math.random() * 13) + 75 // 75% to 87% (light pastel)
      : Math.floor(Math.random() * 11) + 12; // 12% to 22% (deep atmospheric)

    return hslToHex(hue, saturation, lightness);
  };

  const handleExitZenMode = useCallback(() => {
    setIsZenMode(false);
    setIsRandomColorsMode(false);
    if (onClearInitialQuoteId) {
      onClearInitialQuoteId();
    }
    if (onExitZenMode) {
      onExitZenMode();
    }
  }, [onClearInitialQuoteId, onExitZenMode]);

  // Save Zen Mode background color changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("quote_shuffle_zen_bg_color", zenBgColor);
    } catch (e) {
      console.warn("Failed to persist zenBgColor to localStorage:", e);
    }
  }, [zenBgColor]);

  // Close context menu on click anywhere
  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu?.visible) {
        setContextMenu(null);
      }
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [contextMenu]);

  // Clean up clickTimeoutRef on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // A ref to keep track of isControlsVisible inside event listeners without rebuilding them
  const isControlsVisibleRef = useRef(isControlsVisible);
  useEffect(() => {
    isControlsVisibleRef.current = isControlsVisible;
  }, [isControlsVisible]);

  // Auto-hide Zen controls and mouse cursor after 3 seconds of idle time
  useEffect(() => {
    if (!isZenMode) {
      setIsControlsVisible(true);
      return;
    }

    let timeoutId: any;
    
    // baselineX/Y tracks the starting position of a potential gesture to SHOW controls when they are hidden.
    // It gets reset when controls are shown, or when they are hidden.
    let baselineX = -1;
    let baselineY = -1;

    // lastActiveX/Y tracks the last coordinate where the controls were shown or where an activity timeout reset occurred.
    // We only reset the idle timeout if the mouse has moved by >= 15px from this position.
    let lastActiveX = -1;
    let lastActiveY = -1;

    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!showColorPicker && !showShortcuts && !showFontPicker) {
          setIsControlsVisible(false);
          // When hiding, reset all baselines and coordinates so the next movement is fresh
          baselineX = -1;
          baselineY = -1;
          lastActiveX = -1;
          lastActiveY = -1;
        }
      }, 3000);
    };

    const handleActivity = (e?: Event) => {
      const isVisible = isControlsVisibleRef.current;

      if (e && e.type === "mousemove") {
        const mouseEvent = e as MouseEvent;
        const currentX = mouseEvent.clientX;
        const currentY = mouseEvent.clientY;

        if (!isVisible) {
          // Controls are NOT visible. We require 100px move from baseline to show them.
          if (baselineX === -1 || baselineY === -1) {
            baselineX = currentX;
            baselineY = currentY;
            return;
          }

          const dx = currentX - baselineX;
          const dy = currentY - baselineY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance >= 100) {
            setIsControlsVisible(true);
            baselineX = currentX;
            baselineY = currentY;
            lastActiveX = currentX;
            lastActiveY = currentY;
            resetTimeout();
          }
        } else {
          // Controls ARE visible. We require 15px movement from last active coordinate to reset the 3-second timeout.
          // This prevents tiny mouse sensor jitter or mouse click micro-movements from keeping controls visible forever.
          if (lastActiveX === -1 || lastActiveY === -1) {
            lastActiveX = currentX;
            lastActiveY = currentY;
            return;
          }

          const dx = currentX - lastActiveX;
          const dy = currentY - lastActiveY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance >= 15) {
            lastActiveX = currentX;
            lastActiveY = currentY;
            // Also update baseline so we have a fresh starting position if it hides later
            baselineX = currentX;
            baselineY = currentY;
            resetTimeout();
          }
        }
      } else if (e && e.type === "touchstart") {
        const touchEvent = e as TouchEvent;
        if (touchEvent.touches && touchEvent.touches.length > 0) {
          const currentX = touchEvent.touches[0].clientX;
          const currentY = touchEvent.touches[0].clientY;
          
          if (!isVisible) {
            // Touch down doesn't show controls immediately unless they move (handled in touchmove)
            // But we set baselines so we can measure movement
            baselineX = currentX;
            baselineY = currentY;
          } else {
            // Touch down can reset timeout if already visible, or we can wait for significant move.
            // Let's reset the timeout on any direct touch start to be responsive.
            lastActiveX = currentX;
            lastActiveY = currentY;
            resetTimeout();
          }
        }
      } else {
        // e is undefined, meaning this was an initial/on-mount call.
        // On initial mount or when states change, show controls and set a timeout.
        if (isVisible) {
          resetTimeout();
        }
      }
    };

    // Initialize/show on mount or when states change
    handleActivity();

    const listener = handleActivity as EventListener;

    window.addEventListener("mousemove", listener);
    window.addEventListener("touchstart", listener);

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        const currentX = touch.clientX;
        const currentY = touch.clientY;
        const isVisible = isControlsVisibleRef.current;

        if (!isVisible) {
          if (baselineX !== -1 && baselineY !== -1) {
            const dx = currentX - baselineX;
            const dy = currentY - baselineY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance >= 30) { // smaller threshold of 30px for touch swipe on mobile
              setIsControlsVisible(true);
              baselineX = currentX;
              baselineY = currentY;
              lastActiveX = currentX;
              lastActiveY = currentY;
              resetTimeout();
            }
          } else {
            baselineX = currentX;
            baselineY = currentY;
          }
        } else {
          if (lastActiveX !== -1 && lastActiveY !== -1) {
            const dx = currentX - lastActiveX;
            const dy = currentY - lastActiveY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance >= 15) {
              lastActiveX = currentX;
              lastActiveY = currentY;
              resetTimeout();
            }
          } else {
            lastActiveX = currentX;
            lastActiveY = currentY;
          }
        }
      }
    };

    window.addEventListener("touchmove", handleTouchMove as EventListener);

    return () => {
      window.removeEventListener("mousemove", listener);
      window.removeEventListener("touchstart", listener);
      window.removeEventListener("touchmove", handleTouchMove as EventListener);
      clearTimeout(timeoutId);
    };
  }, [isZenMode, showColorPicker, showShortcuts, showFontPicker]);

  const handleContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end) {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        visible: true,
        selectionStart: start,
        selectionEnd: end,
        targetId: textarea.id,
      });
    }
  };

  const applyFormat = (type: 'capitalize' | 'underline' | 'highlight' | 'bold' | 'italic' | 'remove') => {
    if (!contextMenu) return;
    const { selectionStart: start, selectionEnd: end, targetId } = contextMenu;
    
    if (targetId !== "player-edit-textarea") return;

    const selectedText = editText.slice(start, end);
    let formatted = "";

    if (type === 'remove') {
      formatted = stripFormatTags(selectedText);
    } else if (type === 'underline') {
      formatted = `<u>${selectedText}</u>`;
    } else if (type === 'highlight') {
      formatted = `<mark>${selectedText}</mark>`;
    } else if (type === 'bold') {
      formatted = `<b>${selectedText}</b>`;
    } else if (type === 'italic') {
      formatted = `<i>${selectedText}</i>`;
    } else if (type === 'capitalize') {
      formatted = `<span class="uppercase">${selectedText}</span>`;
    }

    const newVal = editText.slice(0, start) + formatted + editText.slice(end);
    setEditText(newVal);
    setContextMenu(null);

    // Restore focus and select
    setTimeout(() => {
      const el = document.getElementById(targetId) as HTMLTextAreaElement;
      if (el) {
        el.focus();
        el.setSelectionRange(start, start + formatted.length);
      }
    }, 50);
  };

  const activeQuote = currentQuoteIndex !== -1 ? shufflePool[currentQuoteIndex] : null;
  const currentCategory = activeQuote
    ? categories.find((c) => c.id === activeQuote.categoryId)
    : null;
  // Find if current zenBgColor matches any of our saved gradients
  const matchedGradient = useMemo(() => {
    if (!zenBgColor.startsWith("linear-gradient")) return null;
    return savedGradients.find((grad) => {
      const angle = grad.angle !== undefined ? grad.angle : 135;
      const gradStr = grad.color3
        ? `linear-gradient(${angle}deg, ${grad.color1}, ${grad.color2}, ${grad.color3})`
        : `linear-gradient(${angle}deg, ${grad.color1}, ${grad.color2})`;
      return zenBgColor.toLowerCase() === gradStr.toLowerCase();
    });
  }, [zenBgColor, savedGradients]);

  const isDarkText = useMemo(() => {
    if (matchedGradient && matchedGradient.textColor) {
      return matchedGradient.textColor === "black";
    }
    if (customGradientTextColor) {
      return customGradientTextColor === "black";
    }
    return getContrastColor(zenBgColor) === "dark";
  }, [matchedGradient, customGradientTextColor, zenBgColor]);

  const handleSelectColor = (color: string) => {
    let validColor = color;
    if (!validColor.startsWith("#")) {
      validColor = "#" + validColor;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(validColor)) {
      if (/^#[0-9A-Fa-f]{3}$/.test(validColor)) {
        validColor = "#" + validColor[1] + validColor[1] + validColor[2] + validColor[2] + validColor[3] + validColor[3];
      } else {
        return;
      }
    }
    
    setZenBgColor(validColor);
    setHexInput(validColor);
    setIsRandomColorsMode(false);
  };

  const handleSaveToRecent = (color: string) => {
    let validColor = color;
    if (!validColor.startsWith("#")) {
      validColor = "#" + validColor;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(validColor)) {
      if (/^#[0-9A-Fa-f]{3}$/.test(validColor)) {
        validColor = "#" + validColor[1] + validColor[1] + validColor[2] + validColor[2] + validColor[3] + validColor[3];
      } else {
        return;
      }
    }

    setZenBgColor(validColor);
    setHexInput(validColor);
    setIsRandomColorsMode(false);

    // Save/add to recent list
    setRecentColors((prev) => {
      const filtered = prev.filter((c) => c.toLowerCase() !== validColor.toLowerCase());
      const updated = [validColor, ...filtered];
      return updated.slice(0, 5);
    });

    // Close the background color customizer window
    setShowColorPicker(false);
  };

  // Picture-in-Picture logic
  const activeFont = useMemo(() => {
    let fid = selectedFontId;
    if (!fid) {
       try {
         fid = localStorage.getItem("quote_shuffle_font_id") || "playfair-display";
       } catch (e) {
         fid = "playfair-display";
       }
    }
    return fonts.find((f) => f.id === fid) || fonts[0] || QUOTE_FONTS[0];
  }, [selectedFontId, fonts]);

  const activeGreekFont = useMemo(() => {
    let fid = selectedGreekFontId;
    if (!fid) {
       try {
         fid = localStorage.getItem("quote_shuffle_greek_font_id") || "playfair-display";
       } catch (e) {
         fid = "playfair-display";
       }
    }
    return fonts.find((f) => f.id === fid) || fonts[0] || QUOTE_FONTS[0];
  }, [selectedGreekFontId, fonts]);

  const activeQuoteFontCSS = useMemo(() => {
    if (!activeQuote) return '"Playfair Display", Georgia, serif';
    const isGreek = isGreekText(activeQuote.text);
    return isGreek ? activeGreekFont.cssValue : activeFont.cssValue;
  }, [activeQuote, activeFont, activeGreekFont]);

  const handleSetRandomizeFontMode = (mode: 'none' | 'all' | 'favorites') => {
    setRandomizeFontMode(mode);
    try {
      localStorage.setItem("quote_shuffle_randomize_font_mode", mode);
    } catch (e) {
      console.warn("Could not save randomize font mode", e);
    }
  };

  const handleNextFont = useCallback(() => {
    if (!activeQuote) return;
    const isGreek = isGreekText(activeQuote.text);
    const currentFontId = isGreek ? selectedGreekFontId : selectedFontId;

    // Filter fonts of the same language
    const pool = fonts.filter((f) => isGreek ? f.supportsGreek : true);
    if (pool.length === 0) return;

    const currentIndex = pool.findIndex((f) => f.id === currentFontId);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % pool.length;
    const nextFont = pool[nextIndex];

    if (isGreek) {
      onSelectGreekFontId?.(nextFont.id);
    } else {
      onSelectFontId?.(nextFont.id);
    }
  }, [activeQuote, fonts, selectedFontId, selectedGreekFontId, onSelectFontId, onSelectGreekFontId]);

  const handlePrevFont = useCallback(() => {
    if (!activeQuote) return;
    const isGreek = isGreekText(activeQuote.text);
    const currentFontId = isGreek ? selectedGreekFontId : selectedFontId;

    // Filter fonts of the same language
    const pool = fonts.filter((f) => isGreek ? f.supportsGreek : true);
    if (pool.length === 0) return;

    const currentIndex = pool.findIndex((f) => f.id === currentFontId);
    const prevIndex = currentIndex === -1 ? pool.length - 1 : (currentIndex - 1 + pool.length) % pool.length;
    const prevFont = pool[prevIndex];

    if (isGreek) {
      onSelectGreekFontId?.(prevFont.id);
    } else {
      onSelectFontId?.(prevFont.id);
    }
  }, [activeQuote, fonts, selectedFontId, selectedGreekFontId, onSelectFontId, onSelectGreekFontId]);

  // Reset delete confirm state when active font changes
  useEffect(() => {
    setShowDeleteConfirm(false);
  }, [selectedFontId, selectedGreekFontId]);

  // Quote-change auto font-randomization effect
  useEffect(() => {
    if (!activeQuote || randomizeFontMode === "none") return;

    const isGreek = isGreekText(activeQuote.text);
    // filter fonts based on language
    let pool = fonts.filter((f) => isGreek ? f.supportsGreek : true);

    if (randomizeFontMode === "favorites") {
      pool = pool.filter((f) => favoriteFontIds.includes(f.id));
      // Fallback if no favorites exist for this language:
      if (pool.length === 0) {
        pool = fonts.filter((f) => isGreek ? f.supportsGreek : true);
      }
    }

    if (pool.length > 0) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      const randomFont = pool[randomIndex];
      if (isGreek) {
        if (onSelectGreekFontId && selectedGreekFontId !== randomFont.id) {
          onSelectGreekFontId(randomFont.id);
        }
      } else {
        if (onSelectFontId && selectedFontId !== randomFont.id) {
          onSelectFontId(randomFont.id);
        }
      }
    }
  }, [
    activeQuote?.id,
    randomizeFontMode,
    favoriteFontIds,
    fonts,
    onSelectFontId,
    onSelectGreekFontId,
  ]);

  const renderFontPickerContent = (isDarkBg: boolean) => {
    if (!activeQuote) return null;

    const isGreek = isGreekText(activeQuote.text);
    const activeLanguageLabel = isGreek ? "Greek" : "Latin/EN";
    const currentFont = isGreek ? activeGreekFont : activeFont;
    const isCurrentFav = favoriteFontIds.includes(currentFont.id);

    // Language fonts pool
    const langFonts = fonts.filter((f) => isGreek ? f.supportsGreek : true);
    const favLangFonts = langFonts.filter((f) => favoriteFontIds.includes(f.id));

    return (
      <div className="flex flex-col gap-3.5 text-left">
        <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: isDarkBg ? "#292524" : "#f1f0ee" }}>
          <div className="flex items-center gap-1.5">
            <Type className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-xs uppercase tracking-wider">
              Font Settings
            </span>
          </div>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
            isDarkBg
              ? "bg-amber-950/40 text-amber-400 border-amber-850/40"
              : "bg-amber-50 text-stone-700 border-amber-200/50"
          }`}>
            {activeLanguageLabel}
          </span>
        </div>

        {/* 1. Cycle Fonts Manual Controls */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Preview & Cycle Fonts
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevFont}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isDarkBg
                  ? "border-stone-800 hover:bg-stone-850 text-stone-300"
                  : "border-stone-200 hover:bg-stone-100 text-stone-700"
              }`}
              title="Previous Font"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              className={`flex-1 text-center py-1.5 px-2 rounded-lg border text-xs font-semibold truncate ${
                isDarkBg
                  ? "bg-stone-950/40 border-stone-800 text-stone-200"
                  : "bg-stone-50 border-stone-200 text-stone-800"
              }`}
            >
              {currentFont.name}
            </div>

            <button
              type="button"
              onClick={handleNextFont}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isDarkBg
                  ? "border-stone-800 hover:bg-stone-850 text-stone-300"
                  : "border-stone-200 hover:bg-stone-100 text-stone-700"
              }`}
              title="Next Font"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Favorite & Delete controls for the current font */}
        <div className="flex items-center justify-between gap-2">
          {/* Favorite Toggle button */}
          <button
            type="button"
            onClick={() => onToggleFavoriteFont?.(currentFont.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
              isCurrentFav
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500 font-extrabold"
                : isDarkBg
                  ? "border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-850"
                  : "border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-50"
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isCurrentFav ? "fill-amber-550 text-amber-500" : ""}`} />
            <span>{isCurrentFav ? "Favorited" : "Favorite"}</span>
          </button>

          {/* Delete Option */}
          {onDeleteFont && (
            <div className="relative flex-1">
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    isDarkBg
                      ? "border-stone-800 text-stone-400 hover:text-red-400 hover:bg-stone-850"
                      : "border-stone-200 text-stone-500 hover:text-red-600 hover:bg-stone-50"
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Font</span>
                </button>
              ) : (
                <div className="flex items-center border border-red-500/30 rounded-xl overflow-hidden text-[10px] font-bold h-[30px] w-full">
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteFont(currentFont.id);
                      setShowDeleteConfirm(false);
                    }}
                    className="flex-1 bg-red-600 text-white h-full hover:bg-red-700 cursor-pointer text-center"
                  >
                    Delete?
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className={`w-10 h-full cursor-pointer text-center ${
                      isDarkBg ? "bg-stone-800 text-stone-300 hover:bg-stone-750" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Randomize Font Option */}
        <div className="flex flex-col gap-1.5 pt-2 border-t" style={{ borderColor: isDarkBg ? "#292524" : "#f1f0ee" }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Randomize on Next Quote
            </span>
          </div>
          <div className="flex bg-stone-100 dark:bg-stone-950 p-0.5 rounded-xl border border-stone-200 dark:border-stone-900 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => handleSetRandomizeFontMode("none")}
              className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                randomizeFontMode === "none"
                  ? "bg-amber-500 text-white shadow-xs font-black"
                  : isDarkBg
                    ? "text-stone-400 hover:text-stone-200"
                    : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Off
            </button>
            <button
              type="button"
              onClick={() => handleSetRandomizeFontMode("favorites")}
              className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                randomizeFontMode === "favorites"
                  ? "bg-amber-500 text-white shadow-xs font-black"
                  : isDarkBg
                    ? "text-stone-400 hover:text-stone-200"
                    : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Favorites
            </button>
            <button
              type="button"
              onClick={() => handleSetRandomizeFontMode("all")}
              className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                randomizeFontMode === "all"
                  ? "bg-amber-500 text-white shadow-xs font-black"
                  : isDarkBg
                    ? "text-stone-400 hover:text-stone-200"
                    : "text-stone-500 hover:text-stone-800"
              }`}
            >
              All Fonts
            </button>
          </div>

          {/* Fallback warning / stats */}
          {randomizeFontMode === "favorites" && favLangFonts.length === 0 && (
            <p className="text-[9px] text-amber-600 dark:text-amber-400 leading-normal italic font-medium">
              No favorited {activeLanguageLabel} fonts yet. Falling back to all fonts.
            </p>
          )}
          {randomizeFontMode === "favorites" && favLangFonts.length > 0 && (
            <p className="text-[9px] text-stone-400 dark:text-stone-500 leading-none">
              Randomizing from {favLangFonts.length} favorite {activeLanguageLabel} font(s).
            </p>
          )}
          {randomizeFontMode === "all" && (
            <p className="text-[9px] text-stone-400 dark:text-stone-500 leading-none">
              Randomizing from {langFonts.length} {activeLanguageLabel} font(s).
            </p>
          )}
        </div>
      </div>
    );
  };

  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPipActive, setIsPipActive] = useState<boolean>(false);
  const [pipError, setPipError] = useState<string>("");

  const updatePipCanvas = useCallback(() => {
    if (!activeQuote) return;
    const canvas = pipCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Fill background with current background color
    if (zenBgColor.startsWith("linear-gradient")) {
      const { color1, color2, color3, angleDeg } = parseGradient(zenBgColor);
      const coords = getGradientCoords(angleDeg, width, height);
      const grad = ctx.createLinearGradient(coords.x0, coords.y0, coords.x1, coords.y1);
      if (color3) {
        grad.addColorStop(0, color1);
        grad.addColorStop(0.5, color2);
        grad.addColorStop(1, color3);
      } else {
        grad.addColorStop(0, color1);
        grad.addColorStop(1, color2);
      }
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = zenBgColor;
    }
    ctx.fillRect(0, 0, width, height);

    // Draw giant faint quotes watermark
    ctx.fillStyle = isDarkText ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)";
    ctx.font = "bold 280px Georgia, serif";
    ctx.fillText("“", 40, 240);

    // Text setup
    const defaultColor = isDarkText ? "#1c1917" : "#fafaf9"; // stone-900 or stone-50
    const rawText = `"${activeQuote.text}"`;

    // Parse text formatting tags: <u>, <mark>, <b>, <i>, <span class="uppercase">, <span class="capitalize">
    const tagRegex = /(<u>|<\/u>|<mark>|<\/mark>|<b>|<\/b>|<i>|<\/i>|<span class="uppercase">|<span class="capitalize">|<\/span>)/g;
    const parts = rawText.split(tagRegex);

    let isUnderline = false;
    let isHighlight = false;
    let isBold = false;
    let isItalic = false;
    let isUppercase = false;
    let isCapitalize = false;

    interface StyledSegment {
      text: string;
      isUnderline: boolean;
      isHighlight: boolean;
      isBold: boolean;
      isItalic: boolean;
      isUppercase: boolean;
      isCapitalize: boolean;
    }

    const segments: StyledSegment[] = [];

    for (const part of parts) {
      if (part === "<u>") {
        isUnderline = true;
      } else if (part === "</u>") {
        isUnderline = false;
      } else if (part === "<mark>") {
        isHighlight = true;
      } else if (part === "</mark>") {
        isHighlight = false;
      } else if (part === "<b>") {
        isBold = true;
      } else if (part === "</b>") {
        isBold = false;
      } else if (part === "<i>") {
        isItalic = true;
      } else if (part === "</i>") {
        isItalic = false;
      } else if (part === '<span class="uppercase">') {
        isUppercase = true;
      } else if (part === '<span class="capitalize">') {
        isCapitalize = true;
      } else if (part === "</span>") {
        isUppercase = false;
        isCapitalize = false;
      } else if (part) {
        let textToUse = part;
        if (isUppercase) {
          textToUse = textToUse.toUpperCase();
        } else if (isCapitalize) {
          textToUse = textToUse.replace(/\b\w/g, (c) => c.toUpperCase());
        }
        segments.push({
          text: textToUse,
          isUnderline,
          isHighlight,
          isBold,
          isItalic,
          isUppercase,
          isCapitalize,
        });
      }
    }

    interface WordToken {
      text: string;
      isUnderline: boolean;
      isHighlight: boolean;
      isBold: boolean;
      isItalic: boolean;
      isUppercase: boolean;
      isCapitalize: boolean;
    }

    // Split text segments into whitespace-separated word tokens
    const tokens: WordToken[] = [];
    for (const seg of segments) {
      const subParts = seg.text.split(/(\s+)/);
      for (const p of subParts) {
        if (p) {
          tokens.push({
            text: p,
            isUnderline: seg.isUnderline,
            isHighlight: seg.isHighlight,
            isBold: seg.isBold,
            isItalic: seg.isItalic,
            isUppercase: seg.isUppercase,
            isCapitalize: seg.isCapitalize,
          });
        }
      }
    }

    const maxWidth = width - 120;
    const lineHeight = 44;

    const getFontString = (t: WordToken) => {
      const boldStyle = (t.isBold || t.isHighlight) ? "bold " : "";
      const italicStyle = t.isItalic ? "italic " : "";
      return `${boldStyle}${italicStyle}32px ${activeQuoteFontCSS}`;
    };

    // Word wrapping
    const lines: Array<Array<WordToken & { width: number }>> = [];
    let currentLine: Array<WordToken & { width: number }> = [];
    let currentLineWidth = 0;

    for (const token of tokens) {
      ctx.font = getFontString(token);
      const tokenWidth = ctx.measureText(token.text).width;
      const isWhitespace = /^\s+$/.test(token.text);

      if (isWhitespace && currentLine.length === 0) {
        continue;
      }

      if (currentLineWidth + tokenWidth > maxWidth && currentLine.length > 0) {
        while (currentLine.length > 0 && /^\s+$/.test(currentLine[currentLine.length - 1].text)) {
          const removed = currentLine.pop();
          if (removed) {
            currentLineWidth -= removed.width;
          }
        }
        lines.push(currentLine);
        currentLine = [];
        currentLineWidth = 0;

        if (isWhitespace) {
          continue;
        }
      }

      currentLine.push({ ...token, width: tokenWidth });
      currentLineWidth += tokenWidth;
    }

    if (currentLine.length > 0) {
      while (currentLine.length > 0 && /^\s+$/.test(currentLine[currentLine.length - 1].text)) {
        currentLine.pop();
      }
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
    }

    // Calculate starting y-coordinate to center the block vertically
    const totalHeight = lines.length * lineHeight;
    let startY = (height - totalHeight) / 2;
    if (startY < 80) startY = 80;

    ctx.textAlign = "left";

    // Draw the text lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineWidth = line.reduce((sum, t) => sum + t.width, 0);
      let startX = (width - lineWidth) / 2;
      const currentY = startY + (i * lineHeight);

      for (const token of line) {
        ctx.font = getFontString(token);

        // Draw background highlight first if active
        if (token.isHighlight) {
          ctx.fillStyle = isDarkText ? "#fde68a" : "#b45309"; // bg-amber-200 or bg-amber-700
          ctx.fillRect(startX - 2, currentY - 28, token.width + 4, 38);
        }

        // Set text color
        if (token.isHighlight) {
          ctx.fillStyle = isDarkText ? "#1c1917" : "#ffffff";
        } else {
          ctx.fillStyle = defaultColor;
        }

        // Draw text segment
        ctx.fillText(token.text, startX, currentY);

        // Draw underline if active
        if (token.isUnderline) {
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(startX, currentY + 4);
          ctx.lineTo(startX + token.width, currentY + 4);
          ctx.stroke();
        }

        startX += token.width;
      }
    }

    // Draw the author (uppercase to match the slideshow styling)
    const authorText = `— ${activeQuote.author || "Unknown"}`.toUpperCase();
    ctx.font = 'bold 20px "Inter", sans-serif';
    ctx.textAlign = "center";
    ctx.fillStyle = isDarkText ? "#78350f" : "#fbbf24"; // amber-900 or amber-400
    ctx.fillText(authorText, width / 2, startY + totalHeight + 40);
  }, [activeQuote, zenBgColor, isDarkText, activeQuoteFontCSS]);

  // Redraw PiP canvas when dependencies change
  useEffect(() => {
    if (isPipActive) {
      updatePipCanvas();
    }
  }, [activeQuote, zenBgColor, isDarkText, isPipActive, updatePipCanvas]);

  const togglePictureInPicture = async () => {
    try {
      setPipError("");
      if (isPipActive) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        }
        setIsPipActive(false);
        return;
      }

      // Make sure we have canvas and video
      const canvas = pipCanvasRef.current;
      const video = pipVideoRef.current;
      if (!canvas || !video) {
        throw new Error("Video or Canvas element is not initialized");
      }

      // Draw first frame
      updatePipCanvas();

      // Create a stream with 5 FPS
      let stream: MediaStream;
      if ('captureStream' in canvas) {
        stream = (canvas as any).captureStream(5);
      } else if ('mozCaptureStream' in canvas) {
        stream = (canvas as any).mozCaptureStream(5);
      } else {
        throw new Error("Your browser does not support canvas video capture");
      }

      video.srcObject = stream;
      
      // Play video
      await video.play();

      // Request Picture in Picture
      await video.requestPictureInPicture();
      setIsPipActive(true);

      // Event listener to synchronize state if closed via native controls
      const onLeavePip = () => {
        setIsPipActive(false);
        video.removeEventListener("leavepictureinpicture", onLeavePip);
      };
      video.addEventListener("leavepictureinpicture", onLeavePip);

    } catch (err: any) {
      console.error("Picture-in-Picture error:", err);
      setPipError(err?.message || "Failed to initiate Picture-in-Picture mode.");
      setIsPipActive(false);
    }
  };

  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Disable alternating folders if there are not enough folders selected
  useEffect(() => {
    if (isAlternatingFoldersDisabled && alternatingFolders) {
      setAlternatingFolders(false);
    }
  }, [isAlternatingFoldersDisabled, alternatingFolders]);

  // Compute a serialized representation of the shuffle pool IDs to detect subject/folder selection changes
  const poolIdsStr = useMemo(() => {
    return shufflePool.map((q) => q.id).join(",");
  }, [shufflePool]);

  // Automatically fallback to shuffle mode if sequential play mode is active but becomes disabled
  useEffect(() => {
    if (isSequentialDisabled && playMode === "sequential") {
      setPlayMode("shuffle");
    }
  }, [isSequentialDisabled, playMode]);

  // Handle general initialization, fallback, and folder/subject selection change resets
  useEffect(() => {
    if (shufflePool.length === 0) {
      setCurrentQuoteIndex(-1);
      setHistory([]);
      setHistoryPos(-1);
      setIsPlaying(false);
    } else {
      // Start the slideshow again when selection changes or is initialized
      const startIndex = playMode === "sequential" ? 0 : Math.floor(Math.random() * shufflePool.length);
      setCurrentQuoteIndex(startIndex);
      setHistory([startIndex]);
      setHistoryPos(0);

      // Initialize categoryIndexMap for this starting category
      if (playMode === "sequential") {
        const startingQuote = shufflePool[startIndex];
        if (startingQuote) {
          const catQuotes = shufflePool.filter((q) => q.categoryId === startingQuote.categoryId);
          const relIdx = catQuotes.findIndex((q) => q.id === startingQuote.id);
          setCategoryIndexMap({
            [startingQuote.categoryId]: relIdx + 1
          });
        }
      }
    }
  }, [poolIdsStr, playMode]);

  // Handle specific quote preview (Zen mode override)
  useEffect(() => {
    if (initialQuoteId && shufflePool.length > 0) {
      const idx = shufflePool.findIndex((q) => q.id === initialQuoteId);
      if (idx !== -1) {
        setCurrentQuoteIndex(idx);
        setHistory([idx]);
        setHistoryPos(0);
        setIsZenMode(true);
        setIsPlaying(false);
      }
    }
  }, [initialQuoteId, shufflePool]);

  // Dynamic Random Background Color/Gradient handler on transition
  useEffect(() => {
    if (isZenMode && currentQuoteIndex !== -1) {
      if (isRandomColorsMode) {
        const randomColor = getRandomAestheticColor();
        setZenBgColor(randomColor);
        setHexInput(randomColor);
      } else if (isRandomGradientsMode) {
        if (savedGradients.length > 0) {
          const randomIndex = Math.floor(Math.random() * savedGradients.length);
          const grad = savedGradients[randomIndex];
          const angle = grad.angle !== undefined ? grad.angle : 135;
          const gradStr = grad.color3
            ? `linear-gradient(${angle}deg, ${grad.color1}, ${grad.color2}, ${grad.color3})`
            : `linear-gradient(${angle}deg, ${grad.color1}, ${grad.color2})`;
          setZenBgColor(gradStr);
          setSelectedGradIndex(randomIndex);
        }
      }
    }
  }, [currentQuoteIndex, isZenMode, isRandomColorsMode, isRandomGradientsMode, savedGradients]);

  // Autoplay handler
  useEffect(() => {
    if (isPlaying && shufflePool.length > 0) {
      autoplayTimerRef.current = setInterval(() => {
        handleNext();
      }, speed * 1000);
    } else {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    }

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [isPlaying, currentQuoteIndex, speed, shufflePool.length, timerTrigger]);

  const getQuoteFolderId = useCallback((quote: Quote) => {
    const category = categories.find((c) => c.id === quote.categoryId);
    return category?.folderId || "unknown";
  }, [categories]);

  const handleNext = useCallback(() => {
    if (shufflePool.length === 0) return;

    // Stop speaking if active
    safeCancelSpeech();
    setIsSpeaking(false);

    if (isZenMode) {
      setTimerTrigger((prev) => prev + 1);
    }

    // If we are browsing history and not at the end of history, just step forward
    if (historyPos < history.length - 1) {
      const nextPos = historyPos + 1;
      setHistoryPos(nextPos);
      setCurrentQuoteIndex(history[nextPos]);
    } else {
      let newIndex = 0;
      if (alternatingFolders) {
        // Get folder ID of current quote
        const currentQuote = currentQuoteIndex !== -1 ? shufflePool[currentQuoteIndex] : null;
        const currentFolderId = currentQuote ? getQuoteFolderId(currentQuote) : null;
        const currentCategoryId = currentQuote ? currentQuote.categoryId : null;

        // Get all unique folder IDs represented in the shuffle pool
        const activeFolders: string[] = Array.from(new Set(shufflePool.map((q) => getQuoteFolderId(q))));
        let targetFolderId = currentFolderId;
        let targetCategoryId: string | null = null;

        if (activeFolders.length > 1) {
          // Choose a folder different from the current one
          const otherFolders = activeFolders.filter((fid) => fid !== currentFolderId);
          targetFolderId = otherFolders[Math.floor(Math.random() * otherFolders.length)];
        }

        // Within targetFolderId, get all categories (subjects) that have quotes in the pool
        const folderCategoriesInPool: string[] = Array.from(
          new Set(
            shufflePool
              .filter((q) => getQuoteFolderId(q) === targetFolderId)
              .map((q) => q.categoryId)
          )
        );

        if (folderCategoriesInPool.length > 0) {
          // If we had to stay in the same folder, try to pick a different category (subject)
          if (targetFolderId === currentFolderId && folderCategoriesInPool.length > 1) {
            const otherCats = folderCategoriesInPool.filter((cid) => cid !== currentCategoryId);
            targetCategoryId = otherCats[Math.floor(Math.random() * otherCats.length)];
          } else {
            targetCategoryId = folderCategoriesInPool[Math.floor(Math.random() * folderCategoriesInPool.length)];
          }
        }

        if (targetCategoryId) {
          // Now pick the quote from the target category
          const catQuotes = shufflePool.filter((q) => q.categoryId === targetCategoryId);
          if (playMode === "sequential") {
            const currentIdxInCat = categoryIndexMap[targetCategoryId] ?? 0;
            const nextIdxInCat = currentIdxInCat % catQuotes.length;
            const targetQuote = catQuotes[nextIdxInCat];
            newIndex = shufflePool.findIndex((q) => q.id === targetQuote.id);

            setCategoryIndexMap((prev) => ({
              ...prev,
              [targetCategoryId!]: currentIdxInCat + 1,
            }));
          } else {
            // Shuffle mode
            const targetQuote = catQuotes[Math.floor(Math.random() * catQuotes.length)];
            newIndex = shufflePool.findIndex((q) => q.id === targetQuote.id);
          }
        } else {
          // Fallback if targetCategoryId couldn't be resolved
          newIndex = playMode === "sequential"
            ? (currentQuoteIndex + 1) % shufflePool.length
            : Math.floor(Math.random() * shufflePool.length);
        }
      } else if (playMode === "sequential") {
        newIndex = (currentQuoteIndex + 1) % shufflePool.length;
      } else {
        // Pick a new random index. Prefer different from current if pool size > 1
        newIndex = Math.floor(Math.random() * shufflePool.length);
        if (shufflePool.length > 1) {
          let limit = 0;
          while (newIndex === currentQuoteIndex && limit < 10) {
            newIndex = Math.floor(Math.random() * shufflePool.length);
            limit++;
          }
        }
      }

      const updatedHistory = [...history, newIndex];
      // Keep history bounded to 100 entries
      if (updatedHistory.length > 100) {
        updatedHistory.shift();
      }
      setHistory(updatedHistory);
      setHistoryPos(updatedHistory.length - 1);
      setCurrentQuoteIndex(newIndex);
    }
  }, [
    shufflePool,
    isZenMode,
    historyPos,
    history,
    playMode,
    currentQuoteIndex,
    alternatingFolders,
    getQuoteFolderId,
    categoryIndexMap,
    setCategoryIndexMap,
  ]);

  const handlePrev = useCallback(() => {
    if (shufflePool.length === 0) return;

    // Stop speaking
    safeCancelSpeech();
    setIsSpeaking(false);

    if (isZenMode) {
      setTimerTrigger((prev) => prev + 1);
    }

    if (historyPos > 0) {
      const prevPos = historyPos - 1;
      setHistoryPos(prevPos);
      setCurrentQuoteIndex(history[prevPos]);
    } else {
      // If we are at the first slide (historyPos === 0), restart the time again for the first slide
      setTimerTrigger((prev) => prev + 1);
      return;
    }
    // Pause auto-play when going backward manually to avoid confusing experience
    if (!isZenMode) {
      setIsPlaying(false);
    }
  }, [shufflePool, isZenMode, historyPos, history]);

  // Keyboard Shortcuts Listener for Shuffle Player (Zen Mode & Normal Mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (shufflePool.length === 0) return;

      // Ignore shortcuts when user is typing in any input, textarea, or editable element
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          handleNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handlePrev();
          break;
        case " ": // Space
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
        case "Escape":
          if (isZenMode) {
            e.preventDefault();
            handleExitZenMode();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shufflePool.length, handleNext, handlePrev, isZenMode, handleExitZenMode]);

  const handleZoneClick = (action: "prev" | "next") => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    const isDoubleTap = now - lastTapRef.current < DOUBLE_TAP_DELAY;
    lastTapRef.current = now;

    if (isDoubleTap) {
      // It's a double click! Clear any pending single-click navigation timer
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      lastTapRef.current = 0; // reset tap timestamp

      // Toggle Thumbs Up (rate up) for the active quote
      if (activeQuote && onRateQuote) {
        const nextRating = activeQuote.rating === "up" ? null : "up";
        onRateQuote(activeQuote.id, nextRating);
      }
    } else {
      // Single click: wait to see if a second click follows
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }

      clickTimeoutRef.current = setTimeout(() => {
        if (!initialQuoteId) {
          if (action === "next") {
            handleNext();
          } else {
            handlePrev();
          }
        }
        clickTimeoutRef.current = null;
      }, DOUBLE_TAP_DELAY);
    }
  };

  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Fallback copy failed:", err);
    }
  };

  const handleCopy = () => {
    if (currentQuoteIndex === -1 || !shufflePool[currentQuoteIndex]) return;
    const quote = shufflePool[currentQuoteIndex];
    const plainText = stripFormatTags(quote.text);
    const textToCopy = `"${plainText}" — ${quote.author}`;
    
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        fallbackCopyText(textToCopy);
        return;
      }
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          console.warn("Clipboard write failed, using fallback:", err);
          fallbackCopyText(textToCopy);
        });
    } catch (err) {
      console.warn("Clipboard write failed, using fallback:", err);
      fallbackCopyText(textToCopy);
    }
  };

  const handleSpeak = () => {
    if (currentQuoteIndex === -1 || !shufflePool[currentQuoteIndex]) return;
    const quote = shufflePool[currentQuoteIndex];

    try {
      if (!isSpeechSupported()) {
        setErrorSpeech("Text-to-speech is not supported in this browser.");
        return;
      }

      if (isSpeaking) {
        safeCancelSpeech();
        setIsSpeaking(false);
        return;
      }

      const plainText = stripFormatTags(quote.text);
      const textToSpeak = `${plainText} by ${quote.author}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      setIsSpeaking(true);
      safeSpeak(utterance);
    } catch (err: any) {
      console.error("Speech synthesis failed:", err);
      setErrorSpeech("Text-to-speech failed due to environment limitations.");
      setIsSpeaking(false);
    }
  };

  const handleDeleteActiveQuote = () => {
    if (!activeQuote) return;

    safeCancelSpeech();
    setIsSpeaking(false);

    if (onDeleteQuote) {
      onDeleteQuote(activeQuote.id);
    }

    setIsDeleting(false);

    if (shufflePool.length <= 1) {
      setIsZenMode(false);
      setIsPlaying(false);
    } else if (wasPlayingBeforeDelete) {
      setTimeout(() => {
        setIsPlaying(true);
      }, 200);
    }
  };

  // Clean speech on unmount
  useEffect(() => {
    return () => {
      safeCancelSpeech();
    };
  }, []);

  return (
    <div id="shuffle-player-container" className="flex flex-col flex-1 h-full max-w-4xl mx-auto py-6 px-4 md:px-8">
      {/* Hidden elements for Picture-in-Picture streaming */}
      <div className="absolute top-0 left-0 w-0 h-0 overflow-hidden pointer-events-none opacity-0" aria-hidden="true">
        <canvas
          ref={pipCanvasRef}
          width={800}
          height={450}
          style={{ display: "block" }}
        />
        <video
          ref={pipVideoRef}
          autoPlay
          playsInline
          muted
          style={{ display: "block" }}
        />
      </div>

      {/* Dynamic Status / Overview */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-stone-100 p-3 rounded-xl border border-stone-200/50">
        <div className="flex items-center gap-2 text-stone-600 text-xs">
          <span className="font-semibold text-stone-700">Included Categories:</span>
          {shuffleFavoritesOnly ? (
            <span className="bg-emerald-100 text-emerald-850 px-2.5 py-0.5 rounded-full font-bold">Thumbs Up Only</span>
          ) : shufflableCategories.length === 0 ? (
            <span className="text-red-500 font-medium">None (Shuffle Off)</span>
          ) : shufflableCategories.length === categories.length ? (
            <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-medium">All categories</span>
          ) : (
            <span className="text-stone-700 font-medium truncate max-w-[280px]">
              {shufflableCategories.map((c) => c.name).join(", ")}
            </span>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Thumbs Up filter toggle */}
          <button
            id="toggle-favs-only-btn"
            onClick={() => setShuffleFavoritesOnly(!shuffleFavoritesOnly)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              shuffleFavoritesOnly
                ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs"
                : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
            title="Toggle Thumbs-Up Only quotes"
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${shuffleFavoritesOnly ? "fill-current text-emerald-600" : ""}`} />
            <span>Thumbs Up Only</span>
          </button>

          {/* Alternating Folders Toggle */}
          <button
            id="toggle-alternating-folders-btn"
            disabled={isAlternatingFoldersDisabled}
            onClick={() => {
              const nextVal = !alternatingFolders;
              setAlternatingFolders(nextVal);
              localStorage.setItem("quote_shuffle_alternating_folders", String(nextVal));
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
              isAlternatingFoldersDisabled
                ? "bg-stone-50 border-stone-150 text-stone-350 cursor-not-allowed opacity-50"
                : alternatingFolders
                ? "bg-amber-50 border-amber-300 text-amber-900 shadow-2xs cursor-pointer"
                : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer"
            }`}
            title={
              isAlternatingFoldersDisabled
                ? "Select at least 2 subjects to enable alternating folders mode"
                : "Alternates next slides between different selected folders"
            }
          >
            <Sparkles className={`w-3.5 h-3.5 ${alternatingFolders ? "text-amber-600 fill-amber-100" : ""}`} />
            <span>Alternating Folders</span>
          </button>

          {/* Play Order Selector (Shuffle vs In Order) */}
          <div className="flex bg-stone-200/50 p-0.5 rounded-lg border border-stone-200 text-xs font-semibold select-none">
            <button
              type="button"
              id="play-mode-shuffle-btn"
              onClick={() => setPlayMode("shuffle")}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                playMode === "shuffle"
                  ? "bg-white text-stone-900 shadow-3xs font-bold"
                  : "text-stone-500 hover:text-stone-850"
              }`}
              title="Shuffle / Play in Random Order"
            >
              <Shuffle className="w-3 h-3" />
              <span>Shuffle</span>
            </button>
            <div className="relative group/tooltip flex">
              <button
                type="button"
                id="play-mode-order-btn"
                disabled={isSequentialDisabled}
                onClick={() => {
                  if (!isSequentialDisabled) {
                    setPlayMode("sequential");
                    safeCancelSpeech();
                    setIsSpeaking(false);
                    if (shufflePool.length > 0) {
                      setCurrentQuoteIndex(0);
                      setHistory([0]);
                      setHistoryPos(0);
                      setIsPlaying(true);
                      setTimerTrigger((prev) => prev + 1);
                    }
                  }
                }}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                  isSequentialDisabled
                    ? "opacity-45 cursor-not-allowed text-stone-400"
                    : playMode === "sequential"
                    ? "bg-white text-stone-900 shadow-3xs font-bold cursor-pointer"
                    : "text-stone-500 hover:text-stone-850 cursor-pointer"
                }`}
                title={isSequentialDisabled ? undefined : "Play In Sequential Order"}
              >
                <ArrowRight className="w-3 h-3" />
                <span>In Order</span>
              </button>

              {isSequentialDisabled && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-stone-900 text-white text-[11px] rounded-xl shadow-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity duration-200 z-50 text-center leading-normal">
                  <span className="font-semibold block mb-0.5 text-amber-400">Sequential play unavailable</span>
                  Please select (toggle on) at least one subject on the left to enable sequential play.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-stone-900" />
                </div>
              )}
            </div>
          </div>

          {shufflePool.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                id="enter-zen-mode-btn"
                onClick={() => setIsZenMode(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-55 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                title="Full Screen Slideshow"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Full Screen Zen Play</span>
              </button>

              <button
                id="pip-mode-toggle-btn"
                onClick={togglePictureInPicture}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                  isPipActive
                    ? "bg-amber-50 border-amber-300 text-amber-900 shadow-2xs"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
                title="Float Quotes Above All Windows (Picture-in-Picture)"
              >
                <PictureInPicture2 className="w-3.5 h-3.5" />
                <span>{isPipActive ? "Exit Float (PiP)" : "Float Quote (PiP)"}</span>
              </button>
            </div>
          )}
          <div className="text-stone-500 text-xs font-mono">
            Pool size: <span className="font-bold text-stone-800">{shufflePool.length}</span> quotes
          </div>
        </div>
      </div>

      {pipError && (
        <div className="mb-4 text-xs text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center justify-between gap-2">
          <span>
            <strong>Note on Picture-in-Picture:</strong> {pipError}. To grant PiP permissions in AI Studio's preview iframe, please click the <strong>"Open in new tab"</strong> button in the top right menu of the application!
          </span>
          <button className="text-amber-800 font-bold hover:text-amber-950 px-1 cursor-pointer" onClick={() => setPipError("")}>✕</button>
        </div>
      )}

      {searchPlayList && (
        <div id="search-slideshow-info-banner" className="mb-4 bg-amber-500/10 border border-amber-500/20 text-amber-900 rounded-2xl p-3.5 flex items-center justify-between gap-4 animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-amber-700 animate-pulse" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wide font-sans block sm:inline">
                Search Results Slideshow Active
              </span>
              <span className="hidden sm:inline text-xs text-stone-500 ml-1.5">— Playing {shufflePool.length} quotes matching "{searchQuery}"</span>
            </div>
          </div>
          <button
            id="exit-search-banner-btn"
            onClick={onClearSearchPlay}
            className="text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl cursor-pointer transition-colors shadow-2xs shrink-0"
          >
            Exit Slideshow
          </button>
        </div>
      )}

      {shuffleFavoritesOnly && (
        <div id="thumbs-up-slideshow-info-banner" className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 rounded-2xl p-3.5 flex items-center justify-between gap-4 animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ThumbsUp className="w-4 h-4 fill-current text-emerald-600 animate-bounce" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wide font-sans block sm:inline">
                Thumbs Up Slideshow Active
              </span>
              <span className="hidden sm:inline text-xs text-stone-500 ml-1.5">— Playing your saved favorites</span>
            </div>
          </div>
          <button
            id="exit-thumbs-up-banner-btn"
            onClick={() => setShuffleFavoritesOnly(false)}
            className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl cursor-pointer transition-colors shadow-2xs shrink-0"
          >
            Exit Slideshow
          </button>
        </div>
      )}

      {/* Main Quote Screen */}
      <div className="flex-1 flex flex-col justify-center min-h-[320px] md:min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeQuote ? (
            <motion.div
              key={activeQuote.id}
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              id="quote-card-display"
              className="relative bg-white border border-stone-200 shadow-xl rounded-3xl p-8 md:p-14 flex flex-col justify-between overflow-hidden aspect-[4/3] md:aspect-[16/10]"
            >
              {/* Giant elegant background quotation mark */}
              <div className="absolute top-4 left-6 text-[180px] md:text-[240px] font-serif text-amber-50/70 select-none pointer-events-none leading-none font-black">
                “
              </div>

              {/* Tag / Category Indicator */}
              <div className="relative z-30 flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    id="quote-tag-category"
                    className="bg-amber-50 text-amber-800 border border-amber-200/50 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider"
                  >
                    {currentCategory ? currentCategory.name : "Uncategorized"}
                  </span>
                  {shuffleFavoritesOnly && (
                    <span
                      id="quote-thumbs-up-indicator"
                      className="bg-emerald-50 text-emerald-850 border border-emerald-200/50 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-2xs"
                    >
                      <ThumbsUp className="w-3 h-3 fill-current text-emerald-600" />
                      <span>Saved Favorite</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 border-r border-stone-200/60 pr-2 mr-0.5">
                    <button
                      id="rate-up-btn"
                      onClick={() => onRateQuote?.(activeQuote.id, activeQuote.rating === 'up' ? null : 'up')}
                      className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                        activeQuote.rating === 'up'
                          ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                          : "text-stone-400 hover:text-emerald-600 hover:bg-stone-50"
                      }`}
                      title="Recommend (Thumbs Up)"
                    >
                      <ThumbsUp className={`w-4 h-4 ${activeQuote.rating === 'up' ? "fill-current" : ""}`} />
                    </button>
                    <button
                      id="rate-down-btn"
                      onClick={() => onRateQuote?.(activeQuote.id, activeQuote.rating === 'down' ? null : 'down')}
                      className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                        activeQuote.rating === 'down'
                          ? "text-red-600 bg-red-50 hover:bg-red-100"
                          : "text-stone-400 hover:text-red-600 hover:bg-stone-50"
                      }`}
                      title="Don't Recommend / Flag (Thumbs Down)"
                    >
                      <ThumbsDown className={`w-4 h-4 ${activeQuote.rating === 'down' ? "fill-current" : ""}`} />
                    </button>
                  </div>

                  <button
                    id="copy-quote-btn"
                    onClick={handleCopy}
                    className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
                    title="Copy to Clipboard"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    id="speak-quote-btn"
                    onClick={handleSpeak}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      isSpeaking
                        ? "text-amber-800 bg-amber-50 hover:bg-amber-100"
                        : "text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                    }`}
                    title={isSpeaking ? "Stop Reading" : "Read Aloud"}
                  >
                    <Volume2 className={`w-4 h-4 ${isSpeaking ? "animate-bounce" : ""}`} />
                  </button>

                  {/* Font Styling Settings Button */}
                  <div className="relative">
                    <button
                      id="normal-font-picker-toggle"
                      onClick={() => {
                        setShowFontPicker(!showFontPicker);
                        setShowColorPicker(false);
                      }}
                      className={`p-2 rounded-xl transition-all cursor-pointer ${
                        showFontPicker
                          ? "text-amber-800 bg-amber-50"
                          : "text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                      }`}
                      title="Font Styling Settings"
                    >
                      <Type className="w-4 h-4" />
                    </button>

                    <AnimatePresence>
                      {showFontPicker && (
                        <motion.div
                          id="normal-font-picker-dropdown"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 mt-2 p-4 rounded-2xl border border-stone-200 bg-white shadow-2xl w-72 z-50 flex flex-col gap-3.5 text-stone-800"
                        >
                          {renderFontPickerContent(false)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Edit active quote from slide */}
                  <button
                    id="edit-quote-btn-slideshow"
                    onClick={() => {
                      setWasPlayingBeforeEdit(isPlaying);
                      setIsPlaying(false);
                      setEditText(activeQuote.text);
                      setEditAuthor(activeQuote.author || "");
                      setIsEditing(true);
                    }}
                    className="p-2 text-stone-400 hover:text-amber-650 hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
                    title="Edit Quote"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Delete active quote from slide */}
                  <button
                    id="delete-quote-btn-slideshow"
                    onClick={() => {
                      setWasPlayingBeforeDelete(isPlaying);
                      setIsPlaying(false);
                      setIsDeleting(true);
                    }}
                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
                    title="Delete Quote"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Text Area */}
              <div className="relative z-10 my-auto flex flex-col justify-center">
                <blockquote
                  id="quote-text-serif"
                  data-quote-id={activeQuote.id}
                  className="font-quote text-stone-800 font-medium leading-relaxed md:leading-normal select-text cursor-text selection:bg-amber-200/80"
                  style={{ 
                    "--quote-font": isGreekText(activeQuote.text) ? "var(--quote-font-el)" : "var(--quote-font-en)",
                    fontSize: `${getQuoteFontSize(activeQuote, false)}px`
                  } as React.CSSProperties}
                >
                  "{renderFormattedText(activeQuote.text)}"
                </blockquote>
                <cite
                  id="quote-author-name"
                  className="block font-sans not-italic text-sm md:text-base font-semibold text-stone-500 mt-6 tracking-wide uppercase"
                >
                  — {activeQuote.author || "Unknown"}
                </cite>
              </div>

              {/* Animated Progress Bar for Autoplay */}
              {isPlaying && (
                <div className="absolute bottom-0 left-0 h-1.5 bg-amber-200/50 w-full overflow-hidden">
                  <motion.div
                    key={`${activeQuote.id}-${speed}-${isPlaying}-${timerTrigger}`}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: speed, ease: "linear" }}
                    className="h-full bg-amber-600"
                  />
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-stone-50 border-2 border-dashed border-stone-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center max-w-lg mx-auto"
            >
              {shuffleFavoritesOnly ? (
                <>
                  <ThumbsUp className="w-12 h-12 text-stone-400 mb-4" />
                  <h3 className="font-serif text-lg font-semibold text-stone-800 mb-2">
                    No Thumbs-Up Quotes Found
                  </h3>
                  <p className="text-stone-500 text-sm leading-relaxed mb-6">
                    You haven't rated any quotes in your active categories with a <span className="font-semibold text-emerald-600">thumbs-up</span> yet! Rate some quotes, or disable the filter to play your entire library.
                  </p>
                  <button
                    id="disable-favs-filter-empty-btn"
                    onClick={() => setShuffleFavoritesOnly(false)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-md"
                  >
                    Disable Thumbs Up Filter
                  </button>
                </>
              ) : (
                <>
                  <Shuffle className="w-12 h-12 text-stone-400 mb-4 animate-spin-slow" />
                  <h3 className="font-serif text-lg font-semibold text-stone-800 mb-2">
                    Your Shuffle Pool is Empty
                  </h3>
                  <p className="text-stone-500 text-sm leading-relaxed mb-6">
                    Please make sure you have toggled at least one category <span className="font-semibold">ON</span> in the sidebar, and that it contains quotes!
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Buttons & Speeds */}
      {shufflePool.length > 0 && (
        <div id="player-controls-container" className="mt-8 flex flex-col gap-6">
          {/* Main Controls row */}
          <div className="flex items-center justify-center gap-4">
            {/* Previous */}
            <button
              id="prev-quote-btn"
              onClick={handlePrev}
              disabled={playMode === "shuffle" ? historyPos <= 0 : shufflePool.length === 0}
              className={`p-3 border border-stone-200 rounded-2xl shadow-sm bg-white transition-all ${
                (playMode === "shuffle" ? historyPos <= 0 : shufflePool.length === 0)
                  ? "text-stone-300 bg-stone-50 cursor-not-allowed"
                  : "text-stone-700 hover:bg-stone-50 hover:border-stone-300 active:scale-95"
              }`}
              title="Previous Quote"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Play/Pause Autoplay */}
            <button
              id="play-pause-btn"
              onClick={() => {
                const nextPlaying = !isPlaying;
                if (nextPlaying && playMode === "sequential" && shufflePool.length > 0) {
                  setCurrentQuoteIndex(0);
                  setHistory([0]);
                  setHistoryPos(0);
                }
                setIsPlaying(nextPlaying);
              }}
              className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-sans text-sm font-semibold tracking-wide shadow-md transition-all active:scale-95 ${
                isPlaying
                  ? "bg-stone-900 text-white hover:bg-stone-800"
                  : "bg-amber-600 text-white hover:bg-amber-700"
              }`}
              title={isPlaying ? "Pause Slideshow" : "Start Slideshow"}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-white" />
                  <span>Pause Play</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Auto Play</span>
                </>
              )}
            </button>

            {/* Next Random */}
            <button
              id="next-quote-btn"
              onClick={handleNext}
              className="p-3 border border-stone-200 rounded-2xl shadow-sm bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-300 active:scale-95 transition-all"
              title="Next Random Quote"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Autoplay Speed Controller */}
          <div className="flex items-center justify-center gap-3">
            <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider">
              Cycle Speed
            </span>
            <div className="bg-stone-100 p-1 rounded-xl border border-stone-200/50 flex items-center">
              {[10, 20, 30, 60].map((s) => (
                <button
                  key={s}
                  id={`speed-btn-${s}`}
                  onClick={() => setSpeed(s)}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-mono font-bold transition-all cursor-pointer ${
                    speed === s
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {errorSpeech && (
        <p id="speech-error-msg" className="text-center text-xs text-red-500 mt-2">
          {errorSpeech}
        </p>
      )}

      {/* ======================================================= */}
      {/* ZEN PRESENTATION MODE OVERLAY                          */}
      {/* ======================================================= */}
      <AnimatePresence>
        {isZenMode && activeQuote && (
          <motion.div
            id="zen-slideshow-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ background: zenBgColor }}
            className={`fixed inset-0 z-[120] flex flex-col justify-between p-6 md:p-14 select-none touch-manipulation transition-all duration-300 ${
              isDarkText ? "text-stone-900 animate-fade-in" : "text-stone-100 animate-fade-in"
            } ${!isControlsVisible ? "cursor-none" : ""}`}
            onContextMenu={(e) => {
              e.preventDefault();
              setZenContextMenu({
                x: e.clientX,
                y: e.clientY,
                visible: true
              });
            }}
          >
            {/* Absolute Left & Right Navigation Click Hotspots (Behind controls, covering rest of screen) */}
            <div className="absolute inset-0 z-0 flex pointer-events-auto">
              <div
                className={`w-1/2 h-full ${!isControlsVisible ? "cursor-none" : "cursor-w-resize"}`}
                onClick={() => handleZoneClick("prev")}
                title={isControlsVisible ? "Previous Slide (Left Click)" : undefined}
              />
              <div
                className={`w-1/2 h-full ${!isControlsVisible ? "cursor-none" : "cursor-e-resize"}`}
                onClick={() => handleZoneClick("next")}
                title={isControlsVisible ? "Next Slide (Right Click)" : undefined}
              />
            </div>
            {/* Top Bar Controls */}
            <motion.div
              id="zen-top-bar"
              animate={{
                y: isControlsVisible ? 0 : -60,
                opacity: isControlsVisible ? 1 : 0,
                pointerEvents: isControlsVisible ? "auto" : "none"
              }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="relative flex items-center justify-between z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${
                    isDarkText
                      ? "bg-stone-200/80 text-amber-900 border border-stone-300"
                      : "bg-stone-900/80 text-amber-400 border border-stone-800"
                  }`}
                >
                  {initialQuoteId ? "Quote preview" : (currentCategory ? currentCategory.name : "Shuffle Pool")}
                </span>

                {shuffleFavoritesOnly && !initialQuoteId && (
                  <span
                    className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                      isDarkText
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                        : "bg-emerald-950/80 text-emerald-450 border border-emerald-800"
                    }`}
                  >
                    <ThumbsUp className="w-3 h-3 fill-current text-emerald-600" />
                    <span>Thumbs Up Slideshow</span>
                  </span>
                )}
                
                {/* Active index counters */}
                {!initialQuoteId && (
                  <span className={`text-xs font-mono px-2 py-1 rounded ${
                    isDarkText ? "text-stone-600" : "text-stone-400"
                  }`}>
                    {historyPos + 1} / {history.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Color Customizer Button */}
                <div className="relative">
                  <button
                    id="zen-color-picker-toggle"
                    onClick={() => {
                      setShowColorPicker(!showColorPicker);
                      setShowShortcuts(false);
                      setShowFontPicker(false);
                    }}
                    className={`p-2.5 rounded-xl transition-all border flex items-center gap-1.5 cursor-pointer ${
                      isDarkText
                        ? "border-stone-300 hover:bg-stone-200 text-stone-700"
                        : "border-stone-800 hover:bg-stone-900 text-stone-300"
                    } ${showColorPicker ? "bg-amber-100/10" : ""}`}
                    title="Customize Background Color"
                  >
                    <Palette className="w-4 h-4" />
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-stone-400"
                      style={{ background: zenBgColor }}
                    />
                  </button>

                  <AnimatePresence>
                    {showColorPicker && (
                      <motion.div
                        id="zen-color-picker-dropdown"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={`absolute right-0 mt-2 p-4 rounded-2xl border shadow-2xl w-72 z-50 flex flex-col gap-3 ${
                          isDarkText
                            ? "bg-white border-stone-200 text-stone-800"
                            : "bg-stone-900 border-stone-800 text-stone-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-xs uppercase tracking-wider">
                            Background Styling
                          </h5>
                          <button
                            type="button"
                            onClick={() => setShowColorPicker(false)}
                            className={`p-1 rounded-lg transition-colors cursor-pointer ${
                              isDarkText
                                ? "hover:bg-stone-100 text-stone-400 hover:text-stone-600"
                                : "hover:bg-stone-800 text-stone-400 hover:text-stone-200"
                            }`}
                            title="Close Settings"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Solid / Gradient Tab Buttons */}
                        <div className="flex border-b border-stone-200 dark:border-stone-850 pb-1 mb-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveColorTab("solid");
                              setIsRandomColorsMode(false);
                              setIsRandomGradientsMode(false);
                              setSelectedGradIndex(null);
                            }}
                            className={`flex-1 text-center py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                              activeColorTab === "solid"
                                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
                                : "border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                            }`}
                          >
                            Solid
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveColorTab("gradient");
                              setIsRandomColorsMode(false);
                              setIsRandomGradientsMode(false);
                            }}
                            className={`flex-1 text-center py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                              activeColorTab === "gradient"
                                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
                                : "border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                            }`}
                          >
                            Gradient
                          </button>
                        </div>

                        {activeColorTab === "solid" ? (
                          <>
                            {/* Random (colors) toggle button */}
                            <button
                              onClick={() => {
                                const newMode = !isRandomColorsMode;
                                setIsRandomColorsMode(newMode);
                                setIsRandomGradientsMode(false);
                                setSelectedGradIndex(null);
                                if (newMode) {
                                  const randomColor = getRandomAestheticColor();
                                  setZenBgColor(randomColor);
                                  setHexInput(randomColor);
                                }
                              }}
                              className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-xs font-semibold ${
                                isRandomColorsMode
                                  ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400"
                                  : isDarkText
                                  ? "border-stone-200 hover:bg-stone-50 text-stone-700"
                                  : "border-stone-800 hover:bg-stone-950 text-stone-300"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                                <span>Random (colors)</span>
                              </div>
                              <div className={`w-2 h-2 rounded-full ${isRandomColorsMode ? "bg-amber-500" : "bg-stone-300 dark:bg-stone-700"}`} />
                            </button>

                            {/* Recent Colors */}
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-semibold text-stone-400 uppercase">Recent Colors</span>
                              <div className="flex items-center gap-2 flex-wrap">
                                {recentColors.map((color) => {
                                  const isSelected = !isRandomColorsMode && !isRandomGradientsMode && zenBgColor.toLowerCase() === color.toLowerCase();
                                  return (
                                    <button
                                      key={color}
                                      onClick={() => {
                                        handleSelectColor(color);
                                        setIsRandomGradientsMode(false);
                                        setSelectedGradIndex(null);
                                      }}
                                      className={`w-8 h-8 rounded-lg border-2 transition-all relative cursor-pointer ${
                                        isSelected
                                          ? "border-amber-500 scale-105"
                                          : "border-transparent hover:scale-105"
                                      }`}
                                      style={{ backgroundColor: color }}
                                      title={color}
                                    >
                                      {isSelected && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <Check className={`w-3.5 h-3.5 ${getContrastColor(color) === "dark" ? "text-stone-950" : "text-white"}`} />
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Custom Color Inputs */}
                            <div className="flex flex-col gap-1.5 mt-1">
                              <span className="text-[10px] font-semibold text-stone-400 uppercase">Custom Color</span>
                              <div className="flex items-center gap-2">
                                {/* Color Picker input */}
                                <div className={`relative w-9 h-9 rounded-xl border border-stone-300 overflow-hidden shrink-0 ${isRandomColorsMode ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
                                  <input
                                    type="color"
                                    disabled={isRandomColorsMode}
                                    value={isRandomColorsMode ? "#ffffff" : (zenBgColor.startsWith("linear-gradient") ? "#ffffff" : zenBgColor)}
                                    onChange={(e) => {
                                      handleSelectColor(e.target.value);
                                      setIsRandomGradientsMode(false);
                                      setSelectedGradIndex(null);
                                    }}
                                    className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                                  />
                                  <div
                                    className="w-full h-full flex items-center justify-center font-bold"
                                    style={{ background: isRandomColorsMode ? "#a8a29e" : (zenBgColor.startsWith("linear-gradient") ? "#ffffff" : zenBgColor) }}
                                  >
                                    <Palette className={`w-4 h-4 ${isDarkText ? "text-stone-950" : "text-white"}`} />
                                  </div>
                                </div>

                                {/* Hex Input & OK Button */}
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    if (isRandomColorsMode) {
                                      setShowColorPicker(false);
                                    } else {
                                      handleSaveToRecent(hexInput);
                                      setIsRandomGradientsMode(false);
                                      setSelectedGradIndex(null);
                                    }
                                  }}
                                  className="flex items-center gap-1.5 flex-1"
                                >
                                  <input
                                    type="text"
                                    disabled={isRandomColorsMode}
                                    value={isRandomColorsMode ? "Random active" : hexInput}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                      if (isRandomColorsMode) return;
                                      let val = e.target.value;
                                      if (!val.startsWith("#") && val.trim() !== "") {
                                        val = "#" + val;
                                      }
                                      setHexInput(val);
                                      if (/^#[0-9A-Fa-f]{6}$/.test(val) || /^#[0-9A-Fa-f]{3}$/.test(val)) {
                                        setZenBgColor(val);
                                        setIsRandomGradientsMode(false);
                                        setSelectedGradIndex(null);
                                      }
                                    }}
                                    onBlur={() => {
                                      if (isRandomColorsMode) return;
                                      if (/^#[0-9A-Fa-f]{6}$/.test(hexInput) || /^#[0-9A-Fa-f]{3}$/.test(hexInput)) {
                                        handleSelectColor(hexInput);
                                        setIsRandomGradientsMode(false);
                                        setSelectedGradIndex(null);
                                      } else {
                                        setHexInput(zenBgColor.startsWith("linear-gradient") ? "#ffffff" : zenBgColor);
                                      }
                                    }}
                                    className={`text-xs font-mono w-full px-2.5 py-2 rounded-xl border disabled:cursor-not-allowed disabled:opacity-60 ${
                                      isDarkText
                                        ? "bg-stone-50 border-stone-200 text-stone-850 focus:border-amber-500"
                                        : "bg-stone-950 border-stone-750 text-stone-100 focus:border-amber-500"
                                    } focus:outline-none transition-all`}
                                    placeholder="#000000"
                                    maxLength={15}
                                  />
                                  <button
                                    type="submit"
                                    className={`text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                                      isDarkText
                                        ? "bg-stone-900 text-white hover:bg-stone-800"
                                        : "bg-white text-stone-950 hover:bg-stone-200"
                                    }`}
                                    title={isRandomColorsMode ? "Close Settings" : "Add to Recent"}
                                  >
                                    OK
                                  </button>
                                </form>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Random (gradients) toggle button */}
                            <button
                              onClick={() => {
                                const newMode = !isRandomGradientsMode;
                                setIsRandomGradientsMode(newMode);
                                setIsRandomColorsMode(false);
                                if (newMode && savedGradients.length > 0) {
                                  const randomIndex = Math.floor(Math.random() * savedGradients.length);
                                  const grad = savedGradients[randomIndex];
                                  const angle = grad.angle !== undefined ? grad.angle : 135;
                                  const gradStr = grad.color3
                                    ? `linear-gradient(${angle}deg, ${grad.color1}, ${grad.color2}, ${grad.color3})`
                                    : `linear-gradient(${angle}deg, ${grad.color1}, ${grad.color2})`;
                                  setZenBgColor(gradStr);
                                  setSelectedGradIndex(randomIndex);
                                }
                              }}
                              className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-xs font-semibold ${
                                isRandomGradientsMode
                                  ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400"
                                  : isDarkText
                                  ? "border-stone-200 hover:bg-stone-50 text-stone-700"
                                  : "border-stone-800 hover:bg-stone-950 text-stone-300"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                                <span>Random (gradients)</span>
                              </div>
                              <div className={`w-2 h-2 rounded-full ${isRandomGradientsMode ? "bg-amber-500" : "bg-stone-300 dark:bg-stone-700"}`} />
                            </button>

                            {/* Saved & Preset Gradients list */}
                            <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                              <span className="text-[10px] font-semibold text-stone-400 uppercase">Saved & Presets</span>
                              <div className="flex flex-col gap-1">
                                {savedGradients.map((grad, idx) => {
                                  const angle = grad.angle !== undefined ? grad.angle : 135;
                                  const gradStr = grad.color3
                                    ? `linear-gradient(${angle}deg, ${grad.color1}, ${grad.color2}, ${grad.color3})`
                                    : `linear-gradient(${angle}deg, ${grad.color1}, ${grad.color2})`;
                                  const isSelected = !isRandomColorsMode && !isRandomGradientsMode && selectedGradIndex === idx;
                                  return (
                                    <div
                                      key={idx}
                                      onClick={() => {
                                        setSelectedGradIndex(idx);
                                        setIsRandomGradientsMode(false);
                                        setIsRandomColorsMode(false);
                                        setZenBgColor(gradStr);
                                        setGradientColor1(grad.color1);
                                        setGradientColor2(grad.color2);
                                        if (grad.color3) {
                                          setGradientColor3(grad.color3);
                                          setUseColor3(true);
                                        } else {
                                          setUseColor3(false);
                                        }
                                        setCustomGradientAngle(angle);
                                        setNewGradientName(grad.name);
                                        setCustomGradientTextColor(grad.textColor);
                                      }}
                                      className={`flex items-center justify-between p-1.5 rounded-xl border transition-all cursor-pointer text-xs ${
                                        isSelected
                                          ? "border-amber-500 bg-amber-500/5 font-bold"
                                          : isDarkText
                                          ? "border-stone-200 hover:bg-stone-50 text-stone-700"
                                          : "border-stone-800 hover:bg-stone-950 text-stone-300"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-5 h-5 rounded-md border border-stone-300/40 shrink-0"
                                          style={{ background: gradStr }}
                                        />
                                        <span className="truncate max-w-[130px]">{grad.name}</span>
                                      </div>

                                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-500" />}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = savedGradients.filter((_, i) => i !== idx);
                                            setSavedGradients(updated);
                                            if (selectedGradIndex === idx) {
                                              setSelectedGradIndex(null);
                                            } else if (selectedGradIndex !== null && selectedGradIndex > idx) {
                                              setSelectedGradIndex(selectedGradIndex - 1);
                                            }
                                            try {
                                              localStorage.setItem("quote_shuffle_saved_gradients", JSON.stringify(updated));
                                            } catch (err) {
                                              console.warn("Failed to save gradients to localStorage:", err);
                                            }
                                          }}
                                          className="p-1 text-stone-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-500/10"
                                          title="Delete gradient"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Angle Adjustment Slider */}
                            {zenBgColor.startsWith("linear-gradient") && (
                              <div className={`flex flex-col gap-1.5 p-2.5 rounded-xl border shadow-inner transition-all ${
                                isDarkText
                                  ? "bg-stone-100 border-stone-200"
                                  : "bg-stone-950 border-stone-800"
                              }`}>
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                    isDarkText ? "text-stone-700" : "text-stone-200"
                                  }`}>
                                    Gradient Angle
                                  </span>
                                  <span className="text-[10px] font-mono font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                    {parseGradient(zenBgColor).angleDeg}°
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="360"
                                  step="45"
                                  value={parseGradient(zenBgColor).angleDeg}
                                  onChange={(e) => {
                                    const newAngle = parseInt(e.target.value, 10);
                                    const { color1, color2, color3 } = parseGradient(zenBgColor);
                                    const gradStr = color3
                                      ? `linear-gradient(${newAngle}deg, ${color1}, ${color2}, ${color3})`
                                      : `linear-gradient(${newAngle}deg, ${color1}, ${color2})`;
                                    setZenBgColor(gradStr);
                                    setIsRandomGradientsMode(false);
                                    
                                    // Persist to saved gradient list if it's currently selected
                                    if (selectedGradIndex !== null && selectedGradIndex < savedGradients.length) {
                                      const updated = [...savedGradients];
                                      updated[selectedGradIndex] = {
                                        ...updated[selectedGradIndex],
                                        angle: newAngle
                                      };
                                      setSavedGradients(updated);
                                      try {
                                        localStorage.setItem("quote_shuffle_saved_gradients", JSON.stringify(updated));
                                      } catch (err) {
                                        console.warn("Failed to save gradient angle:", err);
                                      }
                                    } else {
                                      setCustomGradientAngle(newAngle);
                                    }
                                  }}
                                  className="w-full accent-amber-500 h-1 bg-stone-300 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer"
                                />
                              </div>
                            )}

                            {/* Create Custom Gradient Form */}
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const trimmedName = newGradientName.trim();
                                if (!trimmedName) return;

                                const existingIndex = savedGradients.findIndex(
                                  (g) => g.name.toLowerCase() === trimmedName.toLowerCase()
                                );

                                const newGrad: { name: string; color1: string; color2: string; color3?: string; angle: number; textColor?: "black" | "white" } = {
                                  name: trimmedName,
                                  color1: gradientColor1,
                                  color2: gradientColor2,
                                  angle: customGradientAngle
                                };
                                if (useColor3) {
                                  newGrad.color3 = gradientColor3;
                                }
                                if (customGradientTextColor) {
                                  newGrad.textColor = customGradientTextColor;
                                }

                                if (existingIndex !== -1) {
                                  setOverwriteTarget({ index: existingIndex, newGrad });
                                } else {
                                  saveGradient(newGrad);
                                }
                              }}
                              className="flex flex-col gap-2 mt-1 pt-2 border-t border-stone-200 dark:border-stone-800"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-stone-400 uppercase">Create Gradient</span>
                                <div className="flex bg-stone-100 dark:bg-stone-900 rounded-lg p-0.5 border border-stone-200 dark:border-stone-800">
                                  <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => {
                                      setUseColor3(false);
                                      const gradStr = `linear-gradient(${customGradientAngle}deg, ${gradientColor1}, ${gradientColor2})`;
                                      setZenBgColor(gradStr);
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                                      !useColor3
                                        ? isDarkText
                                          ? "bg-white text-stone-950 shadow-sm"
                                          : "bg-stone-800 text-stone-100 shadow-sm"
                                        : "text-stone-400 hover:text-stone-200"
                                    }`}
                                  >
                                    2 Co
                                  </button>
                                  <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => {
                                      setUseColor3(true);
                                      const gradStr = `linear-gradient(${customGradientAngle}deg, ${gradientColor1}, ${gradientColor2}, ${gradientColor3})`;
                                      setZenBgColor(gradStr);
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                                      useColor3
                                        ? isDarkText
                                          ? "bg-white text-stone-950 shadow-sm"
                                          : "bg-stone-800 text-stone-100 shadow-sm"
                                        : "text-stone-400 hover:text-stone-200"
                                    }`}
                                  >
                                    3 Co
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {/* Color 1 input & Hex */}
                                <div className="flex flex-col gap-0.5 flex-1">
                                  <span className="text-[9px] text-stone-400 font-semibold">Color 1</span>
                                  <div className="flex items-center gap-1">
                                    <div className="relative w-6 h-6 rounded-md border border-stone-300 overflow-hidden shrink-0 cursor-pointer">
                                      <input
                                        type="color"
                                        tabIndex={-1}
                                        value={gradientColor1}
                                        onChange={(e) => {
                                          setGradientColor1(e.target.value);
                                          const gradStr = useColor3
                                            ? `linear-gradient(${customGradientAngle}deg, ${e.target.value}, ${gradientColor2}, ${gradientColor3})`
                                            : `linear-gradient(${customGradientAngle}deg, ${e.target.value}, ${gradientColor2})`;
                                          setZenBgColor(gradStr);
                                          setIsRandomColorsMode(false);
                                          setIsRandomGradientsMode(false);
                                          setSelectedGradIndex(null);
                                        }}
                                        className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer opacity-0"
                                      />
                                      <div className="w-full h-full" style={{ backgroundColor: gradientColor1 }} />
                                    </div>
                                    <input
                                      type="text"
                                      ref={color1InputRef}
                                      value={gradientColor1}
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) => {
                                        let val = e.target.value;
                                        if (!val.startsWith("#") && val.trim() !== "") val = "#" + val;
                                        setGradientColor1(val);
                                        if (/^#[0-9A-Fa-f]{6}$/.test(val) || /^#[0-9A-Fa-f]{3}$/.test(val)) {
                                          const gradStr = useColor3
                                            ? `linear-gradient(${customGradientAngle}deg, ${val}, ${gradientColor2}, ${gradientColor3})`
                                            : `linear-gradient(${customGradientAngle}deg, ${val}, ${gradientColor2})`;
                                          setZenBgColor(gradStr);
                                          setIsRandomColorsMode(false);
                                          setIsRandomGradientsMode(false);
                                          setSelectedGradIndex(null);
                                        }
                                      }}
                                      className={`text-[9px] font-mono w-full px-1 py-0.5 rounded-md border focus:outline-none ${
                                        isDarkText
                                          ? "bg-stone-50 border-stone-200 text-stone-850 focus:border-amber-500"
                                          : "bg-stone-950 border-stone-750 text-stone-100 focus:border-amber-500"
                                      }`}
                                      maxLength={7}
                                    />
                                  </div>
                                </div>

                                {/* Color 2 input & Hex */}
                                <div className="flex flex-col gap-0.5 flex-1">
                                  <span className="text-[9px] text-stone-400 font-semibold">Color 2</span>
                                  <div className="flex items-center gap-1">
                                    <div className="relative w-6 h-6 rounded-md border border-stone-300 overflow-hidden shrink-0 cursor-pointer">
                                      <input
                                        type="color"
                                        tabIndex={-1}
                                        value={gradientColor2}
                                        onChange={(e) => {
                                          setGradientColor2(e.target.value);
                                          const gradStr = useColor3
                                            ? `linear-gradient(${customGradientAngle}deg, ${gradientColor1}, ${e.target.value}, ${gradientColor3})`
                                            : `linear-gradient(${customGradientAngle}deg, ${gradientColor1}, ${e.target.value})`;
                                          setZenBgColor(gradStr);
                                          setIsRandomColorsMode(false);
                                          setIsRandomGradientsMode(false);
                                          setSelectedGradIndex(null);
                                        }}
                                        className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer opacity-0"
                                      />
                                      <div className="w-full h-full" style={{ backgroundColor: gradientColor2 }} />
                                    </div>
                                    <input
                                      type="text"
                                      value={gradientColor2}
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) => {
                                        let val = e.target.value;
                                        if (!val.startsWith("#") && val.trim() !== "") val = "#" + val;
                                        setGradientColor2(val);
                                        if (/^#[0-9A-Fa-f]{6}$/.test(val) || /^#[0-9A-Fa-f]{3}$/.test(val)) {
                                          const gradStr = useColor3
                                            ? `linear-gradient(${customGradientAngle}deg, ${gradientColor1}, ${val}, ${gradientColor3})`
                                            : `linear-gradient(${customGradientAngle}deg, ${gradientColor1}, ${val})`;
                                          setZenBgColor(gradStr);
                                          setIsRandomColorsMode(false);
                                          setIsRandomGradientsMode(false);
                                          setSelectedGradIndex(null);
                                        }
                                      }}
                                      className={`text-[9px] font-mono w-full px-1 py-0.5 rounded-md border focus:outline-none ${
                                        isDarkText
                                          ? "bg-stone-50 border-stone-200 text-stone-850 focus:border-amber-500"
                                          : "bg-stone-950 border-stone-750 text-stone-100 focus:border-amber-500"
                                      }`}
                                      maxLength={7}
                                    />
                                  </div>
                                </div>

                                {/* Color 3 input & Hex */}
                                {useColor3 && (
                                  <div className="flex flex-col gap-0.5 flex-1 animate-fade-in">
                                    <span className="text-[9px] text-stone-400 font-semibold">Color 3</span>
                                    <div className="flex items-center gap-1">
                                      <div className="relative w-6 h-6 rounded-md border border-stone-300 overflow-hidden shrink-0 cursor-pointer">
                                        <input
                                          type="color"
                                          tabIndex={-1}
                                          value={gradientColor3}
                                          onChange={(e) => {
                                            setGradientColor3(e.target.value);
                                            const gradStr = `linear-gradient(${customGradientAngle}deg, ${gradientColor1}, ${gradientColor2}, ${e.target.value})`;
                                            setZenBgColor(gradStr);
                                            setIsRandomColorsMode(false);
                                            setIsRandomGradientsMode(false);
                                            setSelectedGradIndex(null);
                                          }}
                                          className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer opacity-0"
                                        />
                                        <div className="w-full h-full" style={{ backgroundColor: gradientColor3 }} />
                                      </div>
                                      <input
                                        type="text"
                                        value={gradientColor3}
                                        onFocus={(e) => e.target.select()}
                                        onChange={(e) => {
                                          let val = e.target.value;
                                          if (!val.startsWith("#") && val.trim() !== "") val = "#" + val;
                                          setGradientColor3(val);
                                          if (/^#[0-9A-Fa-f]{6}$/.test(val) || /^#[0-9A-Fa-f]{3}$/.test(val)) {
                                            const gradStr = `linear-gradient(${customGradientAngle}deg, ${gradientColor1}, ${gradientColor2}, ${val})`;
                                            setZenBgColor(gradStr);
                                            setIsRandomColorsMode(false);
                                            setIsRandomGradientsMode(false);
                                            setSelectedGradIndex(null);
                                          }
                                        }}
                                        className={`text-[9px] font-mono w-full px-1 py-0.5 rounded-md border focus:outline-none ${
                                          isDarkText
                                            ? "bg-stone-50 border-stone-200 text-stone-850 focus:border-amber-500"
                                            : "bg-stone-950 border-stone-750 text-stone-100 focus:border-amber-500"
                                        }`}
                                        maxLength={7}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Text Color preference selection */}
                              <div className="flex flex-col gap-1 mt-1">
                                <span className="text-[10px] font-semibold text-stone-400 uppercase">Text Color Preference</span>
                                <div className="flex bg-stone-100 dark:bg-stone-900 rounded-lg p-0.5 border border-stone-200 dark:border-stone-800 text-[10px] font-bold">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateTextColorPreference(undefined)}
                                    className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${
                                      customGradientTextColor === undefined
                                        ? "bg-amber-500 text-white shadow-xs font-black"
                                        : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                                    }`}
                                  >
                                    Auto
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateTextColorPreference("black")}
                                    className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${
                                      customGradientTextColor === "black"
                                        ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs font-black"
                                        : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                                    }`}
                                  >
                                    Black
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateTextColorPreference("white")}
                                    className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${
                                      customGradientTextColor === "white"
                                        ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs font-black"
                                        : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                                    }`}
                                  >
                                    White
                                  </button>
                                </div>
                              </div>

                              {/* Save Section */}
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] text-stone-400 font-semibold">Save with Name</span>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="e.g. Sunset Wood"
                                    value={newGradientName}
                                    onChange={(e) => setNewGradientName(e.target.value)}
                                    className={`text-xs w-full px-2 py-1.5 rounded-lg border focus:outline-none ${
                                      isDarkText
                                        ? "bg-stone-50 border-stone-200 text-stone-850 focus:border-amber-500"
                                        : "bg-stone-950 border-stone-750 text-stone-100 focus:border-amber-500"
                                    }`}
                                    maxLength={20}
                                  />
                                  <button
                                    type="submit"
                                    disabled={!newGradientName.trim()}
                                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                                      isDarkText
                                        ? "bg-stone-900 text-white hover:bg-stone-800"
                                        : "bg-white text-stone-950 hover:bg-stone-200"
                                    }`}
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            </form>

                            {/* OK / Close Button */}
                            <button
                              type="button"
                              onClick={() => setShowColorPicker(false)}
                              className={`w-full py-2 mt-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isDarkText
                                  ? "bg-stone-900 text-white hover:bg-stone-800"
                                  : "bg-white text-stone-950 hover:bg-stone-200"
                              }`}
                            >
                              OK
                            </button>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Font Customizer Button */}
                <div className="relative">
                  <button
                    id="zen-font-picker-toggle"
                    onClick={() => {
                      setShowFontPicker(!showFontPicker);
                      setShowColorPicker(false);
                      setShowShortcuts(false);
                    }}
                    className={`p-2.5 rounded-xl transition-all border flex items-center gap-1.5 cursor-pointer ${
                      isDarkText
                        ? "border-stone-300 hover:bg-stone-200 text-stone-700"
                        : "border-stone-800 hover:bg-stone-900 text-stone-300"
                    } ${showFontPicker ? "bg-amber-100/10" : ""}`}
                    title="Customize Font Settings"
                  >
                    <Type className="w-4 h-4" />
                  </button>

                  <AnimatePresence>
                    {showFontPicker && (
                      <motion.div
                        id="zen-font-picker-dropdown"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={`absolute right-0 mt-2 p-4 rounded-2xl border shadow-2xl w-72 z-50 flex flex-col gap-3.5 ${
                          isDarkText
                            ? "bg-white border-stone-200 text-stone-800"
                            : "bg-stone-900 border-stone-800 text-stone-100"
                        }`}
                      >
                        {renderFontPickerContent(!isDarkText)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Theme Selector Button */}
                <button
                  id="zen-theme-toggle"
                  onClick={() => {
                    const nextTheme = zenTheme === "dark" ? "warm" : "dark";
                    setZenTheme(nextTheme);
                    const nextColor = nextTheme === "dark" ? "#0c0a09" : "#fafaf9";
                    handleSelectColor(nextColor);
                  }}
                  className={`p-2.5 rounded-xl transition-all border cursor-pointer ${
                    isDarkText
                      ? "border-stone-300 hover:bg-stone-200 text-stone-700"
                      : "border-stone-800 hover:bg-stone-900 text-stone-300"
                  }`}
                  title="Switch Palette Atmosphere"
                >
                  {isDarkText ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>

                {/* Keyboard Shortcuts Helper Button */}
                <div className="relative">
                  <button
                    id="zen-shortcuts-toggle"
                    onClick={() => {
                      setShowShortcuts(!showShortcuts);
                      setShowColorPicker(false);
                      setShowFontPicker(false);
                    }}
                    className={`p-2.5 rounded-xl transition-all border cursor-pointer ${
                      isDarkText
                        ? "border-stone-300 hover:bg-stone-200 text-stone-700"
                        : "border-stone-800 hover:bg-stone-900 text-stone-300"
                    } ${showShortcuts ? "bg-amber-100/10" : ""}`}
                    title="View Shortcuts Help"
                  >
                    <Keyboard className="w-4 h-4" />
                  </button>

                  <AnimatePresence>
                    {showShortcuts && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={`absolute right-0 mt-2 p-4 rounded-xl border shadow-xl w-60 z-50 ${
                          isDarkText
                            ? "bg-white border-stone-200 text-stone-700"
                            : "bg-stone-900 border-stone-800 text-stone-300"
                        }`}
                      >
                        <h5 className="font-bold text-xs uppercase mb-2 tracking-wider">
                          Keyboard Navigation
                        </h5>
                        <ul className="text-xs space-y-1.5 font-mono">
                          <li className="flex justify-between">
                            <span>Next Quote</span>
                            <kbd className={`px-1 py-0.5 rounded ${
                              isDarkText ? "bg-stone-200 text-stone-800" : "bg-stone-700 text-stone-100"
                            }`}>➔</kbd>
                          </li>
                          <li className="flex justify-between">
                            <span>Previous Quote</span>
                            <kbd className={`px-1 py-0.5 rounded ${
                              isDarkText ? "bg-stone-200 text-stone-800" : "bg-stone-700 text-stone-100"
                            }`}>L-Arrow</kbd>
                          </li>
                          <li className="flex justify-between">
                            <span>Play / Pause</span>
                            <kbd className={`px-1 py-0.5 rounded ${
                              isDarkText ? "bg-stone-200 text-stone-800" : "bg-stone-700 text-stone-100"
                            }`}>Space</kbd>
                          </li>
                          <li className="flex justify-between">
                            <span>Exit Fullscreen</span>
                            <kbd className={`px-1 py-0.5 rounded ${
                              isDarkText ? "bg-stone-200 text-stone-800" : "bg-stone-700 text-stone-100"
                            }`}>Esc</kbd>
                          </li>
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Rating Buttons in Zen Mode */}
                <div className={`flex items-center gap-1 border px-1.5 py-0.5 rounded-xl ${
                  isDarkText ? "border-stone-200 bg-stone-100/50" : "border-stone-850 bg-stone-900/50"
                }`}>
                  <button
                    id="zen-rate-up-btn"
                    onClick={() => onRateQuote?.(activeQuote.id, activeQuote.rating === 'up' ? null : 'up')}
                    className={`p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                      activeQuote.rating === 'up'
                        ? "text-emerald-500 bg-emerald-500/10"
                        : isDarkText
                        ? "text-stone-500 hover:text-emerald-600 hover:bg-stone-200"
                        : "text-stone-400 hover:text-emerald-400 hover:bg-stone-850"
                    }`}
                    title="Recommend (Thumbs Up)"
                  >
                    <ThumbsUp className={`w-4 h-4 ${activeQuote.rating === 'up' ? "fill-current" : ""}`} />
                  </button>
                  <button
                    id="zen-rate-down-btn"
                    onClick={() => onRateQuote?.(activeQuote.id, activeQuote.rating === 'down' ? null : 'down')}
                    className={`p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                      activeQuote.rating === 'down'
                        ? "text-red-500 bg-red-500/10"
                        : isDarkText
                        ? "text-stone-500 hover:text-red-600 hover:bg-stone-200"
                        : "text-stone-400 hover:text-red-400 hover:bg-stone-850"
                    }`}
                    title="Don't Recommend / Flag (Thumbs Down)"
                  >
                    <ThumbsDown className={`w-4 h-4 ${activeQuote.rating === 'down' ? "fill-current" : ""}`} />
                  </button>
                </div>

                {/* Copy Quote Button inside Zen */}
                <button
                  id="zen-copy-btn"
                  onClick={handleCopy}
                  className={`p-2.5 rounded-xl transition-all border cursor-pointer ${
                    copied
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : isDarkText
                      ? "border-stone-300 hover:bg-stone-200 text-stone-700"
                      : "border-stone-800 hover:bg-stone-900 text-stone-300"
                  }`}
                  title="Copy to Clipboard"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>

                {/* Speech Button inside Zen */}
                <button
                  id="zen-speak-btn"
                  onClick={handleSpeak}
                  className={`p-2.5 rounded-xl transition-all border cursor-pointer ${
                    isSpeaking
                      ? "border-amber-500 bg-amber-500/10 text-amber-400"
                      : isDarkText
                      ? "border-stone-300 hover:bg-stone-200 text-stone-700"
                      : "border-stone-800 hover:bg-stone-900 text-stone-300"
                  }`}
                  title="Read Aloud"
                >
                  <Volume2 className={`w-4 h-4 ${isSpeaking ? "animate-bounce" : ""}`} />
                </button>

                {/* Edit active quote from Zen Mode */}
                <button
                  id="zen-edit-btn"
                  onClick={() => {
                    setWasPlayingBeforeEdit(isPlaying);
                    setIsPlaying(false);
                    setEditText(activeQuote.text);
                    setEditAuthor(activeQuote.author || "");
                    setIsEditing(true);
                  }}
                  className={`p-2.5 rounded-xl transition-all border cursor-pointer ${
                    isDarkText
                      ? "border-stone-300 hover:bg-stone-200 text-stone-700"
                      : "border-stone-800 hover:bg-stone-900 text-stone-300"
                  }`}
                  title="Edit Quote"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                {/* Delete active quote from Zen Mode */}
                <button
                  id="zen-delete-btn"
                  onClick={() => {
                    setWasPlayingBeforeDelete(isPlaying);
                    setIsPlaying(false);
                    setIsDeleting(true);
                  }}
                  className={`p-2.5 rounded-xl transition-all border cursor-pointer ${
                    isDarkText
                      ? "border-stone-300 hover:bg-stone-200 text-stone-700 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                      : "border-stone-800 hover:bg-stone-900 text-stone-300 hover:text-red-400 hover:border-red-950 hover:bg-red-950/20"
                  }`}
                  title="Delete Quote"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Float Quotes Button inside Zen */}
                <button
                  id="zen-pip-btn"
                  onClick={togglePictureInPicture}
                  className={`p-2.5 rounded-xl transition-all border cursor-pointer ${
                    isPipActive
                      ? "border-amber-500 bg-amber-500/10 text-amber-500 animate-pulse"
                      : isDarkText
                      ? "border-stone-300 hover:bg-stone-200 text-stone-700"
                      : "border-stone-800 hover:bg-stone-900 text-stone-300"
                  }`}
                  title={isPipActive ? "Stop Floating Picture-in-Picture" : "Float Quotes Above All Windows (Picture-in-Picture)"}
                >
                  <PictureInPicture2 className="w-4 h-4" />
                </button>

                {/* Exit Fullscreen button */}
                <button
                  id="exit-zen-btn"
                  onClick={handleExitZenMode}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-sans text-xs font-bold uppercase tracking-wider shadow-sm transition-all border cursor-pointer ${
                    isDarkText
                      ? "bg-white border-stone-300 text-stone-800 hover:bg-stone-100"
                      : "bg-stone-900 border-stone-800 text-white hover:bg-stone-850"
                  }`}
                >
                  <Minimize2 className="w-4 h-4" />
                  <span>Exit Zen Mode</span>
                </button>
              </div>
            </motion.div>

            {/* Fullscreen Quote Box - Beautiful giant serif statement */}
            <div 
              className="flex-1 flex flex-col justify-center mx-auto w-full relative pointer-events-none transition-all duration-300"
              style={{ maxWidth: `${zenTextWidth}%` }}
            >
              {/* Giant abstract watermark quotes */}
              <div
                style={{ color: isDarkText ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)" }}
                className="absolute top-0 left-0 text-[200px] md:text-[320px] font-serif select-none pointer-events-none leading-none font-black -translate-x-8 -translate-y-16"
              >
                “
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeQuote.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="relative z-10 flex flex-col justify-center"
                >
                  <blockquote
                    id="zen-quote-text"
                    className="font-quote font-medium leading-relaxed tracking-tight"
                    style={{ 
                      "--quote-font": isGreekText(activeQuote.text) ? "var(--quote-font-el)" : "var(--quote-font-en)",
                      fontSize: `${getQuoteFontSize(activeQuote, true)}px`
                    } as React.CSSProperties}
                  >
                    "{renderFormattedText(activeQuote.text)}"
                  </blockquote>

                  <cite
                    id="zen-quote-author"
                    className={`block font-sans not-italic text-sm md:text-xl font-bold tracking-wider uppercase mt-8 md:mt-12 ${
                      isDarkText ? "text-amber-850" : "text-amber-400"
                    }`}
                  >
                    — {activeQuote.author}
                  </cite>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom Playbar Controls */}
            <motion.div
              id="zen-bottom-bar"
              animate={{
                y: isControlsVisible ? 0 : 60,
                opacity: isControlsVisible ? 1 : 0,
                pointerEvents: isControlsVisible ? "auto" : "none"
              }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="flex flex-col md:flex-row items-center justify-between gap-6 z-10 border-t pt-6 border-stone-800/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Autoplay status text */}
              <div className="text-xs font-mono flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isPlaying ? "bg-emerald-500 animate-ping" : isDarkText ? "bg-stone-400" : "bg-stone-600"}`} />
                <span>
                  {isPlaying ? `Autoplay is Active (next in ${speed}s)` : "Slideshow is Paused"}
                </span>
              </div>

              {/* Player Row */}
              <div className="flex items-center gap-4">
                <button
                  id="zen-prev-btn"
                  onClick={handlePrev}
                  disabled={!!initialQuoteId}
                  className={`p-3.5 border rounded-2xl transition-all ${
                    !!initialQuoteId
                      ? "opacity-30 cursor-not-allowed border-transparent text-stone-300"
                      : isDarkText
                      ? "border-stone-300 bg-white hover:bg-stone-100 text-stone-800 cursor-pointer"
                      : "border-stone-800 bg-stone-900 hover:bg-stone-850 text-white cursor-pointer"
                  }`}
                  title={initialQuoteId ? "Previous button is disabled during individual quote preview" : "Previous (Left Arrow)"}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  id="zen-play-pause-btn"
                  disabled={!!initialQuoteId}
                  onClick={() => {
                    if (!initialQuoteId) {
                      setIsPlaying(!isPlaying);
                    }
                  }}
                  className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-bold tracking-wider shadow-lg transition-all transform active:scale-95 ${
                    initialQuoteId
                      ? "opacity-40 cursor-not-allowed bg-stone-100 text-stone-400 border border-stone-200"
                      : isPlaying
                      ? "bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
                      : isDarkText
                      ? "bg-stone-900 text-white hover:bg-stone-850 cursor-pointer"
                      : "bg-white text-stone-950 hover:bg-stone-200 cursor-pointer"
                  }`}
                  title={initialQuoteId ? "Autoplay is disabled during individual quote preview" : "Play / Pause (Space)"}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{isPlaying ? "Pause" : "Auto Play"}</span>
                </button>

                <button
                  id="zen-next-btn"
                  onClick={handleNext}
                  disabled={!!initialQuoteId}
                  className={`p-3.5 border rounded-2xl transition-all ${
                    initialQuoteId
                      ? "opacity-30 cursor-not-allowed border-transparent text-stone-300"
                      : isDarkText
                      ? "border-stone-300 bg-white hover:bg-stone-100 text-stone-800 cursor-pointer"
                      : "border-stone-800 bg-stone-900 hover:bg-stone-850 text-white cursor-pointer"
                  }`}
                  title={initialQuoteId ? "Next button is disabled during individual quote preview" : "Next Random (Right Arrow)"}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Speeds Controller in Zen */}
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                  Delay Speed:
                </span>
                <div className={`p-1 rounded-xl border flex items-center ${
                  isDarkText ? "bg-stone-200/50 border-stone-300" : "bg-stone-900 border-stone-800"
                }`}>
                  {[10, 20, 30, 60].map((s) => (
                    <button
                      key={s}
                      disabled={!!initialQuoteId}
                      onClick={() => {
                        if (!initialQuoteId) {
                          setSpeed(s);
                        }
                      }}
                      className={`text-xs px-3.5 py-1.5 rounded-lg font-mono font-bold transition-all ${
                        initialQuoteId
                          ? "opacity-30 cursor-not-allowed text-stone-400"
                          : speed === s
                          ? isDarkText
                            ? "bg-white text-stone-900 shadow-sm cursor-pointer"
                            : "bg-stone-850 text-amber-400 shadow-sm cursor-pointer"
                          : "opacity-50 hover:opacity-100 cursor-pointer"
                      }`}
                      title={initialQuoteId ? "Delay speed is deactivated during preview" : `${s}s delay`}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Absolute loading bar for autoplay */}
            {isPlaying && (
              <motion.div
                animate={{ opacity: isControlsVisible ? 1 : 0 }}
                transition={{ duration: 0.35 }}
                className="absolute bottom-0 left-0 h-1.5 w-full bg-stone-800/10"
              >
                <motion.div
                  key={`${activeQuote.id}-${speed}-${isPlaying}-${timerTrigger}`}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: speed, ease: "linear" }}
                  className="h-full bg-amber-600"
                />
              </motion.div>
            )}

            {/* Right click menu for custom font size adjustment */}
            {zenContextMenu?.visible && (
              <div
                id="zen-font-context-menu"
                className={`absolute border rounded-2xl shadow-xl p-4.5 z-[250] text-left w-[280px] animate-fade-in ${
                  isDarkText 
                    ? "bg-white/95 backdrop-blur-md border-stone-200 text-stone-800" 
                    : "bg-stone-900/95 backdrop-blur-md border-stone-800 text-stone-100"
                }`}
                style={{
                  top: `${Math.min(window.innerHeight - 180, zenContextMenu.y)}px`,
                  left: `${Math.min(window.innerWidth - 300, zenContextMenu.x)}px`,
                }}
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.preventDefault()}
              >
                <div className="flex items-center justify-between mb-3 border-b pb-2 border-stone-550/10">
                  <span className="text-xs font-bold font-sans uppercase tracking-wider flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    Adjust Font Size
                  </span>
                  <button
                    onClick={() => setZenContextMenu(null)}
                    className="p-1 hover:bg-stone-500/10 rounded-lg cursor-pointer text-stone-400 hover:text-stone-200 text-xs leading-none"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3.5">
                  {/* Display current font size info */}
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="opacity-60">Current Size:</span>
                    <span className="font-bold text-amber-500">
                      {getQuoteFontSize(activeQuote, true)}px
                      {activeQuote.fontSize ? " (Locked)" : " (Auto)"}
                    </span>
                  </div>

                  {/* Range Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] opacity-50 font-sans">
                      <span>Small (16px)</span>
                      <span>Large (96px)</span>
                    </div>
                    <input
                      type="range"
                      min="16"
                      max="96"
                      value={getQuoteFontSize(activeQuote, true)}
                      onChange={(e) => {
                        const size = parseInt(e.target.value, 10);
                        if (onUpdateQuote) {
                          onUpdateQuote(activeQuote.id, activeQuote.text, activeQuote.author, activeQuote.categoryId, size);
                        }
                      }}
                      className="w-full accent-amber-500 h-1.5 bg-stone-500/20 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Mode Indicator / Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] opacity-60">
                      {activeQuote.fontSize ? "Manual Size Locked" : "Auto-Scaling Mode"}
                    </span>
                    {activeQuote.fontSize && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onUpdateQuote) {
                            onUpdateQuote(activeQuote.id, activeQuote.text, activeQuote.author, activeQuote.categoryId, -1);
                          }
                        }}
                        className="text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold px-2 py-1 rounded-lg cursor-pointer transition-colors"
                      >
                        Reset to Auto
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Active Quote Modal */}
      {isEditing && activeQuote && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-stone-200"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-600" />
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  Edit Slideshow Quote
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsEditing(false);
                  if (wasPlayingBeforeEdit) {
                    setIsPlaying(true);
                  }
                }}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
                  <label htmlFor="player-edit-textarea" className="font-sans uppercase tracking-wider text-[10px]">
                    Quote Text
                  </label>
                  <span className="text-[10px] font-mono opacity-65">
                    {editText.length}/700
                  </span>
                </div>
                <textarea
                  id="player-edit-textarea"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onContextMenu={handleContextMenu}
                  maxLength={700}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-4 py-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all resize-none font-serif italic"
                  rows={4}
                  placeholder="Highlight text and right-click to format!"
                />
                <span className="text-[10px] text-stone-400 mt-1">
                  Tip: Select text and right-click to apply formatting like Bold, Italic, Underline, or Highlight!
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="player-edit-author" className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Author
                </label>
                <input
                  id="player-edit-author"
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-stone-800 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all font-sans"
                  placeholder="Author name (optional)"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-stone-100">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    if (wasPlayingBeforeEdit) {
                      setIsPlaying(true);
                    }
                  }}
                  className="px-4 py-2 text-stone-500 hover:text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!activeQuote) return;
                    onUpdateQuote?.(activeQuote.id, editText, editAuthor);
                    setIsEditing(false);
                    if (wasPlayingBeforeEdit) {
                      setIsPlaying(true);
                    }
                  }}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Overwrite Preset Confirmation Modal */}
      {overwriteTarget && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800"
          >
            <div className="flex items-center gap-3 border-b border-stone-100 dark:border-stone-800 pb-3 mb-4">
              <div className="p-2 rounded-full bg-amber-50 dark:bg-amber-950/50">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-sans font-bold text-lg text-stone-900 dark:text-stone-100">
                Overwrite Preset?
              </h3>
            </div>

            <p className="text-sm text-stone-600 dark:text-stone-300 mb-6 leading-relaxed">
              A preset named <strong className="text-stone-900 dark:text-stone-100">"{savedGradients[overwriteTarget.index]?.name}"</strong> already exists. Would you like to overwrite it with the new colors?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOverwriteTarget(null)}
                className="px-4 py-2 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  saveGradient(overwriteTarget.newGrad, overwriteTarget.index);
                  setOverwriteTarget(null);
                }}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                Overwrite
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Quote Confirmation Modal */}
      {isDeleting && activeQuote && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-2xl border border-stone-200 dark:border-stone-800"
          >
            <div className="flex items-center gap-3 border-b border-stone-100 dark:border-stone-800 pb-3 mb-4">
              <div className="p-2 rounded-full bg-red-50 dark:bg-red-950/50">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-sans font-bold text-lg text-stone-900 dark:text-stone-100">
                Delete Quote?
              </h3>
            </div>

            <p className="text-sm text-stone-600 dark:text-stone-300 mb-4 leading-relaxed">
              Are you sure you want to delete this quote? This action is permanent and cannot be undone.
            </p>

            <div className="p-3 bg-stone-50 dark:bg-stone-850 rounded-2xl border border-stone-100 dark:border-stone-800 mb-6 max-h-32 overflow-y-auto">
              <p className="text-xs italic text-stone-500 dark:text-stone-400 font-serif leading-relaxed">
                "{stripFormatTags(activeQuote.text)}"
              </p>
              {activeQuote.author && (
                <p className="text-[10px] text-stone-400 dark:text-stone-500 font-mono mt-1 text-right">
                  — {activeQuote.author}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleting(false);
                  if (wasPlayingBeforeDelete) {
                    setIsPlaying(true);
                  }
                }}
                className="px-4 py-2 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteActiveQuote}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs animate-fade-in"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Floating Custom Right-Click Context Menu for Text Formatting */}
      {contextMenu && contextMenu.visible && (
        <div
          id="text-format-context-menu-player"
          className="fixed z-[250] min-w-[170px] bg-white border border-stone-200 shadow-2xl rounded-2xl p-1.5 flex flex-col gap-0.5 animate-fade-in select-none"
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100 mb-1">
            Formatting Options
          </div>

          <button
            type="button"
            id="player-format-bold-btn"
            onClick={() => applyFormat("bold")}
            className="flex items-center gap-2 px-2.5 py-1.5 text-stone-700 hover:bg-stone-50 rounded-xl text-left font-sans text-xs font-semibold cursor-pointer transition-colors"
          >
            <Bold className="w-3.5 h-3.5 text-amber-600" />
            <span>Bold</span>
          </button>

          <button
            type="button"
            id="player-format-italic-btn"
            onClick={() => applyFormat("italic")}
            className="flex items-center gap-2 px-2.5 py-1.5 text-stone-700 hover:bg-stone-50 rounded-xl text-left font-sans text-xs font-semibold cursor-pointer transition-colors"
          >
            <Italic className="w-3.5 h-3.5 text-amber-600" />
            <span>Italic</span>
          </button>

          <button
            type="button"
            id="player-format-capitalize-btn"
            onClick={() => applyFormat("capitalize")}
            className="flex items-center gap-2 px-2.5 py-1.5 text-stone-700 hover:bg-stone-50 rounded-xl text-left font-sans text-xs font-semibold cursor-pointer transition-colors"
          >
            <Type className="w-3.5 h-3.5 text-amber-600" />
            <span>Capitalize</span>
          </button>

          <button
            type="button"
            id="player-format-underline-btn"
            onClick={() => applyFormat("underline")}
            className="flex items-center gap-2 px-2.5 py-1.5 text-stone-700 hover:bg-stone-50 rounded-xl text-left font-sans text-xs font-semibold cursor-pointer transition-colors"
          >
            <Underline className="w-3.5 h-3.5 text-amber-600" />
            <span>Underline</span>
          </button>

          <button
            type="button"
            id="player-format-highlight-btn"
            onClick={() => applyFormat("highlight")}
            className="flex items-center gap-2 px-2.5 py-1.5 text-stone-700 hover:bg-stone-50 rounded-xl text-left font-sans text-xs font-semibold cursor-pointer transition-colors"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-600" />
            <span>Highlight</span>
          </button>

          <div className="h-px bg-stone-100 my-1" />

          <button
            type="button"
            id="player-format-remove-btn"
            onClick={() => applyFormat("remove")}
            className="flex items-center gap-2 px-2.5 py-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-850 rounded-xl text-left font-sans text-xs font-semibold cursor-pointer transition-colors"
          >
            <Eraser className="w-3.5 h-3.5 text-stone-400" />
            <span>Remove Formatting</span>
          </button>
        </div>
      )}
    </div>
  );
}
