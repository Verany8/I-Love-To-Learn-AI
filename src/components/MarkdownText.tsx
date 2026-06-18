import React from 'react';

interface MarkdownTextProps {
  text: string;
}

export default function MarkdownText({ text }: MarkdownTextProps) {
  // Split the text into lines to process block structures
  const lines = text.split('\n');

  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-800">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // 1. Render empty lines as spacers
        if (trimmed === '') {
          return <div key={lineIdx} className="h-2" />;
        }

        // 2. Headings (e.g., ### Heading, ## Heading)
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={lineIdx} className="font-semibold text-base text-slate-900 mt-3 mb-1 first:mt-0">
              {parseInlineStyles(trimmed.slice(4))}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={lineIdx} className="font-bold text-lg text-slate-900 mt-4 mb-2 first:mt-0">
              {parseInlineStyles(trimmed.slice(3))}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={lineIdx} className="font-extrabold text-xl text-slate-900 mt-4 mb-2 first:mt-0">
              {parseInlineStyles(trimmed.slice(2))}
            </h2>
          );
        }

        // 3. Bullet points (e.g., - item or * item)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-4 my-1">
              <span className="text-emerald-500 mt-1.5 shrink-0 block w-1.5 h-1.5 rounded-full" />
              <p className="flex-1 text-slate-700">
                {parseInlineStyles(trimmed.slice(2))}
              </p>
            </div>
          );
        }

        // 4. Numbered list (e.g., 1. item)
        const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numberMatch) {
          const [, num, content] = numberMatch;
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-4 my-1">
              <span className="font-mono text-xs text-emerald-600 font-semibold mt-0.5 shrink-0 w-4">
                {num}.
              </span>
              <p className="flex-1 text-slate-700">
                {parseInlineStyles(content)}
              </p>
            </div>
          );
        }

        // 5. Standard paragraph line
        return (
          <p key={lineIdx} className="text-slate-700">
            {parseInlineStyles(line)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Parses inline formatting: **bold** and `code`
 */
function parseInlineStyles(text: string): React.ReactNode[] {
  // Regex pattern to search for **text** or `text`
  // We'll segment the string sequentially
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;

  // Let's iterate index-by-index scanning for formats
  while (currentIndex < text.length) {
    const nextBold = text.indexOf('**', currentIndex);
    const nextCode = text.indexOf('`', currentIndex);

    // If neither formatted part is found, append the rest of the text
    if (nextBold === -1 && nextCode === -1) {
      parts.push(text.slice(currentIndex));
      break;
    }

    // Determine which formatting tag appears first
    let isBoldFirst = false;
    let matchIndex = -1;

    if (nextBold !== -1 && (nextCode === -1 || nextBold < nextCode)) {
      isBoldFirst = true;
      matchIndex = nextBold;
    } else {
      matchIndex = nextCode;
    }

    // Push any text between the current position and the match
    if (matchIndex > currentIndex) {
      parts.push(text.slice(currentIndex, matchIndex));
    }

    if (isBoldFirst) {
      // Find closing **
      const closeIndex = text.indexOf('**', matchIndex + 2);
      if (closeIndex === -1) {
        // Unclosed format, treat as literal text
        parts.push('**');
        currentIndex = matchIndex + 2;
      } else {
        const innerText = text.slice(matchIndex + 2, closeIndex);
        parts.push(
          <strong key={`${matchIndex}-bold`} className="font-bold text-slate-900">
            {innerText}
          </strong>
        );
        currentIndex = closeIndex + 2;
      }
    } else {
      // Find closing `
      const closeIndex = text.indexOf('`', matchIndex + 1);
      if (closeIndex === -1) {
        // Unclosed format, treat as literal text
        parts.push('`');
        currentIndex = matchIndex + 1;
      } else {
        const innerText = text.slice(matchIndex + 1, closeIndex);
        parts.push(
          <span
            key={`${matchIndex}-code`}
            className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-purple-700"
          >
            {innerText}
          </span>
        );
        currentIndex = closeIndex + 1;
      }
    }
  }

  return parts;
}
