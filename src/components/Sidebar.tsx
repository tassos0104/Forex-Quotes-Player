import React, { useState } from "react";
import { Category, Quote } from "../types";
import { BookOpen, Plus, Trash2, Check, X, Sparkles, ThumbsUp } from "lucide-react";

interface SidebarProps {
  categories: Category[];
  quotes: Quote[];
  activeCategoryId: string;
  setActiveCategoryId: (id: string) => void;
  onAddCategory: (name: string) => void;
  onDeleteCategory: (id: string) => void;
  onToggleShuffle: (id: string) => void;
  onToggleAllShuffle: (enable: boolean) => void;
  shuffleFavoritesOnly?: boolean;
  onDisableFavoritesOnly?: () => void;
}

export default function Sidebar({
  categories,
  quotes,
  activeCategoryId,
  setActiveCategoryId,
  onAddCategory,
  onDeleteCategory,
  onToggleShuffle,
  onToggleAllShuffle,
  shuffleFavoritesOnly = false,
  onDisableFavoritesOnly,
}: SidebarProps) {
  const [newCatName, setNewCatName] = useState("");
  const [error, setError] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    if (trimmed.length > 20) {
      setError("Category name must be 20 characters or less.");
      return;
    }

    if (
      categories.some(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setError("Category already exists.");
      return;
    }

    onAddCategory(trimmed);
    setNewCatName("");
    setError("");
  };

  // Get quote count for a category
  const getQuoteCount = (categoryId: string) => {
    return quotes.filter((q) => q.categoryId === categoryId).length;
  };

  // Check if all are enabled
  const allEnabled = categories.every((c) => c.isShufflable);
  
  const totalInPool = shuffleFavoritesOnly
    ? quotes.filter((q) => q.rating === "up").length
    : quotes.filter((q) => {
        const cat = categories.find((c) => c.id === q.categoryId);
        return cat?.isShufflable;
      }).length;

  return (
    <div
      id="app-sidebar"
      className="w-full md:w-80 flex flex-col bg-stone-50 border-b md:border-b-0 md:border-r border-stone-200 h-full max-h-screen shrink-0"
    >
      {/* App Header */}
      <div className="p-6 border-b border-stone-200 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
            <BookOpen id="sidebar-logo-icon" className="w-6 h-6" />
          </div>
          <div>
            <h1 id="app-title" className="font-serif text-2xl font-semibold text-stone-900 tracking-tight">
              Quote Shuffle
            </h1>
            <p className="text-xs text-stone-500 font-sans">
              Create, organize & shuffle quotes
            </p>
          </div>
        </div>

        {/* Shuffle Pool Info */}
        <div className="mt-4 p-3 bg-stone-100/70 rounded-xl border border-stone-200/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
            <span className="text-xs text-stone-600 font-medium">
              {shuffleFavoritesOnly ? "Thumbs-Up Play Pool" : "Active Shuffle Pool"}
            </span>
          </div>
          <span className="text-xs font-mono bg-stone-200 text-stone-800 px-2 py-0.5 rounded-full font-semibold">
            {totalInPool} {totalInPool === 1 ? "quote" : "quotes"}
          </span>
        </div>
      </div>

      {/* Category List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1.5">
        {shuffleFavoritesOnly ? (
          <div className="flex flex-col gap-3 mt-1">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Playing Slideshow
              </span>
            </div>

            {/* Temporary Thumbs Up Category Card */}
            <div
              id="thumbs-up-temp-category"
              className="flex flex-col gap-3 bg-emerald-50/60 border-2 border-emerald-500/35 rounded-2xl p-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 bg-emerald-600 text-white rounded-lg shrink-0 shadow-xs">
                    <ThumbsUp className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <span className="font-serif text-[15px] font-bold text-emerald-900 truncate">
                    Thumbs up
                  </span>
                </div>
                
                <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                  {quotes.filter((q) => q.rating === "up").length}
                </span>
              </div>

              <p className="text-xs text-emerald-700 leading-relaxed font-sans">
                Only quotes you have marked with a thumbs-up are currently playing in the slideshow.
              </p>

              {onDisableFavoritesOnly && (
                <button
                  id="exit-thumbs-up-slideshow-sidebar-btn"
                  onClick={onDisableFavoritesOnly}
                  className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider py-2.5 px-3 rounded-xl shadow-xs transition-colors cursor-pointer mt-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Exit Slideshow</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Categories
              </span>
              <button
                id="toggle-all-btn"
                onClick={() => onToggleAllShuffle(!allEnabled)}
                className="text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
              >
                {allEnabled ? "Deselect All" : "Select All"}
              </button>
            </div>

            {categories.map((cat) => {
              const isActive = cat.id === activeCategoryId;
              const count = getQuoteCount(cat.id);

              return (
                <div
                  key={cat.id}
                  id={`cat-row-${cat.id}`}
                  className={`group flex items-center justify-between p-2 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-amber-50 border border-amber-200/70 shadow-sm"
                      : "hover:bg-stone-100 border border-transparent"
                  }`}
                >
                  {/* Left Side: Click to active, Toggle state */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Custom Toggle Switch for Shuffle */}
                    <button
                      id={`shuffle-toggle-${cat.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleShuffle(cat.id);
                      }}
                      title={
                        cat.isShufflable ? "Included in Shuffle" : "Excluded from Shuffle"
                      }
                      className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors duration-300 shrink-0 ${
                        cat.isShufflable ? "bg-amber-600" : "bg-stone-300"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-300 ${
                          cat.isShufflable ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>

                    {/* Category Button Name */}
                    <button
                      id={`cat-select-${cat.id}`}
                      onClick={() => setActiveCategoryId(cat.id)}
                      className={`text-left font-serif text-[15px] truncate flex-1 font-medium transition-colors ${
                        isActive
                          ? "text-amber-900"
                          : "text-stone-700 hover:text-stone-900"
                      }`}
                    >
                      {cat.name}
                    </button>
                  </div>

                  {/* Right Side: Quote Count & Delete */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <span
                      id={`cat-badge-${cat.id}`}
                      className={`text-xs font-mono px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? "bg-amber-100/80 text-amber-800"
                          : "bg-stone-200/70 text-stone-600"
                      }`}
                    >
                      {count}
                    </span>

                    {cat.isCustom && (
                      <button
                        id={`delete-cat-${cat.id}`}
                        onClick={() => setCategoryToDelete(cat)}
                        className="p-1 text-stone-400 hover:text-red-600 rounded-md hover:bg-stone-200/50 transition-colors md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Add Category Form */}
      {!shuffleFavoritesOnly && (
        <div className="p-4 border-t border-stone-200 bg-stone-100/50">
          <form onSubmit={handleAddSubmit} className="flex flex-col gap-2">
            <label htmlFor="new-cat-input" className="text-xs font-semibold text-stone-500">
              Create Custom Category
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id="new-cat-input"
                type="text"
                placeholder="e.g. Life, Science"
                value={newCatName}
                onChange={(e) => {
                  setNewCatName(e.target.value);
                  if (error) setError("");
                }}
                className="flex-1 text-sm bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all"
              />
              <button
                id="add-cat-submit"
                type="submit"
                className="p-2 bg-stone-900 hover:bg-amber-700 text-white rounded-lg transition-colors duration-200"
                title="Add Category"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {error && (
              <p id="cat-form-error" className="text-xs text-red-500 font-sans mt-0.5">
                {error}
              </p>
            )}
          </form>
        </div>
      )}

      {/* Category Deletion Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/65 backdrop-blur-[2px] p-4">
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xl max-w-sm w-full p-6 animate-fade-in">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2.5 bg-red-50 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h4 className="font-serif text-lg font-semibold text-stone-950">
                Delete Category?
              </h4>
            </div>
            
            <p className="text-sm text-stone-600 leading-relaxed mb-5">
              Are you sure you want to delete <strong className="text-stone-900 font-semibold font-serif">"{categoryToDelete.name}"</strong>? This will permanently delete the category and all of its <strong className="text-stone-950 font-bold">{getQuoteCount(categoryToDelete.id)}</strong> saved quotes.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                id="cancel-delete-cat-btn"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-cat-btn"
                onClick={() => {
                  onDeleteCategory(categoryToDelete.id);
                  setCategoryToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
