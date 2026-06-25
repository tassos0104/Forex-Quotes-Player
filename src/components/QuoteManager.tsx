import React, { useState, useEffect, useRef } from "react";
import { Quote, Category } from "../types";
import { Plus, Trash2, Calendar, Sparkles, ThumbsUp, ThumbsDown, Pencil, Check, X, Type, Underline, Highlighter, Eraser, Bold, Italic, Play, Eye, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { renderFormattedText, stripFormatTags } from "../utils/textFormatter";

interface QuoteManagerProps {
  category: Category;
  categories: Category[];
  quotes: Quote[];
  allQuotes: Quote[];
  onAddQuote: (text: string, author: string, categoryId: string, rating?: 'up' | 'down' | null) => void;
  onDeleteQuote: (id: string) => void;
  onRateQuote: (id: string, rating: 'up' | 'down' | null) => void;
  onUpdateQuote: (id: string, text: string, author: string, categoryId: string) => void;
  onUpdateCategory: (id: string, name: string) => void;
  onReorderQuotes?: (reorderedQuotes: Quote[]) => void;
  onPlayQuote?: (id: string) => void;
}

export default function QuoteManager({
  category,
  categories,
  quotes,
  allQuotes,
  onAddQuote,
  onDeleteQuote,
  onRateQuote,
  onUpdateQuote,
  onUpdateCategory,
  onReorderQuotes,
  onPlayQuote,
}: QuoteManagerProps) {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [error, setError] = useState("");

  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editError, setEditError] = useState("");

  // Category renaming states
  const [isEditingCategoryName, setIsEditingCategoryName] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [categoryNameError, setCategoryNameError] = useState("");

  // Duplicate confirmation states
  const [duplicateConfirmQuote, setDuplicateConfirmQuote] = useState<{
    text: string;
    author: string;
    rating: 'up' | 'down' | null;
    duplicate: Quote;
  } | null>(null);

  // Drag and drop sorting states
  const [draggedQuoteId, setDraggedQuoteId] = useState<string | null>(null);
  const [dragOverQuoteId, setDragOverQuoteId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);

  // Context Menu state for right-click text formatting
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
    selectionStart: number;
    selectionEnd: number;
    targetId: string;
  } | null>(null);

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

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  const startAutoScroll = (direction: 'up' | 'down') => {
    if (scrollIntervalRef.current) return;
    scrollIntervalRef.current = window.setInterval(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const amount = direction === 'up' ? -12 : 12;
      container.scrollTop += amount;
    }, 16);
  };

  const stopAutoScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const container = scrollContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const threshold = 60; // scroll trigger zone

    if (relativeY < threshold) {
      startAutoScroll('up');
    } else if (relativeY > rect.height - threshold) {
      startAutoScroll('down');
    } else {
      stopAutoScroll();
    }
  };

  const handleContainerDragLeave = () => {
    stopAutoScroll();
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedQuoteId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedQuoteId === id) {
      setDragOverQuoteId(null);
      setDropPosition(null);
      return;
    }

    setDragOverQuoteId(id);

    // Calculate mouse position relative to target card to decide "above" or "below"
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const position = relativeY < rect.height / 2 ? "above" : "below";
    setDropPosition(position);
  };

  const handleDragEnd = () => {
    setDraggedQuoteId(null);
    setDragOverQuoteId(null);
    setDropPosition(null);
    stopAutoScroll();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    stopAutoScroll();

    if (!draggedQuoteId || draggedQuoteId === targetId) {
      setDraggedQuoteId(null);
      setDragOverQuoteId(null);
      setDropPosition(null);
      return;
    }

    const draggedIndex = sortedQuotes.findIndex(q => q.id === draggedQuoteId);
    const targetIndex = sortedQuotes.findIndex(q => q.id === targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const updatedList = [...sortedQuotes];
      // Remove the dragged item
      const [draggedItem] = updatedList.splice(draggedIndex, 1);
      
      // Recalculate targetIndex after removing the dragged item if necessary
      let newTargetIndex = updatedList.findIndex(q => q.id === targetId);
      
      if (dropPosition === "below") {
        newTargetIndex += 1;
      }
      
      updatedList.splice(newTargetIndex, 0, draggedItem);
      
      if (onReorderQuotes) {
        onReorderQuotes(updatedList);
      }
    }

    setDraggedQuoteId(null);
    setDragOverQuoteId(null);
    setDropPosition(null);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Only intercept and show custom context menu if there's selected text
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
    
    let currentVal = "";
    let setter: (val: string) => void = () => {};

    if (targetId === "quote-textarea") {
      currentVal = text;
      setter = setText;
    } else if (targetId.startsWith("edit-quote-textarea-")) {
      currentVal = editText;
      setter = setEditText;
    } else {
      return;
    }

    const selectedText = currentVal.slice(start, end);
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

    const newVal = currentVal.slice(0, start) + formatted + currentVal.slice(end);
    setter(newVal);

    setContextMenu(null);

    // Restore focus and select the newly inserted formatting
    setTimeout(() => {
      const el = document.getElementById(targetId) as HTMLTextAreaElement;
      if (el) {
        el.focus();
        el.setSelectionRange(start, start + formatted.length);
      }
    }, 50);
  };

  useEffect(() => {
    setIsEditingCategoryName(false);
    setCategoryNameError("");
  }, [category.id]);

  // Real-time duplicate checking
  const getDuplicateQuote = () => {
    const trimmed = text.trim();
    if (trimmed.length < 4) return null;
    const normalizedInput = trimmed.toLowerCase().replace(/[\s\p{P}]+/gu, "");
    return allQuotes.find((q) => {
      const normalizedQ = q.text.toLowerCase().replace(/[\s\p{P}]+/gu, "");
      return normalizedQ === normalizedInput;
    }) || null;
  };

  const realTimeDuplicate = getDuplicateQuote();
  const realTimeDuplicateCategoryName = realTimeDuplicate
    ? categories.find((c) => c.id === realTimeDuplicate.categoryId)?.name || "Uncategorized"
    : "";

  const handleStartEditCategory = () => {
    setEditCategoryName(category.name);
    setIsEditingCategoryName(true);
    setCategoryNameError("");
  };

  const handleSaveCategoryName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editCategoryName.trim();
    if (!trimmed) {
      setCategoryNameError("Category name cannot be empty.");
      return;
    }
    if (trimmed.length > 20) {
      setCategoryNameError("Category name must be 20 characters or less.");
      return;
    }
    if (
      categories.some(
        (c) => c.id !== category.id && c.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setCategoryNameError("Another category already has this name.");
      return;
    }

    onUpdateCategory(category.id, trimmed);
    setIsEditingCategoryName(false);
    setCategoryNameError("");
  };

  const maxTextLength = 280;
  const maxAuthorLength = 40;

  const handleStartEdit = (q: Quote) => {
    setEditingQuoteId(q.id);
    setEditText(q.text);
    setEditAuthor(q.author || "");
    setEditCategoryId(q.categoryId);
    setEditError("");
  };

  const handleSaveEdit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    const trimmedText = editText.trim();
    const trimmedAuthor = editAuthor.trim() || "Unknown";

    if (!trimmedText) {
      setEditError("Quote text cannot be empty.");
      return;
    }

    if (trimmedText.length > maxTextLength) {
      setEditError(`Quote text must be ${maxTextLength} characters or less.`);
      return;
    }

    if (trimmedAuthor.length > maxAuthorLength) {
      setEditError(`Author name must be ${maxAuthorLength} characters or less.`);
      return;
    }

    onUpdateQuote(id, trimmedText, trimmedAuthor, editCategoryId);
    setEditingQuoteId(null);
    setEditText("");
    setEditAuthor("");
    setEditCategoryId("");
    setEditError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedText = text.trim();
    const trimmedAuthor = author.trim() || "Unknown";

    if (!trimmedText) {
      setError("Quote text cannot be empty.");
      return;
    }

    if (trimmedText.length > maxTextLength) {
      setError(`Quote text must be ${maxTextLength} characters or less.`);
      return;
    }

    if (trimmedAuthor.length > maxAuthorLength) {
      setError(`Author name must be ${maxAuthorLength} characters or less.`);
      return;
    }

    // Duplicate detection check
    if (realTimeDuplicate) {
      setDuplicateConfirmQuote({
        text: trimmedText,
        author: trimmedAuthor,
        rating,
        duplicate: realTimeDuplicate,
      });
      return;
    }

    onAddQuote(trimmedText, trimmedAuthor, category.id, rating);
    setText("");
    setAuthor("");
    setRating(null);
    setError("");
  };

  const handleForceAddDuplicate = () => {
    if (!duplicateConfirmQuote) return;
    const { text: t, author: a, rating: r } = duplicateConfirmQuote;
    onAddQuote(t, a, category.id, r);
    setText("");
    setAuthor("");
    setRating(null);
    setError("");
    setDuplicateConfirmQuote(null);
  };

  // Sort quotes newest first
  const sortedQuotes = [...quotes].sort((a, b) => b.createdAt - a.createdAt);

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div id="quote-manager-container" className="flex flex-col flex-1 h-full max-w-4xl mx-auto py-6 px-4 md:px-8">
      {/* Category Info Header */}
      <div className="mb-8 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Managing Category
          </span>
        </div>
        
        {isEditingCategoryName ? (
          <form onSubmit={handleSaveCategoryName} className="flex flex-col gap-2 mt-1 mb-2 max-w-md">
            <div className="flex items-center gap-2">
              <input
                id="edit-category-name-input"
                type="text"
                value={editCategoryName}
                onChange={(e) => {
                  setEditCategoryName(e.target.value);
                  if (categoryNameError) setCategoryNameError("");
                }}
                className="font-serif text-2xl font-semibold text-stone-900 bg-white border border-stone-300 rounded-xl px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all shadow-2xs"
                autoFocus
                maxLength={20}
              />
              <button
                id="save-category-name-btn"
                type="submit"
                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
                title="Save Name"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                id="cancel-category-name-btn"
                type="button"
                onClick={() => {
                  setIsEditingCategoryName(false);
                  setCategoryNameError("");
                }}
                className="p-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl transition-colors cursor-pointer shrink-0"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {categoryNameError && (
              <p id="category-name-error" className="text-xs text-red-500 font-sans">
                {categoryNameError}
              </p>
            )}
          </form>
        ) : (
          <div className="flex items-center gap-2.5 group">
            <h2 id="active-category-title" className="font-serif text-3xl font-semibold text-stone-900 tracking-tight">
              {category.name}
            </h2>
            <button
              id="edit-category-title-btn"
              onClick={handleStartEditCategory}
              className="p-1.5 text-stone-400 hover:text-amber-700 hover:bg-stone-100 rounded-lg border border-transparent transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs"
              title="Rename Category"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        )}

        <p className="text-sm text-stone-500 mt-1">
          {quotes.length} {quotes.length === 1 ? "quote" : "quotes"} saved in this category.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form to Add Quote */}
        <div className="lg:col-span-5 bg-white border border-stone-200 p-6 rounded-2xl shadow-sm">
          <h3 className="font-serif text-lg font-semibold text-stone-800 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-amber-700" /> Add Quote Manually
          </h3>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Quote Text */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
                <label htmlFor="quote-textarea">Quote Text</label>
                <span
                  className={`${
                    text.length > maxTextLength ? "text-red-500" : "text-stone-400"
                  }`}
                >
                  {text.length}/{maxTextLength}
                </span>
              </div>
              <textarea
                id="quote-textarea"
                placeholder="What inspiring words would you like to add? Highlight text and right-click to format!"
                rows={4}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (error) setError("");
                }}
                onContextMenu={handleContextMenu}
                className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-4 py-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all resize-none"
              />
              {realTimeDuplicate && (
                <div id="duplicate-warning" className="text-[11px] leading-snug text-amber-900 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 mt-1.5 flex items-start gap-1.5 animate-fade-in shadow-3xs">
                  <span className="shrink-0">⚠️</span>
                  <span>
                    This quote already exists in category <strong className="text-stone-850">"{realTimeDuplicateCategoryName}"</strong>.
                  </span>
                </div>
              )}
            </div>

            {/* Author */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
                <label htmlFor="author-input">Author (Optional)</label>
                <span
                  className={`${
                    author.length > maxAuthorLength ? "text-red-500" : "text-stone-400"
                  }`}
                >
                  {author.length}/{maxAuthorLength}
                </span>
              </div>
              <input
                id="author-input"
                type="text"
                placeholder="e.g. Abraham Lincoln"
                value={author}
                onChange={(e) => {
                  setAuthor(e.target.value);
                  if (error) setError("");
                }}
                className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-4 py-2 text-stone-800 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all"
              />
            </div>

            {/* Initial Rating Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-500">Initial Rating (Optional)</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  id="rating-up-select-btn"
                  onClick={() => setRating(rating === 'up' ? null : 'up')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    rating === 'up'
                      ? "bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm"
                      : "bg-stone-50 border-stone-300 text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${rating === 'up' ? "fill-current" : ""}`} />
                  <span>Thumbs Up</span>
                </button>
                <button
                  type="button"
                  id="rating-down-select-btn"
                  onClick={() => setRating(rating === 'down' ? null : 'down')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    rating === 'down'
                      ? "bg-red-50 border-red-400 text-red-700 shadow-sm"
                      : "bg-stone-50 border-stone-300 text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <ThumbsDown className={`w-3.5 h-3.5 ${rating === 'down' ? "fill-current" : ""}`} />
                  <span>Thumbs Down</span>
                </button>
              </div>
            </div>

            {error && (
              <p id="quote-form-error" className="text-xs text-red-500">
                {error}
              </p>
            )}

            <button
              id="quote-submit-btn"
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-sans text-sm font-semibold tracking-wide py-3 px-4 rounded-xl shadow-sm transition-colors mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Quote</span>
            </button>
          </form>
        </div>

        {/* Right Column: Quotes List */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <h3 className="font-serif text-lg font-semibold text-stone-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-700" /> Quotes in this Category
          </h3>

          <div
            id="quotes-list-wrapper"
            ref={scrollContainerRef}
            onDragOver={handleContainerDragOver}
            onDragLeave={handleContainerDragLeave}
            className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1"
          >
            <AnimatePresence initial={false}>
              {sortedQuotes.length > 0 ? (
                sortedQuotes.map((q) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    id={`quote-row-${q.id}`}
                    draggable={editingQuoteId !== q.id}
                    onDragStart={(e) => handleDragStart(e, q.id)}
                    onDragOver={(e) => handleDragOver(e, q.id)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, q.id)}
                    className={`relative group bg-stone-50/60 border rounded-xl p-4 md:p-5 flex items-start justify-between gap-4 transition-all hover:bg-stone-50 hover:border-stone-200 hover:shadow-sm ${
                      draggedQuoteId === q.id
                        ? "opacity-35 border-dashed border-stone-300 bg-stone-100/50"
                        : dragOverQuoteId === q.id
                        ? "border-amber-400 bg-amber-50/30 scale-[1.01]"
                        : "border-stone-200/60"
                    }`}
                  >
                    {/* Drag indicator line: above */}
                    {dragOverQuoteId === q.id && dropPosition === "above" && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 rounded-full z-10 animate-pulse" />
                    )}
                    {/* Drag indicator line: below */}
                    {dragOverQuoteId === q.id && dropPosition === "below" && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 rounded-full z-10 animate-pulse" />
                    )}
                    {editingQuoteId === q.id ? (
                      <form onSubmit={(e) => handleSaveEdit(e, q.id)} className="flex-1 flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <textarea
                            id={`edit-quote-textarea-${q.id}`}
                            className="w-full text-sm bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all resize-none font-serif"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onContextMenu={handleContextMenu}
                            rows={3}
                            maxLength={maxTextLength}
                            required
                          />
                          <span className="text-[10px] text-right text-stone-400">
                            {editText.length}/{maxTextLength}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 items-center justify-between w-full">
                          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-2/3">
                            <div className="w-full sm:w-1/2 flex flex-col gap-0.5">
                              <label className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider pl-1">Author</label>
                              <input
                                type="text"
                                className="w-full text-xs bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all font-semibold font-serif"
                                value={editAuthor}
                                onChange={(e) => setEditAuthor(e.target.value)}
                                placeholder="Author (Optional)"
                                maxLength={maxAuthorLength}
                              />
                            </div>
                            <div className="w-full sm:w-1/2 flex flex-col gap-0.5">
                              <label className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider pl-1">Category</label>
                              <select
                                className="w-full text-xs bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-800 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all font-sans font-medium cursor-pointer"
                                value={editCategoryId}
                                onChange={(e) => setEditCategoryId(e.target.value)}
                                required
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
                            <button
                              type="button"
                              onClick={() => setEditingQuoteId(null)}
                              className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-all cursor-pointer shadow-sm"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                        {editError && <p className="text-[11px] text-red-500 mt-1">{editError}</p>}
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center self-stretch pr-1 text-stone-300 group-hover:text-stone-400 transition-colors cursor-grab active:cursor-grabbing shrink-0" title="Drag to reorder">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-serif text-[15px] text-stone-800 font-medium leading-relaxed">
                            "{renderFormattedText(q.text)}"
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3">
                            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                              — {q.author}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(q.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Play/Preview button */}
                          <button
                            id={`preview-quote-btn-${q.id}`}
                            onClick={() => {
                              if (onPlayQuote) {
                                onPlayQuote(q.id);
                              }
                            }}
                            className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg border border-amber-200/50 transition-all cursor-pointer flex items-center justify-center"
                            title="Play Quote in Zen Mode"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>

                          {/* Edit button */}
                          <button
                            id={`edit-quote-btn-${q.id}`}
                            onClick={() => handleStartEdit(q)}
                            className="p-1.5 text-stone-400 hover:text-amber-700 hover:bg-stone-100 rounded-lg border border-transparent transition-all cursor-pointer"
                            title="Edit Quote"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Thumbs Up button */}
                          <button
                            id={`rate-up-quote-${q.id}`}
                            onClick={() => onRateQuote(q.id, q.rating === 'up' ? null : 'up')}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              q.rating === 'up'
                                ? "text-emerald-700 bg-emerald-50 border-emerald-300"
                                : "text-stone-400 hover:text-stone-700 hover:bg-stone-100 border-transparent"
                            }`}
                            title="Thumbs Up"
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${q.rating === 'up' ? "fill-current" : ""}`} />
                          </button>

                          {/* Thumbs Down button */}
                          <button
                            id={`rate-down-quote-${q.id}`}
                            onClick={() => onRateQuote(q.id, q.rating === 'down' ? null : 'down')}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              q.rating === 'down'
                                ? "text-red-700 bg-red-50 border-red-300"
                                : "text-stone-400 hover:text-stone-700 hover:bg-stone-100 border-transparent"
                            }`}
                            title="Thumbs Down"
                          >
                            <ThumbsDown className={`w-3.5 h-3.5 ${q.rating === 'down' ? "fill-current" : ""}`} />
                          </button>

                          {/* Delete button */}
                          <button
                            id={`delete-quote-${q.id}`}
                            onClick={() => onDeleteQuote(q.id)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-stone-100 rounded-lg border border-transparent transition-all cursor-pointer"
                            title="Delete Quote"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))
              ) : (
                <div id="empty-category-notice" className="border-2 border-dashed border-stone-200 rounded-xl p-8 text-center text-stone-500 text-sm">
                  <p className="font-serif italic font-medium mb-1">
                    No quotes in this category yet.
                  </p>
                  <p className="text-xs text-stone-400">
                    Use the form on the left to write and save your first quote.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Duplicate Quote Confirmation Dialog */}
      {duplicateConfirmQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/65 backdrop-blur-[2px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-stone-200 shadow-2xl rounded-3xl w-full max-w-md p-6 relative z-10"
          >
            <h3 className="font-serif text-lg font-bold text-stone-900 mb-2 flex items-center gap-2">
              <span className="text-amber-600">⚠️</span> Duplicate Quote Detected
            </h3>
            <p className="text-stone-600 text-sm mb-4 leading-relaxed">
              This exact quote already exists in category <strong className="text-stone-800">"{
                categories.find(c => c.id === duplicateConfirmQuote.duplicate.categoryId)?.name || "Uncategorized"
              }"</strong>. Are you sure you want to add it again?
            </p>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 mb-5 text-stone-800 text-xs italic leading-relaxed">
              "{duplicateConfirmQuote.text}"
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                id="cancel-add-duplicate-btn"
                onClick={() => setDuplicateConfirmQuote(null)}
                className="px-4 py-2 border border-stone-200 hover:border-stone-300 bg-white text-stone-600 font-sans text-xs font-semibold rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-add-duplicate-btn"
                onClick={handleForceAddDuplicate}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-sans text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                Yes, Add Duplicate
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Floating Custom Right-Click Context Menu for Text Formatting */}
      {contextMenu && contextMenu.visible && (
        <div
          id="text-format-context-menu"
          className="fixed z-[100] min-w-[170px] bg-white border border-stone-250 shadow-2xl rounded-2xl p-1.5 flex flex-col gap-0.5 animate-fade-in select-none"
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
            id="format-bold-btn"
            onClick={() => applyFormat("bold")}
            className="flex items-center gap-2 px-2.5 py-1.5 text-stone-700 hover:bg-stone-50 rounded-xl text-left font-sans text-xs font-semibold cursor-pointer transition-colors"
          >
            <Bold className="w-3.5 h-3.5 text-amber-600" />
            <span>Bold</span>
          </button>

          <button
            type="button"
            id="format-italic-btn"
            onClick={() => applyFormat("italic")}
            className="flex items-center gap-2 px-2.5 py-1.5 text-stone-700 hover:bg-stone-50 rounded-xl text-left font-sans text-xs font-semibold cursor-pointer transition-colors"
          >
            <Italic className="w-3.5 h-3.5 text-amber-600" />
            <span>Italic</span>
          </button>

          <button
            type="button"
            id="format-capitalize-btn"
            onClick={() => applyFormat("capitalize")}
            className="flex items-center gap-2 px-2.5 py-1.5 text-stone-700 hover:bg-stone-50 rounded-xl text-left font-sans text-xs font-semibold cursor-pointer transition-colors"
          >
            <Type className="w-3.5 h-3.5 text-amber-600" />
            <span>Capitalize</span>
          </button>

          <button
            type="button"
            id="format-underline-btn"
            onClick={() => applyFormat("underline")}
            className="flex items-center gap-2 px-2.5 py-1.5 text-stone-700 hover:bg-stone-50 rounded-xl text-left font-sans text-xs font-semibold cursor-pointer transition-colors"
          >
            <Underline className="w-3.5 h-3.5 text-amber-600" />
            <span>Underline</span>
          </button>

          <button
            type="button"
            id="format-highlight-btn"
            onClick={() => applyFormat("highlight")}
            className="flex items-center gap-2 px-2.5 py-1.5 text-stone-700 hover:bg-stone-50 rounded-xl text-left font-sans text-xs font-semibold cursor-pointer transition-colors"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-600" />
            <span>Highlight</span>
          </button>

          <div className="h-px bg-stone-100 my-1" />

          <button
            type="button"
            id="format-remove-btn"
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
