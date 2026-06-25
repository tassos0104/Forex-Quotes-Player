import React from "react";

/**
 * Parses and renders text containing our custom format tags:
 * - <u>...</u> for Underline
 * - <mark>...</mark> for Highlight
 * - <b>...</b> for Bold
 * - <i>...</i> for Italic
 * - <span class="uppercase">...</span> for Uppercase
 * - <span class="capitalize">...</span> for Capitalize
 */
export function renderFormattedText(text: string): React.ReactNode {
  if (!text) return "";

  const tagRegex = /(<u>|<\/u>|<mark>|<\/mark>|<b>|<\/b>|<i>|<\/i>|<span class="uppercase">|<span class="capitalize">|<\/span>)/g;
  const parts = text.split(tagRegex);

  if (parts.length === 1) {
    return text;
  }

  const result: React.ReactNode[] = [];
  let isUnderline = false;
  let isHighlight = false;
  let isBold = false;
  let isItalic = false;
  let isUppercase = false;
  let isCapitalize = false;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === "<u>") {
      isUnderline = true;
    } else if (part === "</u>") {
      isUnderline = false;
    } else if (part === "<mark>") {
      isHighlight = true;
    } else if (part === "</mark>") {
      isHighlight = false;
    } else if (part === "<b>") {
      isBold = true;
    } else if (part === "</b>") {
      isBold = false;
    } else if (part === "<i>") {
      isItalic = true;
    } else if (part === "</i>") {
      isItalic = false;
    } else if (part === '<span class="uppercase">') {
      isUppercase = true;
    } else if (part === '<span class="capitalize">') {
      isCapitalize = true;
    } else if (part === "</span>") {
      isUppercase = false;
      isCapitalize = false;
    } else if (part) {
      let classes = "";
      if (isUnderline) classes += "underline ";
      if (isHighlight) {
        classes += "bg-amber-200 text-stone-950 px-1 rounded-md font-semibold shadow-3xs border border-amber-300/30 ";
      }
      if (isBold) classes += "font-bold ";
      if (isItalic) classes += "italic ";
      if (isUppercase) classes += "uppercase ";
      if (isCapitalize) classes += "capitalize ";

      if (classes) {
        result.push(
          <span key={i} className={classes.trim()}>
            {part}
          </span>
        );
      } else {
        result.push(part);
      }
    }
  }

  return <>{result}</>;
}

/**
 * Strips all our custom formatting tags from a string.
 */
export function stripFormatTags(text: string): string {
  if (!text) return "";
  return text.replace(/<\/?[a-zA-Z]+(?:\s+class="[^"]*")?>/g, "");
}
