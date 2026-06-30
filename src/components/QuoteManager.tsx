import React, { useState, useEffect, useRef } from "react";
import { Quote, Category } from "../types";
import { Plus, Trash2, Calendar, Sparkles, ThumbsUp, ThumbsDown, Pencil, Check, X, Type, Underline, Highlighter, Eraser, Bold, Italic, Play, Eye, EyeOff, GripVertical, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { renderFormattedText, stripFormatTags, isGreekText } from "../utils/textFormatter";

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
  onUpdateAllQuotes?: (allQuotes: Quote[]) => void;
  targetEditQuoteId?: string | null;
  onClearTargetEditQuoteId?: () => void;
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
  onUpdateAllQuotes,
  targetEditQuoteId,
  onClearTargetEditQuoteId,
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
  const [catalogSearchText, setCatalogSearchText] = useState("");

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
  const [draggableQuoteId, setDraggableQuoteId] = useState<string | null>(null);

  // Context Menu state for right-click text formatting
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
    selectionStart: number;
    selectionEnd: number;
    targetId: string;
  } | null>(null);

  // Custom right-click context menu state for selected quotes
  const [rowContextMenu, setRowContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
    quoteIds: string[];
  } | null>(null);

  // Multi-selection states
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deleteConfirmQuoteId, setDeleteConfirmQuoteId] = useState<string | null>(null);

  // Font size level for displaying quotes (1: xs, 2: sm, 3: base, 4: lg, 5: xl, 6: 2xl)
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(3);

  const getFontSizeClass = (level: number) => {
    switch (level) {
      case 1: return "text-xs md:text-sm";
      case 2: return "text-sm md:text-base";
      case 3: return "text-base md:text-lg";
      case 4: return "text-lg md:text-xl";
      case 5: return "text-xl md:text-2xl";
      case 6: return "text-2xl md:text-3xl font-semibold";
      default: return "text-base md:text-lg";
    }
  };

  // Font size level for bulk paste preview (1 to 8)
  const [bulkFontSizeLevel, setBulkFontSizeLevel] = useState<number>(5);

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

  // Active filter for displaying category quotes ('all', 'hidden', 'thumbs-up', 'thumbs-down', 'formatted')
  const [quoteFilter, setQuoteFilter] = useState<"all" | "hidden" | "thumbs-up" | "thumbs-down" | "formatted">("all");

  // Active filter for bulk preview ('all', 'unique', 'new')
  const [bulkPreviewFilter, setBulkPreviewFilter] = useState<"all" | "unique" | "new">("all");

  // Undo support & Toast state
  const [history, setHistory] = useState<Quote[][]>([]);
  const [toastMessage, setToastMessage] = useState<{ text: string; actionText?: string; onAction?: () => void } | null>(null);

  // Bulk Paste states
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkInputText, setBulkInputText] = useState("");
  const [parsedBulkQuotes, setParsedBulkQuotes] = useState<{ text: string; author: string }[]>([]);
  const [bulkParseError, setBulkParseError] = useState("");

  // Auto-hide toast after 6 seconds
  useEffect(() => {
    if (toastMessage) {
      const id = setTimeout(() => {
        setToastMessage(null);
      }, 6000);
      return () => clearTimeout(id);
    }
  }, [toastMessage]);

  // Clear selected quotes when category changes
  useEffect(() => {
    setSelectedQuoteIds([]);
    setLastSelectedId(null);
    setDeleteConfirmQuoteId(null);
  }, [category.id]);

  // Keep only selected quotes that still exist in the current category list
  useEffect(() => {
    setSelectedQuoteIds((prev) => prev.filter((id) => quotes.some((q) => q.id === id)));
  }, [quotes]);

  // Reset bulk delete confirmation if selection is cleared
  useEffect(() => {
    if (selectedQuoteIds.length === 0) {
      setShowBulkDeleteConfirm(false);
    }
  }, [selectedQuoteIds.length]);

  // Handle external edit navigation request (scroll & edit)
  useEffect(() => {
    if (targetEditQuoteId && quotes.some((q) => q.id === targetEditQuoteId)) {
      setEditingQuoteId(targetEditQuoteId);
      const targetQuote = quotes.find((q) => q.id === targetEditQuoteId);
      if (targetQuote) {
        setEditText(targetQuote.text);
        setEditAuthor(targetQuote.author || "");
        setEditCategoryId(targetQuote.categoryId);
      }
      
      onClearTargetEditQuoteId?.();

      setTimeout(() => {
        const el = document.getElementById(`quote-row-${targetEditQuoteId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-amber-500", "ring-offset-2");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-amber-500", "ring-offset-2");
          }, 2000);
        }
      }, 300);
    }
  }, [targetEditQuoteId, quotes, onClearTargetEditQuoteId]);

  // Cancel editing mode if quotes are selected
  useEffect(() => {
    if (selectedQuoteIds.length > 0 && editingQuoteId !== null) {
      setEditingQuoteId(null);
    }
  }, [selectedQuoteIds.length, editingQuoteId]);

  // Close context menus on click anywhere
  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu?.visible) {
        setContextMenu(null);
      }
      if (rowContextMenu?.visible) {
        setRowContextMenu(null);
      }
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [contextMenu, rowContextMenu]);

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
    
    // Determine the list of quotes being dragged.
    // If the dragged quote is part of the multi-selection, we drag the entire selection.
    // Otherwise, we drag just this single quote.
    const draggedIds = selectedQuoteIds.includes(id) 
      ? selectedQuoteIds 
      : [id];
      
    e.dataTransfer.setData("application/json", JSON.stringify({
      type: "quotes",
      quoteIds: draggedIds,
      sourceCategoryId: category.id
    }));
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
    e.stopPropagation();
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

  const maxTextLength = 700;
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
      if (realTimeDuplicate.categoryId === category.id) {
        setError("This quote already exists in this category and cannot be duplicated here.");
        return;
      }
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

  // Parser and bulk operation handlers
  const parseBulkInput = (input: string): { text: string; author: string }[] => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return [];

    // 1. Try JSON parsing
    try {
      const parsed = JSON.parse(trimmedInput);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(item => item && typeof item === "object")
          .map(item => {
            const rawText = item.text || item.quote || item.content || "";
            const rawAuthor = item.author || item.source || "";
            return {
              text: String(rawText).trim(),
              author: String(rawAuthor).trim() || "Unknown"
            };
          })
          .filter(q => q.text.length > 0);
      } else if (parsed && typeof parsed === "object") {
        const arrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
        if (arrayKey) {
          return parsed[arrayKey]
            .filter((item: any) => item && typeof item === "object")
            .map((item: any) => {
              const rawText = item.text || item.quote || item.content || "";
              const rawAuthor = item.author || item.source || "";
              return {
                text: String(rawText).trim(),
                author: String(rawAuthor).trim() || "Unknown"
              };
            })
            .filter((q: any) => q.text.length > 0);
        }
      }
    } catch (e) {
      // Not valid JSON
    }

    // 2. Line-by-line parsing
    const lines = trimmedInput.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return [];

    // Auto-detect delimiter
    const delimiters = ["|", "\t", "~", ";", " - "];
    const delimiterCounts = delimiters.map(d => ({
      delimiter: d,
      count: lines.filter(line => line.includes(d)).length
    }));

    const bestDelimiter = delimiterCounts.reduce((best, current) => {
      return current.count > best.count ? current : best;
    }, { delimiter: "|", count: 0 });

    const chosenDelimiter = bestDelimiter.count > 0 ? bestDelimiter.delimiter : null;

    return lines.map(line => {
      if (chosenDelimiter) {
        const parts = line.split(chosenDelimiter);
        const textPart = parts[0].trim();
        const authorPart = parts.slice(1).join(chosenDelimiter).trim();
        
        let cleanedText = textPart;
        if (cleanedText.startsWith('"') && cleanedText.endsWith('"') && cleanedText.length > 1) {
          cleanedText = cleanedText.slice(1, -1);
        }
        
        return {
          text: cleanedText,
          author: authorPart || "Unknown"
        };
      } else {
        const csvRegex = /^["'](.*?)["']\s*,\s*["'](.*?)["']$/;
        const match = line.match(csvRegex);
        if (match) {
          return {
            text: match[1].trim(),
            author: match[2].trim() || "Unknown"
          };
        }

        let cleanedText = line;
        if (cleanedText.startsWith('"') && cleanedText.endsWith('"') && cleanedText.length > 1) {
          cleanedText = cleanedText.slice(1, -1);
        }
        return {
          text: cleanedText,
          author: "Unknown"
        };
      }
    }).filter(q => q.text.length > 0);
  };

  const handleRunBulkParse = () => {
    setBulkParseError("");
    if (!bulkInputText.trim()) {
      setBulkParseError("Please paste some content first.");
      return;
    }
    const result = parseBulkInput(bulkInputText);
    if (result.length === 0) {
      setBulkParseError("No quotes could be parsed. Check your format.");
    } else {
      setParsedBulkQuotes(result);
    }
  };

  const handleAddBulkToCategory = () => {
    if (parsedBulkQuotes.length === 0 || !onUpdateAllQuotes) return;

    // Filter duplicates/new based on user choice
    const uniqueParsed = parsedBulkQuotes.filter(
      (q) => checkQuoteExistence(q.text).status !== "same_category"
    );
    const newParsed = parsedBulkQuotes.filter(
      (q) => checkQuoteExistence(q.text).status === "new"
    );

    const targetList = bulkPreviewFilter === "new" ? newParsed : uniqueParsed;

    if (targetList.length === 0) {
      setToastMessage({
        text: "No eligible unique quotes to add.",
      });
      return;
    }

    setHistory((prev) => [...prev, allQuotes]);

    const timestampBase = Date.now();
    const newQuotesList: Quote[] = targetList.map((item, idx) => ({
      id: `quote-${timestampBase}-${idx}`,
      text: item.text,
      author: item.author,
      categoryId: category.id,
      createdAt: timestampBase - idx * 1000,
      isActive: true,
      rating: null,
    }));

    onUpdateAllQuotes([...newQuotesList, ...allQuotes]);

    const addedCount = newQuotesList.length;
    setIsBulkModalOpen(false);
    setBulkInputText("");
    setParsedBulkQuotes([]);
    setBulkPreviewFilter("all");

    setToastMessage({
      text: `Successfully added ${addedCount} unique quotes!`,
      actionText: "Undo",
      onAction: () => {
        setHistory((prev) => {
          const prevState = prev[prev.length - 1];
          if (prevState && onUpdateAllQuotes) {
            onUpdateAllQuotes(prevState);
          }
          return prev.slice(0, -1);
        });
      },
    });
  };

  // Click & Multiselect logic (Windows Explorer-like Ctrl/Shift)
  const handleQuoteClick = (e: React.MouseEvent, quoteId: string) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("textarea") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("form") ||
      target.closest("span[title]")
    ) {
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      setSelectedQuoteIds((prev) => {
        if (prev.includes(quoteId)) {
          return prev.filter((id) => id !== quoteId);
        } else {
          return [...prev, quoteId];
        }
      });
      setLastSelectedId(quoteId);
    } else if (e.shiftKey && lastSelectedId) {
      const idx1 = sortedQuotes.findIndex((q) => q.id === lastSelectedId);
      const idx2 = sortedQuotes.findIndex((q) => q.id === quoteId);
      if (idx1 !== -1 && idx2 !== -1) {
        const startIdx = Math.min(idx1, idx2);
        const endIdx = Math.max(idx1, idx2);
        const rangeIds = sortedQuotes.slice(startIdx, endIdx + 1).map((q) => q.id);
        
        setSelectedQuoteIds((prev) => {
          const union = Array.from(new Set([...prev, ...rangeIds]));
          return union;
        });
      }
      setLastSelectedId(quoteId);
    } else {
      setSelectedQuoteIds((prev) => {
        if (prev.includes(quoteId)) {
          return prev.filter((id) => id !== quoteId);
        } else {
          return [...prev, quoteId];
        }
      });
      setLastSelectedId(quoteId);
    }
  };

  // Bulk operations
  const handleBulkDeactivate = () => {
    if (selectedQuoteIds.length === 0 || !onUpdateAllQuotes) return;
    setHistory((prev) => [...prev, allQuotes]);

    const updated = allQuotes.map((q) => {
      if (selectedQuoteIds.includes(q.id)) {
        return { ...q, isActive: false };
      }
      return q;
    });

    onUpdateAllQuotes(updated);
    const count = selectedQuoteIds.length;

    setToastMessage({
      text: `Deactivated ${count} quotes. Hidden from slideshows.`,
      actionText: "Undo",
      onAction: () => {
        setHistory((prev) => {
          const prevState = prev[prev.length - 1];
          if (prevState && onUpdateAllQuotes) {
            onUpdateAllQuotes(prevState);
          }
          return prev.slice(0, -1);
        });
      },
    });
  };

  const handleBulkActivate = () => {
    if (selectedQuoteIds.length === 0 || !onUpdateAllQuotes) return;
    setHistory((prev) => [...prev, allQuotes]);

    const updated = allQuotes.map((q) => {
      if (selectedQuoteIds.includes(q.id)) {
        return { ...q, isActive: true };
      }
      return q;
    });

    onUpdateAllQuotes(updated);
    const count = selectedQuoteIds.length;

    setToastMessage({
      text: `Activated ${count} quotes.`,
      actionText: "Undo",
      onAction: () => {
        setHistory((prev) => {
          const prevState = prev[prev.length - 1];
          if (prevState && onUpdateAllQuotes) {
            onUpdateAllQuotes(prevState);
          }
          return prev.slice(0, -1);
        });
      },
    });
  };

  const executeBulkDelete = () => {
    if (selectedQuoteIds.length === 0 || !onUpdateAllQuotes) return;
    setHistory((prev) => [...prev, allQuotes]);

    const updated = allQuotes.filter((q) => !selectedQuoteIds.includes(q.id));
    onUpdateAllQuotes(updated);
    const count = selectedQuoteIds.length;
    setSelectedQuoteIds([]);
    setShowBulkDeleteConfirm(false);

    setToastMessage({
      text: `Deleted ${count} quotes.`,
      actionText: "Undo",
      onAction: () => {
        setHistory((prev) => {
          const prevState = prev[prev.length - 1];
          if (prevState && onUpdateAllQuotes) {
            onUpdateAllQuotes(prevState);
          }
          return prev.slice(0, -1);
        });
      },
    });
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteConfirm(true);
  };

  const handleBulkThumbsUp = () => {
    if (selectedQuoteIds.length === 0 || !onUpdateAllQuotes) return;
    setHistory((prev) => [...prev, allQuotes]);

    const updated = allQuotes.map((q) => {
      if (selectedQuoteIds.includes(q.id)) {
        return { ...q, rating: 'up' as const };
      }
      return q;
    });

    onUpdateAllQuotes(updated);
    const count = selectedQuoteIds.length;

    setToastMessage({
      text: `Set ${count} quote${count > 1 ? "s" : ""} to Thumbs Up.`,
      actionText: "Undo",
      onAction: () => {
        setHistory((prev) => {
          const prevState = prev[prev.length - 1];
          if (prevState && onUpdateAllQuotes) {
            onUpdateAllQuotes(prevState);
          }
          return prev.slice(0, -1);
        });
      },
    });
  };

  const handleBulkThumbsDown = () => {
    if (selectedQuoteIds.length === 0 || !onUpdateAllQuotes) return;
    setHistory((prev) => [...prev, allQuotes]);

    const updated = allQuotes.map((q) => {
      if (selectedQuoteIds.includes(q.id)) {
        return { ...q, rating: 'down' as const };
      }
      return q;
    });

    onUpdateAllQuotes(updated);
    const count = selectedQuoteIds.length;

    setToastMessage({
      text: `Set ${count} quote${count > 1 ? "s" : ""} to Thumbs Down.`,
      actionText: "Undo",
      onAction: () => {
        setHistory((prev) => {
          const prevState = prev[prev.length - 1];
          if (prevState && onUpdateAllQuotes) {
            onUpdateAllQuotes(prevState);
          }
          return prev.slice(0, -1);
        });
      },
    });
  };

  const handleBulkClearFormatting = () => {
    if (selectedQuoteIds.length === 0 || !onUpdateAllQuotes) return;
    setHistory((prev) => [...prev, allQuotes]);

    const updated = allQuotes.map((q) => {
      if (selectedQuoteIds.includes(q.id)) {
        return { ...q, text: stripFormatTags(q.text) };
      }
      return q;
    });

    onUpdateAllQuotes(updated);
    const count = selectedQuoteIds.length;

    setToastMessage({
      text: `Cleared formatting for ${count} quote${count > 1 ? "s" : ""}.`,
      actionText: "Undo",
      onAction: () => {
        setHistory((prev) => {
          const prevState = prev[prev.length - 1];
          if (prevState && onUpdateAllQuotes) {
            onUpdateAllQuotes(prevState);
          }
          return prev.slice(0, -1);
        });
      },
    });
  };

  const handleRowContextMenu = (e: React.MouseEvent, quoteId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Determine target selection
    let targetQuoteIds = [...selectedQuoteIds];
    if (!selectedQuoteIds.includes(quoteId)) {
      setSelectedQuoteIds([quoteId]);
      targetQuoteIds = [quoteId];
    }

    // Keep within viewport bounds
    const menuWidth = 200;
    const menuHeight = 280;
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    setRowContextMenu({
      x,
      y,
      visible: true,
      quoteIds: targetQuoteIds,
    });
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    if (!onUpdateAllQuotes) return;
    setHistory((prev) => [...prev, allQuotes]);

    const updated = allQuotes.map((q) => {
      if (q.id === id) {
        return { ...q, isActive: !currentActive };
      }
      return q;
    });
    onUpdateAllQuotes(updated);

    setToastMessage({
      text: currentActive ? "Deactivated quote. Hidden from slideshow." : "Activated quote.",
      actionText: "Undo",
      onAction: () => {
        setHistory((prev) => {
          const prevState = prev[prev.length - 1];
          if (prevState && onUpdateAllQuotes) {
            onUpdateAllQuotes(prevState);
          }
          return prev.slice(0, -1);
        });
      },
    });
  };

  // Sort quotes newest first
  const sortedQuotes = [...quotes].sort((a, b) => b.createdAt - a.createdAt);

  // Filter quotes based on active filter and catalogSearchText
  const filteredQuotes = sortedQuotes.filter((q) => {
    if (quoteFilter === "hidden" && q.isActive !== false) return false;
    if (quoteFilter === "thumbs-up" && q.rating !== "up") return false;
    if (quoteFilter === "thumbs-down" && q.rating !== "down") return false;
    if (quoteFilter === "formatted" && stripFormatTags(q.text) === q.text) return false;

    if (catalogSearchText.trim()) {
      const query = catalogSearchText.toLowerCase();
      const textMatches = stripFormatTags(q.text).toLowerCase().includes(query);
      const authorMatches = (q.author || "").toLowerCase().includes(query);
      return textMatches || authorMatches;
    }

    return true;
  });

  // Helper to check if a quote text already exists and where
  const checkQuoteExistence = (parsedText: string) => {
    const clean = (str: string) => {
      return str
        .toLowerCase()
        .replace(/["'“”‘’]/g, "") // remove quotes
        .replace(/[\s\p{P}]/gu, "") // remove all whitespace and punctuation
        .trim();
    };

    const parsedClean = clean(parsedText);
    if (!parsedClean) return { status: "new" as const };

    const match = allQuotes.find((existing) => clean(existing.text) === parsedClean);
    if (match) {
      if (match.categoryId === category.id) {
        return { status: "same_category" as const, matchedQuote: match };
      } else {
        const otherCat = categories.find((c) => c.id === match.categoryId);
        return { status: "other_category" as const, matchedQuote: match, otherCategoryName: otherCat?.name || "Another Category" };
      }
    }

    return { status: "new" as const };
  };

  // Computed bulk subsets
  const uniqueParsedBulk = parsedBulkQuotes.filter(
    (q) => checkQuoteExistence(q.text).status !== "same_category"
  );
  const newParsedBulk = parsedBulkQuotes.filter(
    (q) => checkQuoteExistence(q.text).status === "new"
  );
  const visibleBulkQuotes =
    bulkPreviewFilter === "new" ? newParsedBulk :
    bulkPreviewFilter === "unique" ? uniqueParsedBulk :
    parsedBulkQuotes;

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
                maxLength={maxTextLength}
                className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-4 py-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all resize-none"
              />
              {realTimeDuplicate && (
                <div
                  id="duplicate-warning"
                  className={`text-[11px] leading-snug p-2.5 rounded-xl border mt-1.5 flex items-start gap-1.5 animate-fade-in shadow-3xs ${
                    realTimeDuplicate.categoryId === category.id
                      ? "text-red-900 bg-red-50/70 border-red-200"
                      : "text-amber-900 bg-amber-50/70 border-amber-200"
                  }`}
                >
                  <span className="shrink-0">{realTimeDuplicate.categoryId === category.id ? "❌" : "⚠️"}</span>
                  <span>
                    {realTimeDuplicate.categoryId === category.id ? (
                      <>This quote already exists in this category and cannot be duplicated here.</>
                    ) : (
                      <>
                        This quote already exists in category <strong className="text-stone-850">"{realTimeDuplicateCategoryName}"</strong>. You can still save it as a duplicate in this category.
                      </>
                    )}
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
          <div className="flex flex-col gap-3 border-b border-stone-200 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-serif text-lg font-semibold text-stone-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-700" /> Quotes in this Category
              </h3>
              
              <div className="flex items-center gap-2 flex-wrap">
                {/* Font Size Modifier Controls */}
                <div className="flex items-center gap-1 border border-stone-200 bg-stone-50/60 px-2 py-0.5 rounded-xl text-stone-600 font-sans text-xs shadow-3xs shrink-0">
                  <span className="font-semibold text-stone-500 mr-1 select-none text-[11px]">Size:</span>
                  <button
                    type="button"
                    onClick={() => setFontSizeLevel(prev => Math.max(1, prev - 1))}
                    disabled={fontSizeLevel === 1}
                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-stone-200/50 disabled:opacity-40 font-bold transition-colors cursor-pointer text-stone-700"
                    title="Decrease font size"
                  >
                    A-
                  </button>
                  <span className="w-4 text-center font-bold text-amber-700 select-none text-xs">{fontSizeLevel}</span>
                  <button
                    type="button"
                    onClick={() => setFontSizeLevel(prev => Math.min(6, prev + 1))}
                    disabled={fontSizeLevel === 6}
                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-stone-200/50 disabled:opacity-40 font-bold transition-colors cursor-pointer text-stone-700"
                    title="Increase font size"
                  >
                    A+
                  </button>
                </div>

                {sortedQuotes.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const filteredIds = filteredQuotes.map(q => q.id);
                        const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedQuoteIds.includes(id));
                        if (allFilteredSelected) {
                          setSelectedQuoteIds(prev => prev.filter(id => !filteredIds.includes(id)));
                        } else {
                          setSelectedQuoteIds(prev => [...new Set([...prev, ...filteredIds])]);
                        }
                      }}
                      className="px-2.5 py-1 text-xs border border-stone-250 bg-white hover:bg-stone-50 text-stone-600 rounded-lg transition-colors cursor-pointer font-sans font-semibold shrink-0"
                    >
                      {filteredQuotes.length > 0 && filteredQuotes.every(q => selectedQuoteIds.includes(q.id))
                        ? (quoteFilter === "all" ? "Deselect All" : "Deselect Filtered")
                        : (quoteFilter === "all" ? "Select All" : "Select Filtered")}
                    </button>
                    {selectedQuoteIds.length > 0 && (
                      <span className="text-[11px] font-bold text-amber-850 bg-amber-50 border border-amber-200/60 px-2 py-1 rounded-lg font-sans whitespace-nowrap animate-fade-in shadow-3xs">
                        {selectedQuoteIds.length} selected (right-click for actions)
                      </span>
                    )}
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(true)}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-sans text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Bulk Paste Quotes</span>
                </button>
              </div>
            </div>

            {/* Search Quotes catalog filter bar with visible label */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full">
              <label htmlFor="catalog-search" className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 font-sans whitespace-nowrap flex items-center gap-1.5 shrink-0 select-none">
                <Search className="w-3.5 h-3.5 text-amber-600" />
                SEARCH QUOTES:
              </label>
              <div className="relative flex-1">
                <input
                  id="catalog-search"
                  type="text"
                  value={catalogSearchText}
                  onChange={(e) => setCatalogSearchText(e.target.value)}
                  placeholder="Search quotes in this category by text or author..."
                  className="w-full pl-3 pr-8 py-2 bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-xl text-xs text-stone-850 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:bg-white focus:ring-1 focus:ring-amber-600 transition-all font-sans font-medium"
                />
                {catalogSearchText && (
                  <button
                    type="button"
                    onClick={() => setCatalogSearchText("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold font-sans cursor-pointer p-0.5 rounded-full hover:bg-stone-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filters Row */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setQuoteFilter("all")}
                className={`px-2.5 py-1 text-xs rounded-lg font-sans font-semibold transition-all cursor-pointer ${
                  quoteFilter === "all"
                    ? "bg-stone-800 text-white shadow-3xs"
                    : "text-stone-650 bg-stone-50 hover:bg-stone-100 border border-stone-200/50"
                }`}
              >
                All ({quotes.length})
              </button>
              <button
                type="button"
                onClick={() => setQuoteFilter("thumbs-up")}
                className={`px-2.5 py-1 text-xs rounded-lg font-sans font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  quoteFilter === "thumbs-up"
                    ? "bg-emerald-700 text-white shadow-3xs"
                    : "text-stone-650 bg-stone-50 hover:bg-stone-100 border border-stone-200/50"
                }`}
              >
                <ThumbsUp className="w-3 h-3 fill-current" />
                Thumbs Up ({quotes.filter(q => q.rating === "up").length})
              </button>
              <button
                type="button"
                onClick={() => setQuoteFilter("thumbs-down")}
                className={`px-2.5 py-1 text-xs rounded-lg font-sans font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  quoteFilter === "thumbs-down"
                    ? "bg-red-700 text-white shadow-3xs"
                    : "text-stone-650 bg-stone-50 hover:bg-stone-100 border border-stone-200/50"
                }`}
              >
                <ThumbsDown className="w-3 h-3 fill-current" />
                Thumbs Down ({quotes.filter(q => q.rating === "down").length})
              </button>
              <button
                type="button"
                onClick={() => setQuoteFilter("hidden")}
                className={`px-2.5 py-1 text-xs rounded-lg font-sans font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  quoteFilter === "hidden"
                    ? "bg-amber-700 text-white shadow-3xs"
                    : "text-stone-650 bg-stone-50 hover:bg-stone-100 border border-stone-200/50"
                }`}
              >
                <EyeOff className="w-3 h-3" />
                Hidden ({quotes.filter(q => q.isActive === false).length})
              </button>
              <button
                type="button"
                onClick={() => setQuoteFilter("formatted")}
                className={`px-2.5 py-1 text-xs rounded-lg font-sans font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  quoteFilter === "formatted"
                    ? "bg-purple-700 text-white shadow-3xs"
                    : "text-stone-650 bg-stone-50 hover:bg-stone-100 border border-stone-200/50"
                }`}
              >
                <Highlighter className="w-3 h-3 text-purple-250" />
                Formatted ({quotes.filter(q => stripFormatTags(q.text) !== q.text).length})
              </button>
            </div>
          </div>



          <div
            id="quotes-list-wrapper"
            ref={scrollContainerRef}
            onDragOver={handleContainerDragOver}
            onDragLeave={handleContainerDragLeave}
            className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1"
          >
            <AnimatePresence initial={false}>
              {filteredQuotes.length > 0 ? (
                filteredQuotes.map((q) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    id={`quote-row-${q.id}`}
                    draggable={draggableQuoteId === q.id && editingQuoteId !== q.id && quoteFilter === "all"}
                    onDragStart={(e) => handleDragStart(e, q.id)}
                    onDragOver={(e) => handleDragOver(e, q.id)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, q.id)}
                    onClick={(e) => handleQuoteClick(e, q.id)}
                    onContextMenu={(e) => {
                      if (editingQuoteId === q.id) {
                        e.stopPropagation();
                        return;
                      }
                      handleRowContextMenu(e, q.id);
                    }}
                    className={`relative group border rounded-xl p-4 md:p-5 flex flex-col gap-3.5 transition-all ${
                      selectedQuoteIds.includes(q.id)
                        ? "border-amber-500 bg-amber-50/20 shadow-xs"
                        : q.isActive === false
                        ? "opacity-65 bg-stone-100/40 border-stone-200"
                        : "bg-stone-50/60 border-stone-200/60 hover:bg-stone-50 hover:border-stone-200 hover:shadow-sm"
                    } ${
                      draggedQuoteId === q.id
                        ? "opacity-35 border-dashed border-stone-300 bg-stone-100/50"
                        : dragOverQuoteId === q.id
                        ? "border-amber-400 bg-amber-50/30 scale-[1.01]"
                        : ""
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
                      <form
                        onSubmit={(e) => handleSaveEdit(e, q.id)}
                        onClick={(e) => {
                          if (contextMenu?.visible) {
                            setContextMenu(null);
                          }
                          e.stopPropagation();
                        }}
                        className="flex-1 flex flex-col gap-3 w-full"
                      >
                        <div className="flex flex-col gap-1 w-full">
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
                        {/* Top Controls Row spanning full width */}
                        <div className="flex items-center justify-between w-full border-b border-stone-150 pb-2.5">
                          {/* Left controls: Select Checkbox, Drag indicator, Hidden status & Date */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="checkbox"
                              checked={selectedQuoteIds.includes(q.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                setSelectedQuoteIds((prev) => {
                                  if (prev.includes(q.id)) {
                                    return prev.filter((id) => id !== q.id);
                                  } else {
                                    return [...prev, q.id];
                                  }
                                });
                                setLastSelectedId(q.id);
                              }}
                              className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                            />

                            {quoteFilter === "all" && (
                              <div
                                onMouseDown={() => setDraggableQuoteId(q.id)}
                                onMouseUp={() => setDraggableQuoteId(null)}
                                onMouseLeave={() => setDraggableQuoteId(null)}
                                className="flex items-center text-stone-300 group-hover:text-stone-400 transition-colors cursor-grab active:cursor-grabbing shrink-0 select-none"
                                title="Drag to reorder"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>
                            )}

                            {q.isActive === false && (
                              <span className="text-[9px] font-bold tracking-wider text-stone-500 bg-stone-200/60 border border-stone-300 px-1.5 py-0.5 rounded-sm uppercase font-sans shrink-0">
                                Hidden
                              </span>
                            )}

                            <span className="text-[10px] text-stone-400 font-mono flex items-center gap-1 shrink-0 select-none">
                              <Calendar className="w-3 h-3" />
                              {formatDate(q.createdAt)}
                            </span>
                          </div>

                          {/* Right action buttons: Full row by themselves */}
                          <div className={`flex items-center gap-1 shrink-0 transition-all ${
                            selectedQuoteIds.length > 0 ? "pointer-events-none opacity-40 select-none" : ""
                          }`}>
                            {deleteConfirmQuoteId === q.id ? (
                              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 p-1 rounded-lg shrink-0 animate-fade-in shadow-3xs">
                                <span className="text-[10px] font-bold text-red-700 uppercase font-sans px-1.5">
                                  Delete Quote?
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteQuote(q.id);
                                    setDeleteConfirmQuoteId(null);
                                  }}
                                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-md cursor-pointer transition-colors"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmQuoteId(null);
                                  }}
                                  className="px-2.5 py-1 bg-white border border-stone-250 text-stone-700 text-[10px] font-semibold rounded-md cursor-pointer hover:bg-stone-50 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                {/* Play/Preview button */}
                                <button
                                  id={`preview-quote-btn-${q.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEdit(q);
                                  }}
                                  className="p-1.5 text-stone-400 hover:text-amber-700 hover:bg-stone-100 rounded-lg border border-transparent transition-all cursor-pointer"
                                  title="Edit Quote"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>

                                {/* Visibility status Quick Toggle */}
                                <button
                                  id={`toggle-active-${q.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleActive(q.id, q.isActive !== false);
                                  }}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    q.isActive !== false
                                      ? "text-stone-400 hover:text-stone-750 hover:bg-stone-100 border-transparent"
                                      : "text-amber-700 bg-amber-50 border-amber-300"
                                  }`}
                                  title={q.isActive !== false ? "Hide Quote from slideshow" : "Show Quote in slideshow"}
                                >
                                  {q.isActive !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                </button>

                                {/* Thumbs Up button */}
                                <button
                                  id={`rate-up-quote-${q.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRateQuote(q.id, q.rating === 'up' ? null : 'up');
                                  }}
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRateQuote(q.id, q.rating === 'down' ? null : 'down');
                                  }}
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmQuoteId(q.id);
                                  }}
                                  className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-stone-100 rounded-lg border border-transparent transition-all cursor-pointer"
                                  title="Delete Quote"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Verse Text underneath (Full Width) */}
                        <div className="w-full mt-1">
                          <p
                            data-quote-id={q.id}
                            onClick={(e) => {
                              // Stop propagation so clicking text does not trigger row selection,
                              // unless we are in selection mode where we want click to bubble to select the row
                              if (selectedQuoteIds.length > 0) {
                                return;
                              }
                              e.stopPropagation();
                            }}
                            className={`font-quote text-stone-800 font-medium leading-relaxed ${
                              selectedQuoteIds.length > 0
                                ? "select-none pointer-events-none cursor-default"
                                : "select-text cursor-text selection:bg-amber-200/80"
                            } ${getFontSizeClass(fontSizeLevel)} ${q.isActive === false ? "text-stone-500 line-through decoration-stone-300" : ""}`}
                            style={{ "--quote-font": isGreekText(q.text) ? "var(--quote-font-el)" : "var(--quote-font-en)" } as React.CSSProperties}
                          >
                            "{renderFormattedText(q.text)}"
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3.5 pt-2 border-t border-stone-100/50">
                            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                              — {q.author}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))
              ) : sortedQuotes.length > 0 ? (
                <div id="empty-filter-notice" className="border border-dashed border-stone-200 rounded-xl p-8 text-center text-stone-500 text-sm">
                  <p className="font-serif italic font-medium mb-1">
                    No quotes match the selected filter.
                  </p>
                  <p className="text-xs text-stone-400">
                    Try choosing "All" or adding some quotes that fit this filter.
                  </p>
                </div>
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

      {/* Floating Custom Right-Click Context Menu for Selected Quotes */}
      {rowContextMenu && rowContextMenu.visible && (
        <div
          id="row-context-menu"
          className="fixed z-[100] min-w-[200px] bg-white border border-stone-250 shadow-2xl rounded-2xl p-1.5 flex flex-col gap-0.5 animate-fade-in select-none"
          style={{
            top: `${rowContextMenu.y}px`,
            left: `${rowContextMenu.x}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100 mb-1 flex items-center justify-between">
            <span>Actions ({rowContextMenu.quoteIds.length})</span>
          </div>

          <button
            type="button"
            id="row-context-deselect-btn"
            onClick={() => {
              setSelectedQuoteIds([]);
              setRowContextMenu(null);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 text-stone-700 hover:bg-stone-50 rounded-xl text-left font-sans text-xs font-semibold cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5 text-stone-550" />
            <span>Deselect All</span>
          </button>

          <button
            type="button"
            id="row-context-clear-formatting-btn"
            onClick={() => {
              handleBulkClearFormatting();
              setRowContextMenu(null);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 text-stone-700 hover:bg-stone-50 rounded-xl text-left font-sans text-xs font-semibold cursor-pointer transition-colors"
          >
            <Eraser className="w-3.5 h-3.5 text-amber-600" />
            <span>Clear Formatting</span>
          </button>

          <div className="h-px bg-stone-100 my-1" />

          <button
            type="button"
            id="row-context-thumbs-up-btn"
            onClick={() => {
              handleBulkThumbsUp();
              setRowContextMenu(null);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 text-emerald-800 hover:bg-emerald-50 rounded-xl text-left font-sans text-xs font-semibold cursor-pointer transition-colors"
          >
            <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Thumbs Up</span>
          </button>

          <button
            type="button"
            id="row-context-thumbs-down-btn"
            onClick={() => {
              handleBulkThumbsDown();
              setRowContextMenu(null);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 text-red-800 hover:bg-red-50 rounded-xl text-left font-sans text-xs font-semibold cursor-pointer transition-colors"
          >
            <ThumbsDown className="w-3.5 h-3.5 text-red-600" />
            <span>Thumbs Down</span>
          </button>

          <div className="h-px bg-stone-100 my-1" />

          <button
            type="button"
            id="row-context-activate-btn"
            onClick={() => {
              handleBulkActivate();
              setRowContextMenu(null);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 text-stone-750 hover:bg-stone-50 rounded-xl text-left font-sans text-xs font-semibold cursor-pointer transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-amber-600" />
            <span>Activate</span>
          </button>

          <button
            type="button"
            id="row-context-deactivate-btn"
            onClick={() => {
              handleBulkDeactivate();
              setRowContextMenu(null);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 text-stone-750 hover:bg-stone-50 rounded-xl text-left font-sans text-xs font-semibold cursor-pointer transition-colors"
          >
            <EyeOff className="w-3.5 h-3.5 text-stone-500" />
            <span>Deactivate</span>
          </button>

          <div className="h-px bg-stone-100 my-1" />

          <button
            type="button"
            id="row-context-delete-btn"
            onClick={() => {
              executeBulkDelete();
              setRowContextMenu(null);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 text-red-750 hover:bg-red-50 rounded-xl text-left font-sans text-xs font-bold cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* Bulk Paste Dialog */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/65 backdrop-blur-[2px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-stone-200 shadow-2xl rounded-3xl w-full max-w-2xl flex flex-col max-h-[85vh] relative z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-150 px-6 py-4 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif text-lg font-bold text-stone-900">
                  Bulk Add Quotes to "{category.name}"
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setBulkInputText("");
                  setParsedBulkQuotes([]);
                  setBulkParseError("");
                }}
                className="text-stone-400 hover:text-stone-600 transition-colors p-1.5 rounded-lg hover:bg-stone-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {parsedBulkQuotes.length === 0 ? (
                <>
                  <div className="text-xs text-stone-500 leading-relaxed bg-stone-50 border border-stone-150 p-4 rounded-2xl flex flex-col gap-2 shadow-2xs">
                    <p className="font-bold text-stone-700">How to Format Your Quotes:</p>
                    <ul className="list-disc list-inside space-y-1 bg-white p-3 rounded-xl border border-stone-150">
                      <li><strong>JSON Array</strong>: <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-[11px]">[{"{"}"text": "Your quote...", "author": "Author"{"}"}]</code></li>
                      <li><strong>Line-by-Line with Delimiter</strong>: <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-[11px]">Quote Text | Author Name</code> (Supports <code className="font-mono bg-stone-100 px-1.5 py-0.5 rounded text-[11px]">|</code>, semicolon <code className="font-mono bg-stone-100 px-1.5 py-0.5 rounded text-[11px] text-amber-700">;</code>, tilde <code className="font-mono bg-stone-100 px-1.5 py-0.5 rounded text-[11px] text-amber-700">~</code>, or tabs)</li>
                      <li><strong>CSV Formatted</strong>: <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-[11px]">"Quote text", "Author"</code></li>
                      <li><strong>Plain Text Lines</strong>: Just paste quotes line-by-line; they'll import with "Unknown" as author.</li>
                    </ul>
                  </div>

                  <div className="flex flex-col gap-1.5 flex-1 min-h-[200px]">
                    <label className="text-xs font-semibold text-stone-600 uppercase pl-1 tracking-wider">Paste raw content below</label>
                    <textarea
                      id="bulk-paste-textarea"
                      value={bulkInputText}
                      onChange={(e) => setBulkInputText(e.target.value)}
                      placeholder='Example:&#10;"The only limit to our realization of tomorrow is our doubts of today." | Franklin D. Roosevelt&#10;"Life is what happens when you are busy making other plans." | John Lennon'
                      className="w-full flex-1 min-h-[160px] text-xs bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all font-mono resize-none shadow-2xs"
                    />
                  </div>

                  {bulkParseError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-semibold flex items-center gap-2">
                      <span>⚠️</span> {bulkParseError}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Top Row: Preview title, A+/A- controls, Change Input */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 border border-stone-200 p-3.5 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                        Preview ({parsedBulkQuotes.length} quotes)
                      </span>
                      {/* Font Size Modifier Controls for Bulk Preview */}
                      <div className="flex items-center gap-1 border border-stone-200 bg-white px-2 py-0.5 rounded-xl text-stone-600 font-sans text-xs shadow-3xs shrink-0">
                        <span className="font-semibold text-stone-500 mr-1 select-none text-[10px]">Size:</span>
                        <button
                          type="button"
                          onClick={() => setBulkFontSizeLevel(prev => Math.max(1, prev - 1))}
                          disabled={bulkFontSizeLevel === 1}
                          className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-stone-100 disabled:opacity-40 font-bold transition-colors cursor-pointer text-stone-700 text-xs"
                          title="Decrease preview font size"
                        >
                          A-
                        </button>
                        <span className="w-4 text-center font-bold text-amber-700 select-none text-xs">{bulkFontSizeLevel}</span>
                        <button
                          type="button"
                          onClick={() => setBulkFontSizeLevel(prev => Math.min(8, prev + 1))}
                          disabled={bulkFontSizeLevel === 8}
                          className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-stone-100 disabled:opacity-40 font-bold transition-colors cursor-pointer text-stone-700 text-xs"
                          title="Increase preview font size"
                        >
                          A+
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setParsedBulkQuotes([]);
                        setBulkPreviewFilter("all");
                      }}
                      className="text-amber-700 hover:text-amber-800 text-xs font-bold hover:underline cursor-pointer bg-white border border-stone-250 px-2.5 py-1 rounded-lg transition-all"
                    >
                      Change Input
                    </button>
                  </div>

                  {/* Filter selector row */}
                  <div className="flex items-center gap-1.5 flex-wrap px-1">
                    <span className="text-stone-500 font-sans text-xs font-semibold select-none mr-1.5">View Filter:</span>
                    <button
                      type="button"
                      onClick={() => setBulkPreviewFilter("all")}
                      className={`px-3 py-1 rounded-lg font-sans text-xs font-bold border transition-all cursor-pointer ${
                        bulkPreviewFilter === "all"
                          ? "bg-stone-850 border-stone-900 text-white shadow-3xs"
                          : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      All ({parsedBulkQuotes.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkPreviewFilter("unique")}
                      className={`px-3 py-1 rounded-lg font-sans text-xs font-bold border transition-all cursor-pointer ${
                        bulkPreviewFilter === "unique"
                          ? "bg-amber-600 border-amber-700 text-white shadow-3xs"
                          : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                      title="Excludes duplicates in this category"
                    >
                      Unique / Importable ({uniqueParsedBulk.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkPreviewFilter("new")}
                      className={`px-3 py-1 rounded-lg font-sans text-xs font-bold border transition-all cursor-pointer ${
                        bulkPreviewFilter === "new"
                          ? "bg-emerald-600 border-emerald-700 text-white shadow-3xs"
                          : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                      title="Only shows brand-new quotes not in any category"
                    >
                      New Only ({newParsedBulk.length})
                    </button>
                  </div>

                  {/* Scrollable list of parsed quotes */}
                  <div className="border border-stone-200 rounded-2xl max-h-[350px] overflow-y-auto divide-y divide-stone-150 bg-stone-50/50 shadow-2xs">
                    {visibleBulkQuotes.length === 0 ? (
                      <div className="p-10 text-center text-stone-500 font-sans text-sm">
                        <p className="font-serif italic font-medium text-stone-700 mb-1">
                          No quotes match the selected filter.
                        </p>
                        <p className="text-xs text-stone-400">
                          Try choosing "All" or adding some quotes that fit this filter.
                        </p>
                      </div>
                    ) : (
                      visibleBulkQuotes.map((q, idx) => {
                        const existStatus = checkQuoteExistence(q.text);
                        return (
                          <div key={idx} className="p-5 flex items-start justify-between gap-5 hover:bg-white transition-colors">
                            <div className="flex-1 min-w-0">
                              <p
                                className={`font-quote text-stone-850 leading-relaxed italic font-medium ${getBulkFontSizeClass(bulkFontSizeLevel)}`}
                                style={{ "--quote-font": isGreekText(q.text) ? "var(--quote-font-el)" : "var(--quote-font-en)" } as React.CSSProperties}
                              >
                                "{q.text}"
                              </p>
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mt-2">
                                <span className="text-[11px] md:text-xs font-bold text-stone-500 uppercase tracking-widest shrink-0">
                                  — {q.author}
                                </span>
                                {existStatus.status === "same_category" && (
                                  <span className="inline-flex items-center text-[9px] font-bold text-white bg-red-600 border border-red-750 px-2 py-0.5 rounded-md select-none font-sans uppercase tracking-wider shadow-3xs">
                                    Already in this Category
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
                                setParsedBulkQuotes(prev => prev.filter(item => item.text !== q.text));
                              }}
                              className="text-stone-400 hover:text-red-600 p-1 rounded-lg transition-colors cursor-pointer shrink-0 mt-1"
                              title="Exclude this quote"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-stone-150 px-6 py-4 flex gap-3 justify-end bg-stone-50 rounded-b-3xl shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setBulkInputText("");
                  setParsedBulkQuotes([]);
                  setBulkParseError("");
                  setBulkPreviewFilter("all");
                }}
                className="px-4 py-2 border border-stone-250 bg-white text-stone-600 font-sans text-xs font-semibold rounded-xl cursor-pointer hover:bg-stone-50 transition-colors shadow-2xs"
              >
                Cancel
              </button>

              {parsedBulkQuotes.length === 0 ? (
                <button
                  type="button"
                  onClick={handleRunBulkParse}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-sans text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs"
                >
                  Parse & Preview Quotes
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAddBulkToCategory}
                  disabled={
                    (bulkPreviewFilter === "new" && newParsedBulk.length === 0) ||
                    (bulkPreviewFilter !== "new" && uniqueParsedBulk.length === 0)
                  }
                  className={`px-4 py-2 text-white font-sans text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed ${
                    bulkPreviewFilter === "new"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {bulkPreviewFilter === "new"
                    ? `Add ${newParsedBulk.length} New Quotes`
                    : `Add ${uniqueParsedBulk.length} Unique Quotes`}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Undo Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[99] bg-stone-900 text-stone-100 text-xs py-3.5 px-5 rounded-2xl shadow-xl flex items-center gap-4 border border-stone-800"
          >
            <span className="font-medium">{toastMessage.text}</span>
            {toastMessage.onAction && (
              <button
                onClick={() => {
                  toastMessage.onAction?.();
                  setToastMessage(null);
                }}
                className="text-amber-400 hover:text-amber-300 font-bold uppercase text-xs tracking-wider border-l border-stone-800 pl-4 cursor-pointer hover:underline"
              >
                {toastMessage.actionText || "Undo"}
              </button>
            )}
            <button
              onClick={() => setToastMessage(null)}
              className="text-stone-400 hover:text-stone-200 cursor-pointer ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
