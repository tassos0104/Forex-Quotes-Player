import React, { useState } from "react";
import { Category, Quote, Folder } from "../types";
import { BookOpen, Plus, Trash2, Check, X, Sparkles, ThumbsUp, Folder as FolderIcon, FolderOpen, ChevronDown, ChevronRight, FolderPlus, Pencil } from "lucide-react";

interface SidebarProps {
  folders: Folder[];
  categories: Category[];
  quotes: Quote[];
  activeCategoryId: string;
  setActiveCategoryId: (id: string) => void;
  onAddFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onUpdateFolder: (id: string, name: string) => void;
  onAddCategory: (name: string, folderId?: string) => void;
  onDeleteCategory: (id: string) => void;
  onToggleShuffle: (id: string) => void;
  onToggleAllShuffle: (enable: boolean) => void;
  shuffleFavoritesOnly?: boolean;
  onDisableFavoritesOnly?: () => void;
}

export default function Sidebar({
  folders,
  categories,
  quotes,
  activeCategoryId,
  setActiveCategoryId,
  onAddFolder,
  onDeleteFolder,
  onUpdateFolder,
  onAddCategory,
  onDeleteCategory,
  onToggleShuffle,
  onToggleAllShuffle,
  shuffleFavoritesOnly = false,
  onDisableFavoritesOnly,
}: SidebarProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [showAddFolderInput, setShowAddFolderInput] = useState(false);
  const [folderError, setFolderError] = useState("");

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [editFolderError, setEditFolderError] = useState("");

  const [expandedFolders, setExpandedFolders] = useState<string[]>(["forex", "bible"]);
  const [activeAddCategoryFolderId, setActiveAddCategoryFolderId] = useState<string | null>(null);
  const [newCatInFolderText, setNewCatInFolderText] = useState("");
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);

  const [newCatName, setNewCatName] = useState("");
  const [error, setError] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
    );
  };

  const handleAddFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    if (trimmed.length > 20) {
      setFolderError("Folder name must be 20 characters or less.");
      return;
    }

    if (
      folders.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      setFolderError("Folder already exists.");
      return;
    }

    onAddFolder(trimmed);
    setNewFolderName("");
    setFolderError("");
    setShowAddFolderInput(false);
    // Auto-expand the newly created folder
    const newId = `folder-${Date.now()}`; // Just to have it expanded in state
    setExpandedFolders(prev => [...prev, newId]);
  };

  const handleRenameFolderSubmit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    const trimmed = editingFolderName.trim();
    if (!trimmed) return;

    if (trimmed.length > 20) {
      setEditFolderError("Folder name must be 20 characters or less.");
      return;
    }

    if (
      folders.some((f) => f.id !== id && f.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      setEditFolderError("Another folder already has this name.");
      return;
    }

    onUpdateFolder(id, trimmed);
    setEditingFolderId(null);
    setEditingFolderName("");
    setEditFolderError("");
  };

  const handleAddCategoryToFolderSubmit = (e: React.FormEvent, folderId: string) => {
    e.preventDefault();
    const trimmed = newCatInFolderText.trim();
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

    onAddCategory(trimmed, folderId);
    setNewCatInFolderText("");
    setActiveAddCategoryFolderId(null);
    setError("");
  };

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

    onAddCategory(trimmed, selectedFolderIdForNewCategory);
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

  const [selectedFolderIdForNewCategory, setSelectedFolderIdForNewCategory] = useState("forex");

  return (
    <div
      id="app-sidebar"
      className="w-full md:w-80 flex flex-col bg-stone-50 border-b md:border-b-0 md:border-r border-stone-200 h-full max-h-screen shrink-0"
    >
      {/* App Header */}
      <div className="p-6 border-b border-stone-200 flex flex-col gap-2 shrink-0">
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
            <div className="flex items-center justify-between px-2 mb-2 shrink-0">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Folders & Subjects
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  id="add-folder-btn"
                  onClick={() => setShowAddFolderInput(!showAddFolderInput)}
                  className="text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors flex items-center gap-1"
                  title="Create Folder"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>New Folder</span>
                </button>
                <button
                  id="toggle-all-btn"
                  onClick={() => onToggleAllShuffle(!allEnabled)}
                  className="text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
                >
                  {allEnabled ? "Deselect All" : "Select All"}
                </button>
              </div>
            </div>

            {/* Inline Folder Creation Form */}
            {showAddFolderInput && (
              <form onSubmit={handleAddFolderSubmit} className="bg-amber-50/50 border border-amber-200/55 p-3 rounded-xl mb-3 animate-fade-in flex flex-col gap-2">
                <span className="text-xs font-semibold text-amber-850 flex items-center gap-1.5">
                  <FolderPlus className="w-3.5 h-3.5 text-amber-600" />
                  Create New Folder
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="e.g. BIBLE, FOREX"
                    value={newFolderName}
                    onChange={(e) => {
                      setNewFolderName(e.target.value);
                      if (folderError) setFolderError("");
                    }}
                    className="flex-1 text-xs bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-850 placeholder-stone-400 focus:outline-none focus:border-amber-600"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="p-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors cursor-pointer"
                    title="Save Folder"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddFolderInput(false);
                      setNewFolderName("");
                      setFolderError("");
                    }}
                    className="p-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-md transition-colors cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {folderError && (
                  <p className="text-[10px] text-red-500">{folderError}</p>
                )}
              </form>
            )}

            {/* Folders & Categories List */}
            <div className="flex flex-col gap-2">
              {folders.map((folder) => {
                const isExpanded = expandedFolders.includes(folder.id);
                const folderCategories = categories.filter((c) => c.folderId === folder.id);
                const isEditing = editingFolderId === folder.id;

                return (
                  <div key={folder.id} className="border border-stone-200/40 rounded-xl p-1 bg-stone-50/30">
                    {/* Folder Header Row */}
                    <div className="group/folder flex items-center justify-between p-1.5 rounded-lg hover:bg-stone-100/70 transition-all">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer" onClick={() => toggleFolder(folder.id)}>
                        <button className="text-stone-400 hover:text-stone-600 transition-colors">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        {isExpanded ? (
                          <FolderOpen className="w-4 h-4 text-amber-600 shrink-0" />
                        ) : (
                          <FolderIcon className="w-4 h-4 text-amber-600 shrink-0" />
                        )}

                        {isEditing ? (
                          <form
                            onSubmit={(e) => handleRenameFolderSubmit(e, folder.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 flex-1 min-w-0"
                          >
                            <input
                              type="text"
                              value={editingFolderName}
                              onChange={(e) => {
                                setEditingFolderName(e.target.value);
                                if (editFolderError) setEditFolderError("");
                              }}
                              className="w-full text-xs bg-white border border-stone-300 rounded-md px-1.5 py-0.5 text-stone-850 focus:outline-none"
                              autoFocus
                              maxLength={20}
                            />
                            <button type="submit" className="text-emerald-600 hover:text-emerald-700">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFolderId(null);
                                setEditingFolderName("");
                                setEditFolderError("");
                              }}
                              className="text-stone-400 hover:text-stone-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        ) : (
                          <span className="font-serif font-bold text-stone-800 tracking-wide text-xs uppercase truncate">
                            {folder.name}
                          </span>
                        )}
                      </div>

                      {/* Folder Actions */}
                      {!isEditing && (
                        <div className="flex items-center gap-1 shrink-0 ml-1 md:opacity-0 md:group-hover/folder:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveAddCategoryFolderId(
                                activeAddCategoryFolderId === folder.id ? null : folder.id
                              );
                              if (!isExpanded) toggleFolder(folder.id);
                            }}
                            className="p-1 text-stone-400 hover:text-amber-700 hover:bg-stone-200/50 rounded-md transition-colors"
                            title="Add Category inside this Folder"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingFolderId(folder.id);
                              setEditingFolderName(folder.name);
                              setEditFolderError("");
                            }}
                            className="p-1 text-stone-400 hover:text-amber-700 hover:bg-stone-200/50 rounded-md transition-colors"
                            title="Rename Folder"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          {folder.isCustom && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFolderToDelete(folder);
                              }}
                              className="p-1 text-stone-400 hover:text-red-600 hover:bg-stone-200/50 rounded-md transition-colors"
                              title="Delete Folder"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Folder Categories (Indented list) */}
                    {isExpanded && (
                      <div className="flex flex-col gap-1 pl-4 pr-1 py-1 border-l border-stone-200/70 ml-3.5 mt-0.5 mb-1 animate-fade-in">
                        {folderCategories.map((cat) => {
                          const isActive = cat.id === activeCategoryId;
                          const count = getQuoteCount(cat.id);

                          return (
                            <div
                              key={cat.id}
                              id={`cat-row-${cat.id}`}
                              className={`group flex items-center justify-between p-1.5 rounded-lg transition-all duration-200 ${
                                isActive
                                  ? "bg-amber-50 border border-amber-200/60 shadow-3xs"
                                  : "hover:bg-stone-100 border border-transparent"
                              }`}
                            >
                              {/* Left: Shuffle Toggle & Category Name Select */}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <button
                                  id={`shuffle-toggle-${cat.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleShuffle(cat.id);
                                  }}
                                  title={
                                    cat.isShufflable ? "Included in Shuffle" : "Excluded from Shuffle"
                                  }
                                  className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-colors duration-300 shrink-0 cursor-pointer ${
                                    cat.isShufflable ? "bg-amber-600" : "bg-stone-300"
                                  }`}
                                >
                                  <div
                                    className={`bg-white w-3 h-3 rounded-full shadow-xs transform transition-transform duration-300 ${
                                      cat.isShufflable ? "translate-x-3" : "translate-x-0"
                                    }`}
                                  />
                                </button>

                                <button
                                  id={`cat-select-${cat.id}`}
                                  onClick={() => setActiveCategoryId(cat.id)}
                                  className={`text-left font-sans text-xs truncate flex-1 font-medium transition-colors cursor-pointer ${
                                    isActive
                                      ? "text-amber-950 font-semibold"
                                      : "text-stone-600 hover:text-stone-900"
                                  }`}
                                >
                                  {cat.name}
                                </button>
                              </div>

                              {/* Right: Count & Delete Category */}
                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                <span
                                  id={`cat-badge-${cat.id}`}
                                  className={`text-[10px] font-mono px-1 py-0.5 rounded-md ${
                                    isActive
                                      ? "bg-amber-100 text-amber-800 font-semibold"
                                      : "bg-stone-200/60 text-stone-500"
                                  }`}
                                >
                                  {count}
                                </span>

                                {cat.isCustom && (
                                  <button
                                    id={`delete-cat-${cat.id}`}
                                    onClick={() => setCategoryToDelete(cat)}
                                    className="p-0.5 text-stone-400 hover:text-red-600 rounded-md hover:bg-stone-200/50 transition-colors cursor-pointer md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                                    title="Delete Category"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Add Category inline form inside this Folder */}
                        {activeAddCategoryFolderId === folder.id && (
                          <form onSubmit={(e) => handleAddCategoryToFolderSubmit(e, folder.id)} className="mt-1 mb-1.5 flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="Category name..."
                              className="flex-1 text-[11px] bg-white border border-stone-300 rounded-lg px-2 py-1 text-stone-850 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all"
                              value={newCatInFolderText}
                              onChange={(e) => {
                                setNewCatInFolderText(e.target.value);
                                if (error) setError("");
                              }}
                              autoFocus
                              maxLength={20}
                            />
                            <button
                              type="submit"
                              className="p-1 bg-stone-900 hover:bg-amber-700 text-white rounded-md transition-colors cursor-pointer"
                              title="Save Category"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveAddCategoryFolderId(null);
                                setNewCatInFolderText("");
                                setError("");
                              }}
                              className="p-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-md transition-colors cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </form>
                        )}

                        {folderCategories.length === 0 && activeAddCategoryFolderId !== folder.id && (
                          <span className="text-[10px] text-stone-400 italic py-1 pl-1">No categories inside.</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add Category Form at bottom */}
      {!shuffleFavoritesOnly && (
        <div className="p-4 border-t border-stone-200 bg-stone-100/50 shrink-0">
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
                className="flex-1 text-sm bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-stone-850 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all"
                maxLength={20}
              />
              <button
                id="add-cat-submit"
                type="submit"
                className="p-2 bg-stone-900 hover:bg-amber-700 text-white rounded-lg transition-colors duration-200 cursor-pointer"
                title="Add Category"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <label htmlFor="target-folder-select" className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                Select Parent Folder
              </label>
              <select
                id="target-folder-select"
                value={selectedFolderIdForNewCategory}
                onChange={(e) => setSelectedFolderIdForNewCategory(e.target.value)}
                className="text-xs bg-white border border-stone-300 rounded-lg px-2 py-1.5 text-stone-700 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all"
              >
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/65 backdrop-blur-[2px] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xl max-w-sm w-full p-6">
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

      {/* Folder Deletion Confirmation Modal */}
      {folderToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/65 backdrop-blur-[2px] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2.5 bg-red-50 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h4 className="font-serif text-lg font-semibold text-stone-950">
                Delete Folder?
              </h4>
            </div>
            
            <p className="text-sm text-stone-600 leading-relaxed mb-5">
              Are you sure you want to delete folder <strong className="text-stone-900 font-semibold font-serif">"{folderToDelete.name}"</strong>? This will permanently delete the folder and ALL categories and quotes nested within it.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setFolderToDelete(null)}
                className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteFolder(folderToDelete.id);
                  setFolderToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
              >
                Yes, Delete Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
