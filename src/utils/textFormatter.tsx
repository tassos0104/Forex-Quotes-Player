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

/**
 * Maps selection indices from stripped text to raw text and applies formatting tags.
 * This is implemented using a robust character-state array parser and serializer to
 * avoid tag-nesting, index-mapping, or dangling tag issues.
 */
interface CharState {
  char: string;
  b: boolean;
  i: boolean;
  u: boolean;
  mark: boolean;
  uppercase: boolean;
  capitalize: boolean;
}

export function parseRawText(rawText: string): CharState[] {
  const chars: CharState[] = [];
  let isUnderline = false;
  let isHighlight = false;
  let isBold = false;
  let isItalic = false;
  let isUppercase = false;
  let isCapitalize = false;

  let i = 0;
  while (i < rawText.length) {
    if (rawText[i] === "<") {
      const tagEnd = rawText.indexOf(">", i);
      if (tagEnd !== -1) {
        const tag = rawText.substring(i, tagEnd + 1);
        if (tag === "<u>") isUnderline = true;
        else if (tag === "</u>") isUnderline = false;
        else if (tag === "<mark>") isHighlight = true;
        else if (tag === "</mark>") isHighlight = false;
        else if (tag === "<b>") isBold = true;
        else if (tag === "</b>") isBold = false;
        else if (tag === "<i>") isItalic = true;
        else if (tag === "</i>") isItalic = false;
        else if (tag === '<span class="uppercase">') isUppercase = true;
        else if (tag === '<span class="capitalize">') isCapitalize = true;
        else if (tag === "</span>") {
          isUppercase = false;
          isCapitalize = false;
        }
        i = tagEnd + 1;
        continue;
      }
    }

    chars.push({
      char: rawText[i],
      b: isBold,
      i: isItalic,
      u: isUnderline,
      mark: isHighlight,
      uppercase: isUppercase,
      capitalize: isCapitalize,
    });
    i++;
  }
  return chars;
}

interface FormatGroup {
  text: string;
  b: boolean;
  i: boolean;
  u: boolean;
  mark: boolean;
  uppercase: boolean;
  capitalize: boolean;
}

export function serializeCharStates(chars: CharState[]): string {
  if (chars.length === 0) return "";

  const groups: FormatGroup[] = [];
  let currentGroup: FormatGroup = {
    text: chars[0].char,
    b: chars[0].b,
    i: chars[0].i,
    u: chars[0].u,
    mark: chars[0].mark,
    uppercase: chars[0].uppercase,
    capitalize: chars[0].capitalize,
  };

  for (let i = 1; i < chars.length; i++) {
    const c = chars[i];
    const match =
      c.b === currentGroup.b &&
      c.i === currentGroup.i &&
      c.u === currentGroup.u &&
      c.mark === currentGroup.mark &&
      c.uppercase === currentGroup.uppercase &&
      c.capitalize === currentGroup.capitalize;

    if (match) {
      currentGroup.text += c.char;
    } else {
      groups.push(currentGroup);
      currentGroup = {
        text: c.char,
        b: c.b,
        i: c.i,
        u: c.u,
        mark: c.mark,
        uppercase: c.uppercase,
        capitalize: c.capitalize,
      };
    }
  }
  groups.push(currentGroup);

  let result = "";
  for (const g of groups) {
    let formattedText = g.text;
    if (g.capitalize) {
      formattedText = `<span class="capitalize">${formattedText}</span>`;
    }
    if (g.uppercase) {
      formattedText = `<span class="uppercase">${formattedText}</span>`;
    }
    if (g.mark) {
      formattedText = `<mark>${formattedText}</mark>`;
    }
    if (g.u) {
      formattedText = `<u>${formattedText}</u>`;
    }
    if (g.i) {
      formattedText = `<i>${formattedText}</i>`;
    }
    if (g.b) {
      formattedText = `<b>${formattedText}</b>`;
    }
    result += formattedText;
  }

  return result;
}

export function applyFormatting(
  rawText: string,
  selectedText: string,
  formatType: 'b' | 'i' | 'u' | 'mark' | 'uppercase' | 'capitalize' | 'clear',
  selectionOffset: number
): string {
  if (!rawText) return "";

  const chars = parseRawText(rawText);
  const totalLength = chars.length;

  let startIndex = selectionOffset;
  let endIndex = selectionOffset + selectedText.length;

  // Clamping indices to avoid out of bounds
  if (startIndex < 0) startIndex = 0;
  if (endIndex > totalLength) endIndex = totalLength;

  if (startIndex >= endIndex) return rawText;

  if (formatType === "clear") {
    for (let idx = startIndex; idx < endIndex; idx++) {
      chars[idx].b = false;
      chars[idx].i = false;
      chars[idx].u = false;
      chars[idx].mark = false;
      chars[idx].uppercase = false;
      chars[idx].capitalize = false;
    }
  } else {
    // Check if all selected characters already have this format
    const allHaveFormat = chars.slice(startIndex, endIndex).every((c) => {
      if (formatType === "b") return c.b;
      if (formatType === "i") return c.i;
      if (formatType === "u") return c.u;
      if (formatType === "mark") return c.mark;
      if (formatType === "uppercase") return c.uppercase;
      if (formatType === "capitalize") return c.capitalize;
      return false;
    });

    const newValue = !allHaveFormat;

    for (let idx = startIndex; idx < endIndex; idx++) {
      if (formatType === "b") chars[idx].b = newValue;
      else if (formatType === "i") chars[idx].i = newValue;
      else if (formatType === "u") chars[idx].u = newValue;
      else if (formatType === "mark") chars[idx].mark = newValue;
      else if (formatType === "uppercase") chars[idx].uppercase = newValue;
      else if (formatType === "capitalize") chars[idx].capitalize = newValue;
    }
  }

  return serializeCharStates(chars);
}

/**
 * Helper to determine if a string contains Greek characters.
 */
export function isGreekText(text: string): boolean {
  if (!text) return false;
  const greekRegex = /[\u0370-\u03FF\u1F00-\u1FFF]/;
  return greekRegex.test(text);
}
