import JSZip from 'jszip';

export interface ImportedDoc {
  id?: string;
  title: string;
  icon?: string | null;
  contentBlocks: any[];
  relativePath: string;
  parentPath?: string | null;
  children?: ImportedDoc[];
}

/**
 * Parses inline markdown formatting (bold, italic, code, links) into BlockNote inline content objects
 */
export function parseInlineMarkdown(text: string): any[] {
  if (!text) return [];

  // Inline parser handling **bold**, *italic*, `code`, and [link](url)
  const inlineItems: any[] = [];
  const tokenRegex = /(\*\*(.*?)\*\*|\*(.*?)\*|`(.*?)`|\[(.*?)\]\((.*?)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      inlineItems.push({
        type: 'text',
        text: text.slice(lastIndex, match.index),
        styles: {},
      });
    }

    const fullMatch = match[0];
    if (fullMatch.startsWith('**')) {
      inlineItems.push({
        type: 'text',
        text: match[2],
        styles: { bold: true },
      });
    } else if (fullMatch.startsWith('*')) {
      inlineItems.push({
        type: 'text',
        text: match[3],
        styles: { italic: true },
      });
    } else if (fullMatch.startsWith('`')) {
      inlineItems.push({
        type: 'text',
        text: match[4],
        styles: { code: true },
      });
    } else if (fullMatch.startsWith('[')) {
      inlineItems.push({
        type: 'link',
        content: [{ type: 'text', text: match[5], styles: {} }],
        href: match[6],
      });
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    inlineItems.push({
      type: 'text',
      text: text.slice(lastIndex),
      styles: {},
    });
  }

  return inlineItems.length > 0 ? inlineItems : [{ type: 'text', text, styles: {} }];
}

/**
 * Converts Markdown string into BlockNote block format
 */
export function parseMarkdownToBlocks(markdown: string): any[] {
  if (!markdown || !markdown.trim()) {
    return [{ type: 'paragraph', content: [] }];
  }

  const lines = markdown.split(/\r?\n/);
  const blocks: any[] = [];
  let inCodeBlock = false;
  let codeLanguage = 'plaintext';
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block fence
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({
          type: 'codeBlock',
          props: { language: codeLanguage },
          content: parseInlineMarkdown(codeBuffer.join('\n')),
        });
        inCodeBlock = false;
        codeBuffer = [];
      } else {
        inCodeBlock = true;
        codeLanguage = trimmed.slice(3).trim() || 'plaintext';
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Skip empty lines
    if (!trimmed) {
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      blocks.push({
        type: 'heading',
        props: { level: 1 },
        content: parseInlineMarkdown(trimmed.slice(2)),
      });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({
        type: 'heading',
        props: { level: 2 },
        content: parseInlineMarkdown(trimmed.slice(3)),
      });
    } else if (trimmed.startsWith('### ')) {
      blocks.push({
        type: 'heading',
        props: { level: 3 },
        content: parseInlineMarkdown(trimmed.slice(4)),
      });
    }
    // Checklists (- [ ] or - [x])
    else if (/^- \[( |x|X)\] /.test(trimmed)) {
      const isChecked = trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]');
      blocks.push({
        type: 'checkListItem',
        props: { checked: isChecked },
        content: parseInlineMarkdown(trimmed.slice(6)),
      });
    }
    // Bullet List (- or *)
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      blocks.push({
        type: 'bulletListItem',
        content: parseInlineMarkdown(trimmed.slice(2)),
      });
    }
    // Numbered List (1. 2. etc)
    else if (/^\d+\.\s/.test(trimmed)) {
      const contentText = trimmed.replace(/^\d+\.\s/, '');
      blocks.push({
        type: 'numberedListItem',
        content: parseInlineMarkdown(contentText),
      });
    }
    // Blockquote
    else if (trimmed.startsWith('> ')) {
      blocks.push({
        type: 'quote',
        content: parseInlineMarkdown(trimmed.slice(2)),
      });
    }
    // Standard Paragraph
    else {
      blocks.push({
        type: 'paragraph',
        content: parseInlineMarkdown(trimmed),
      });
    }
  }

  // Handle unclosed code block at EOF
  if (inCodeBlock && codeBuffer.length > 0) {
    blocks.push({
      type: 'codeBlock',
      props: { language: codeLanguage },
      content: parseInlineMarkdown(codeBuffer.join('\n')),
    });
  }

  return blocks.length > 0 ? blocks : [{ type: 'paragraph', content: [] }];
}

/**
 * Converts HTML string (Apple Notes / Web notes) into BlockNote block format
 */
