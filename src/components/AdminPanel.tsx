import React, { useState, useEffect, useRef, useMemo } from "react";
import { Quote, Category, QUOTE_FONTS, QuoteFont } from "../types";
import { ShieldAlert, Trash2, RotateCcw, Search, Filter, ArrowLeft, BookOpen, ThumbsDown, ThumbsUp, Play, Type, Plus, Star, Copy } from "lucide-react";
import { renderFormattedText, stripFormatTags } from "../utils/textFormatter";

interface AdminPanelProps {
  categories: Category[];
  quotes: Quote[];
  onDeleteQuote: (id: string) => void;
  onRateQuote: (id: string, rating: 'up' | 'down' | null) => void;
  onClearAllFlagged?: () => void;
  onPlayThumbsUpSlideshow?: () => void;
  selectedFontId?: string;
  onSelectFontId?: (id: string) => void;
  selectedGreekFontId?: string;
  onSelectGreekFontId?: (id: string) => void;
  previewEn?: string;
  previewEl?: string;
  fonts?: QuoteFont[];
  onAddFont?: (newFont: QuoteFont) => void;
  onDeleteFont?: (id: string) => void;
  onResetFonts?: () => void;
  zenTextWidth?: number;
  onSelectZenTextWidth?: (width: number) => void;
  favoriteFontIds?: string[];
  onToggleFavoriteFont?: (id: string) => void;
}

