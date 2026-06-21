/**
 * latexStripper.js
 * Converts raw LaTeX source into clean plain text for ATS scoring.
 *
 * Returns:
 *   - plainText: Full cleaned text (for keyword matching)
 *   - lines[]:   Per-line data with original LaTeX, cleaned text, and isItem flag
 *   - sections[]: Detected section headings with line positions
 *
 * The stripping pipeline is deliberately aggressive — ATS parsers only see
 * the plain-text layer of a PDF, so we must replicate that extraction.
 */

const { SECTION_VARIANTS } = require('../utils/constants');

/**
 * Strips LaTeX markup and returns structured plain text data.
 * @param {string} rawLatex - The full LaTeX source code
 * @returns {{ plainText: string, lines: object[], sections: object[] }}
 */
function stripLatex(rawLatex) {
  if (!rawLatex || typeof rawLatex !== 'string') {
    return { plainText: '', lines: [], sections: [] };
  }

  const sections = [];
  let text = rawLatex;

  // ── Step 1: Remove LaTeX comments (%... but not escaped \%) ────────────
  // Negative lookbehind ensures we don't strip escaped percent signs
  text = text.replace(/(?<!\\)%.*$/gm, '');

  // ── Step 2: Remove preamble (everything before \begin{document}) ───────
  const docBegin = text.indexOf('\\begin{document}');
  if (docBegin !== -1) {
    text = text.substring(docBegin + '\\begin{document}'.length);
  }

  // Remove \end{document} and everything after it
  const docEnd = text.indexOf('\\end{document}');
  if (docEnd !== -1) {
    text = text.substring(0, docEnd);
  }

  // ── Step 3: Remove document-level commands ─────────────────────────────
  text = text.replace(/\\documentclass(\[.*?\])?\{.*?\}/g, '');
  text = text.replace(/\\usepackage(\[.*?\])?\{.*?\}/g, '');
  text = text.replace(/\\newcommand\{[^}]*\}(\[.*?\])*\{[^}]*\}/g, '');
  text = text.replace(/\\renewcommand\{[^}]*\}(\[.*?\])*\{[^}]*\}/g, '');
  text = text.replace(/\\def\\[a-zA-Z]+\{[^}]*\}/g, '');
  text = text.replace(/\\setlength\{[^}]*\}\{[^}]*\}/g, '');
  text = text.replace(/\\pagestyle\{[^}]*\}/g, '');
  text = text.replace(/\\thispagestyle\{[^}]*\}/g, '');
  text = text.replace(/\\geometry\{[^}]*\}/g, '');
  text = text.replace(/\\hypersetup\{[^}]*\}/g, '');

  // ── Step 4: Extract section names and mark them ────────────────────────
  // We detect sections but keep a marker so we can identify them in the lines later
  const sectionRegex = /\\(?:section|subsection|subsubsection)\*?\{([^}]*)\}/g;
  let sectionMatch;
  // First pass: collect section names and their approximate positions
  const sectionMarkers = [];
  let tempText = text;
  while ((sectionMatch = sectionRegex.exec(tempText)) !== null) {
    const sectionName = sectionMatch[1].trim();
    sectionMarkers.push(sectionName);
  }

  // Replace section commands with a detectable marker line
  text = text.replace(/\\(?:section|subsection|subsubsection)\*?\{([^}]*)\}/g,
    '\n===SECTION:$1===\n');

  // ── Step 5: Iteratively unwrap formatting commands ─────────────────────
  // These commands wrap content in braces: \textbf{content} → content
  // We iterate because they can be nested: \textbf{\textit{text}}
  const formattingCommands = [
    'textbf', 'textit', 'emph', 'underline', 'textsc', 'texttt', 'text',
    'textrm', 'textsf', 'textsl', 'textup', 'textnormal',
    'bfseries', 'itshape', 'scshape', 'ttfamily',
    'mbox', 'makebox', 'fbox', 'parbox',
    'centering', 'raggedright', 'raggedleft'
  ];

  // Iterate unwrapping up to 10 passes to handle deep nesting
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;
    for (const cmd of formattingCommands) {
      const regex = new RegExp(`\\\\${cmd}\\{([^{}]*?)\\}`, 'g');
      const newText = text.replace(regex, '$1');
      if (newText !== text) {
        text = newText;
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Also handle bare formatting switches: {\bf text} → text, {\it text} → text
  text = text.replace(/\{\\(?:bf|it|em|sc|tt|rm|sf|sl|normalfont)\s+([^{}]*?)\}/g, '$1');

  // ── Step 6: Handle \href{url}{text} → keep text ───────────────────────
  text = text.replace(/\\href\{[^}]*\}\{([^}]*)\}/g, '$1');

  // ── Step 7: Handle \url{...} → keep URL ────────────────────────────────
  text = text.replace(/\\url\{([^}]*)\}/g, '$1');

  // ── Step 8: Handle moderncv commands ───────────────────────────────────
  // \cventry{date}{title}{org}{location}{grade}{description}
  text = text.replace(/\\cventry\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g,
    '$1 $2 $3 $4 $5 $6');
  // \cvitem{label}{text}
  text = text.replace(/\\cvitem\{([^}]*)\}\{([^}]*)\}/g, '$1: $2');
  // \cvskill{label}{text}
  text = text.replace(/\\cvskill\{([^}]*)\}\{([^}]*)\}/g, '$1: $2');
  // \cvlistitem{text}
  text = text.replace(/\\cvlistitem\{([^}]*)\}/g, '• $1');

  // ── Step 9: Mark \item entries for quantification scoring ──────────────
  text = text.replace(/\\item\s*/g, '===ITEM===');

  // ── Step 10: Remove environment markers ────────────────────────────────
  text = text.replace(/\\begin\{[^}]*\}(\[[^\]]*\])?/g, '');
  text = text.replace(/\\end\{[^}]*\}/g, '');

  // ── Step 11: Remove spacing commands ───────────────────────────────────
  text = text.replace(/\\vspace\*?\{[^}]*\}/g, '');
  text = text.replace(/\\hspace\*?\{[^}]*\}/g, '');
  text = text.replace(/\\(?:smallskip|medskip|bigskip|newpage|clearpage|cleardoublepage|pagebreak|linebreak|noindent|indent|par)\b/g, '');
  text = text.replace(/\\(?:vfill|hfill|dotfill|hrulefill)\b/g, '');
  text = text.replace(/\\kern\s*[^\\{\s]+/g, '');
  text = text.replace(/\\phantom\{[^}]*\}/g, '');

  // ── Step 12: Remove font size commands ─────────────────────────────────
  text = text.replace(/\\(?:tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge)\b/g, '');

  // ── Step 13: Convert \\ to newlines ────────────────────────────────────
  text = text.replace(/\\\\/g, '\n');

  // ── Step 14: Strip remaining \command patterns (catch-all) ─────────────
  // Must come AFTER all specific command handling
  // Handles \command (no braces), \command{...} (with braces)
  text = text.replace(/\\[a-zA-Z@]+\*?(\{[^}]*\})*/g, '');

  // ── Step 15: Remove remaining braces ───────────────────────────────────
  text = text.replace(/[{}]/g, '');

  // ── Step 16: Convert LaTeX special characters ──────────────────────────
  text = text.replace(/~/g, ' ');           // Non-breaking space → space
  text = text.replace(/---/g, '—');         // Em dash
  text = text.replace(/--/g, '–');          // En dash
  text = text.replace(/``/g, '"');          // Opening double quote
  text = text.replace(/''/g, '"');          // Closing double quote
  text = text.replace(/`/g, '\'');           // Opening single quote
  text = text.replace(/'/g, '\'');           // Closing single quote → note: careful with apostrophes
  text = text.replace(/\\&/g, '&');
  text = text.replace(/\\\$/g, '$');
  text = text.replace(/\\#/g, '#');
  text = text.replace(/\\_/g, '_');
  text = text.replace(/\\%/g, '%');

  // ── Step 17: Collapse whitespace ───────────────────────────────────────
  text = text.replace(/[ \t]+/g, ' ');      // Multiple spaces/tabs → single space
  text = text.replace(/\n\s*\n+/g, '\n');   // Multiple blank lines → single newline
  text = text.trim();

  // ── Build structured output ────────────────────────────────────────────
  const rawLines = text.split('\n');
  const lines = [];
  let lineNumber = 0;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue; // Skip empty lines

    lineNumber++;

    // Detect section markers
    const sectionMatch = trimmed.match(/^===SECTION:(.+)===$/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1].trim();
      sections.push({
        name: sectionName,
        startLine: lineNumber
      });
      continue; // Don't include the marker itself as a content line
    }

    // Detect item markers
    const isItem = trimmed.startsWith('===ITEM===');
    const cleanedText = trimmed.replace(/===ITEM===/g, '').trim();

    if (cleanedText) {
      lines.push({
        lineNumber,
        originalLatex: '', // We don't track back to original LaTeX per-line
        cleanedText,
        isItem
      });
    }
  }

  // Build final plain text from cleaned lines
  const plainText = lines.map(l => l.cleanedText).join('\n');

  return {
    plainText,
    lines,
    sections
  };
}

module.exports = { stripLatex };