export function parseHTMLToBlocks(html: string): any[] {
  if (typeof window === 'undefined') {
    return parseMarkdownToBlocks(html);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;
  const blocks: any[] = [];

  const processNode = (node: Node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();
    const textContent = el.textContent?.trim() || '';

    if (!textContent && tagName !== 'hr' && tagName !== 'br') return;

    if (tagName === 'h1') {
      blocks.push({ type: 'heading', props: { level: 1 }, content: parseInlineMarkdown(textContent) });
    } else if (tagName === 'h2') {
      blocks.push({ type: 'heading', props: { level: 2 }, content: parseInlineMarkdown(textContent) });
    } else if (tagName === 'h3' || tagName === 'h4' || tagName === 'h5' || tagName === 'h6') {
      blocks.push({ type: 'heading', props: { level: 3 }, content: parseInlineMarkdown(textContent) });
    } else if (tagName === 'ul') {
      const items = el.querySelectorAll(':scope > li');
      items.forEach((li) => {
        const isCheckbox = li.querySelector('input[type="checkbox"]') || li.classList.contains('task-list-item');
        if (isCheckbox) {
          const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
          const checked = checkbox ? checkbox.checked : false;
          const labelText = li.textContent?.trim() || '';
          blocks.push({ type: 'checkListItem', props: { checked }, content: parseInlineMarkdown(labelText) });
        } else {
          blocks.push({ type: 'bulletListItem', content: parseInlineMarkdown(li.textContent?.trim() || '') });
        }
      });
    } else if (tagName === 'ol') {
      const items = el.querySelectorAll(':scope > li');
      items.forEach((li) => {
        blocks.push({ type: 'numberedListItem', content: parseInlineMarkdown(li.textContent?.trim() || '') });
      });
    } else if (tagName === 'blockquote') {
      blocks.push({ type: 'quote', content: parseInlineMarkdown(textContent) });
    } else if (tagName === 'pre' || tagName === 'code') {
      blocks.push({ type: 'codeBlock', props: { language: 'plaintext' }, content: parseInlineMarkdown(textContent) });
    } else if (tagName === 'p' || tagName === 'div') {
      blocks.push({ type: 'paragraph', content: parseInlineMarkdown(textContent) });
    } else {
      el.childNodes.forEach(processNode);
    }
  };

  body.childNodes.forEach(processNode);

  return blocks.length > 0 ? blocks : [{ type: 'paragraph', content: [] }];
}

/**
 * Strip Notion's 32-character hex string hash suffix from titles/filenames
 * E.g., "Product Spec 3a2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d.md" -> "Product Spec"
 */
export function cleanNotionTitle(rawName: string): string {
  let name = rawName.replace(/\.[^/.]+$/, '');
  name = name.replace(/\s?[0-9a-f]{32}$/i, '').trim();
  return name || 'Untitled Document';
}

/**
 * Extract title from Markdown content (# Heading 1) or fall back to cleaned filename
 */
export function extractTitleFromContent(content: string, fallbackFileName: string): { title: string; bodyMarkdown: string } {
  const lines = content.split(/\r?\n/);
  let title = '';
  const bodyLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!title && trimmed.startsWith('# ')) {
      title = trimmed.slice(2).trim();
    } else {
      bodyLines.push(lines[i]);
    }
  }

  if (!title) {
    title = cleanNotionTitle(fallbackFileName.split('/').pop() || 'Untitled Document');
  }

  return {
    title,
    bodyMarkdown: bodyLines.join('\n'),
  };
}

/**
 * Processes Notion ZIP exports or multiple files into a clean list of ImportedDocs
 */
export async function parseNotionZipArchive(zipFile: File): Promise<ImportedDoc[]> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipFile);
  const importedDocs: ImportedDoc[] = [];

  const files = Object.entries(loadedZip.files);

  for (const [relativePath, zipEntry] of files) {
    if (zipEntry.dir) continue;

    const lowerPath = relativePath.toLowerCase();
    const fileName = relativePath.split('/').pop() || '';

    if (fileName.startsWith('.') || relativePath.includes('__MACOSX')) {
      continue;
    }

    if (lowerPath.endsWith('.md') || lowerPath.endsWith('.txt')) {
      const rawText = await zipEntry.async('text');
      const { title, bodyMarkdown } = extractTitleFromContent(rawText, fileName);
      const blocks = parseMarkdownToBlocks(bodyMarkdown);

      const pathParts = relativePath.split('/');
      pathParts.pop();
      const parentPath = pathParts.join('/');

      importedDocs.push({
        title,
        icon: null,
        contentBlocks: blocks,
        relativePath,
        parentPath: parentPath || null,
      });
    } else if (lowerPath.endsWith('.html') || lowerPath.endsWith('.htm')) {
      const rawHtml = await zipEntry.async('text');
      const title = cleanNotionTitle(fileName);
      const blocks = parseHTMLToBlocks(rawHtml);

      const pathParts = relativePath.split('/');
      pathParts.pop();
      const parentPath = pathParts.join('/');

      importedDocs.push({
        title,
        icon: null,
        contentBlocks: blocks,
        relativePath,
        parentPath: parentPath || null,
      });
    }
  }

  importedDocs.sort((a, b) => a.relativePath.split('/').length - b.relativePath.split('/').length);

  return importedDocs;
}

export interface ParsedDatabaseSource {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

/**
 * Detects common delimiters in CSV/TSV text
 */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r\n|\n|\r/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const pipeCount = (firstLine.match(/\|/g) || []).length;

