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
 * Trigger custom client-side generation and download of page as PDF (.pdf)
 */
export async function exportPageToPDF(page: ExportablePage, customFilename?: string): Promise<void> {
  const { exportPageToPDFCustom } = await import('./pdfExport');
  return exportPageToPDFCustom(page, customFilename);
}

/**
 * Format any database property value into a clean, human-readable display string for export
 */
export function formatPropertyValueForExport(
  val: any,
  prop: { id: string; name: string; type: string; options?: any[]; config?: any },
  relatedItemsLookup?: Record<string, { title: string }>
): string {
  if (val === null || val === undefined || val === '') return '';

  switch (prop.type) {
    case 'checkbox':
      return val === true || val === 'true' ? 'Yes' : 'No';

    case 'select': {
      if (prop.options && Array.isArray(prop.options)) {
        const opt = prop.options.find((o) => o.id === val || o.value === val);
        if (opt) return opt.value;
      }
      return String(val);
    }

    case 'status': {
      const options = prop.options || prop.config?.options;
      if (options && Array.isArray(options)) {
        const opt = options.find((o: any) => o.id === val || o.value === val);
        if (opt) return opt.value;
      }
      return String(val);
    }

    case 'multi_select': {
      const arr = Array.isArray(val) ? val : typeof val === 'string' ? val.split(',') : [val];
      const labels = arr
        .map((item) => {
          const trimmed = String(item).trim();
          if (prop.options && Array.isArray(prop.options)) {
            const opt = prop.options.find((o) => o.id === trimmed || o.value === trimmed);
            if (opt) return opt.value;
          }
          return trimmed;
        })
        .filter(Boolean);
      return labels.join(', ');
    }

    case 'relation': {
      const ids = Array.isArray(val) ? val : [val];
      const titles = ids
        .map((id) => {
          const strId = String(id).trim();
          if (relatedItemsLookup && relatedItemsLookup[strId]?.title) {
            return relatedItemsLookup[strId].title;
          }
          return strId;
        })
        .filter(Boolean);
      return titles.join(', ');
    }

    case 'date': {
      if (typeof val === 'object' && val !== null) {
        if (val.start && val.end) return `${val.start} -> ${val.end}`;
        if (val.start) return String(val.start);
      }
      return String(val);
    }

    case 'file':
    case 'files': {
      if (Array.isArray(val)) {
        return val
          .map((f: any) => (typeof f === 'string' ? f : f?.name || f?.url || ''))
          .filter(Boolean)
          .join(', ');
      }
      if (typeof val === 'object' && val !== null) {
        return val.name || val.url || '';
      }
      return String(val);
    }

    default:
      if (Array.isArray(val)) return val.join(', ');
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
  }
}

/**
 * Escapes a cell value for standard CSV format
 */