export default function AdminPanel({
  categories,
  quotes,
  onDeleteQuote,
  onRateQuote,
  onClearAllFlagged,
  onPlayThumbsUpSlideshow,
  selectedFontId = "playfair-display",
  onSelectFontId,
  selectedGreekFontId = "gfs-didot",
  onSelectGreekFontId,
  previewEn = "True wisdom comes to each of us when we realize how little we understand about life, ourselves, and the world around us.",
  previewEl = "Η αληθινή σοφία έρχεται στον καθένα μας όταν συνειδητοποιήσουμε πόσο λίγο κατανοούμε τη ζωή, τον εαυτό μας και τον κόσμο γύρω μας.",
  fonts = QUOTE_FONTS,
  favoriteFontIds = [],
  onToggleFavoriteFont,
  onAddFont,
  onDeleteFont,
  onResetFonts,
  zenTextWidth = 85,
  onSelectZenTextWidth,
}: AdminPanelProps) {
  const [adminTab, setAdminTab] = useState<'down' | 'up' | 'fonts'>('down');
  const [activeFontTab, setActiveFontTab] = useState<'en' | 'el'>('en');
  const [fontSearch, setFontSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");

  const [showAddForm, setShowAddForm] = useState(false);
  const [newFontName, setNewFontName] = useState("");
  const [addError, setAddError] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fontInputRef = useRef<HTMLInputElement>(null);
  const [modalPreviewFontSize, setModalPreviewFontSize] = useState<number>(18);

  const isAlreadyInstalled = useMemo(() => {
    const nameTrimmed = newFontName.trim();
    if (!nameTrimmed) return false;
    
    let mappedName = nameTrimmed;
    const lowerName = nameTrimmed.toLowerCase();
    if (lowerName.startsWith("playwrite ")) {
      const suffix = lowerName.substring(10).trim();
      const countriesMap: Record<string, string> = {
        "new zealand": "NZ",
        "united states": "US",
        "united kingdom": "GB",
        "great britain": "GB",
        "england": "GB",
        "australia": "AU",
        "canada": "CA",
        "germany": "DE",
        "indonesia": "ID",
        "iceland": "IS",
        "italy": "IT",
        "croatia": "HR",
        "mexico": "MX",
        "norway": "NO",
        "poland": "PL",
        "romania": "RO",
        "tanzania": "TZ",
        "vietnam": "VN",
        "south africa": "ZA"
      };
      if (countriesMap[suffix]) {
        mappedName = `Playwrite ${countriesMap[suffix]}`;
      }
    }

    const fontId = mappedName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return (fonts || []).some(f => f.id === fontId);
  }, [newFontName, fonts]);

  useEffect(() => {
    if (showAddForm) {
      setTimeout(() => {
        fontInputRef.current?.focus();
      }, 50);
    }
  }, [showAddForm]);
  const [fontIdToDeleteConfirm, setFontIdToDeleteConfirm] = useState<string | null>(null);
  const [showResetFontsConfirm, setShowResetFontsConfirm] = useState(false);
  const [fontSort, setFontSort] = useState<'alphabetical' | 'last-added'>('last-added');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
    fontId: string;
  } | null>(null);

  const [previewFontSize, setPreviewFontSize] = useState<number>(() => {
    return Number(localStorage.getItem("quote_shuffle_preview_font_size")) || 22;
  });

  const handleIncreaseFontSize = () => {
    setPreviewFontSize(prev => {
      const next = Math.min(prev + 2, 48);
      localStorage.setItem("quote_shuffle_preview_font_size", String(next));
      return next;
    });
  };

  const handleDecreaseFontSize = () => {
    setPreviewFontSize(prev => {
      const next = Math.max(prev - 2, 12);
      localStorage.setItem("quote_shuffle_preview_font_size", String(next));
      return next;
    });
  };

  // Dynamically load ALL google fonts when the typography tab is open so they show correctly
  useEffect(() => {
    if (adminTab === 'fonts') {
      fonts.forEach((f) => {
        const fontLinkId = `google-font-${f.id}`;
        if (!document.getElementById(fontLinkId)) {
          const link = document.createElement("link");
          link.id = fontLinkId;
          link.rel = "stylesheet";
          const encodedFamily = encodeURIComponent(f.family);
          link.href = `https://fonts.googleapis.com/css2?family=${encodedFamily}&display=swap`;
          document.head.appendChild(link);
        }
      });
    }
  }, [adminTab, fonts]);

  // Keyboard navigation for fonts list (ArrowUp and ArrowDown)
  useEffect(() => {
    if (adminTab !== 'fonts') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

      const displayedFonts = [...fonts]
        .filter((font) => activeFontTab === 'en' || font.supportsGreek)
        .filter((font) => {
          if (!fontSearch) return true;
          const query = fontSearch.toLowerCase();
          return font.name.toLowerCase().includes(query) || font.category.toLowerCase().includes(query);
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      if (displayedFonts.length === 0) return;

      const currentSelectedId = activeFontTab === 'en' ? selectedFontId : selectedGreekFontId;
      const currentIndex = displayedFonts.findIndex(f => f.id === currentSelectedId);

      let nextIndex = currentIndex;
      if (e.key === "ArrowDown") {
        nextIndex = currentIndex + 1;
        if (nextIndex >= displayedFonts.length) {
          nextIndex = 0; // Wrap around
        }
      } else if (e.key === "ArrowUp") {
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          nextIndex = displayedFonts.length - 1; // Wrap around
        }
      }

      if (nextIndex !== currentIndex && nextIndex >= 0 && nextIndex < displayedFonts.length) {
        e.preventDefault(); // Prevent page scrolling
        const nextFont = displayedFonts[nextIndex];
        if (activeFontTab === 'en') {
          onSelectFontId?.(nextFont.id);
        } else {
          onSelectGreekFontId?.(nextFont.id);
        }

        // Scroll the selected font button into view
        setTimeout(() => {
          const btn = document.getElementById(`font-btn-${nextFont.id}`);
          if (btn) {
            btn.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }
        }, 50);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [adminTab, activeFontTab, fontSearch, selectedFontId, selectedGreekFontId, onSelectFontId, onSelectGreekFontId, fonts]);

  // Automatically scroll the currently applied font button into view when entering Typography tab or switching sub-tabs
  useEffect(() => {
    if (adminTab !== 'fonts') return;
    const currentSelectedId = activeFontTab === 'en' ? selectedFontId : selectedGreekFontId;
    if (!currentSelectedId) return;

    const timer = setTimeout(() => {
      const btn = document.getElementById(`font-btn-${currentSelectedId}`);
      if (btn) {
        btn.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [adminTab, activeFontTab]);

  // Close right click context menu on global click
  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };
    window.addEventListener("click", handleGlobalClick);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
    };
  }, [contextMenu]);

  // Custom confirmation states to bypass native window.confirm in sandboxed iframes
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkResetConfirm, setBulkResetConfirm] = useState(false);
  const [quoteIdToDeleteConfirm, setQuoteIdToDeleteConfirm] = useState<string | null>(null);

  // States for confirming whether to apply newly imported font
  const [showApplyFontConfirm, setShowApplyFontConfirm] = useState(false);
  const [importedFontId, setImportedFontId] = useState<string | null>(null);
  const [importedFontName, setImportedFontName] = useState<string>("");
  const [previousFontId, setPreviousFontId] = useState<string>("");
  const [previousGreekFontId, setPreviousGreekFontId] = useState<string>("");

  // States for confirming applying Greek font to English as well
  const [showApplyGreekToEnglishConfirm, setShowApplyGreekToEnglishConfirm] = useState(false);
  const [targetGreekFontId, setTargetGreekFontId] = useState<string | null>(null);

  // Load dynamic font stylesheet for previewing on demand
  useEffect(() => {
    const fontIdToLoad = targetGreekFontId || importedFontId;
    if (!fontIdToLoad) return;
    
    const font = fonts.find(f => f.id === fontIdToLoad);
    if (font) {
      const fontLinkId = `google-font-preview-${font.id}`;
      if (!document.getElementById(fontLinkId)) {
        const link = document.createElement("link");
        link.id = fontLinkId;
        link.rel = "stylesheet";
        const encodedFamily = encodeURIComponent(font.family);
        link.href = `https://fonts.googleapis.com/css2?family=${encodedFamily}&display=swap`;
        document.head.appendChild(link);
      }
    }
  }, [targetGreekFontId, importedFontId, fonts]);

  // Filter quotes based on rating
  const flaggedQuotes = quotes.filter((q) => q.rating === "down");
  const thumbsUpQuotes = quotes.filter((q) => q.rating === "up");

  const activeList = adminTab === "down" ? flaggedQuotes : thumbsUpQuotes;

  // Apply search & category filters
  const filteredList = activeList.filter((q) => {
    const textToSearch = q && typeof q.text === "string" ? stripFormatTags(q.text) : "";
    const authorToSearch = q && typeof q.author === "string" ? q.author : "";
    const matchesSearch =
      textToSearch.toLowerCase().includes(searchTerm.toLowerCase()) ||
      authorToSearch.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategoryId === "all" || (q && q.categoryId === selectedCategoryId);
    return matchesSearch && matchesCategory;
  });

  const getCategoryName = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : "Uncategorized";
  };

  const executeBulkDelete = () => {
    filteredList.forEach((q) => {
      onDeleteQuote(q.id);
    });
    setBulkDeleteConfirm(false);
  };

  const executeBulkReset = () => {
    filteredList.forEach((q) => {
      onRateQuote(q.id, null);
    });
    setBulkResetConfirm(false);
  };

  return (
    <div id="admin-panel-container" className="p-6 max-w-5xl mx-auto">
      {/* Segmented Inner Tab Bar */}
      <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200/60 max-w-xl mb-6">
        <button
          onClick={() => {
            setAdminTab('down');
            setSearchTerm("");
            setBulkDeleteConfirm(false);
            setBulkResetConfirm(false);
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            adminTab === 'down'
              ? "bg-white text-red-700 shadow-xs"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          <ThumbsDown className="w-3.5 h-3.5 fill-current" />
          <span>Flagged ({flaggedQuotes.length})</span>
        </button>
        <button
          onClick={() => {
            setAdminTab('up');
            setSearchTerm("");
            setBulkDeleteConfirm(false);
            setBulkResetConfirm(false);
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            adminTab === 'up'
              ? "bg-white text-emerald-700 shadow-xs"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5 fill-current" />
          <span>Thumbs Up ({thumbsUpQuotes.length})</span>
        </button>
        <button
          onClick={() => {
            setAdminTab('fonts');
            setSearchTerm("");
            setBulkDeleteConfirm(false);
            setBulkResetConfirm(false);
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            adminTab === 'fonts'
              ? "bg-white text-amber-700 shadow-xs"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          <Type className="w-3.5 h-3.5 text-amber-600" />
          <span>Quote Typography</span>
        </button>
      </div>

      {/* Header Banner */}
      {adminTab !== 'fonts' ? (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-stone-700 font-sans font-bold">
              <ShieldAlert className="w-5 h-5 text-amber-600 animate-pulse" />
              <span className="uppercase tracking-wider text-xs">Admin Dashboard</span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-stone-900 mt-1">
              {adminTab === 'down' ? "Flagged Content Management" : "Highly Rated Content"}
            </h2>
            <p className="text-stone-600 text-sm mt-1 max-w-xl">
              {adminTab === 'down' ? (
                <>
                  Below are all the quotes that have received a <span className="font-semibold text-red-600">thumbs-down</span> rating during slideshows. Review them below to reset their rating or delete them permanently.
                </>
              ) : (
                <>
                  Below are all the quotes that have received a <span className="font-semibold text-emerald-600">thumbs-up</span> rating. Review your favorites, reset their rating, or play them in a dedicated slideshow.
                </>
              )}
            </p>
          </div>

          {/* Highlight counter & Play button */}
          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full md:w-auto">
            {adminTab === 'up' && thumbsUpQuotes.length > 0 && onPlayThumbsUpSlideshow && (
              <button
                id="admin-play-thumbs-up-slideshow"
                onClick={onPlayThumbsUpSlideshow}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-bold uppercase tracking-wider py-3 px-5 rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-95 w-full sm:w-auto"
              >
                <Play className="w-3.5 h-3.5 fill-current text-white" />
                <span>Play Slideshow</span>
              </button>
            )}

            <div className="bg-white border border-stone-200 p-4 rounded-xl shadow-xs text-center shrink-0 min-w-[140px] w-full sm:w-auto">
              <span className={`block text-2xl font-mono font-bold ${adminTab === 'down' ? 'text-red-600' : 'text-emerald-600'}`}>
                {adminTab === 'down' ? flaggedQuotes.length : thumbsUpQuotes.length}
              </span>
              <span className="text-[10px] uppercase font-semibold text-stone-400 tracking-wider">
                {adminTab === 'down' ? 'Total Flagged' : 'Total Favorited'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-stone-700 font-sans font-bold">
              <Type className="w-5 h-5 text-amber-600" />
              <span className="uppercase tracking-wider text-xs">Global Settings</span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-stone-900 mt-1">
              Global Quote Typography
            </h2>
            <p className="text-stone-600 text-sm mt-1 max-w-xl">
              Select a beautiful, free Google Font to apply to all quote texts throughout the application (Slideshow Player, Category List, Search Results, etc.). All choices fully support <span className="font-bold text-amber-700">Greek (Ελληνικά)</span> and Latin scripts.
            </p>
          </div>
          
          <div className="bg-white border border-stone-200 px-5 py-4 rounded-xl shadow-xs shrink-0 md:min-w-[200px] w-full md:w-auto">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block mb-2">
              Currently Selected
            </span>
            <div className="space-y-3">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-semibold text-stone-400 block">English/Global Font:</span>
                <span className="text-sm font-bold text-amber-700 font-serif block truncate">
                  {fonts.find(f => f.id === selectedFontId)?.name || "Playfair Display"}
                </span>
              </div>
              <div className="border-t border-stone-100 pt-2">
                <span className="text-[9px] uppercase tracking-wider font-semibold text-stone-400 block">Greek Font (Ελληνικά):</span>
                <span className="text-sm font-bold text-emerald-700 font-serif block truncate">
                  {fonts.find(f => f.id === selectedGreekFontId)?.name || "GFS Didot"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

       {/* Tab Content Display */}
      {adminTab === 'fonts' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in mb-8">
          {/* Left Panel: Font Cards Selection List (One Column) */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6 lg:self-start">
            {/* Add Font & Reset Defaults Header Actions */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-sans text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Google Font
              </button>
              {showResetFontsConfirm ? (
                <div className="flex items-center gap-1.5 bg-stone-100 px-2 py-1.5 border border-stone-250 rounded-xl">
                  <span className="text-[10px] font-semibold text-stone-500">Reset?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onResetFonts?.();
                      setShowResetFontsConfirm(false);
                    }}
                    className="text-[9px] bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetFontsConfirm(false)}
                    className="text-[9px] bg-stone-250 hover:bg-stone-300 text-stone-700 font-bold px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowResetFontsConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 hover:border-amber-500 hover:text-amber-850 bg-white text-stone-600 font-sans text-xs font-semibold rounded-xl shadow-3xs cursor-pointer transition-all hover:bg-stone-50 shrink-0"
                  title="Restore default Google Fonts list"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Defaults
                </button>
              )}
            </div>

            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-2 rounded-xl animate-fade-in text-left">
                {successMessage}
              </div>
            )}

            {/* Collapsible Add Font Form */}
            {showAddForm && (
              <div className="bg-stone-50 border border-stone-250 rounded-2xl p-4 space-y-3 shadow-3xs animate-fade-in text-left">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Import Google Font</h4>
                <p className="text-[10px] text-stone-500 leading-normal">
                  Find the exact font name on <a href="https://fonts.google.com/" target="_blank" rel="noopener noreferrer" className="text-amber-700 underline font-semibold">fonts.google.com</a>.
                </p>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Font Family Name</label>
                  <input
                    ref={fontInputRef}
                    type="text"
                    value={newFontName}
                    onChange={(e) => {
                      setNewFontName(e.target.value);
                      setAddError("");
                    }}
                    placeholder="e.g. Space Grotesk"
                    className={`w-full px-3 py-1.5 text-xs bg-white border rounded-xl focus:outline-none focus:ring-1 transition-all ${
                      isAlreadyInstalled
                        ? "text-red-600 border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "text-stone-850 border-stone-250 focus:border-amber-600 focus:ring-amber-600"
                    }`}
                  />
                  {isAlreadyInstalled && (
                    <p className="text-[10px] text-red-650 font-bold animate-fade-in mt-1">This font is already installed!</p>
                  )}
                </div>

                {addError && !isAlreadyInstalled && (
                  <p className="text-[10px] text-red-600 font-bold">{addError}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1 font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewFontName("");
                      setAddError("");
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-stone-500 hover:text-stone-850 cursor-pointer rounded-lg hover:bg-stone-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nameTrimmed = newFontName.trim();
                      if (!nameTrimmed) {
                        setAddError("Font name is required");
                        return;
                      }

                      // Check if it's a Playwrite font and map country names to ISO codes
                      let mappedName = nameTrimmed;
                      const lowerName = nameTrimmed.toLowerCase();
                      if (lowerName.startsWith("playwrite ")) {
                        const suffix = lowerName.substring(10).trim();
                        const countriesMap: Record<string, string> = {
                          "new zealand": "NZ",
                          "united states": "US",
                          "united kingdom": "GB",
                          "great britain": "GB",
                          "england": "GB",
                          "australia": "AU",
                          "canada": "CA",
                          "germany": "DE",
                          "indonesia": "ID",
                          "iceland": "IS",
                          "italy": "IT",
                          "croatia": "HR",
                          "mexico": "MX",
                          "norway": "NO",
                          "poland": "PL",
                          "romania": "RO",
                          "tanzania": "TZ",
                          "vietnam": "VN",
                          "south africa": "ZA"
                        };
                        if (countriesMap[suffix]) {
                          mappedName = `Playwrite ${countriesMap[suffix]}`;
                        }
                      }

                      const fontId = mappedName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                      if (fonts.some(f => f.id === fontId)) {
                        setAddError(`Font "${mappedName}" already exists`);
                        return;
                      }

                      const cssValue = `"${mappedName}", Georgia, serif`;

                      const newFont: QuoteFont = {
                        id: fontId,
                        name: mappedName,
                        family: mappedName,
                        cssValue,
                        category: "serif",
                        supportsGreek: true
                      };

                      // Save previous selection to restore if rejected
                      setPreviousFontId(selectedFontId);
                      setPreviousGreekFontId(selectedGreekFontId);
                      setImportedFontId(fontId);
                      setImportedFontName(mappedName);

                      onAddFont?.(newFont);
                      onSelectFontId?.(fontId);
                      onSelectGreekFontId?.(fontId);
                      setFontSearch("");

                      setShowApplyFontConfirm(true);

                      setShowAddForm(false);
                      setNewFontName("");
                      setAddError("");

                      // Scroll to the newly added font
                      setTimeout(() => {
                        const btn = document.getElementById(`font-btn-${fontId}`);
                        if (btn) {
                          btn.scrollIntoView({ block: "center", behavior: "smooth" });
                        }
                      }, 150);
                    }}
                    disabled={isAlreadyInstalled}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      isAlreadyInstalled
                        ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                        : "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                    }`}
                  >
                    Import Font
                  </button>
                </div>
              </div>
            )}

            {/* Language Sub-Tabs */}
            <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-semibold select-none">
              <button
                type="button"
                onClick={() => setActiveFontTab('en')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                  activeFontTab === 'en'
                    ? "bg-white text-stone-900 shadow-3xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                English Fonts
              </button>
              <button
                type="button"
                onClick={() => setActiveFontTab('el')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                  activeFontTab === 'el'
                    ? "bg-white text-stone-900 shadow-3xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Greek Fonts (Ελληνικά)
              </button>
            </div>
            
            {/* Font Search & Sort Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="relative sm:col-span-2">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-3.5 w-3.5 text-stone-400" />
                </span>
                <input
                  type="text"
                  value={fontSearch}
                  onChange={(e) => setFontSearch(e.target.value)}
                  placeholder="Search font by name..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-stone-50 border border-stone-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600 transition-all placeholder-stone-400 text-stone-850"
                />
                {fontSearch && (
                  <button
                    type="button"
                    onClick={() => setFontSearch("")}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-stone-450 hover:text-stone-700 font-sans text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="relative">
                <select
                  value={fontSort}
                  onChange={(e) => setFontSort(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600 text-stone-850 cursor-pointer font-sans font-semibold appearance-none pr-8"
                >
                  <option value="last-added">Order: Last Added</option>
                  <option value="alphabetical">Order: Alphabetical</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-stone-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5 font-sans">
                <span>
                  {activeFontTab === 'en' ? "Latin/English Typography" : "Greek-Supported Typography"}
                </span>
                <span className="text-[10px] bg-amber-500/10 text-amber-800 font-bold px-2 py-0.5 rounded-full font-mono">
                  {
                    (() => {
                      const displayedFonts = fonts
                        .filter((font) => activeFontTab === 'en' || font.supportsGreek)
                        .filter((font) => {
                          if (!fontSearch) return true;
                          const query = fontSearch.toLowerCase();
                          return font.name.toLowerCase().includes(query) || font.category.toLowerCase().includes(query);
                        });
                      return displayedFonts.length;
                    })()
                  } Fonts
                </span>
              </h3>
            </div>

            <div className="flex flex-col gap-3 max-h-[500px] lg:max-h-[60vh] xl:max-h-[65vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-stone-200">
              {(() => {
                const displayedFonts = [...fonts]
                  .filter((font) => activeFontTab === 'en' || font.supportsGreek)
                  .filter((font) => {
                    if (!fontSearch) return true;
                    const query = fontSearch.toLowerCase();
                    return font.name.toLowerCase().includes(query) || font.category.toLowerCase().includes(query);
                  })
                  .sort((a, b) => {
                    if (fontSort === 'alphabetical') {
                      return a.name.localeCompare(b.name);
                    } else {
                      const indexA = fonts.indexOf(a);
                      const indexB = fonts.indexOf(b);
                      return indexB - indexA;
                    }
                  });

                if (displayedFonts.length === 0) {
                  return (
                    <div className="text-center py-8 text-stone-400 text-xs font-medium">
                      No matching fonts found.
                    </div>
                  );
                }

                return displayedFonts.map((font) => {
                  const isActive = activeFontTab === 'en' 
                    ? font.id === selectedFontId 
                    : font.id === selectedGreekFontId;
                  
                  const isAppliedEN = font.id === selectedFontId;
                  const isAppliedEL = font.id === selectedGreekFontId;

                  return (
                    <div
                      key={font.id}
                      id={`font-btn-${font.id}`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          visible: true,
                          fontId: font.id
                        });
                      }}
                      onClick={() => {
                        if (activeFontTab === 'en') {
                          onSelectFontId?.(font.id);
                        } else {
                          onSelectGreekFontId?.(font.id);
                        }
                      }}
                      className={`flex flex-col text-left p-4 rounded-2xl border transition-all cursor-pointer w-full shrink-0 relative group ${
                        isActive
                          ? "bg-amber-500/5 border-amber-600 ring-2 ring-amber-500/10 shadow-xs"
                          : "bg-white hover:bg-stone-50 border-stone-200"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-3">
                        <span className="text-sm font-bold text-stone-850 font-sans">
                          {font.name}
                        </span>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {isAppliedEN && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-md border border-amber-200 select-none font-sans shrink-0">
                              EN Applied
                            </span>
                          )}
                          {isAppliedEL && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md border border-emerald-200 select-none font-sans shrink-0">
                              GR Applied
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavoriteFont?.(font.id);
                            }}
                            className={`p-1 rounded-lg transition-all cursor-pointer ${
                              favoriteFontIds.includes(font.id)
                                ? "text-amber-500 hover:bg-amber-50"
                                : "text-stone-300 hover:text-amber-500 hover:bg-stone-100"
                            }`}
                            title={favoriteFontIds.includes(font.id) ? "Remove from Favorites" : "Add to Favorites"}
                          >
                            <Star className={`w-3.5 h-3.5 ${favoriteFontIds.includes(font.id) ? "fill-amber-400" : ""}`} />
                          </button>
                          {onDeleteFont && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFontIdToDeleteConfirm(font.id);
                              }}
                              className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer opacity-80 group-hover:opacity-100 shrink-0"
                              title={`Delete ${font.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mini inline preview */}
                      <div
                        className="mt-auto border-t border-stone-100 pt-2.5 text-stone-600 w-full"
                        style={{ fontFamily: font.cssValue }}
                      >
                        {activeFontTab === 'en' ? previewEn : previewEl}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Right Panel: Live Dynamic Preview Board (Wider) */}
          <div className="lg:col-span-8">
            <div className="sticky top-6 space-y-4">
              {/* Zen Mode Text Width Preference */}
              <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4 text-left select-none animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-stone-900 font-sans">Zen Mode Text Layout Width</h4>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider leading-none">Screen Proportion Preference</p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-700 px-3 py-1 rounded-xl">
                    {zenTextWidth}%
                  </span>
                </div>

                <p className="text-xs text-stone-500 leading-relaxed font-sans">
                  Choose what percentage of the screen width the quote text is allowed to fill in Zen Mode. A larger percentage expands the horizontal area, reducing unnecessary line wraps and allowing longer paragraphs to fit beautifully without scaling the font down too small.
                </p>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-stone-400 font-semibold font-sans">
                    <span>Narrow (40%)</span>
                    <span>Standard (70%)</span>
                    <span>Full Width (100%)</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="100"
                    step="5"
                    value={zenTextWidth}
                    onChange={(e) => {
                      if (onSelectZenTextWidth) {
                        onSelectZenTextWidth(Number(e.target.value));
                      }
                    }}
                    className="w-full accent-amber-600 h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer border border-stone-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Live Global Preview (Right-Click/Select Text to Format)
                </h3>
                <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg border border-stone-200/60 shadow-3xs select-none">
                  <button
                    onClick={handleDecreaseFontSize}
                    className="px-2 py-1 text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-white rounded-md transition-all cursor-pointer border border-transparent hover:border-stone-200/50"
                    title="Decrease Font Size (A-)"
                  >
                    A-
                  </button>
                  <span className="text-[10px] font-mono font-bold text-stone-400 px-1">{previewFontSize}px</span>
                  <button
                    onClick={handleIncreaseFontSize}
                    className="px-2 py-1 text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-white rounded-md transition-all cursor-pointer border border-transparent hover:border-stone-200/50"
                    title="Increase Font Size (A+)"
                  >
                    A+
                  </button>
                </div>
              </div>

              <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-md relative overflow-hidden">
                {/* Visual quote mark decoration */}
                <div
                  className="absolute top-4 left-6 text-[120px] font-black select-none pointer-events-none leading-none opacity-[0.06] text-stone-900"
                  style={{ fontFamily: fonts.find((f) => f.id === selectedFontId)?.cssValue || QUOTE_FONTS[0].cssValue }}
                >
                  “
                </div>

                <div className="relative z-10 space-y-8 mx-auto transition-all duration-300" style={{ maxWidth: `${zenTextWidth}%` }}>
                  {/* English quote body preview */}
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-stone-400 block mb-2 font-sans select-none">
                      English Preview
                    </span>
                    <blockquote
                      data-quote-id="preview-en"
                      className="text-stone-850 leading-relaxed font-medium selection:bg-amber-200/80 cursor-text"
                      style={{
                        fontFamily: fonts.find((f) => f.id === selectedFontId)?.cssValue || QUOTE_FONTS[0].cssValue,
                        fontSize: `${previewFontSize}px`
                      }}
                    >
                      "{renderFormattedText(previewEn)}"
                    </blockquote>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-stone-100" />

                  {/* Greek quote body preview */}
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-stone-400 block mb-2 font-sans select-none">
                      Greek Preview (Ελληνικά)
                    </span>
                    <blockquote
                      data-quote-id="preview-el"
                      className="text-stone-850 leading-relaxed font-medium selection:bg-amber-200/80 cursor-text"
                      style={{
                        fontFamily: fonts.find((f) => f.id === selectedGreekFontId)?.cssValue || QUOTE_FONTS[0].cssValue,
                        fontSize: `${previewFontSize}px`
                      }}
                    >
                      "{renderFormattedText(previewEl)}"
                    </blockquote>
                  </div>

                  {/* Attribution */}
                  <div className="border-t border-stone-100/60 pt-4 flex justify-between items-center text-[11px] text-stone-400 font-sans select-none">
                    <span className="font-semibold uppercase tracking-wider">— Socrates / Σωκράτης</span>
                    <span className="italic bg-stone-100 text-stone-600 px-2.5 py-0.5 rounded-full capitalize">
                      {(fonts.find((f) => f.id === (activeFontTab === 'en' ? selectedFontId : selectedGreekFontId)) || QUOTE_FONTS[0])?.category} Style
                    </span>
                  </div>
                </div>
              </div>

              {/* Scope isolation advisory */}
              <div className="bg-stone-100 border border-stone-200/50 p-4 rounded-2xl text-[11px] text-stone-500 leading-normal font-sans shadow-2xs select-none">
                <p className="font-semibold text-stone-700 mb-1">Scope Isolation Policy</p>
                As requested, this setting applies <span className="font-semibold">exclusively</span> to the quote bodies (the actual texts). All user interface labels, action buttons, category panels, and author attributions will retain the ultra-legible system font <span className="font-medium">Inter</span> to ensure perfect navigation ergonomics.
              </div>
            </div>
          </div>
        </div>
      ) : activeList.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-16 text-center shadow-xs">
          <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-stone-100">
            {adminTab === 'down' ? (
              <ThumbsDown className="w-6 h-6 text-emerald-600 rotate-180" />
            ) : (
              <ThumbsUp className="w-6 h-6 text-amber-500" />
            )}
          </div>
          <h3 className="font-serif text-lg font-bold text-stone-800 mb-1">
            {adminTab === 'down' ? "Your Library is Pristine!" : "No Favorites Yet"}
          </h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto">
            {adminTab === 'down' ? (
              "There are currently zero quotes marked with a thumbs down. Any quote you downvote during slideshow play will appear here for review."
            ) : (
              "There are currently zero quotes marked with a thumbs up. Use the thumbs up button on cards during a slideshow to mark your favorites, and they will list here!"
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 justify-between shadow-xs">
            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="admin-search-flagged"
                type="text"
                placeholder="Search text or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full font-sans text-sm pl-9 pr-4 py-2 border border-stone-200 rounded-xl bg-stone-50/50 hover:bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              <div className="flex items-center gap-1.5 text-xs text-stone-500 font-semibold uppercase">
                <Filter className="w-3.5 h-3.5 text-stone-400" />
                <span>Category:</span>
              </div>
              <select
                id="admin-cat-filter"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="font-sans text-sm border border-stone-200 rounded-xl px-3 py-1.5 bg-stone-50 hover:bg-white focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Bulk Actions */}
              {filteredList.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-l border-stone-200 pl-3 ml-1">
                  {bulkResetConfirm ? (
                    <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 p-1 rounded-lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 px-1.5">
                        {adminTab === 'down' ? "Reset All Flags?" : "Reset All Favorites?"}
                      </span>
                      <button
                        onClick={executeBulkReset}
                        className="bg-stone-950 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-2 rounded-md cursor-pointer transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setBulkResetConfirm(false)}
                        className="bg-stone-100 hover:bg-stone-200 text-stone-600 text-[10px] font-bold uppercase tracking-wider py-1 px-2 rounded-md cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : bulkDeleteConfirm ? (
                    <div className="flex items-center gap-1 bg-red-50 border border-red-200 p-1 rounded-lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 px-1.5">Delete All Filtered?</span>
                      <button
                        onClick={executeBulkDelete}
                        className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-2 rounded-md cursor-pointer transition-colors"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setBulkDeleteConfirm(false)}
                        className="bg-stone-100 hover:bg-stone-200 text-stone-600 text-[10px] font-bold uppercase tracking-wider py-1 px-2 rounded-md cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        id="bulk-reset-btn"
                        onClick={() => {
                          setBulkResetConfirm(true);
                          setBulkDeleteConfirm(false);
                        }}
                        className="flex items-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                        title={adminTab === 'down' ? "Reset flags for filtered list" : "Reset favorites for filtered list"}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{adminTab === 'down' ? 'Reset All' : 'Reset Favs'} ({filteredList.length})</span>
                      </button>
                      <button
                        id="bulk-delete-btn"
                        onClick={() => {
                          setBulkDeleteConfirm(true);
                          setBulkResetConfirm(false);
                        }}
                        className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                        title="Delete permanently all filtered list"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete All ({filteredList.length})</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Table / List Grid */}
          {filteredList.length === 0 ? (
            <div className="p-8 text-center text-stone-400 font-serif border border-dashed border-stone-200 rounded-xl">
              No quotes match your current filter parameters.
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-stone-100">
              {filteredList.map((quote) => (
                <div
                  key={quote.id}
                  id={`quote-row-${quote.id}`}
                  className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors"
                >
                  {/* Left content block */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {/* Rating Tag */}
                      {quote.rating === 'down' ? (
                        <span className="flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                          <ThumbsDown className="w-2.5 h-2.5 fill-current" />
                          <span>Downvoted</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                          <ThumbsUp className="w-2.5 h-2.5 fill-current" />
                          <span>Upvoted</span>
                        </span>
                      )}

                      {/* Category Badge */}
                      <span className="bg-stone-100 text-stone-600 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                        {getCategoryName(quote.categoryId)}
                      </span>
                    </div>

                    <p className="font-quote text-stone-850 text-base leading-relaxed">
                      "{renderFormattedText(quote.text)}"
                    </p>
                    <span className="block text-xs font-semibold text-stone-400 mt-2 uppercase tracking-wide">
                      — {quote.author || "Unknown"}
                    </span>
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                    {/* Approve / Reset rating button */}
                    <button
                      onClick={() => {
                        onRateQuote(quote.id, null);
                        if (quoteIdToDeleteConfirm === quote.id) {
                          setQuoteIdToDeleteConfirm(null);
                        }
                      }}
                      className="flex items-center gap-1.5 border border-stone-200 hover:border-amber-500 hover:text-amber-850 hover:bg-amber-50 bg-white text-stone-600 font-sans text-xs font-semibold py-2 px-3.5 rounded-xl transition-all cursor-pointer shadow-2xs"
                      title={adminTab === 'down' ? "Keep quote and clear flags" : "Remove from favorites"}
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                      <span>{adminTab === 'down' ? 'Approve & Reset' : 'Remove Favorite'}</span>
                    </button>

                    {/* Delete Permanently button */}
                    {quoteIdToDeleteConfirm === quote.id ? (
                      <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 p-1.5 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 px-1">Delete?</span>
                        <button
                          onClick={() => {
                            onDeleteQuote(quote.id);
                            setQuoteIdToDeleteConfirm(null);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-2 rounded-md cursor-pointer transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setQuoteIdToDeleteConfirm(null)}
                          className="bg-stone-200 hover:bg-stone-300 text-stone-700 text-[10px] font-bold uppercase tracking-wider py-1 px-2 rounded-md cursor-pointer transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setQuoteIdToDeleteConfirm(quote.id);
                        }}
                        className="flex items-center gap-1.5 border border-red-200 hover:border-red-500 hover:bg-red-50 hover:text-red-700 bg-white text-stone-600 font-sans text-xs font-semibold py-2 px-3.5 rounded-xl transition-all cursor-pointer shadow-2xs"
                        title="Permanently remove quote from library"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        <span>Delete Permanently</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Context Menu for Font Deletion & Options */}
      {contextMenu?.visible && (
        <div
          id="font-context-menu"
          className="fixed bg-white border border-stone-250 rounded-xl shadow-lg py-1.5 z-50 text-left min-w-[160px] animate-fade-in"
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Copy Font Name Option */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const fontName = fonts.find(f => f.id === contextMenu.fontId)?.name || "";
              navigator.clipboard.writeText(fontName);
              setSuccessMessage(`Font name "${fontName}" copied to clipboard!`);
              setTimeout(() => setSuccessMessage(null), 3000);
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 cursor-pointer transition-colors border-b border-stone-100 pb-2 mb-1"
          >
            <Copy className="w-3.5 h-3.5 text-stone-500" />
            <span>Copy Font Name</span>
          </button>

          {/* Apply same font in English Option (Greek fonts tab only) */}
          {activeFontTab === 'el' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTargetGreekFontId(contextMenu.fontId);
                setShowApplyGreekToEnglishConfirm(true);
                setContextMenu(null);
              }}
              className="w-full text-left px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2 cursor-pointer transition-colors border-b border-stone-100 pb-2 mb-2"
            >
              <Type className="w-3.5 h-3.5 text-amber-500" />
              <span>Apply same font in English</span>
            </button>
          )}

          {/* Favorite Toggle Option */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavoriteFont?.(contextMenu.fontId);
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Star className={`w-3.5 h-3.5 ${favoriteFontIds.includes(contextMenu.fontId) ? "fill-amber-400 text-amber-500" : "text-stone-500"}`} />
            <span>
              {favoriteFontIds.includes(contextMenu.fontId) ? "Remove Favorite" : "Add to Favorites"}
            </span>
          </button>

          {onDeleteFont && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFontIdToDeleteConfirm(contextMenu.fontId);
                setContextMenu(null);
              }}
              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-2 cursor-pointer transition-colors border-t border-stone-100 mt-1 pt-2"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              <span>Delete Font</span>
            </button>
          )}
        </div>
      )}

      {/* Center Screen Font Deletion Confirmation Modal Overlay */}
      {fontIdToDeleteConfirm && (
        <div 
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center z-[200] p-4 animate-fade-in" 
          onClick={() => setFontIdToDeleteConfirm(null)}
        >
          <div 
            className="bg-white border border-stone-200 rounded-3xl p-6 max-w-sm w-full shadow-xl animate-scale-up text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-900 font-sans">Delete Custom Font?</h4>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider leading-none">Confirm Action</p>
              </div>
            </div>
            
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              Are you sure you want to delete <strong className="text-stone-900 font-semibold">"{fonts.find(f => f.id === fontIdToDeleteConfirm)?.name || "selected font"}"</strong>? This will remove it from your typography options.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onDeleteFont && fontIdToDeleteConfirm) {
                    onDeleteFont(fontIdToDeleteConfirm);
                  }
                  setFontIdToDeleteConfirm(null);
                }}
                className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all text-center"
              >
                Yes, Delete
              </button>
              <button
                type="button"
                onClick={() => setFontIdToDeleteConfirm(null)}
                className="flex-1 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl border border-stone-200/60 cursor-pointer transition-all text-center"
              >
                No, Keep
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Center Screen Font Application Confirmation Modal Overlay */}
      {showApplyFontConfirm && (
        <div 
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center z-[200] p-4 animate-fade-in"
          onClick={() => {}}
        >
          <div 
            className="bg-white border border-stone-200 rounded-3xl p-6 max-w-md w-full shadow-xl animate-scale-up text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                <Type className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-900 font-sans">Apply Imported Font?</h4>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider leading-none">Confirm Selection</p>
              </div>
            </div>
            
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              Would you like to apply <strong className="text-stone-900 font-semibold">"{importedFontName}"</strong> as your active font?
            </p>

            {/* Visual Preview Container */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/60 space-y-3 shadow-3xs">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 block leading-none">
                  Typography Preview
                </span>
                <div className="flex items-center gap-1.5 select-none shrink-0 bg-stone-100 p-0.5 rounded-lg border border-stone-200/40">
                  <button
                    type="button"
                    onClick={() => setModalPreviewFontSize(prev => Math.max(12, prev - 2))}
                    className="w-5 h-5 flex items-center justify-center text-[10px] font-extrabold bg-white hover:bg-stone-50 text-stone-700 rounded shadow-3xs hover:text-amber-700 cursor-pointer active:scale-95 transition-all"
                    title="Decrease preview font size"
                  >
                    A-
                  </button>
                  <span className="text-[9px] font-bold text-stone-500 w-7 text-center font-mono">
                    {modalPreviewFontSize}px
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalPreviewFontSize(prev => Math.min(32, prev + 2))}
                    className="w-5 h-5 flex items-center justify-center text-[10px] font-extrabold bg-white hover:bg-stone-50 text-stone-700 rounded shadow-3xs hover:text-amber-700 cursor-pointer active:scale-95 transition-all"
                    title="Increase preview font size"
                  >
                    A+
                  </button>
                </div>
              </div>
              
              <div 
                style={{ fontFamily: `"${importedFontName}", Georgia, serif` }}
                className="space-y-3 text-stone-850"
              >
                <div className="space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 leading-none">
                    English (Latin)
                  </p>
                  <p 
                    style={{ fontSize: `${modalPreviewFontSize}px` }}
                    className="font-medium leading-relaxed"
                  >
                    "True wisdom comes to each of us when we realize how little we understand."
                  </p>
                </div>

                <div className="border-t border-stone-200/80 my-2"></div>

                <div className="space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 leading-none">
                    Greek (Ελληνικά)
                  </p>
                  <p 
                    style={{ fontSize: `${modalPreviewFontSize}px` }}
                    className="font-medium leading-relaxed"
                  >
                    "Η αληθινή σοφία έρχεται στον καθένα μας όταν συνειδητοποιήσουμε πόσο λίγο κατανοούμε."
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowApplyFontConfirm(false);
                  setSuccessMessage(`Font "${importedFontName}" successfully applied!`);
                  setTimeout(() => setSuccessMessage(null), 3000);
                }}
                className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all text-center"
              >
                Yes, Apply
              </button>
              <button
                type="button"
                onClick={() => {
                  // Restore previously selected fonts
                  if (onSelectFontId && previousFontId) {
                    onSelectFontId(previousFontId);
                  }
                  if (onSelectGreekFontId && previousGreekFontId) {
                    onSelectGreekFontId(previousGreekFontId);
                  }
                  setShowApplyFontConfirm(false);
                  
                  // Scroll back to the previous font button
                  const targetScrollId = activeFontTab === 'en' ? previousFontId : previousGreekFontId;
                  setTimeout(() => {
                    const btn = document.getElementById(`font-btn-${targetScrollId}`);
                    if (btn) {
                      btn.scrollIntoView({ block: "center", behavior: "smooth" });
                    }
                  }, 150);
                }}
                className="flex-1 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl border border-stone-200/60 cursor-pointer transition-all text-center"
              >
                No, Keep Previous
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Greek Font to English (Latin) Application Confirmation Modal Overlay */}
      {showApplyGreekToEnglishConfirm && targetGreekFontId && (
        <div 
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center z-[200] p-4 animate-fade-in"
          onClick={() => {
            setShowApplyGreekToEnglishConfirm(false);
            setTargetGreekFontId(null);
          }}
        >
          <div 
            className="bg-white border border-stone-200 rounded-3xl p-6 max-w-md w-full shadow-xl animate-scale-up text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                <Type className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-900 font-sans">Apply Font to English?</h4>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider leading-none">Confirm Unified Styling</p>
              </div>
            </div>
            
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              Would you like to apply <strong className="text-stone-900 font-semibold">"{fonts.find(f => f.id === targetGreekFontId)?.name || ""}"</strong> as your active font for <strong className="text-amber-700 font-semibold">English quotes</strong> as well?
            </p>

            {/* Visual Preview Container */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/60 space-y-3 shadow-3xs">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 block leading-none">
                  Typography Preview
                </span>
                <div className="flex items-center gap-1.5 select-none shrink-0 bg-stone-100 p-0.5 rounded-lg border border-stone-200/40">
                  <button
                    type="button"
                    onClick={() => setModalPreviewFontSize(prev => Math.max(12, prev - 2))}
                    className="w-5 h-5 flex items-center justify-center text-[10px] font-extrabold bg-white hover:bg-stone-50 text-stone-700 rounded shadow-3xs hover:text-amber-700 cursor-pointer active:scale-95 transition-all"
                    title="Decrease preview font size"
                  >
                    A-
                  </button>
                  <span className="text-[9px] font-bold text-stone-500 w-7 text-center font-mono">
                    {modalPreviewFontSize}px
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalPreviewFontSize(prev => Math.min(32, prev + 2))}
                    className="w-5 h-5 flex items-center justify-center text-[10px] font-extrabold bg-white hover:bg-stone-50 text-stone-700 rounded shadow-3xs hover:text-amber-700 cursor-pointer active:scale-95 transition-all"
                    title="Increase preview font size"
                  >
                    A+
                  </button>
                </div>
              </div>
              
              <div 
                style={{ fontFamily: fonts.find(f => f.id === targetGreekFontId)?.cssValue || "inherit" }}
                className="space-y-3 text-stone-850"
              >
                <div className="space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 leading-none">
                    English (Latin)
                  </p>
                  <p 
                    style={{ fontSize: `${modalPreviewFontSize}px` }}
                    className="font-medium leading-relaxed"
                  >
                    "True wisdom comes to each of us when we realize how little we understand."
                  </p>
                </div>

                <div className="border-t border-stone-200/80 my-2"></div>

                <div className="space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 leading-none">
                    Greek (Ελληνικά)
                  </p>
                  <p 
                    style={{ fontSize: `${modalPreviewFontSize}px` }}
                    className="font-medium leading-relaxed"
                  >
                    "Η αληθινή σοφία έρχεται στον καθένα μας όταν συνειδητοποιήσουμε πόσο λίγο κατανοούμε."
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onSelectFontId && targetGreekFontId) {
                    onSelectFontId(targetGreekFontId);
                  }
                  setShowApplyGreekToEnglishConfirm(false);
                  const fontName = fonts.find(f => f.id === targetGreekFontId)?.name || "";
                  setSuccessMessage(`Font "${fontName}" applied to English quotes successfully!`);
                  setTimeout(() => setSuccessMessage(null), 3000);
                  setTargetGreekFontId(null);
                }}
                className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all text-center font-bold"
              >
                Yes, Apply to English
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowApplyGreekToEnglishConfirm(false);
                  setTargetGreekFontId(null);
                }}
                className="flex-1 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl border border-stone-200/60 cursor-pointer transition-all text-center"
              >
                No, Keep Separate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
