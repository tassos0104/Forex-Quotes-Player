import React, { useState, useEffect } from "react";
import { Quote, Category, QUOTE_FONTS } from "../types";
import { ShieldAlert, Trash2, RotateCcw, Search, Filter, ArrowLeft, BookOpen, ThumbsDown, ThumbsUp, Play, Type } from "lucide-react";
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
}: AdminPanelProps) {
  const [adminTab, setAdminTab] = useState<'down' | 'up' | 'fonts'>('down');
  const [activeFontTab, setActiveFontTab] = useState<'en' | 'el'>('en');
  const [fontSearch, setFontSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");

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
      const combinedLinkId = "google-fonts-all-admin";
      if (!document.getElementById(combinedLinkId)) {
        const link = document.createElement("link");
        link.id = combinedLinkId;
        link.rel = "stylesheet";
        const families = QUOTE_FONTS.map(f => `family=${encodeURIComponent(f.family)}`).join("&");
        link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
        document.head.appendChild(link);
      }
    }
  }, [adminTab]);

  // Custom confirmation states to bypass native window.confirm in sandboxed iframes
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkResetConfirm, setBulkResetConfirm] = useState(false);
  const [quoteIdToDeleteConfirm, setQuoteIdToDeleteConfirm] = useState<string | null>(null);

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
                  {QUOTE_FONTS.find(f => f.id === selectedFontId)?.name || "Playfair Display"}
                </span>
              </div>
              <div className="border-t border-stone-100 pt-2">
                <span className="text-[9px] uppercase tracking-wider font-semibold text-stone-400 block">Greek Font (Ελληνικά):</span>
                <span className="text-sm font-bold text-emerald-700 font-serif block truncate">
                  {QUOTE_FONTS.find(f => f.id === selectedGreekFontId)?.name || "GFS Didot"}
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
          <div className="lg:col-span-4 space-y-4">
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
            
            {/* Font Search Field */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-stone-400" />
              </span>
              <input
                type="text"
                value={fontSearch}
                onChange={(e) => setFontSearch(e.target.value)}
                placeholder="Search font by name or category..."
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

            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <span>
                  {activeFontTab === 'en' ? "Latin/English Typography" : "Greek-Supported Typography"}
                </span>
                <span className="text-[10px] bg-amber-500/10 text-amber-800 font-bold px-2 py-0.5 rounded-full font-mono">
                  {
                    (() => {
                      const displayedFonts = QUOTE_FONTS
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

            <div className="flex flex-col gap-3 max-h-[550px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-stone-200">
              {(() => {
                const displayedFonts = [...QUOTE_FONTS]
                  .filter((font) => activeFontTab === 'en' || font.supportsGreek)
                  .filter((font) => {
                    if (!fontSearch) return true;
                    const query = fontSearch.toLowerCase();
                    return font.name.toLowerCase().includes(query) || font.category.toLowerCase().includes(query);
                  })
                  .sort((a, b) => a.name.localeCompare(b.name));

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
                  
                  return (
                    <button
                      key={font.id}
                      onClick={() => {
                        if (activeFontTab === 'en') {
                          onSelectFontId?.(font.id);
                        } else {
                          onSelectGreekFontId?.(font.id);
                        }
                      }}
                      className={`flex flex-col text-left p-4 rounded-2xl border transition-all cursor-pointer w-full shrink-0 ${
                        isActive
                          ? "bg-amber-500/5 border-amber-600 ring-2 ring-amber-500/10 shadow-xs"
                          : "bg-white hover:bg-stone-50 border-stone-200"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-sm font-bold text-stone-850 font-sans">
                          {font.name}
                        </span>
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                        )}
                      </div>

                      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-4">
                        {font.category} Style {font.supportsGreek && "• Greek Supported"}
                      </span>

                      {/* Mini inline preview */}
                      <div
                        className="mt-auto border-t border-stone-100 pt-2.5 text-stone-600 w-full"
                        style={{ fontFamily: font.cssValue }}
                      >
                        {activeFontTab === 'en' ? previewEn : previewEl}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          {/* Right Panel: Live Dynamic Preview Board (Wider) */}
          <div className="lg:col-span-8">
            <div className="sticky top-6 space-y-4">
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
                  style={{ fontFamily: QUOTE_FONTS.find((f) => f.id === selectedFontId)?.cssValue }}
                >
                  “
                </div>

                <div className="relative z-10 space-y-8">
                  {/* English quote body preview */}
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-stone-400 block mb-2 font-sans select-none">
                      English Preview
                    </span>
                    <blockquote
                      data-quote-id="preview-en"
                      className="text-stone-850 leading-relaxed font-medium selection:bg-amber-200/80 cursor-text"
                      style={{
                        fontFamily: QUOTE_FONTS.find((f) => f.id === selectedFontId)?.cssValue,
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
                        fontFamily: QUOTE_FONTS.find((f) => f.id === selectedGreekFontId)?.cssValue,
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
                      {QUOTE_FONTS.find((f) => f.id === (activeFontTab === 'en' ? selectedFontId : selectedGreekFontId))?.category} Style
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
                        className="bg-red-650 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-2 rounded-md cursor-pointer transition-colors"
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
                          className="bg-red-650 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-2 rounded-md cursor-pointer transition-colors"
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
    </div>
  );
}
