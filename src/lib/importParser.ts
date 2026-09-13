import JSZip from 'jszip';

export interface ImportedDoc {
  id?: string;
  title: string;
  icon?: string;
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
        icon: '📄',
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
        icon: '📄',
        contentBlocks: blocks,
        relativePath,
        parentPath: parentPath || null,
      });
    }
  }

  importedDocs.sort((a, b) => a.relativePath.split('/').length - b.relativePath.split('/').length);

  return importedDocs;
}