function escapeCSVCell(val: any): string {
  if (val === null || val === undefined) return '';
  let str = '';
  if (Array.isArray(val)) {
    str = val.join(', ');
  } else if (typeof val === 'object') {
    str = JSON.stringify(val);
  } else {
    str = String(val);
  }

  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface ExportDatabaseData {
  database: { title?: string | null; icon?: string | null };
  properties?: any[];
  items?: any[];
  relatedItems?: Record<string, { title: string }>;
}

/**
 * Export full database records, properties, and values to CSV (.csv)
 */
export function exportDatabaseToCSV(
  databaseData: ExportDatabaseData,
  customFilename?: string
) {
  const dbTitle = databaseData.database?.title || 'Untitled Database';
  const properties = [...(databaseData.properties || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const items = [...(databaseData.items || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const relatedLookup = databaseData.relatedItems;

  const titleProp = properties.find((p) => p.type === 'title');
  const nonTitleProps = properties.filter((p) => p.type !== 'title');

  const headers: string[] = [
    titleProp?.name || 'Title',
    ...nonTitleProps.map((p) => p.name || 'Field'),
  ];

  const csvRows: string[] = [headers.map(escapeCSVCell).join(',')];

  for (const item of items) {
    const rowCells: string[] = [];
    const titleVal = item.title || (titleProp ? item.properties?.[titleProp.id] : '') || '';
    rowCells.push(escapeCSVCell(titleVal));

    for (const prop of nonTitleProps) {
      const rawVal = item.properties?.[prop.id];
      const formattedVal = formatPropertyValueForExport(rawVal, prop, relatedLookup);
      rowCells.push(escapeCSVCell(formattedVal));
    }

    csvRows.push(rowCells.join(','));
  }

  const csvContent = csvRows.join('\r\n');
  const filename =
    customFilename ||
    `${dbTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'database'}.csv`;

  // Include UTF-8 BOM so Microsoft Excel and other spreadsheet apps open UTF-8 correctly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
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
 * Export full database records to JSON format (.json)
 */
export function exportDatabaseToJSON(
  databaseData: ExportDatabaseData,
  customFilename?: string
) {
  const dbTitle = databaseData.database?.title || 'Untitled Database';
  const properties = [...(databaseData.properties || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const items = [...(databaseData.items || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const relatedLookup = databaseData.relatedItems;

  const titleProp = properties.find((p) => p.type === 'title');
  const nonTitleProps = properties.filter((p) => p.type !== 'title');

  const formattedRows = items.map((item) => {
    const record: Record<string, any> = {
      title: item.title || (titleProp ? item.properties?.[titleProp.id] : '') || '',
    };
    for (const prop of nonTitleProps) {
      const rawVal = item.properties?.[prop.id];
      const formattedVal = formatPropertyValueForExport(rawVal, prop, relatedLookup);
      record[prop.name || prop.id] = formattedVal;
    }
    return record;
  });

  const jsonPayload = JSON.stringify(formattedRows, null, 2);
  const filename =
    customFilename ||
    `${dbTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'database'}.json`;

  const blob = new Blob([jsonPayload], { type: 'application/json;charset=utf-8;' });
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
 * Export full database to Markdown table (.md)
 */
export function exportDatabaseToMarkdownTable(
  databaseData: ExportDatabaseData,
  customFilename?: string
) {
  const dbTitle = databaseData.database?.title || 'Untitled Database';
  const icon = databaseData.database?.icon || '📊';
  const properties = [...(databaseData.properties || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const items = [...(databaseData.items || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const relatedLookup = databaseData.relatedItems;

  const titleProp = properties.find((p) => p.type === 'title');
  const nonTitleProps = properties.filter((p) => p.type !== 'title');

  const headers: string[] = [
    titleProp?.name || 'Title',
    ...nonTitleProps.map((p) => p.name || 'Field'),
  ];

  let md = `# ${icon ? `${icon} ` : ''}${dbTitle}\n\n`;
  md += `| ${headers.join(' | ')} |\n`;
  md += `| ${headers.map(() => '---').join(' | ')} |\n`;

  for (const item of items) {
    const rowCells: string[] = [];
    const titleVal = item.title || (titleProp ? item.properties?.[titleProp.id] : '') || '';
    rowCells.push(String(titleVal).replace(/\|/g, '\\|').replace(/\n/g, ' '));

    for (const prop of nonTitleProps) {
      const rawVal = item.properties?.[prop.id];
      const displayVal = formatPropertyValueForExport(rawVal, prop, relatedLookup);
      rowCells.push(displayVal.replace(/\|/g, '\\|').replace(/\n/g, ' '));
    }

    md += `| ${rowCells.join(' | ')} |\n`;
  }

  const filename =
    customFilename ||
    `${dbTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'database'}.md`;

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
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
 * Export full database records into a clean, print-ready PDF preview table (.pdf)
 */
export async function exportDatabaseToPDF(
  databaseData: ExportDatabaseData,
  customFilename?: string
): Promise<void> {
  const { exportDatabaseToPDFCustom } = await import('./pdfExport');
  return exportDatabaseToPDFCustom(databaseData, customFilename);
}


