import React, { useState, useEffect, useRef } from "react";
import { Quote } from "../types";
import { Bold, Italic, Underline, Highlighter, CaseSensitive, Eraser } from "lucide-react";
import { applyFormatting, stripFormatTags } from "../utils/textFormatter";

interface SelectionFormattingToolbarProps {
  quotes: Quote[];
  previewEn: string;
  previewEl: string;
  onUpdateQuoteText: (id: string, newText: string) => void;
}

export default function SelectionFormattingToolbar({
  quotes,
  previewEn,
  previewEl,
  onUpdateQuoteText,
}: SelectionFormattingToolbarProps) {
  // Selection toolbar state
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarCoords, setToolbarCoords] = useState({ top: 0, left: 0 });

  // Currently target quote context
  const [targetQuoteId, setTargetQuoteId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectionOffset, setSelectionOffset] = useState<number>(0);

  const toolbarRef = useRef<HTMLDivElement>(null);

  // Helper to get raw quote text
  const getRawText = (id: string): string => {
    if (id === "preview-en") return previewEn;
    if (id === "preview-el") return previewEl;
    return quotes.find((q) => q.id === id)?.text || "";
  };

  // Traverses DOM to compute character offset of the selection relative to container
  const getSelectionCharacterOffsetWithin = (element: HTMLElement) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return { start: 0, text: "" };
    const range = sel.getRangeAt(0);

    let start = 0;
    let foundStart = false;
    let skippedLeadingQuote = false;

    const traverse = (node: Node) => {
      if (foundStart) return;

      if (node.nodeType === Node.TEXT_NODE) {
        let text = node.textContent || "";
        
        // If this text node contains the selection start container, we stop counting here
        if (node === range.startContainer) {
          let offset = range.startOffset;
          // If we haven't skipped the leading quote yet, and it is in this node
          if (!skippedLeadingQuote) {
            // Find the first quote character and skip it
            const quoteIdx = text.search(/["“«]/);
            if (quoteIdx !== -1 && quoteIdx < offset) {
              offset -= (quoteIdx + 1);
              skippedLeadingQuote = true;
            }
          }
          start += offset;
          foundStart = true;
          return;
        }

        // Otherwise, add this node's length to start
        if (!skippedLeadingQuote) {
          const quoteIdx = text.search(/["“«]/);
          if (quoteIdx !== -1) {
            text = text.substring(quoteIdx + 1);
            skippedLeadingQuote = true;
          } else {
            // If there's no quote in this node, it might be whitespace/indentation, so we don't count its characters
            text = "";
          }
        }
        start += text.length;
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          traverse(node.childNodes[i]);
          if (foundStart) return;
        }
      }
    };

    traverse(element);

    return {
      start,
      text: range.toString(),
    };
  };

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // Small timeout to allow the browser selection to finish updating
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.toString().trim()) {
          // If clicked outside toolbar, close it
          if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
            setShowToolbar(false);
          }
          return;
        }

        const range = selection.getRangeAt(0);
        // Find if selection is within a quote element
        let node: Node | null = range.startContainer;
        let quoteElement: HTMLElement | null = null;

        while (node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (el.hasAttribute("data-quote-id")) {
              quoteElement = el;
              break;
            }
          }
          node = node.parentNode;
        }

        if (quoteElement) {
          const quoteId = quoteElement.getAttribute("data-quote-id")!;
          const { start, text } = getSelectionCharacterOffsetWithin(quoteElement);
          
          setTargetQuoteId(quoteId);
          setSelectedText(text);
          setSelectionOffset(start);

          // Position the selection toolbar right above the selection range
          const rect = range.getBoundingClientRect();
          setToolbarCoords({
            top: rect.top + window.scrollY - 44, // 44px above the highlight
            left: rect.left + window.scrollX + rect.width / 2, // Centered horizontally
          });
          setShowToolbar(true);
        }
      }, 50);
    };

    const handleGlobalClick = (e: MouseEvent) => {
      // Dismiss toolbar if clicked outside quote text and toolbar
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          setShowToolbar(false);
        }
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("click", handleGlobalClick);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("click", handleGlobalClick);
    };
  }, [quotes, previewEn, previewEl]);

  const handleApplyFormatting = (formatType: 'b' | 'i' | 'u' | 'mark' | 'uppercase' | 'capitalize' | 'clear') => {
    if (!targetQuoteId || !selectedText) return;

    const rawText = getRawText(targetQuoteId);
    const updatedText = applyFormatting(rawText, selectedText, formatType, selectionOffset);
    
    onUpdateQuoteText(targetQuoteId, updatedText);

    // Clear selection & hide menus
    window.getSelection()?.removeAllRanges();
    setShowToolbar(false);
  };

  return (
    <>
      {/* 1. FLOATING SELECTION TOOLBAR */}
      {showToolbar && (
        <div
          ref={toolbarRef}
          style={{
            top: `${toolbarCoords.top}px`,
            left: `${toolbarCoords.left}px`,
            transform: "translateX(-50%)",
          }}
          className="absolute z-[300] bg-stone-900 text-white rounded-xl shadow-xl px-2 py-1.5 flex items-center gap-1 border border-stone-800 animate-fade-in text-xs font-semibold select-none scale-95 origin-bottom"
        >
          <button
            onClick={() => handleApplyFormatting("b")}
            className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-100 transition-colors"
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleApplyFormatting("i")}
            className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-100 transition-colors"
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleApplyFormatting("u")}
            className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-100 transition-colors"
            title="Underline"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleApplyFormatting("mark")}
            className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-100 transition-colors"
            title="Highlight text"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-400" />
          </button>
          <button
            onClick={() => handleApplyFormatting("uppercase")}
            className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-100 transition-colors text-[10px] font-black tracking-tighter"
            title="UPPERCASE"
          >
            A
          </button>
          <button
            onClick={() => handleApplyFormatting("capitalize")}
            className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-100 transition-colors text-[10px] font-bold"
            title="Capitalize"
          >
            Ab
          </button>
          <div className="w-[1px] h-4 bg-stone-800 mx-1" />
          <button
            onClick={() => handleApplyFormatting("clear")}
            className="p-1.5 hover:bg-stone-800 hover:text-red-400 rounded-lg text-stone-400 transition-colors"
            title="Clear Formatting"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
