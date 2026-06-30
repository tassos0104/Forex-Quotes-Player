import React, { useState, useEffect, useRef } from "react";
import { Quote, Category } from "../types";
import { Search, X, Play, Tag, HelpCircle, ArrowRight, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { renderFormattedText, stripFormatTags, isGreekText } from "../utils/textFormatter";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotes: Quote[];
  categories: Category[];
  onPlaySearchResults: (results: Quote[], query: string) => void;
  onNavigateToQuote: (quoteId: string, categoryId: string) => void;
}

export default function SearchModal({
  isOpen,
  onClose,
  quotes,
  categories,
  onPlaySearchResults,
  onNavigateToQuote,
}: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"exact" | "all" | "any">("exact");
  const [results, setResults] = useState<Quote[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [rightClickMenu, setRightClickMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
    quote: Quote;
  } | null>(null);

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      // Keep search state, only reset temporary UI menus
      setRightClickMenu(null);
    }
  }, [isOpen]);

  // Update search results if the parent quotes array changes or when the modal is opened,
  // so any edited or deleted quotes are correctly updated.
  useEffect(() => {
    if (isOpen && hasSearched && searchQuery.trim()) {
      performSearch(searchQuery, searchMode);
    }
  }, [isOpen, quotes]);

  // Dismiss right click menu on click anywhere
  useEffect(() => {
    const handleGlobalClick = () => {
      if (rightClickMenu?.visible) {
        setRightClickMenu(null);
      }
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [rightClickMenu]);

  if (!isOpen) return null;

  const performSearch = (queryText: string, mode: "exact" | "all" | "any") => {
    const query = queryText.trim().toLowerCase();
    if (!query) {
      setResults([]);
      setHasSearched(true);
      return;
    }

    const matched = quotes.filter((q) => {
      const plainText = stripFormatTags(q.text).toLowerCase();
      const plainAuthor = (q.author || "").toLowerCase();

      if (mode === "exact") {
        const textMatch = plainText.includes(query);
        const authorMatch = plainAuthor.includes(query);
        return textMatch || authorMatch;
      }

      // Split the query by spaces and clean up empty elements
      const words = query.split(/\s+/).filter(Boolean);
      if (words.length === 0) return false;

      if (mode === "all") {
        // Every word must match either the text or the author
        return words.every((word) => plainText.includes(word) || plainAuthor.includes(word));
      } else {
        // At least one word must match either the text or the author
        return words.some((word) => plainText.includes(word) || plainAuthor.includes(word));
      }
    });

    setResults(matched);
    setHasSearched(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery, searchMode);
  };

  const handleSearchModeChange = (mode: "exact" | "all" | "any") => {
    setSearchMode(mode);
    if (searchQuery.trim()) {
      performSearch(searchQuery, mode);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? cat.name : "Uncategorized";
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/65 backdrop-blur-[2px]">
        {/* Backdrop click closer */}
        <div className="absolute inset-0 cursor-default" onClick={onClose} />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white border border-stone-200 shadow-2xl rounded-3xl w-full max-w-2xl h-[85vh] max-h-[700px] flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between shrink-0 bg-stone-50/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-700">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900">
                  Search Library
                </h3>
                <p className="text-stone-500 text-xs font-sans">
                  Find quotes across all categories by text or author
                </p>
              </div>
            </div>
            <button
              id="close-search-modal-btn"
              onClick={onClose}
              className="p-1.5 hover:bg-stone-200/70 text-stone-400 hover:text-stone-700 rounded-full transition-colors cursor-pointer"
              title="Close Search"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Form */}
          <div className="p-6 pb-4 border-b border-stone-100 bg-stone-50/30 shrink-0">
            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3">
              <div className="flex gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={
                      searchMode === "exact"
                        ? "Type a phrase, quote snippet, or author..."
                        : searchMode === "all"
                        ? "Type words that MUST ALL be in the quote..."
                        : "Type words, ANY of which can be in the quote..."
                    }
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      // Optional: Real-time search if preferred, let's trigger search immediately
                      performSearch(e.target.value, searchMode);
                    }}
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-stone-300 rounded-2xl text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all font-sans font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setResults([]);
                        setHasSearched(false);
                        inputRef.current?.focus();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  id="search-submit-btn"
                  className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-sans text-sm font-semibold rounded-2xl cursor-pointer transition-colors shadow-sm shrink-0 flex items-center gap-1.5"
                >
                  <span>Search</span>
                </button>
              </div>

              {/* Match Options */}
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider mr-1">Match Mode:</span>
                <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200/50">
                  <button
                    type="button"
                    onClick={() => handleSearchModeChange("exact")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      searchMode === "exact"
                        ? "bg-white text-stone-900 shadow-xs"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    Exact Phrase
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSearchModeChange("all")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      searchMode === "all"
                        ? "bg-white text-stone-900 shadow-xs"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    All Words (AND)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSearchModeChange("any")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      searchMode === "any"
                        ? "bg-white text-stone-900 shadow-xs"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    Any Word (OR)
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-stone-50/20">
            {!hasSearched ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-400 font-sans">
                <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mb-3">
                  <HelpCircle className="w-6 h-6 text-stone-400" />
                </div>
                <p className="text-sm font-medium text-stone-600">Enter a term above to begin searching</p>
                <p className="text-xs text-stone-400 mt-1 max-w-xs">
                  We'll search through every category's quote texts and authors in your library.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-500 font-sans">
                <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mb-3">
                  <Search className="w-6 h-6 text-stone-400" />
                </div>
                <p className="text-sm font-bold text-stone-700">No matching quotes found</p>
                <p className="text-xs text-stone-400 mt-1">
                  Try checking spelling or searching for a shorter keyword.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Result header & Play CTAs */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-100 p-3 rounded-2xl border border-stone-200/50 sticky top-0 bg-white/95 backdrop-blur-md z-10 shadow-3xs">
                  <span className="text-xs font-semibold text-stone-600 pl-1">
                    Found <span className="font-bold text-stone-950 font-mono">{results.length}</span> matching {results.length === 1 ? "quote" : "quotes"}
                    <span className="hidden sm:inline-block text-[10px] text-stone-400 font-normal ml-2 bg-stone-50 border border-stone-200 px-1.5 py-0.5 rounded-lg select-none">
                      Right-click any quote to edit in Catalog
                    </span>
                  </span>
                  <button
                    type="button"
                    id="search-play-slideshow-btn"
                    onClick={() => onPlaySearchResults(results, searchQuery)}
                    className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-xl cursor-pointer transition-colors shadow-xs hover:scale-[1.01] active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play Slideshow</span>
                  </button>
                </div>

                {/* Match List */}
                <div className="divide-y divide-stone-100 bg-white border border-stone-200/60 rounded-2xl overflow-hidden shadow-2xs">
                  {results.map((quote) => (
                    <div
                      key={quote.id}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setRightClickMenu({
                          x: e.clientX,
                          y: e.clientY,
                          visible: true,
                          quote,
                        });
                      }}
                      className="p-5 hover:bg-stone-50/50 transition-colors flex flex-col gap-2.5 cursor-context-menu"
                      title="Right-click to edit in Quote Catalog"
                    >
                      <blockquote
                        className="font-quote text-sm leading-relaxed text-stone-850"
                        style={{ "--quote-font": isGreekText(quote.text) ? "var(--quote-font-el)" : "var(--quote-font-en)" } as React.CSSProperties}
                      >
                        "{renderFormattedText(quote.text)}"
                      </blockquote>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-stone-500 italic font-medium font-serif">
                          — {quote.author || "Unknown"}
                        </span>
                        
                        {/* Category Badge */}
                        <div className="flex items-center gap-1 bg-stone-100 text-stone-600 px-2.5 py-1 rounded-lg font-sans font-medium text-[11px] border border-stone-200/40">
                          <Tag className="w-3 h-3 text-stone-400" />
                          <span>Category: <strong className="text-stone-800 font-semibold">{getCategoryName(quote.categoryId)}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Right-click custom context menu */}
      {rightClickMenu?.visible && (
        <div
          className="fixed z-[100] bg-white border border-stone-250 shadow-lg rounded-xl py-1 w-44 font-sans text-xs flex flex-col select-none"
          style={{
            top: `${rightClickMenu.y}px`,
            left: `${rightClickMenu.x}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              onNavigateToQuote(rightClickMenu.quote.id, rightClickMenu.quote.categoryId);
              setRightClickMenu(null);
              onClose();
            }}
            className="px-3.5 py-2 hover:bg-amber-50 text-stone-700 hover:text-amber-900 font-semibold flex items-center gap-2 transition-colors text-left cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5 text-amber-600" />
            <span>Edit in Catalog</span>
          </button>
        </div>
      )}
    </AnimatePresence>
  );
}
