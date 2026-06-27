import React, { useState, useEffect } from "react";
import { Category, Quote, Folder, QUOTE_FONTS } from "./types";
import { DEFAULT_CATEGORIES, DEFAULT_QUOTES } from "./defaultData";
import Sidebar from "./components/Sidebar";
import ShufflePlayer from "./components/ShufflePlayer";
import QuoteManager from "./components/QuoteManager";
import AdminPanel from "./components/AdminPanel";
import ImportExportModal from "./components/ImportExportModal";
import { Menu, X, Shuffle, BookOpen, Sparkles, BookMarked, FileJson, ShieldAlert, Search, ArrowRight, AlertTriangle } from "lucide-react";
import SearchModal from "./components/SearchModal";
import SelectionFormattingToolbar from "./components/SelectionFormattingToolbar";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  
  // Folders State
  const [folders, setFolders] = useState<Folder[]>(() => {
    try {
      const stored = localStorage.getItem("quote_shuffle_folders");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("LocalStorage access blocked or failed for folders, using defaults.", e);
    }
    return [
      { id: "forex", name: "FOREX" },
      { id: "bible", name: "BIBLE" },
    ];
  });

  // State Initialization from LocalStorage or Default Data
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const stored = localStorage.getItem("quote_shuffle_categories");
      if (stored) {
        const parsed = JSON.parse(stored) as Category[];
        // Backwards compatibility: ensure all categories have a folderId, defaulting to forex
        return parsed.map((cat) => ({
          ...cat,
          folderId: cat.folderId || "forex",
        }));
      }
    } catch (e) {
      console.error("LocalStorage access blocked or failed for categories, using defaults.", e);
    }
    return DEFAULT_CATEGORIES;
  });

  const [quotes, setQuotes] = useState<Quote[]>(() => {
    try {
      const stored = localStorage.getItem("quote_shuffle_quotes");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("LocalStorage access blocked or failed for quotes, using defaults.", e);
    }
    return DEFAULT_QUOTES;
  });

  const [activeCategoryId, setActiveCategoryId] = useState<string>(() => {
    return categories.length > 0 ? categories[0].id : "";
  });

  const [activeTab, setActiveTab] = useState<"player" | "manage" | "admin">("player");
  const [shuffleFavoritesOnly, setShuffleFavoritesOnly] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Search and Search-Slideshow Play States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSearchPlayList, setActiveSearchPlayList] = useState<Quote[] | null>(null);
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [initialQuoteId, setInitialQuoteId] = useState<string | null>(null);

  const [selectedFontId, setSelectedFontId] = useState<string>(() => {
    return localStorage.getItem("quote_shuffle_font_id") || "playfair-display";
  });

  const [selectedGreekFontId, setSelectedGreekFontId] = useState<string>(() => {
    return localStorage.getItem("quote_shuffle_greek_font_id") || "gfs-didot";
  });

  const [previewEn, setPreviewEn] = useState<string>(() => {
    return localStorage.getItem("quote_shuffle_preview_en") || "True wisdom comes to each of us when we realize how little we understand about life, ourselves, and the world around us.";
  });

  const [previewEl, setPreviewEl] = useState<string>(() => {
    return localStorage.getItem("quote_shuffle_preview_el") || "Η αληθινή σοφία έρχεται στον καθένα μας όταν συνειδητοποιήσουμε πόσο λίγο κατανοούμε τη ζωή, τον εαυτό μας και τον κόσμο γύρω μας.";
  });

  const handleUpdateQuoteText = (id: string, newText: string) => {
    if (id === "preview-en") {
      setPreviewEn(newText);
      localStorage.setItem("quote_shuffle_preview_en", newText);
    } else if (id === "preview-el") {
      setPreviewEl(newText);
      localStorage.setItem("quote_shuffle_preview_el", newText);
    } else {
      setQuotes((prevQuotes) => {
        const updated = prevQuotes.map((q) => (q.id === id ? { ...q, text: newText } : q));
        try {
          localStorage.setItem("quote_shuffle_quotes", JSON.stringify(updated));
        } catch (e) {
          console.warn("Could not save quotes to localStorage:", e);
        }
        return updated;
      });
    }
  };

  // Load selected Google font dynamically and save choice
  useEffect(() => {
    try {
      localStorage.setItem("quote_shuffle_font_id", selectedFontId);
    } catch (e) {
      console.warn("Could not save font setting to localStorage:", e);
    }

    const selectedFont = QUOTE_FONTS.find((f) => f.id === selectedFontId);
    if (selectedFont) {
      const fontLinkId = `google-font-${selectedFont.id}`;
      if (!document.getElementById(fontLinkId)) {
        const link = document.createElement("link");
        link.id = fontLinkId;
        link.rel = "stylesheet";
        const encodedFamily = encodeURIComponent(selectedFont.family);
        link.href = `https://fonts.googleapis.com/css2?family=${encodedFamily}&display=swap`;
        document.head.appendChild(link);
      }
    }
  }, [selectedFontId]);

  // Load selected Greek Google font dynamically and save choice
  useEffect(() => {
    try {
      localStorage.setItem("quote_shuffle_greek_font_id", selectedGreekFontId);
    } catch (e) {
      console.warn("Could not save Greek font setting to localStorage:", e);
    }

    const selectedFont = QUOTE_FONTS.find((f) => f.id === selectedGreekFontId);
    if (selectedFont) {
      const fontLinkId = `google-font-${selectedFont.id}`;
      if (!document.getElementById(fontLinkId)) {
        const link = document.createElement("link");
        link.id = fontLinkId;
        link.rel = "stylesheet";
        const encodedFamily = encodeURIComponent(selectedFont.family);
        link.href = `https://fonts.googleapis.com/css2?family=${encodedFamily}&display=swap`;
        document.head.appendChild(link);
      }
    }
  }, [selectedGreekFontId]);


  // Persist state updates to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem("quote_shuffle_folders", JSON.stringify(folders));
    } catch (e) {
      console.warn("Could not save folders to localStorage:", e);
    }
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem("quote_shuffle_categories", JSON.stringify(categories));
    } catch (e) {
      console.warn("Could not save categories to localStorage:", e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem("quote_shuffle_quotes", JSON.stringify(quotes));
    } catch (e) {
      console.warn("Could not save quotes to localStorage:", e);
    }
  }, [quotes]);

  // Handlers for Folders
  const handleAddFolder = (name: string) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      isCustom: true,
    };
    setFolders((prev) => [...prev, newFolder]);
  };

  const handleDeleteFolder = (folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    // Also delete all categories belonging to this folder, and all their quotes
    const deletedCatIds = categories.filter((c) => c.folderId === folderId).map((c) => c.id);
    setCategories((prev) => prev.filter((c) => c.folderId !== folderId));
    setQuotes((prev) => prev.filter((q) => !deletedCatIds.includes(q.categoryId)));

    // Reset active category if it was deleted
    if (deletedCatIds.includes(activeCategoryId)) {
      const remaining = categories.filter((c) => c.folderId !== folderId);
      if (remaining.length > 0) {
        setActiveCategoryId(remaining[0].id);
      } else {
        setActiveCategoryId("");
      }
    }
  };

  const handleUpdateFolder = (id: string, name: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name } : f))
    );
  };

  // Handlers for Categories
  const handleAddCategory = (name: string, folderId?: string) => {
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name,
      folderId: folderId || "forex",
      isCustom: true,
      isShufflable: true,
    };
    setCategories((prev) => [...prev, newCategory]);
    setActiveCategoryId(newCategory.id);
  };

  const handleDeleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
    // Also delete all quotes under this deleted category
    setQuotes((prev) => prev.filter((quote) => quote.categoryId !== id));

    // If the active category was deleted, move active state to first remaining
    if (activeCategoryId === id) {
      const remaining = categories.filter((cat) => cat.id !== id);
      if (remaining.length > 0) {
        setActiveCategoryId(remaining[0].id);
      } else {
        setActiveCategoryId("");
      }
    }
  };

  const handleToggleShuffle = (id: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === id ? { ...cat, isShufflable: !cat.isShufflable } : cat
      )
    );
  };

  const handleToggleAllShuffle = (enable: boolean) => {
    setCategories((prev) =>
      prev.map((cat) => ({ ...cat, isShufflable: enable }))
    );
  };

  const handleToggleFolderShuffle = (folderId: string, enable: boolean) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.folderId === folderId ? { ...cat, isShufflable: enable } : cat))
    );
  };

  const handleUpdateCategory = (id: string, name: string, folderId?: string) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, name, folderId: folderId ?? cat.folderId } : cat))
    );
  };

  // Drag and drop bulk move quotes confirmation
  const [pendingMove, setPendingMove] = useState<{
    quoteIds: string[];
    sourceCategoryId: string;
    targetCategoryId: string;
  } | null>(null);

  const [moveQuoteIds, setMoveQuoteIds] = useState<string[]>([]);
  const [moveFontSizeLevel, setMoveFontSizeLevel] = useState<number>(5);
  const [moveModalFilter, setMoveModalFilter] = useState<"all" | "unique" | "new">("all");
  const [dragActionMode, setDragActionMode] = useState<"move" | "copy">("move");

  const handleInitiateMoveQuotes = (quoteIds: string[], sourceCategoryId: string, targetCategoryId: string) => {
    setPendingMove({ quoteIds, sourceCategoryId, targetCategoryId });
    setMoveQuoteIds(quoteIds);
    setMoveModalFilter("all");
    setMoveFontSizeLevel(5);
    setDragActionMode("move");
  };

  const handleUpdateCategoryFolder = (categoryId: string, folderId: string) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === categoryId ? { ...cat, folderId } : cat))
    );
  };

  // Helper to check if a quote text already exists and where relative to the move target
  const checkMoveQuoteExistence = (parsedText: string, currentQuoteId: string) => {
    const clean = (str: string) => {
      return str
        .toLowerCase()
        .replace(/["'“”‘’]/g, "") // remove quotes
        .replace(/[\s\p{P}]/gu, "") // remove all whitespace and punctuation
        .trim();
    };

    const parsedClean = clean(parsedText);
    if (!parsedClean) return { status: "new" as const };

    // Check if there is another quote in the target category with the same text
    const matchInTarget = quotes.find(
      (existing) =>
        existing.categoryId === pendingMove?.targetCategoryId &&
        existing.id !== currentQuoteId &&
        clean(existing.text) === parsedClean
    );
    if (matchInTarget) {
      return { status: "same_category" as const, matchedQuote: matchInTarget };
    }

    // Is it in any OTHER category besides source and target?
    const matchInOther = quotes.find(
      (existing) =>
        existing.categoryId !== pendingMove?.targetCategoryId &&
        existing.categoryId !== pendingMove?.sourceCategoryId &&
        existing.id !== currentQuoteId &&
        clean(existing.text) === parsedClean
    );
    if (matchInOther) {
      const otherCat = categories.find((c) => c.id === matchInOther.categoryId);
      return { status: "other_category" as const, matchedQuote: matchInOther, otherCategoryName: otherCat?.name || "Another Category" };
    }

    return { status: "new" as const };
  };

  const getBulkFontSizeClass = (level: number) => {
    switch (level) {
      case 1: return "text-sm md:text-base";
      case 2: return "text-base md:text-lg";
      case 3: return "text-lg md:text-xl";
      case 4: return "text-xl md:text-2xl";
      case 5: return "text-2xl md:text-3xl";
      case 6: return "text-3xl md:text-4xl";
      case 7: return "text-4xl md:text-5xl";
      case 8: return "text-5xl md:text-6xl font-medium";
      default: return "text-2xl md:text-3xl";
    }
  };

  // Computed values for Move Quotes modal
  const sourceCategory = pendingMove ? categories.find(c => c.id === pendingMove.sourceCategoryId) : null;
  const targetCategory = pendingMove ? categories.find(c => c.id === pendingMove.targetCategoryId) : null;

  const draggedQuotes = pendingMove ? quotes.filter(q => pendingMove.quoteIds.includes(q.id)) : [];
  const activeMoveQuotes = pendingMove ? quotes.filter(q => moveQuoteIds.includes(q.id)) : [];

  const moveDuplicates = activeMoveQuotes.filter(q => {
    const status = checkMoveQuoteExistence(q.text, q.id).status;
    return status === "same_category";
  });

  const moveUniques = activeMoveQuotes.filter(q => {
    const status = checkMoveQuoteExistence(q.text, q.id).status;
    return status !== "same_category";
  });

  const moveNews = activeMoveQuotes.filter(q => {
    const status = checkMoveQuoteExistence(q.text, q.id).status;
    return status === "new";
  });

  const visibleMovedQuotes =
    moveModalFilter === "unique" ? moveUniques :
    moveModalFilter === "new" ? moveNews :
    activeMoveQuotes;

  const handleExecuteMove = (onlyMoveUnique: boolean) => {
    if (!pendingMove) return;
    const { targetCategoryId } = pendingMove;
    const quotesToProcess = onlyMoveUnique ? moveUniques : activeMoveQuotes;

    if (dragActionMode === "copy") {
      const newQuotes: Quote[] = quotesToProcess.map((q, idx) => ({
        id: `quote-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        text: q.text,
        author: q.author,
        categoryId: targetCategoryId,
        createdAt: Date.now() - idx * 1000,
        rating: q.rating,
      }));
      setQuotes(prev => [...newQuotes, ...prev]);
    } else {
      const idsToMove = quotesToProcess.map(q => q.id);
      setQuotes(prev =>
        prev.map(q => (idsToMove.includes(q.id) ? { ...q, categoryId: targetCategoryId } : q))
      );
    }
    setPendingMove(null);
  };

  // Handlers for Quotes
  const handleAddQuote = (text: string, author: string, categoryId: string, rating?: 'up' | 'down' | null) => {
    const newQuote: Quote = {
      id: `quote-${Date.now()}`,
      text,
      author: author || "Unknown",
      categoryId,
      createdAt: Date.now(),
      rating: rating || null,
    };
    setQuotes((prev) => [newQuote, ...prev]);
  };

   const handleDeleteQuote = (id: string) => {
    setQuotes((prev) => prev.filter((q) => q.id !== id));
  };

  const handleRateQuote = (id: string, rating: 'up' | 'down' | null) => {
    setQuotes((prev) =>
      prev.map((q) => (q.id === id ? { ...q, rating } : q))
    );
  };

  const handleUpdateQuote = (id: string, text: string, author: string, categoryId?: string) => {
    setQuotes((prev) =>
      prev.map((q) => (q.id === id ? { ...q, text, author, categoryId: categoryId ?? q.categoryId } : q))
    );
  };

  const handleReorderQuotes = (reorderedForCategory: Quote[]) => {
    const now = Date.now();
    const updatedCategoryQuotes = reorderedForCategory.map((q, idx) => ({
      ...q,
      createdAt: now - idx * 1000,
    }));

    setQuotes((prev) => {
      const otherCategoryQuotes = prev.filter((q) => q.categoryId !== activeCategoryId);
      return [...otherCategoryQuotes, ...updatedCategoryQuotes];
    });
  };

  const handleImport = (
    importedCategories: Category[],
    importedQuotes: Quote[],
    mode: "merge" | "overwrite",
    importedFolders?: Folder[]
  ) => {
    if (mode === "overwrite") {
      if (importedFolders && importedFolders.length > 0) {
        setFolders(importedFolders);
      } else {
        setFolders([
          { id: "forex", name: "FOREX", isCustom: false },
          { id: "bible", name: "BIBLE", isCustom: false }
        ]);
      }

      const mappedCats = importedCategories.map(c => ({
        ...c,
        folderId: c.folderId || "forex"
      }));
      setCategories(mappedCats);
      setQuotes(importedQuotes);
      if (mappedCats.length > 0) {
        setActiveCategoryId(mappedCats[0].id);
      }
    } else {
      // MERGE MODE
      if (importedFolders && importedFolders.length > 0) {
        setFolders((prev) => {
          const updatedFolders = [...prev];
          importedFolders.forEach((f) => {
            const exists = updatedFolders.find(
              (uf) => uf.id === f.id || uf.name.toLowerCase() === f.name.toLowerCase()
            );
            if (!exists) {
              updatedFolders.push(f);
            }
          });
          return updatedFolders;
        });
      }

      const updatedCategories = [...categories];
      importedCategories.forEach((importedCat) => {
        const withFolder = {
          ...importedCat,
          folderId: importedCat.folderId || "forex"
        };
        const exists = updatedCategories.find(
          (c) =>
            c.id === withFolder.id ||
            c.name.toLowerCase() === withFolder.name.toLowerCase()
        );
        if (!exists) {
          updatedCategories.push(withFolder);
        }
      });

      const updatedQuotes = [...quotes];
      importedQuotes.forEach((importedQuote) => {
        // If imported category was matched with an existing one with different ID, map it!
        let finalCatId = importedQuote.categoryId;
        const importedCat = importedCategories.find(c => c.id === importedQuote.categoryId);
        if (importedCat) {
          const matchingExistingCat = updatedCategories.find(
            c => c.name.toLowerCase() === importedCat.name.toLowerCase()
          );
          if (matchingExistingCat) {
            finalCatId = matchingExistingCat.id;
          }
        }

        const quoteExists = updatedQuotes.find(
          (q) =>
            q.text.toLowerCase().trim() === importedQuote.text.toLowerCase().trim()
        );

        if (!quoteExists) {
          updatedQuotes.push({
            ...importedQuote,
            categoryId: finalCatId,
          });
        }
      });

      setCategories(updatedCategories);
      setQuotes(updatedQuotes);
    }
  };

  const handlePlaySearchResults = (results: Quote[], query: string) => {
    setActiveSearchPlayList(results);
    setActiveSearchQuery(query);
    setShuffleFavoritesOnly(false);
    setActiveTab("player");
    setIsSearchOpen(false);
  };

  // Derived properties
  const activeCategory = categories.find((c) => c.id === activeCategoryId);
  const filteredQuotes = quotes.filter((q) => q.categoryId === activeCategoryId);
  const activeFont = QUOTE_FONTS.find((f) => f.id === selectedFontId) || QUOTE_FONTS[0];
  const activeGreekFont = QUOTE_FONTS.find((f) => f.id === selectedGreekFontId) || QUOTE_FONTS[0];

  return (
    <div
      id="quote-app-root"
      className="flex flex-col md:flex-row h-screen w-screen bg-stone-50/50 text-stone-800 font-sans overflow-hidden"
      style={{ 
        "--quote-font-en": activeFont.cssValue,
        "--quote-font-el": activeGreekFont.cssValue,
        "--quote-font": activeFont.cssValue 
      } as React.CSSProperties}
    >
      {/* Mobile Header Banner */}
      <div className="md:hidden bg-stone-900 text-white p-4 flex items-center justify-between border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-amber-500" />
          <span className="font-serif font-bold text-lg">Quote Shuffle</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            id="mobile-backup-trigger"
            onClick={() => setIsImportExportOpen(true)}
            className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-300 hover:text-white transition-colors cursor-pointer"
            title="Import or Export Library"
          >
            <FileJson className="w-5 h-5 text-amber-500" />
          </button>
          <button
            id="mobile-drawer-toggle"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1.5 hover:bg-stone-800 rounded-lg transition-colors"
            title="Open Categories"
          >
            <Menu className="w-5.5 h-5.5" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Sidebar Panel Container */}
          <div className="relative flex flex-col w-80 max-w-[85vw] bg-white h-full shadow-2xl transition-transform transform duration-300">
            {/* Close button inside drawer */}
            <button
              id="close-drawer-btn"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 bg-stone-100 text-stone-600 rounded-full hover:bg-stone-200 transition-all z-10"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex-1 overflow-hidden" onClick={() => setIsMobileSidebarOpen(false)}>
              <Sidebar
                folders={folders}
                categories={categories}
                quotes={quotes}
                activeCategoryId={activeCategoryId}
                setActiveCategoryId={setActiveCategoryId}
                onAddFolder={handleAddFolder}
                onDeleteFolder={handleDeleteFolder}
                onUpdateFolder={handleUpdateFolder}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
                onToggleShuffle={handleToggleShuffle}
                onToggleAllShuffle={handleToggleAllShuffle}
                shuffleFavoritesOnly={activeTab === "player" && shuffleFavoritesOnly}
                onDisableFavoritesOnly={() => setShuffleFavoritesOnly(false)}
                onUpdateCategoryFolder={handleUpdateCategoryFolder}
                onMoveQuotes={handleInitiateMoveQuotes}
                onToggleFolderShuffle={handleToggleFolderShuffle}
              />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Visible on large screens) */}
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar
          folders={folders}
          categories={categories}
          quotes={quotes}
          activeCategoryId={activeCategoryId}
          setActiveCategoryId={setActiveCategoryId}
          onAddFolder={handleAddFolder}
          onDeleteFolder={handleDeleteFolder}
          onUpdateFolder={handleUpdateFolder}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onToggleShuffle={handleToggleShuffle}
          onToggleAllShuffle={handleToggleAllShuffle}
          shuffleFavoritesOnly={activeTab === "player" && shuffleFavoritesOnly}
          onDisableFavoritesOnly={() => setShuffleFavoritesOnly(false)}
          onUpdateCategoryFolder={handleUpdateCategoryFolder}
          onMoveQuotes={handleInitiateMoveQuotes}
          onToggleFolderShuffle={handleToggleFolderShuffle}
        />
      </div>

      {/* Main Right Panel */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-stone-50/20">
        {/* Navigation Tabs Bar */}
        <div id="master-tabs-bar" className="bg-white border-b border-stone-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          {/* Active indicator or title */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Mode Selection
              </span>
            </div>
            <button
              id="import-export-trigger-btn"
              onClick={() => setIsImportExportOpen(true)}
              className="flex items-center gap-1.5 border border-stone-200 hover:border-amber-500 hover:text-amber-850 bg-white text-stone-600 font-sans text-xs font-semibold py-1.5 px-3 rounded-xl shadow-xs transition-all cursor-pointer hover:bg-stone-50"
              title="Import or Export Library"
            >
              <FileJson className="w-4 h-4 text-amber-600" />
              <span>Backup (JSON)</span>
            </button>

            <button
              id="search-library-trigger-btn"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-1.5 border border-stone-200 hover:border-amber-500 hover:text-amber-850 bg-white text-stone-600 font-sans text-xs font-semibold py-1.5 px-3 rounded-xl shadow-xs transition-all cursor-pointer hover:bg-stone-50"
              title="Search all quotes and play slideshow of results"
            >
              <Search className="w-4 h-4 text-amber-600" />
              <span>Search Library</span>
            </button>
          </div>

          {/* Styled Pill Selector Tabs */}
          <div className="flex bg-stone-100 p-1.5 rounded-2xl border border-stone-200 w-full sm:w-auto">
            <button
              id="tab-player-select"
              onClick={() => setActiveTab("player")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === "player"
                  ? "bg-stone-900 text-white shadow-md font-bold"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Shuffle Player</span>
            </button>

            <button
              id="tab-catalog-select"
              onClick={() => setActiveTab("manage")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === "manage"
                  ? "bg-stone-900 text-white shadow-md font-bold"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Quote Catalog</span>
            </button>

            <button
              id="tab-admin-select"
              onClick={() => setActiveTab("admin")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === "admin"
                  ? "bg-stone-900 text-white shadow-md font-bold"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Flags / Admin</span>
            </button>
          </div>
        </div>

        {/* Dynamic Tab Body */}
        <div className="flex-1 overflow-y-auto bg-stone-50/10">
          {activeTab === "player" ? (
            <ShufflePlayer
              categories={categories}
              quotes={filteredQuotes}
              allQuotes={quotes}
              onRateQuote={handleRateQuote}
              onUpdateQuote={handleUpdateQuote}
              shuffleFavoritesOnly={shuffleFavoritesOnly}
              setShuffleFavoritesOnly={setShuffleFavoritesOnly}
              searchPlayList={activeSearchPlayList}
              searchQuery={activeSearchQuery}
              onClearSearchPlay={() => {
                setActiveSearchPlayList(null);
                setActiveSearchQuery("");
              }}
              initialQuoteId={initialQuoteId || undefined}
              onClearInitialQuoteId={() => setInitialQuoteId(null)}
              onExitZenMode={() => {
                if (initialQuoteId) {
                  setActiveTab("manage");
                }
              }}
            />
          ) : activeTab === "admin" ? (
            <AdminPanel
              categories={categories}
              quotes={quotes}
              onDeleteQuote={handleDeleteQuote}
              onRateQuote={handleRateQuote}
              onPlayThumbsUpSlideshow={() => {
                setShuffleFavoritesOnly(true);
                setActiveTab("player");
              }}
              selectedFontId={selectedFontId}
              onSelectFontId={setSelectedFontId}
              selectedGreekFontId={selectedGreekFontId}
              onSelectGreekFontId={setSelectedGreekFontId}
              previewEn={previewEn}
              previewEl={previewEl}
            />
          ) : activeCategory ? (
            <QuoteManager
              category={activeCategory}
              categories={categories}
              quotes={filteredQuotes}
              allQuotes={quotes}
              onAddQuote={handleAddQuote}
              onDeleteQuote={handleDeleteQuote}
              onRateQuote={handleRateQuote}
              onUpdateQuote={handleUpdateQuote}
              onUpdateCategory={handleUpdateCategory}
              onReorderQuotes={handleReorderQuotes}
              onUpdateAllQuotes={setQuotes}
              onPlayQuote={(id) => {
                setInitialQuoteId(id);
                setActiveTab("player");
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-stone-400 p-8 text-center font-serif">
              <div>
                <BookMarked className="w-12 h-12 mx-auto mb-4 text-stone-300" />
                <p className="text-lg font-medium">No active category selected.</p>
                <p className="text-sm font-sans mt-1">Please create or select a category in the sidebar.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Import / Export JSON Dialog */}
      <ImportExportModal
        folders={folders}
        categories={categories}
        quotes={quotes}
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        onImport={handleImport}
      />

      {/* Global Search Dialog */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        quotes={quotes}
        categories={categories}
        onPlaySearchResults={handlePlaySearchResults}
      />

      {/* Bulk Move/Copy Quotes Confirmation Dialog */}
      <AnimatePresence>
        {pendingMove && (() => {
          const actionVerb = dragActionMode === "copy" ? "Copy" : "Move";
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/65 backdrop-blur-[2px]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-stone-200 shadow-2xl rounded-3xl w-full max-w-xl flex flex-col max-h-[85vh] relative z-10"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-stone-150 px-6 py-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    <h3 className="font-serif text-lg font-bold text-stone-900">
                      Bulk {actionVerb} Quotes to "{targetCategory?.name}"
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingMove(null)}
                    className="text-stone-400 hover:text-stone-600 transition-colors p-1.5 rounded-lg hover:bg-stone-50 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                  {/* Action Mode Selection */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 border border-stone-200 p-3.5 rounded-2xl">
                    <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                      Action Mode
                    </span>
                    <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 shadow-3xs">
                      <button
                        type="button"
                        onClick={() => setDragActionMode("move")}
                        className={`px-3 py-1.5 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer ${
                          dragActionMode === "move"
                            ? "bg-stone-850 text-white shadow-3xs"
                            : "text-stone-500 hover:text-stone-750"
                        }`}
                      >
                        Move (Cut & Paste)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDragActionMode("copy")}
                        className={`px-3 py-1.5 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer ${
                          dragActionMode === "copy"
                            ? "bg-amber-600 text-white shadow-3xs"
                            : "text-stone-500 hover:text-stone-750"
                        }`}
                      >
                        Copy (Duplicate)
                      </button>
                    </div>
                  </div>

                  {/* Top Row: Preview title, A+/A- controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 border border-stone-200 p-3.5 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                        Preview ({activeMoveQuotes.length} quotes)
                      </span>
                      {/* Font Size Modifier Controls for Move Preview */}
                      <div className="flex items-center gap-1 border border-stone-200 bg-white px-2 py-0.5 rounded-xl text-stone-600 font-sans text-xs shadow-3xs shrink-0">
                        <span className="font-semibold text-stone-500 mr-1 select-none text-[10px]">Size:</span>
                        <button
                          type="button"
                          onClick={() => setMoveFontSizeLevel(prev => Math.max(1, prev - 1))}
                          disabled={moveFontSizeLevel === 1}
                          className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-stone-100 disabled:opacity-40 font-bold transition-colors cursor-pointer text-stone-700 text-xs"
                          title="Decrease preview font size"
                        >
                          A-
                        </button>
                        <span className="w-4 text-center font-bold text-amber-700 select-none text-xs">{moveFontSizeLevel}</span>
                        <button
                          type="button"
                          onClick={() => setMoveFontSizeLevel(prev => Math.min(8, prev + 1))}
                          disabled={moveFontSizeLevel === 8}
                          className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-stone-100 disabled:opacity-40 font-bold transition-colors cursor-pointer text-stone-700 text-xs"
                          title="Increase preview font size"
                        >
                          A+
                        </button>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider bg-stone-100 border border-stone-250 px-2.5 py-1 rounded-lg">
                      Source: "{sourceCategory?.name}"
                    </div>
                  </div>

                  {/* View Filter selection row */}
                  <div className="flex items-center gap-1.5 flex-wrap px-1">
                    <span className="text-stone-500 font-sans text-xs font-semibold select-none mr-1.5">View Filter:</span>
                    <button
                      type="button"
                      onClick={() => setMoveModalFilter("all")}
                      className={`px-3 py-1 rounded-lg font-sans text-xs font-bold border transition-all cursor-pointer ${
                        moveModalFilter === "all"
                          ? "bg-stone-850 border-stone-900 text-white shadow-3xs"
                          : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      All ({activeMoveQuotes.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoveModalFilter("unique")}
                      className={`px-3 py-1 rounded-lg font-sans text-xs font-bold border transition-all cursor-pointer ${
                        moveModalFilter === "unique"
                          ? "bg-amber-600 border-amber-700 text-white shadow-3xs"
                          : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                      title="Excludes duplicates in this category"
                    >
                      Unique / Importable ({moveUniques.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoveModalFilter("new")}
                      className={`px-3 py-1 rounded-lg font-sans text-xs font-bold border transition-all cursor-pointer ${
                        moveModalFilter === "new"
                          ? "bg-emerald-600 border-emerald-700 text-white shadow-3xs"
                          : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                      title="Only shows brand-new quotes not in any category"
                    >
                      New Only ({moveNews.length})
                    </button>
                  </div>

                  {/* Scrollable list of quotes to move */}
                  <div className="border border-stone-200 rounded-2xl max-h-[350px] overflow-y-auto divide-y divide-stone-150 bg-stone-50/50 shadow-2xs">
                    {visibleMovedQuotes.length === 0 ? (
                      <div className="p-10 text-center text-stone-500 font-sans text-sm">
                        <p className="font-serif italic font-medium text-stone-700 mb-1">
                          No quotes match the selected filter.
                        </p>
                        <p className="text-xs text-stone-400">
                          Try choosing "All" or keep some quotes in the list.
                        </p>
                      </div>
                    ) : (
                      visibleMovedQuotes.map((q) => {
                        const existStatus = checkMoveQuoteExistence(q.text, q.id);
                        return (
                          <div key={q.id} className="p-5 flex items-start justify-between gap-5 hover:bg-white transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className={`font-serif text-stone-850 leading-relaxed italic font-medium ${getBulkFontSizeClass(moveFontSizeLevel)}`}>
                                "{q.text}"
                              </p>
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mt-2">
                                <span className="text-[11px] md:text-xs font-bold text-stone-500 uppercase tracking-widest shrink-0">
                                  — {q.author}
                                </span>
                                {existStatus.status === "same_category" && (
                                  <span className="inline-flex items-center text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md select-none font-sans uppercase tracking-wider">
                                    In Category: {targetCategory?.name}
                                  </span>
                                )}
                                {existStatus.status === "other_category" && (
                                  <span className="inline-flex items-center text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md select-none font-sans uppercase tracking-wider" title={`Found in category: ${existStatus.otherCategoryName}`}>
                                    In Category: {existStatus.otherCategoryName}
                                  </span>
                                )}
                                {existStatus.status === "new" && (
                                  <span className="inline-flex items-center text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md select-none font-sans uppercase tracking-wider">
                                    New
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setMoveQuoteIds(prev => prev.filter(id => id !== q.id));
                              }}
                              className="text-stone-400 hover:text-red-600 p-1 rounded-lg transition-colors cursor-pointer shrink-0 mt-1"
                              title="Exclude this quote from action"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-stone-150 px-6 py-4 flex gap-3 justify-end bg-stone-50 rounded-b-3xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setPendingMove(null)}
                    className="px-4 py-2 border border-stone-250 bg-white text-stone-600 font-sans text-xs font-semibold rounded-xl cursor-pointer hover:bg-stone-50 transition-colors shadow-2xs"
                  >
                    Cancel
                  </button>

                  {moveModalFilter === "unique" ? (
                    <button
                      type="button"
                      onClick={() => handleExecuteMove(true)}
                      disabled={moveUniques.length === 0}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-sans text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      {actionVerb} {moveUniques.length} Unique Quotes
                    </button>
                  ) : moveModalFilter === "new" ? (
                    <button
                      type="button"
                      onClick={() => handleExecuteMove(false)}
                      disabled={moveNews.length === 0}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-sans text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      {actionVerb} {moveNews.length} New Quotes
                    </button>
                  ) : moveDuplicates.length > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleExecuteMove(true)}
                        disabled={moveUniques.length === 0}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-sans text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs disabled:opacity-45 disabled:cursor-not-allowed"
                      >
                        {actionVerb} {moveUniques.length} Unique Quotes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExecuteMove(false)}
                        className="px-4 py-2 bg-stone-900 hover:bg-stone-850 text-white font-sans text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs"
                      >
                        {actionVerb} All anyway ({activeMoveQuotes.length})
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleExecuteMove(false)}
                      disabled={activeMoveQuotes.length === 0}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-sans text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      Confirm {actionVerb} ({activeMoveQuotes.length})
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
      <SelectionFormattingToolbar
        quotes={quotes}
        previewEn={previewEn}
        previewEl={previewEl}
        onUpdateQuoteText={handleUpdateQuoteText}
      />
    </div>
  );
}
