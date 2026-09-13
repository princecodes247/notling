export interface ExportablePage {
  id?: string;
  title: string;
  icon?: string | null;
  content?: any;
  contentText?: string | null;
}

/**
 * Converts inline block content array to Markdown string
 */
function inlineToMarkdown(inlineItems: any[]): string {
  if (!inlineItems || !Array.isArray(inlineItems)) return '';
  let md = '';
  for (const item of inlineItems) {
    if (typeof item === 'string') {
      md += item;
      continue;
    }
    if (item.type === 'text') {
      let text = item.text || '';
      if (item.styles?.code) text = `\`${text}\``;
      if (item.styles?.bold) text = `**${text}**`;
      if (item.styles?.italic) text = `*${text}*`;
      if (item.styles?.strikethrough) text = `~~${text}~~`;
      if (item.styles?.underline) text = `<u>${text}</u>`;
      md += text;
    } else if (item.type === 'link') {
      const linkText = inlineToMarkdown(item.content) || item.href || 'Link';
      md += `[${linkText}](${item.href})`;
    }
  }
  return md;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Converts inline block content array to HTML string
 */
function inlineToHTML(inlineItems: any[]): string {
  if (!inlineItems || !Array.isArray(inlineItems)) return '';
  let html = '';
  for (const item of inlineItems) {
    if (typeof item === 'string') {
      html += escapeHtml(item);
      continue;
    }
    if (item.type === 'text') {
      let text = escapeHtml(item.text || '');
      if (item.styles?.code) text = `<code>${text}</code>`;
      if (item.styles?.bold) text = `<strong>${text}</strong>`;
      if (item.styles?.italic) text = `<em>${text}</em>`;
      if (item.styles?.strikethrough) text = `<del>${text}</del>`;
      if (item.styles?.underline) text = `<u>${text}</u>`;
      if (item.styles?.textColor && item.styles.textColor !== 'default') {
        text = `<span style="color: ${item.styles.textColor}">${text}</span>`;
      }
      html += text;
    } else if (item.type === 'link') {
      const linkText = inlineToHTML(item.content) || item.href || 'Link';
      html += `<a href="${escapeHtml(item.href || '#')}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
    }
  }
  return html;
}

function extractRawTextFromBlock(block: any): string {
  if (!block?.content || !Array.isArray(block.content)) return '';
  return block.content.map((item: any) => item.text || '').join('');
}

/**
 * Converts BlockNote document blocks into Markdown
 */
export function blocksToMarkdown(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) return '';
  const lines: string[] = [];

  for (const block of blocks) {
    const inlineMd = inlineToMarkdown(block.content);

    switch (block.type) {
      case 'heading': {
        const level = block.props?.level || 1;
        const prefix = '#'.repeat(Math.min(Math.max(level, 1), 6));
        lines.push(`${prefix} ${inlineMd}`);
        break;
      }
      case 'paragraph': {
        lines.push(inlineMd);
        break;
      }
      case 'bulletListItem': {
        lines.push(`- ${inlineMd}`);
        break;
      }
      case 'numberedListItem': {
        lines.push(`1. ${inlineMd}`);
        break;
      }
      case 'checkListItem': {
        const checked = block.props?.checked ? '[x]' : '[ ]';
        lines.push(`- ${checked} ${inlineMd}`);
        break;
      }
      case 'codeBlock': {
        const lang = block.props?.language || '';
        const rawText = extractRawTextFromBlock(block);
        lines.push(`\`\`\`${lang}\n${rawText}\n\`\`\``);
        break;
      }
      case 'quote': {
        lines.push(`> ${inlineMd}`);
        break;
      }
      case 'callout': {
        const icon = block.props?.icon || '💡';
        lines.push(`> **${icon}** ${inlineMd}`);
        break;
      }
      case 'image': {
        const url = block.props?.url || '';
        const caption = block.props?.caption || 'Image';
        lines.push(`![${caption}](${url})`);
        break;
      }
      case 'video': {
        const url = block.props?.url || '';
        lines.push(`[Video](${url})`);
        break;
      }
      case 'file': {
        const url = block.props?.url || '';
        lines.push(`[File](${url})`);
        break;
      }
      case 'divider': {
        lines.push('---');
        break;
      }
      default: {
        if (inlineMd) lines.push(inlineMd);
        break;
      }
    }

    if (block.children && Array.isArray(block.children) && block.children.length > 0) {
      const childMd = blocksToMarkdown(block.children);
      const indented = childMd.split('\n').map((l) => (l ? `  ${l}` : '')).join('\n');
      lines.push(indented);
    }
  }

  return lines.join('\n\n');
}

/**
 * Converts BlockNote document blocks into printable HTML
 */
