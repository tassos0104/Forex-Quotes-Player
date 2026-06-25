import React, { useRef, useState } from "react";
import { Category, Quote } from "../types";
import { Upload, Download, FileJson, AlertTriangle, Check, X, HelpCircle } from "lucide-react";

interface ImportExportProps {
  categories: Category[];
  quotes: Quote[];
  onImport: (importedCategories: Category[], importedQuotes: Quote[], mode: "merge" | "overwrite") => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportExportModal({
  categories,
  quotes,
  onImport,
  isOpen,
  onClose,
}: ImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<"merge" | "overwrite">("merge");
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [previewData, setPreviewData] = useState<{ categoriesCount: number; quotesCount: number } | null>(null);
  const [parsedData, setParsedData] = useState<{ categories: Category[]; quotes: Quote[] } | null>(null);
  const [showSchemaInfo, setShowSchemaInfo] = useState(false);

  if (!isOpen) return null;

  // Handle exporting all data
  const handleExport = () => {
    const dataStr = JSON.stringify({ categories, quotes }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quote-shuffle-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatus({ type: "success", message: "Backup file exported successfully!" });
  };

  // Helper to validate and normalize imported structures
  const parseJsonFile = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);

      // Scenario 1: Standard backup format with both categories and quotes
      if (data && typeof data === "object" && !Array.isArray(data)) {
        let importedCats: Category[] = [];
        let importedQuotes: Quote[] = [];

        if (Array.isArray(data.categories)) {
          importedCats = data.categories.filter(
            (c: any) => typeof c === "object" && typeof c.id === "string" && typeof c.name === "string"
          ).map((c: any) => ({
            id: c.id,
            name: c.name,
            isCustom: c.isCustom !== undefined ? c.isCustom : true,
            isShufflable: c.isShufflable !== undefined ? c.isShufflable : true,
          }));
        }

        if (Array.isArray(data.quotes)) {
          importedQuotes = data.quotes.filter(
            (q: any) => typeof q === "object" && typeof q.text === "string" && typeof q.categoryId === "string"
          ).map((q: any) => ({
            id: q.id || `quote-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`,
            text: q.text,
            author: q.author || "Unknown",
            categoryId: q.categoryId,
            createdAt: q.createdAt || Date.now(),
          }));
        }

        if (importedCats.length === 0 && importedQuotes.length === 0) {
          throw new Error("No valid category or quote data found in the backup file.");
        }

        return { categories: importedCats, quotes: importedQuotes };
      }

      // Scenario 2: Flat array of quotes, possibly with a "category" name string
      if (Array.isArray(data)) {
        const generatedCatsMap = new Map<string, string>(); // categoryName -> id
        const importedQuotes: Quote[] = [];

        // Generate IDs for existing categories to prevent creating duplicates if categoryName matches
        categories.forEach(c => {
          generatedCatsMap.set(c.name.toLowerCase(), c.id);
        });

        const newCats: Category[] = [];

        data.forEach((item: any, idx: number) => {
          if (item && typeof item === "object" && typeof item.text === "string") {
            const rawCatName = (item.category || item.categoryId || "Imported").trim();
            const lowerCatName = rawCatName.toLowerCase();

            let targetCatId = generatedCatsMap.get(lowerCatName);
            if (!targetCatId) {
              targetCatId = `cat-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
              generatedCatsMap.set(lowerCatName, targetCatId);
              newCats.push({
                id: targetCatId,
                name: rawCatName,
                isCustom: true,
                isShufflable: true,
              });
            }

            importedQuotes.push({
              id: item.id || `quote-${idx}-${Date.now()}`,
              text: item.text,
              author: item.author || "Unknown",
              categoryId: targetCatId,
              createdAt: item.createdAt || Date.now(),
            });
          }
        });

        if (importedQuotes.length === 0) {
          throw new Error("No valid quotes found in the array. Make sure quotes have a 'text' property.");
        }

        return { categories: newCats, quotes: importedQuotes };
      }

      throw new Error("JSON structure is not supported. Upload a standard backup or simple quotes list.");
    } catch (err: any) {
      throw new Error(err.message || "Invalid JSON formatting.");
    }
  };

  // File picker handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseJsonFile(text);

        setParsedData(parsed);
        setPreviewData({
          categoriesCount: parsed.categories.length,
          quotesCount: parsed.quotes.length,
        });
        setStatus({
          type: "info",
          message: `Successfully parsed JSON! Found ${parsed.quotes.length} quotes and ${parsed.categories.length} new categories.`,
        });
      } catch (err: any) {
        setStatus({ type: "error", message: err.message });
        setPreviewData(null);
        setParsedData(null);
      }
    };
    reader.readAsText(file);
  };

  // Submit parsed data
  const handleImportSubmit = () => {
    if (!parsedData) return;
    onImport(parsedData.categories, parsedData.quotes, importMode);
    setStatus({
      type: "success",
      message: `Import complete! Loaded ${parsedData.quotes.length} quotes using '${importMode}' mode.`,
    });
    setPreviewData(null);
    setParsedData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => {
      onClose();
      setStatus(null);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs" onClick={onClose} />

      {/* Card Content */}
      <div className="relative bg-white w-full max-w-lg rounded-2xl border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-stone-100 p-5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-50 text-amber-800 rounded-lg">
              <FileJson className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-stone-900">
              Import & Export Quotes
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Status Display banner */}
          {status && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 border ${
                status.type === "success"
                  ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                  : status.type === "error"
                  ? "bg-red-50 border-red-100 text-red-800"
                  : "bg-amber-50 border-amber-100 text-amber-800"
              }`}
            >
              {status.type === "success" && <Check className="w-4 h-4 shrink-0 mt-0.5" />}
              {status.type === "error" && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
              {status.type === "info" && <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{status.message}</span>
            </div>
          )}

          {/* Export section */}
          <div className="bg-stone-50 border border-stone-200/60 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h4 className="font-serif text-sm font-semibold text-stone-800">
                Export Current Library
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Save your categories and quotes to a JSON file.
              </p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 bg-stone-900 hover:bg-amber-700 text-white font-sans text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-lg shadow-sm transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-stone-200"></div>
            <span className="flex-shrink mx-4 text-stone-400 text-[10px] font-bold uppercase tracking-wider">OR</span>
            <div className="flex-grow border-t border-stone-200"></div>
          </div>

          {/* Import section */}
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="font-serif text-sm font-semibold text-stone-800">
                Import from JSON
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Select a standard backup file or a flat array of quote objects.
              </p>
            </div>

            {/* Custom file selector button */}
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                id="import-json-picker"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 border border-stone-300 hover:border-amber-600 bg-white text-stone-700 hover:text-amber-800 font-sans text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-lg shadow-sm transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Choose JSON File</span>
              </button>

              <span className="text-xs text-stone-400 truncate max-w-[240px]">
                {fileInputRef.current?.files?.[0]?.name || "No file chosen"}
              </span>
            </div>

            {/* If data is parsed, show import options */}
            {parsedData && (
              <div className="mt-2 bg-stone-100/60 rounded-xl p-4 border border-stone-200 flex flex-col gap-4">
                {/* Method selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                    Import Strategy
                  </span>
                  <div className="grid grid-cols-2 gap-2 bg-stone-200/50 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setImportMode("merge")}
                      className={`text-xs font-semibold py-1.5 rounded-md transition-all ${
                        importMode === "merge"
                          ? "bg-white text-stone-900 shadow-xs"
                          : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      Merge & Skip Duplicates
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode("overwrite")}
                      className={`text-xs font-semibold py-1.5 rounded-md transition-all ${
                        importMode === "overwrite"
                          ? "bg-white text-red-600 shadow-xs"
                          : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      Overwrite Entire Library
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-400 leading-normal">
                    {importMode === "merge"
                      ? "Keep all your existing quotes, add new categories, and skip duplicate quotes."
                      : "DANGER: This will delete all your current quotes and categories and replace them with the imported ones."}
                  </p>
                </div>

                <div className="flex justify-end gap-2.5 mt-2">
                  <button
                    onClick={() => {
                      setParsedData(null);
                      setPreviewData(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-800 transition-colors"
                  >
                    Clear File
                  </button>
                  <button
                    onClick={handleImportSubmit}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-sans text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-lg shadow-sm transition-colors"
                  >
                    Apply Import
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer/Schema info */}
        <div className="bg-stone-50 border-t border-stone-100 p-4 text-[10px] text-stone-400">
          <div className="flex items-center justify-between">
            <span>Supported schemas: Standard Backup or Quote Array</span>
            <button
              onClick={() => setShowSchemaInfo(!showSchemaInfo)}
              className="text-amber-700 font-semibold hover:underline cursor-pointer bg-transparent border-none p-0"
            >
              {showSchemaInfo ? "Hide Template Schema" : "Show Template Schema"}
            </button>
          </div>

          {showSchemaInfo && (
            <div className="mt-3 p-3 bg-stone-900 text-stone-200 rounded-lg font-mono text-[9px] leading-relaxed overflow-x-auto max-h-48 border border-stone-850">
              <p className="text-amber-400 font-sans font-bold uppercase tracking-wider mb-1">Format 1: Flat Quote Array</p>
              <pre className="mb-3 whitespace-pre-wrap">
{`[
  {
    "text": "The only limit to our realization of tomorrow is our doubts of today.",
    "author": "Franklin D. Roosevelt",
    "category": "Inspiration"
  }
]`}
              </pre>
              <p className="text-amber-400 font-sans font-bold uppercase tracking-wider mb-1">Format 2: Standard Backup JSON</p>
              <pre className="whitespace-pre-wrap">
{`{
  "categories": [
    { "id": "cat-1", "name": "Inspiration", "isShufflable": true }
  ],
  "quotes": [
    { "id": "q-1", "text": "Quote here", "author": "Author", "categoryId": "cat-1" }
  ]
}`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
