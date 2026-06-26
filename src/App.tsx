import React, { useState, useEffect } from "react";
import { Category, Quote, Folder } from "./types";
import { DEFAULT_CATEGORIES, DEFAULT_QUOTES } from "./defaultData";
import Sidebar from "./components/Sidebar";
import ShufflePlayer from "./components/ShufflePlayer";
import QuoteManager from "./components/QuoteManager";
import AdminPanel from "./components/AdminPanel";
import ImportExportModal from "./components/ImportExportModal";
import { Menu, X, Shuffle, BookOpen, Sparkles, BookMarked, FileJson, ShieldAlert, Search, ArrowRight, AlertTriangle } from "lucide-react";
import SearchModal from "./components/SearchModal";
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

  const [moveModalFilter, setMoveModalFilter] = useState<"all" | "unique">("all");

  const handleInitiateMoveQuotes = (quoteIds: string[], sourceCategoryId: string, targetCategoryId: string) => {
    setPendingMove({ quoteIds, sourceCategoryId, targetCategoryId });
    setMoveModalFilter("all");
  };

  const handleUpdateCategoryFolder = (categoryId: string, folderId: string) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === categoryId ? { ...cat, folderId } : cat))
    );
  };

  // Computed values for Move Quotes modal
  const sourceCategory = pendingMove ? categories.find(c => c.id === pendingMove.sourceCategoryId) : null;
  const targetCategory = pendingMove ? categories.find(c => c.id === pendingMove.targetCategoryId) : null;
  
  const cleanCompareText = (str: string) => {
    return str
      .toLowerCase()
      .replace(/["'“”‘’]/g, "")
      .replace(/[\s\p{P}]/gu, "")
      .trim();
  };
  
  const targetCategoryQuotes = pendingMove ? quotes.filter(q => q.categoryId === pendingMove.targetCategoryId) : [];
  const draggedQuotes = pendingMove ? quotes.filter(q => pendingMove.quoteIds.includes(q.id)) : [];
  
  const moveDuplicates = draggedQuotes.filter(tq => 
    targetCategoryQuotes.some(q => cleanCompareText(q.text) === cleanCompareText(tq.text))
  );
  
  const moveUniques = draggedQuotes.filter(tq => 
    !targetCategoryQuotes.some(q => cleanCompareText(q.text) === cleanCompareText(tq.text))
  );

  const visibleMovedQuotes = 
    moveModalFilter === "unique" ? moveUniques : draggedQuotes;

  const handleExecuteMove = (onlyMoveUnique: boolean) => {
    if (!pendingMove) return;
    const { targetCategoryId } = pendingMove;
    const quotesToMove = onlyMoveUnique ? moveUniques : draggedQuotes;
    const idsToMove = quotesToMove.map(q => q.id);

    setQuotes(prev =>
      prev.map(q => (idsToMove.includes(q.id) ? { ...q, categoryId: targetCategoryId } : q))
    );
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

  return (
    <div id="quote-app-root" className="flex flex-col md:flex-row h-screen w-screen bg-stone-50/50 text-stone-800 font-sans overflow-hidden">
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

      {/* Bulk Move Quotes Confirmation Dialog */}
      <AnimatePresence>
        {pendingMove && (
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
                    Confirm Move Quotes
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
                {/* Visual Route Info */}
                <div className="flex items-center justify-between bg-stone-50 border border-stone-200 p-4 rounded-2xl shadow-3xs">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Source Category</span>
                    <strong className="text-xs md:text-sm font-serif text-stone-800 truncate block mt-0.5">"{sourceCategory?.name}"</strong>
                  </div>
                  <div className="px-3 shrink-0 flex items-center justify-center text-amber-600">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Target Category</span>
                    <strong className="text-xs md:text-sm font-serif text-amber-900 truncate block mt-0.5">"{targetCategory?.name}"</strong>
                  </div>
                </div>

                {/* Duplicates Warning Panel */}
                {moveDuplicates.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-2xl flex items-start gap-3 shadow-3xs">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-850 leading-relaxed">
                      <p className="font-bold">Duplicate Quotes Detected</p>
                      <p className="mt-1">
                        We found <strong className="font-bold">{moveDuplicates.length} quote{moveDuplicates.length > 1 ? "s" : ""}</strong> that already exist{moveDuplicates.length === 1 ? "s" : ""} in the target category <strong>"{targetCategory?.name}"</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Filter Row */}
                <div className="flex items-center justify-between gap-3 px-1 mt-1 shrink-0">
                  <div className="flex items-center gap-1.5">
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
                      All ({draggedQuotes.length})
                    </button>
                    {moveDuplicates.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setMoveModalFilter("unique")}
                        className={`px-3 py-1 rounded-lg font-sans text-xs font-bold border transition-all cursor-pointer ${
                          moveModalFilter === "unique"
                            ? "bg-amber-600 border-amber-700 text-white shadow-3xs"
                            : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                        }`}
                        title="Only shows quotes that don't already exist in target category"
                      >
                        Unique Only ({moveUniques.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Scrollable list of quotes to move */}
                <div className="border border-stone-200 rounded-2xl max-h-[250px] overflow-y-auto divide-y divide-stone-150 bg-stone-50/50 shadow-2xs">
                  {visibleMovedQuotes.length === 0 ? (
                    <div className="p-10 text-center text-stone-500 font-sans text-sm">
                      <p className="font-serif italic font-medium text-stone-700 mb-1">
                        No quotes match the selected filter.
                      </p>
                    </div>
                  ) : (
                    visibleMovedQuotes.map((q) => {
                      const isDuplicate = moveDuplicates.some(dup => dup.id === q.id);
                      return (
                        <div key={q.id} className="p-4 flex items-start justify-between gap-4 hover:bg-white transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-serif text-stone-850 text-xs italic leading-relaxed font-medium">
                              "{q.text}"
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest shrink-0">
                                — {q.author}
                              </span>
                              {isDuplicate ? (
                                <span className="inline-flex items-center text-[9px] font-bold text-white bg-red-600 border border-red-750 px-2 py-0.5 rounded-md select-none font-sans uppercase tracking-wider shadow-3xs">
                                  Already in "{targetCategory?.name}"
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[9px] font-bold text-emerald-750 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md select-none font-sans uppercase tracking-wider">
                                  Unique
                                </span>
                              )}
                            </div>
                          </div>
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

                {moveDuplicates.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleExecuteMove(true)}
                      disabled={moveUniques.length === 0}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-sans text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      Move {moveUniques.length} Unique
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExecuteMove(false)}
                      className="px-4 py-2 bg-stone-900 hover:bg-stone-850 text-white font-sans text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs"
                    >
                      Move All anyway ({draggedQuotes.length})
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleExecuteMove(false)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-sans text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs"
                  >
                    Confirm Move ({draggedQuotes.length})
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
