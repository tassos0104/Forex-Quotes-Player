import React, { useState, useEffect } from "react";
import { Category, Quote } from "./types";
import { DEFAULT_CATEGORIES, DEFAULT_QUOTES } from "./defaultData";
import Sidebar from "./components/Sidebar";
import ShufflePlayer from "./components/ShufflePlayer";
import QuoteManager from "./components/QuoteManager";
import AdminPanel from "./components/AdminPanel";
import ImportExportModal from "./components/ImportExportModal";
import { Menu, X, Shuffle, BookOpen, Sparkles, BookMarked, FileJson, ShieldAlert, Search } from "lucide-react";
import SearchModal from "./components/SearchModal";

export default function App() {
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  // State Initialization from LocalStorage or Default Data
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const stored = localStorage.getItem("quote_shuffle_categories");
      if (stored) {
        return JSON.parse(stored);
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

  // Handlers for Categories
  const handleAddCategory = (name: string) => {
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name,
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

  const handleUpdateCategory = (id: string, name: string) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, name } : cat))
    );
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
    mode: "merge" | "overwrite"
  ) => {
    if (mode === "overwrite") {
      setCategories(importedCategories);
      setQuotes(importedQuotes);
      if (importedCategories.length > 0) {
        setActiveCategoryId(importedCategories[0].id);
      }
    } else {
      // MERGE MODE
      const updatedCategories = [...categories];
      importedCategories.forEach((importedCat) => {
        const exists = updatedCategories.find(
          (c) =>
            c.id === importedCat.id ||
            c.name.toLowerCase() === importedCat.name.toLowerCase()
        );
        if (!exists) {
          updatedCategories.push(importedCat);
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
                categories={categories}
                quotes={quotes}
                activeCategoryId={activeCategoryId}
                setActiveCategoryId={setActiveCategoryId}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
                onToggleShuffle={handleToggleShuffle}
                onToggleAllShuffle={handleToggleAllShuffle}
                shuffleFavoritesOnly={activeTab === "player" && shuffleFavoritesOnly}
                onDisableFavoritesOnly={() => setShuffleFavoritesOnly(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Visible on large screens) */}
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar
          categories={categories}
          quotes={quotes}
          activeCategoryId={activeCategoryId}
          setActiveCategoryId={setActiveCategoryId}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onToggleShuffle={handleToggleShuffle}
          onToggleAllShuffle={handleToggleAllShuffle}
          shuffleFavoritesOnly={activeTab === "player" && shuffleFavoritesOnly}
          onDisableFavoritesOnly={() => setShuffleFavoritesOnly(false)}
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
    </div>
  );
}