export function blocksToHTML(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) return '';
  let html = '';

  for (const block of blocks) {
    const inlineHtml = inlineToHTML(block.content);

    switch (block.type) {
      case 'heading': {
        const level = block.props?.level || 1;
        const tag = `h${Math.min(Math.max(level, 1), 6)}`;
        html += `<${tag}>${inlineHtml}</${tag}>`;
        break;
      }
      case 'paragraph': {
        html += `<p>${inlineHtml || '&nbsp;'}</p>`;
        break;
      }
      case 'bulletListItem': {
        html += `<ul><li>${inlineHtml}</li></ul>`;
        break;
      }
      case 'numberedListItem': {
        html += `<ol><li>${inlineHtml}</li></ol>`;
        break;
      }
      case 'checkListItem': {
        const checked = block.props?.checked;
        const checkIcon = checked
          ? '<span style="color: #10b981; font-weight: bold;">☑</span>'
          : '<span style="color: #a8a29e;">☐</span>';
        html += `<div class="checkbox-item">${checkIcon} <span>${inlineHtml}</span></div>`;
        break;
      }
      case 'codeBlock': {
        const lang = block.props?.language || '';
        const rawText = escapeHtml(extractRawTextFromBlock(block));
        html += `<pre><code class="language-${lang}">${rawText}</code></pre>`;
        break;
      }
      case 'quote': {
        html += `<blockquote>${inlineHtml}</blockquote>`;
        break;
      }
      case 'callout': {
        const icon = block.props?.icon || '💡';
        html += `<div class="callout"><span>${icon}</span><div>${inlineHtml}</div></div>`;
        break;
      }
      case 'image': {
        const url = block.props?.url || '';
        const caption = block.props?.caption || '';
        html += `<div class="image-wrapper"><img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}" />${caption ? `<div class="caption">${escapeHtml(caption)}</div>` : ''}</div>`;
        break;
      }
      case 'divider': {
        html += `<hr style="border: none; border-top: 1px solid #e7e5e4; margin: 20px 0;" />`;
        break;
      }
      default: {
        if (inlineHtml) html += `<p>${inlineHtml}</p>`;
        break;
      }
    }

    if (block.children && Array.isArray(block.children) && block.children.length > 0) {
      html += `<div style="padding-left: 20px;">${blocksToHTML(block.children)}</div>`;
    }
  }

  return html;
}

/**
 * Trigger browser file download of page content in Markdown format (.md)
 */
export function exportPageToMarkdown(page: ExportablePage, customFilename?: string) {
  const pageTitle = page.title || 'Untitled Document';
  const header = `# ${page.icon ? `${page.icon} ` : ''}${pageTitle}\n\n`;

  let body = '';
  if (Array.isArray(page.content) && page.content.length > 0) {
    body = blocksToMarkdown(page.content);
  } else if (typeof page.content === 'string') {
    body = page.content;
  } else if (page.contentText) {
    body = page.contentText;
  }

  const fullMarkdown = header + body;
  const filename = customFilename || `${pageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'document'}.md`;

  const blob = new Blob([fullMarkdown], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Trigger print dialog to save page content as PDF document (.pdf)
 */
export function exportPageToPDF(page: ExportablePage) {
  const pageTitle = page.title || 'Untitled Document';
  const icon = page.icon || '';

  let bodyHtml = '';
  if (Array.isArray(page.content) && page.content.length > 0) {
    bodyHtml = blocksToHTML(page.content);
  } else if (typeof page.content === 'string') {
    bodyHtml = `<p>${escapeHtml(page.content)}</p>`;
  } else if (page.contentText) {
    bodyHtml = `<p>${escapeHtml(page.contentText)}</p>`;
  } else {
    bodyHtml = '<p style="color: #78716c; font-style: italic;">Empty document.</p>';
  }

  const printDocumentHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(pageTitle)}</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 20mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1c1917;
      line-height: 1.65;
      font-size: 13.5px;
      margin: 0;
      padding: 32px;
      background: #ffffff;
    }
    .header-container {
      margin-bottom: 28px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e7e5e4;
    }
    .page-icon {
      font-size: 32px;
      margin-bottom: 8px;
      display: block;
    }
    .page-title {
      font-size: 26px;
      font-weight: 700;
      color: #0c0a09;
      margin: 0;
      letter-spacing: -0.02em;
    }
    h1 { font-size: 20px; font-weight: 700; margin-top: 24px; margin-bottom: 10px; color: #0c0a09; page-break-after: avoid; }
    h2 { font-size: 16px; font-weight: 600; margin-top: 20px; margin-bottom: 8px; color: #1c1917; page-break-after: avoid; }
    h3 { font-size: 14px; font-weight: 600; margin-top: 16px; margin-bottom: 6px; color: #292524; page-break-after: avoid; }
    p { margin-top: 0; margin-bottom: 12px; color: #292524; }
    ul, ol { margin-top: 0; margin-bottom: 12px; padding-left: 22px; }
    li { margin-bottom: 4px; }
    blockquote {
      margin: 14px 0;
      padding: 10px 18px;
      border-left: 3.5px solid #a8a29e;
      background-color: #f5f5f4;
      color: #44403c;
      font-style: italic;
      border-radius: 0 6px 6px 0;
    }
    pre {
      background-color: #1c1917;
      color: #f5f5f4;
      padding: 14px 18px;
      border-radius: 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
      margin: 14px 0;
      page-break-inside: avoid;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background-color: #f5f5f4;
      color: #292524;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 88%;
      border: 1px solid #e7e5e4;
    }
    pre code {
      background-color: transparent;
      color: inherit;
      padding: 0;
      border: none;
      font-size: 100%;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 14px 0;
      page-break-inside: avoid;
      border: 1px solid #e7e5e4;
    }
    .image-wrapper .caption {
      font-size: 11px;
      color: #78716c;
      text-align: center;
      margin-top: 4px;
    }
    .callout {
      background: #fafaf9;
      border: 1px solid #e7e5e4;
      border-radius: 8px;
      padding: 12px 16px;
      margin: 14px 0;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      page-break-inside: avoid;
    }
    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    a {
      color: #2563eb;
      text-decoration: underline;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header-container">
    ${icon ? `<span class="page-icon">${icon}</span>` : ''}
    <h1 class="page-title">${escapeHtml(pageTitle)}</h1>
  </div>
  <div class="content">${bodyHtml}</div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(printDocumentHtml);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('Print trigger failed:', err);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }
  }, 300);
}