  if (tabCount > commaCount && tabCount > semiCount) return '\t';
  if (semiCount > commaCount && semiCount > tabCount) return ';';
  if (pipeCount > commaCount && pipeCount > tabCount) return '|';
  return ',';
}

/**
 * Parses CSV/TSV text into structured headers and records (RFC 4180 compliant)
 */
export function parseCSVToRecords(csvText: string): ParsedDatabaseSource {
  if (!csvText || !csvText.trim()) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  // Strip BOM if present
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  const delimiter = detectDelimiter(cleanText);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++; // Skip \n
        }
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  // First row is headers
  const rawHeaders = rows[0];
  const headers: string[] = rawHeaders.map((h, idx) => {
    const trimmed = h.trim();
    return trimmed || `Column ${idx + 1}`;
  });

  // Data rows
  const parsedRecords: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    // Skip empty lines
    if (row.length === 1 && !row[0]) continue;
    if (row.every((cell) => !cell)) continue;

    const record: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const headerName = headers[c];
      record[headerName] = (row[c] !== undefined ? row[c] : '').trim();
    }
    parsedRecords.push(record);
  }

  return {
    headers,
    rows: parsedRecords,
    totalRows: parsedRecords.length,
  };
}

/**
 * Parses JSON array or object with items into structured records
 */
export function parseJSONToRecords(jsonText: string): ParsedDatabaseSource {
  if (!jsonText || !jsonText.trim()) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  try {
    let parsed = JSON.parse(jsonText.trim());

    if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
      if (Array.isArray(parsed.data)) parsed = parsed.data;
      else if (Array.isArray(parsed.items)) parsed = parsed.items;
      else if (Array.isArray(parsed.records)) parsed = parsed.records;
      else if (Array.isArray(parsed.rows)) parsed = parsed.rows;
      else {
        parsed = [parsed];
      }
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { headers: [], rows: [], totalRows: 0 };
    }

    const headerSet = new Set<string>();
    parsed.forEach((obj: any) => {
      if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach((k) => headerSet.add(k));
      }
    });

    const headers = Array.from(headerSet);
    const rows: Record<string, string>[] = parsed.map((obj: any) => {
      const row: Record<string, string> = {};
      headers.forEach((h) => {
        const val = obj[h];
        if (val === null || val === undefined) {
          row[h] = '';
        } else if (typeof val === 'object') {
          row[h] = JSON.stringify(val);
        } else {
          row[h] = String(val);
        }
      });
      return row;
    });

    return {
      headers,
      rows,
      totalRows: rows.length,
    };
  } catch (err) {
    console.error('Error parsing JSON for database import:', err);
    return { headers: [], rows: [], totalRows: 0 };
  }
}

/**
 * Automatically infers optimal database property type based on column values and name
 */
export function inferPropertyType(
  values: (string | null | undefined)[],
  headerName?: string
): 'title' | 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url' | 'email' {
  const cleanHeader = (headerName || '').trim().toLowerCase();
  if (['title', 'name', 'item', 'subject', 'task', 'document', 'page'].includes(cleanHeader)) {
    return 'title';
  }

  const nonEmpties = values
    .filter((v): v is string => v !== null && v !== undefined && String(v).trim().length > 0)
    .map((v) => String(v).trim());

  if (nonEmpties.length === 0) return 'text';

  // Checkbox
  const isBool = nonEmpties.every((v) =>
    ['true', 'false', 'yes', 'no', '1', '0', '✓', 'x'].includes(v.toLowerCase())
  );
  if (isBool && (cleanHeader.includes('is_') || cleanHeader.includes('has_') || cleanHeader.includes('done') || cleanHeader.includes('active') || nonEmpties.length > 2)) {
    return 'checkbox';
  }

  // Number
  const isNum = nonEmpties.every((v) => {
    const stripped = v.replace(/[\$,%]/g, '');
    return !isNaN(Number(stripped)) && stripped.length > 0;
  });
  if (isNum) return 'number';

  // URL
  const isUrl = nonEmpties.every((v) => /^https?:\/\/[^\s]+$/i.test(v));
  if (isUrl) return 'url';

  // Email
  const isEmail = nonEmpties.every((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
  if (isEmail) return 'email';

  // Date
  const isDate = nonEmpties.every((v) => {
    if (v.length < 4) return false;
    const d = Date.parse(v);
    return !isNaN(d) && (v.includes('-') || v.includes('/') || v.includes('.'));
  });
  if (isDate) return 'date';

  // Multi-select (contains comma or semicolon within cells)
  const hasDelimiters = nonEmpties.some((v) => v.includes(',') || v.includes(';'));
  if (
    hasDelimiters &&
    (cleanHeader.includes('tag') || cleanHeader.includes('category') || cleanHeader.includes('label') || cleanHeader.includes('skill'))
  ) {
    return 'multi_select';
  }

  // Select (low cardinality unique values relative to row count)
  const uniqueCount = new Set(nonEmpties).size;
  if (uniqueCount <= 12 && uniqueCount < nonEmpties.length * 0.7) {
    return 'select';
  }

  return 'text';
}
