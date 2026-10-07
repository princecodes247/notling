import { jsPDF } from 'jspdf';
import type { ExportablePage, ExportDatabaseData } from './pageExport';
import { formatPropertyValueForExport } from './pageExport';

interface BlockInlineItem {
  type?: string;
  text?: string;
  styles?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    textColor?: string;
    backgroundColor?: string;
  };
  content?: BlockInlineItem[];
  href?: string;
}

interface BlockNode {
  id?: string;
  type?: string;
  props?: Record<string, any>;
  content?: BlockInlineItem[] | string;
  children?: BlockNode[];
}

/**
 * Extracts plain text from inline items or string content
 */
function extractPlainText(content: any): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  let text = '';
  for (const item of content) {
    if (typeof item === 'string') {
      text += item;
    } else if (item?.text) {
      text += item.text;
    } else if (item?.content) {
      text += extractPlainText(item.content);
    }
  }
  return text;
}

/**
 * Attempt to fetch an image and convert it into a base64 data URL for embedding in PDF
 */
async function fetchImageAsBase64(
  url: string,
  timeoutMs = 4000
): Promise<{ dataUrl: string; width: number; height: number; format: string } | null> {
  if (!url || typeof window === 'undefined') return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      signal: controller.signal,
      mode: 'cors',
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const blob = await res.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          let format = 'JPEG';
          if (blob.type.includes('png')) format = 'PNG';
          else if (blob.type.includes('webp')) format = 'WEBP';
          resolve({
            dataUrl,
            width: img.naturalWidth || 400,
            height: img.naturalHeight || 300,
            format,
          });
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Custom PDF Generation Engine for Notling Pages
 */
export class PagePDFBuilder {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private marginLeft = 48;
  private marginRight = 48;
  private marginTop = 54;
  private marginBottom = 50;
  private contentWidth: number;
  private currentY: number;
  private pageTitle: string;
  private pageIcon?: string | null;

  constructor(title: string, icon?: string | null) {
    // Standard A4 portrait: 595.28 x 841.89 pt
    this.doc = new jsPDF({
      unit: 'pt',
      format: 'a4',
      orientation: 'portrait',
    });

    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - this.marginLeft - this.marginRight;
    this.currentY = this.marginTop;
    this.pageTitle = title || 'Untitled Document';
    this.pageIcon = icon;
  }

  private checkPageBreak(neededHeight: number) {
    if (this.currentY + neededHeight > this.pageHeight - this.marginBottom) {
      this.doc.addPage();
      this.currentY = this.marginTop;
    }
  }

  /**
   * Render top cover / title banner
   */
  public renderCoverHeader() {
    this.checkPageBreak(70);

    // Page Icon (if emoji / character)
    if (this.pageIcon) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(24);
      this.doc.setTextColor(17, 24, 39); // #111827
      this.doc.text(this.pageIcon, this.marginLeft, this.currentY + 18);
      this.currentY += 28;
    }

    // Page Title
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(22);
    this.doc.setTextColor(15, 23, 42); // #0f172a

    const titleLines = this.doc.splitTextToSize(this.pageTitle, this.contentWidth);
    for (const line of titleLines) {
      this.checkPageBreak(28);
      this.doc.text(line, this.marginLeft, this.currentY + 18);
      this.currentY += 26;
    }

    // Document Metadata Subheader
    const exportDateStr = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(100, 116, 139); // slate-500
    this.doc.text(`Exported from Notling • ${exportDateStr}`, this.marginLeft, this.currentY + 6);
    this.currentY += 16;

    // Header Divider Line
    this.doc.setDrawColor(226, 232, 240); // slate-200
    this.doc.setLineWidth(1);
    this.doc.line(this.marginLeft, this.currentY, this.pageWidth - this.marginRight, this.currentY);
    this.currentY += 18;
  }

  /**
   * Render Heading Block
   */
  public renderHeading(level: number, text: string, indent = 0) {
    if (!text.trim()) return;

    let fontSize = 16;
    let lineHeight = 20;
    let spaceBefore = 14;
    let spaceAfter = 6;
    let textColor = [15, 23, 42]; // slate-900

    if (level === 2) {
      fontSize = 13;
      lineHeight = 17;
      spaceBefore = 12;
      spaceAfter = 5;
      textColor = [30, 41, 59]; // slate-800
    } else if (level >= 3) {
      fontSize = 11;
      lineHeight = 15;
      spaceBefore = 10;
      spaceAfter = 4;
      textColor = [51, 65, 85]; // slate-700
    }

    this.currentY += spaceBefore;
    // Check page break: ensure space for heading + first line of next content to prevent orphan headers
    this.checkPageBreak(lineHeight * 2 + spaceAfter);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    const maxW = this.contentWidth - indent;
    const lines = this.doc.splitTextToSize(text, maxW);

    for (const line of lines) {
      this.checkPageBreak(lineHeight);
      this.doc.text(line, this.marginLeft + indent, this.currentY + fontSize * 0.85);
      this.currentY += lineHeight;
    }

    this.currentY += spaceAfter;
  }

  /**
   * Render Standard Paragraph Block
   */
  public renderParagraph(text: string, indent = 0) {
    if (!text.trim()) {
      this.currentY += 6;
      return;
    }

    const fontSize = 9.5;
    const lineHeight = 14;
    const maxW = this.contentWidth - indent;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(51, 65, 85); // slate-700

    const lines = this.doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      this.checkPageBreak(lineHeight);
      this.doc.text(line, this.marginLeft + indent, this.currentY + fontSize * 0.85);
      this.currentY += lineHeight;
    }

    this.currentY += 4;
  }

  /**
   * Render Bullet List Item
   */
  public renderBulletItem(text: string, indent = 0) {
    const fontSize = 9.5;
    const lineHeight = 14;
    const bulletOffset = 12;
    const maxW = this.contentWidth - indent - bulletOffset;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(51, 65, 85);

    const lines = this.doc.splitTextToSize(text, maxW);
    if (lines.length === 0) return;

    this.checkPageBreak(lineHeight);

    // Draw bullet dot
    this.doc.setFillColor(100, 116, 139); // slate-500
    this.doc.circle(this.marginLeft + indent + 4, this.currentY + 5.5, 1.8, 'F');

    // Draw lines
    for (const line of lines) {
      this.checkPageBreak(lineHeight);
      this.doc.text(line, this.marginLeft + indent + bulletOffset, this.currentY + fontSize * 0.85);
      this.currentY += lineHeight;
    }
    this.currentY += 2;
  }

  /**
   * Render Numbered List Item
   */
  public renderNumberedItem(numberIndex: number, text: string, indent = 0) {
    const fontSize = 9.5;
    const lineHeight = 14;
    const prefix = `${numberIndex}.`;
    const numOffset = prefix.length > 2 ? 18 : 14;
    const maxW = this.contentWidth - indent - numOffset;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(51, 65, 85);

    const lines = this.doc.splitTextToSize(text, maxW);
    if (lines.length === 0) return;

    this.checkPageBreak(lineHeight);

    // Draw number label
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(71, 85, 105);
    this.doc.text(prefix, this.marginLeft + indent, this.currentY + fontSize * 0.85);

    // Draw lines
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(51, 65, 85);
    for (const line of lines) {
      this.checkPageBreak(lineHeight);
      this.doc.text(line, this.marginLeft + indent + numOffset, this.currentY + fontSize * 0.85);
      this.currentY += lineHeight;
    }
    this.currentY += 2;
  }

  /**
   * Render Interactive Checkbox / Task Item
   */
  public renderChecklistItem(checked: boolean, text: string, indent = 0) {
    const fontSize = 9.5;
    const lineHeight = 14;
    const boxOffset = 16;
    const maxW = this.contentWidth - indent - boxOffset;

    const lines = this.doc.splitTextToSize(text, maxW);
    if (lines.length === 0) return;

    this.checkPageBreak(lineHeight);

    const boxX = this.marginLeft + indent;
    const boxY = this.currentY + 1.5;
    const boxSize = 9;

    if (checked) {
      // Checked box
      this.doc.setFillColor(16, 185, 129); // emerald-500
      this.doc.roundedRect(boxX, boxY, boxSize, boxSize, 2, 2, 'F');

      // Checkmark check lines
      this.doc.setDrawColor(255, 255, 255);
      this.doc.setLineWidth(1.2);
      this.doc.line(boxX + 2.2, boxY + 4.5, boxX + 4, boxY + 6.8);
      this.doc.line(boxX + 4, boxY + 6.8, boxX + 7.2, boxY + 2.4);

      // Text (muted color & optional strikethrough)
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(fontSize);
      this.doc.setTextColor(148, 163, 184); // slate-400
    } else {
      // Unchecked box
      this.doc.setDrawColor(148, 163, 184); // slate-400
      this.doc.setLineWidth(1);
      this.doc.roundedRect(boxX, boxY, boxSize, boxSize, 2, 2, 'S');

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(fontSize);
      this.doc.setTextColor(51, 65, 85);
    }

    for (const line of lines) {
      this.checkPageBreak(lineHeight);
      this.doc.text(line, this.marginLeft + indent + boxOffset, this.currentY + fontSize * 0.85);

      if (checked) {
        // Subtle strikethrough line
        const textWidth = this.doc.getTextWidth(line);
        this.doc.setDrawColor(148, 163, 184);
        this.doc.setLineWidth(0.7);
        this.doc.line(
          this.marginLeft + indent + boxOffset,
          this.currentY + fontSize * 0.5,
          this.marginLeft + indent + boxOffset + textWidth,
          this.currentY + fontSize * 0.5
        );
      }

      this.currentY += lineHeight;
    }

    this.currentY += 2;
  }

  /**
   * Render Blockquote Block
   */
  public renderQuote(text: string, indent = 0) {
    if (!text.trim()) return;

    const fontSize = 9.5;
    const lineHeight = 14;
    const quotePaddingX = 12;
    const maxW = this.contentWidth - indent - quotePaddingX - 6;

    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(fontSize);
    const lines = this.doc.splitTextToSize(text, maxW);

    const totalHeight = lines.length * lineHeight + 12;
    this.checkPageBreak(totalHeight);

    const boxX = this.marginLeft + indent;
    const boxY = this.currentY;

    // Background tint
    this.doc.setFillColor(248, 250, 252); // slate-50
    this.doc.rect(boxX, boxY, this.contentWidth - indent, totalHeight, 'F');

    // Left accent bar
    this.doc.setFillColor(148, 163, 184); // slate-400
    this.doc.rect(boxX, boxY, 3.5, totalHeight, 'F');

    // Text content
    this.doc.setTextColor(71, 85, 105); // slate-600
    let textY = boxY + 6;
    for (const line of lines) {
      this.doc.text(line, boxX + quotePaddingX, textY + fontSize * 0.85);
      textY += lineHeight;
    }

    this.currentY += totalHeight + 6;
  }

  /**
   * Render Callout Box Block
   */
  public renderCallout(icon: string, text: string, indent = 0) {
    const fontSize = 9.5;
    const lineHeight = 14;
    const iconOffset = 22;
    const padding = 10;
    const maxW = this.contentWidth - indent - iconOffset - padding * 2;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(fontSize);
    const lines = this.doc.splitTextToSize(text || 'Callout note', maxW);

    const totalHeight = Math.max(lines.length * lineHeight + padding * 2, 34);
    this.checkPageBreak(totalHeight);

    const boxX = this.marginLeft + indent;
    const boxY = this.currentY;
    const boxW = this.contentWidth - indent;

    // Callout Box Background & Border
    this.doc.setFillColor(248, 250, 252); // slate-50
    this.doc.setDrawColor(226, 232, 240); // slate-200
    this.doc.setLineWidth(1);
    this.doc.roundedRect(boxX, boxY, boxW, totalHeight, 4, 4, 'FD');

    // Callout Icon
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(13);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(icon || '💡', boxX + padding, boxY + padding + 10);

    // Callout Text
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(51, 65, 85);

    let textY = boxY + padding;
    for (const line of lines) {
      this.doc.text(line, boxX + padding + iconOffset, textY + fontSize * 0.85);
      textY += lineHeight;
    }

    this.currentY += totalHeight + 8;
  }

  /**
   * Render Code Block
   */
  public renderCodeBlock(language: string, code: string, indent = 0) {
    const rawLines = (code || '').split('\n');
    const fontSize = 8.5;
    const lineHeight = 12.5;
    const padding = 10;
    const maxW = this.contentWidth - indent - padding * 2;

    this.doc.setFont('courier', 'normal');
    this.doc.setFontSize(fontSize);

    // Split wrapped lines
    const wrappedLines: string[] = [];
    for (const rLine of rawLines) {
      if (rLine.length === 0) {
        wrappedLines.push('');
      } else {
        const splits = this.doc.splitTextToSize(rLine, maxW);
        wrappedLines.push(...splits);
      }
    }

    const headerHeight = language ? 16 : 0;
    const totalHeight = wrappedLines.length * lineHeight + padding * 2 + headerHeight;

    // If fits on page, render contiguous block, otherwise split cleanly across pages
    this.checkPageBreak(Math.min(totalHeight, 120));

    const boxX = this.marginLeft + indent;
    const boxW = this.contentWidth - indent;

    let lineIndex = 0;
    while (lineIndex < wrappedLines.length) {
      const spaceOnPage = this.pageHeight - this.marginBottom - this.currentY;
      const linesCanFit = Math.max(1, Math.floor((spaceOnPage - padding * 2 - (lineIndex === 0 ? headerHeight : 0)) / lineHeight));
      const chunkLines = wrappedLines.slice(lineIndex, lineIndex + linesCanFit);
      const chunkHeight = chunkLines.length * lineHeight + padding * 2 + (lineIndex === 0 ? headerHeight : 0);

      // Background rect
      this.doc.setFillColor(15, 23, 42); // slate-900
      this.doc.roundedRect(boxX, this.currentY, boxW, chunkHeight, 4, 4, 'F');

      let innerY = this.currentY + padding;

      // Language label on first chunk
      if (lineIndex === 0 && language) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(7.5);
        this.doc.setTextColor(148, 163, 184); // slate-400
        this.doc.text(language.toUpperCase(), boxX + boxW - padding - this.doc.getTextWidth(language.toUpperCase()), innerY + 6);
        innerY += headerHeight;
      }

      // Render Code Lines
      this.doc.setFont('courier', 'normal');
      this.doc.setFontSize(fontSize);
      this.doc.setTextColor(248, 250, 252); // slate-50

      for (const line of chunkLines) {
        this.doc.text(line, boxX + padding, innerY + fontSize * 0.85);
        innerY += lineHeight;
      }

      this.currentY += chunkHeight + 4;
      lineIndex += chunkLines.length;

      if (lineIndex < wrappedLines.length) {
        this.doc.addPage();
        this.currentY = this.marginTop;
      }
    }

    this.currentY += 4;
  }

  /**
   * Render Divider Line
   */
  public renderDivider(indent = 0) {
    this.checkPageBreak(16);
    this.currentY += 6;

    this.doc.setDrawColor(226, 232, 240); // slate-200
    this.doc.setLineWidth(1);
    this.doc.line(
      this.marginLeft + indent,
      this.currentY,
      this.pageWidth - this.marginRight,
      this.currentY
    );

    this.currentY += 12;
  }

  /**
   * Render Image Block
   */
  public async renderImage(url: string, caption?: string, indent = 0) {
    if (!url) return;

    const base64Data = await fetchImageAsBase64(url);
    const boxW = this.contentWidth - indent;

    if (base64Data) {
      const aspectRatio = base64Data.height / (base64Data.width || 1);
      const targetW = Math.min(boxW, 440);
      const targetH = Math.min(targetW * aspectRatio, 280);

      this.checkPageBreak(targetH + (caption ? 24 : 12));

      try {
        const imgX = this.marginLeft + indent + (boxW - targetW) / 2;
        this.doc.addImage(
          base64Data.dataUrl,
          base64Data.format,
          imgX,
          this.currentY,
          targetW,
          targetH,
          undefined,
          'FAST'
        );
        this.currentY += targetH + 4;
      } catch (err) {
        console.warn('Could not render image to PDF:', err);
      }
    } else {
      // Fallback placeholder card for images that could not be fetched due to CORS or offline
      this.checkPageBreak(40);
      this.doc.setFillColor(248, 250, 252);
      this.doc.setDrawColor(226, 232, 240);
      this.doc.roundedRect(this.marginLeft + indent, this.currentY, boxW, 36, 4, 4, 'FD');

      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(8.5);
      this.doc.setTextColor(148, 163, 184);
      this.doc.text(`[Image: ${caption || url}]`, this.marginLeft + indent + 12, this.currentY + 22);
      this.currentY += 42;
    }

    if (caption) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(100, 116, 139);
      const capWidth = this.doc.getTextWidth(caption);
      const capX = Math.max(this.marginLeft + indent, this.marginLeft + indent + (boxW - capWidth) / 2);
      this.doc.text(caption, capX, this.currentY + 6);
      this.currentY += 12;
    } else {
      this.currentY += 6;
    }
  }

  /**
   * Recursively process blocks array
   */
  public async processBlocks(blocks: BlockNode[], indent = 0) {
    if (!Array.isArray(blocks)) return;

    let numberedIndex = 1;

    for (const block of blocks) {
      const type = block.type || 'paragraph';
      const text = extractPlainText(block.content);

      if (type !== 'numberedListItem') {
        numberedIndex = 1;
      }

      switch (type) {
        case 'heading': {
          const level = block.props?.level || 1;
          this.renderHeading(level, text, indent);
          break;
        }
        case 'paragraph': {
          this.renderParagraph(text, indent);
          break;
        }
        case 'bulletListItem': {
          this.renderBulletItem(text, indent);
          break;
        }
        case 'numberedListItem': {
          this.renderNumberedItem(numberedIndex, text, indent);
          numberedIndex++;
          break;
        }
        case 'checkListItem': {
          const checked = Boolean(block.props?.checked);
          this.renderChecklistItem(checked, text, indent);
          break;
        }
        case 'quote': {
          this.renderQuote(text, indent);
          break;
        }
        case 'callout': {
          const icon = block.props?.icon || '💡';
          this.renderCallout(icon, text, indent);
          break;
        }
        case 'codeBlock': {
          const lang = block.props?.language || '';
          this.renderCodeBlock(lang, text, indent);
          break;
        }
        case 'divider': {
          this.renderDivider(indent);
          break;
        }
        case 'image': {
          const url = block.props?.url || '';
          const caption = block.props?.caption || '';
          await this.renderImage(url, caption, indent);
          break;
        }
        default: {
          if (text) {
            this.renderParagraph(text, indent);
          }
          break;
        }
      }

      // Process nested children
      if (block.children && Array.isArray(block.children) && block.children.length > 0) {
        await this.processBlocks(block.children, indent + 16);
      }
    }
  }

  /**
   * Decorate all pages with headers, footers, and page numbers
   */
  public finalizeDocument() {
    const totalPages = this.doc.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);

      // Running top header on subsequent pages (page 2+)
      if (i > 1) {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(8);
        this.doc.setTextColor(148, 163, 184); // slate-400
        const headerTitle = this.pageTitle.length > 45 ? `${this.pageTitle.slice(0, 45)}...` : this.pageTitle;
        this.doc.text(headerTitle, this.marginLeft, 32);

        // Header thin divider
        this.doc.setDrawColor(241, 245, 249);
        this.doc.setLineWidth(0.5);
        this.doc.line(this.marginLeft, 38, this.pageWidth - this.marginRight, 38);
      }

      // Running Bottom Footer (on all pages)
      const footerY = this.pageHeight - 24;

      // Top line of footer
      this.doc.setDrawColor(241, 245, 249);
      this.doc.setLineWidth(0.5);
      this.doc.line(this.marginLeft, footerY - 8, this.pageWidth - this.marginRight, footerY - 8);

      // Left footer brand
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(148, 163, 184);
      this.doc.text('Notling', this.marginLeft, footerY + 2);

      // Right footer page number
      const pageStr = `Page ${i} of ${totalPages}`;
      const pageStrWidth = this.doc.getTextWidth(pageStr);
      this.doc.text(pageStr, this.pageWidth - this.marginRight - pageStrWidth, footerY + 2);
    }
  }

  /**
   * Save and download generated PDF document
   */
  public download(filename: string) {
    this.finalizeDocument();
    this.doc.save(filename);
  }
}

/**
 * Custom PDF Generation Engine for Databases (Landscape Tables)
 */
export class DatabasePDFBuilder {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private marginLeft = 36;
  private marginRight = 36;
  private marginTop = 42;
  private marginBottom = 40;
  private contentWidth: number;
  private currentY: number;
  private dbTitle: string;
  private dbIcon?: string | null;

  constructor(title: string, icon?: string | null) {
    // Landscape A4: 841.89 x 595.28 pt
    this.doc = new jsPDF({
      unit: 'pt',
      format: 'a4',
      orientation: 'landscape',
    });

    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - this.marginLeft - this.marginRight;
    this.currentY = this.marginTop;
    this.dbTitle = title || 'Untitled Database';
    this.dbIcon = icon;
  }

  private checkPageBreak(neededHeight: number) {
    if (this.currentY + neededHeight > this.pageHeight - this.marginBottom) {
      this.doc.addPage();
      this.currentY = this.marginTop;
      return true;
    }
    return false;
  }

  public renderDatabaseHeader(totalRecords: number) {
    // Icon and Title
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(18);
    this.doc.setTextColor(15, 23, 42);

    const titleText = `${this.dbIcon ? `${this.dbIcon} ` : ''}${this.dbTitle}`;
    this.doc.text(titleText, this.marginLeft, this.currentY + 14);

    // Records badge and export date
    const exportDateStr = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(100, 116, 139);
    const metaStr = `${totalRecords} records • Exported ${exportDateStr}`;
    const metaWidth = this.doc.getTextWidth(metaStr);
    this.doc.text(metaStr, this.pageWidth - this.marginRight - metaWidth, this.currentY + 14);

    this.currentY += 26;

    // Header line
    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(1);
    this.doc.line(this.marginLeft, this.currentY, this.pageWidth - this.marginRight, this.currentY);
    this.currentY += 12;
  }

  public renderTable(
    properties: any[],
    items: any[],
    relatedLookup?: Record<string, { title: string }>
  ) {
    const sortedProps = [...properties].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const titleProp = sortedProps.find((p) => p.type === 'title');
    const nonTitleProps = sortedProps.filter((p) => p.type !== 'title');
    const allProps = titleProp ? [titleProp, ...nonTitleProps] : nonTitleProps;

    const columnCount = Math.max(1, allProps.length);

    // Calculate column widths proportional to content
    const baseColWidth = this.contentWidth / columnCount;
    // Give title column slightly more width
    const titleColWidth = Math.max(baseColWidth * 1.3, 110);
    const remainingWidth = this.contentWidth - (titleProp ? titleColWidth : 0);
    const otherColWidth = nonTitleProps.length > 0 ? remainingWidth / nonTitleProps.length : baseColWidth;

    const colWidths = allProps.map((p) => (p.type === 'title' ? titleColWidth : otherColWidth));

    const drawTableHeader = () => {
      const headerHeight = 22;
      this.doc.setFillColor(241, 245, 249); // slate-100
      this.doc.rect(this.marginLeft, this.currentY, this.contentWidth, headerHeight, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8.5);
      this.doc.setTextColor(51, 65, 85); // slate-700

      let colX = this.marginLeft;
      for (let i = 0; i < allProps.length; i++) {
        const prop = allProps[i];
        const w = colWidths[i];
        const colName = (prop.name || 'Column').toUpperCase();
        const truncated = this.doc.splitTextToSize(colName, w - 10)[0] || colName;
        this.doc.text(truncated, colX + 6, this.currentY + 14);

        // Header column border
        this.doc.setDrawColor(226, 232, 240);
        this.doc.setLineWidth(0.5);
        this.doc.line(colX + w, this.currentY, colX + w, this.currentY + headerHeight);

        colX += w;
      }

      // Outer border
      this.doc.setDrawColor(203, 213, 225);
      this.doc.rect(this.marginLeft, this.currentY, this.contentWidth, headerHeight, 'S');

      this.currentY += headerHeight;
    };

    drawTableHeader();

    // Render Rows
    for (let rIdx = 0; rIdx < items.length; rIdx++) {
      const item = items[rIdx];

      // Prepare cell contents
      const cellTexts: string[] = [];
      for (const prop of allProps) {
        if (prop.type === 'title') {
          const titleVal = item.title || (titleProp ? item.properties?.[titleProp.id] : '') || '';
          cellTexts.push(String(titleVal));
        } else {
          const rawVal = item.properties?.[prop.id];
          const displayVal = formatPropertyValueForExport(rawVal, prop, relatedLookup);
          cellTexts.push(displayVal);
        }
      }

      // Calculate row height based on tallest cell
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      let maxLines = 1;
      const cellLinesArray: string[][] = [];

      for (let cIdx = 0; cIdx < allProps.length; cIdx++) {
        const w = colWidths[cIdx];
        const text = cellTexts[cIdx] || '';
        const lines = this.doc.splitTextToSize(text, w - 12);
        const count = Math.min(lines.length || 1, 4); // Max 4 lines per cell
        if (count > maxLines) maxLines = count;
        cellLinesArray.push(lines.slice(0, 4));
      }

      const rowHeight = Math.max(18, maxLines * 11 + 8);

      if (this.checkPageBreak(rowHeight + 20)) {
        drawTableHeader();
      }

      // Row background
      if (rIdx % 2 === 1) {
        this.doc.setFillColor(250, 250, 250);
        this.doc.rect(this.marginLeft, this.currentY, this.contentWidth, rowHeight, 'F');
      }

      // Render cell contents
      let colX = this.marginLeft;
      for (let cIdx = 0; cIdx < allProps.length; cIdx++) {
        const prop = allProps[cIdx];
        const w = colWidths[cIdx];
        const lines = cellLinesArray[cIdx];

        if (prop.type === 'title') {
          this.doc.setFont('helvetica', 'bold');
          this.doc.setTextColor(15, 23, 42);
        } else if (prop.type === 'checkbox') {
          this.doc.setFont('helvetica', 'normal');
          const isCheck = cellTexts[cIdx] === 'Yes';
          this.doc.setTextColor(isCheck ? 16 : 148, isCheck ? 185 : 163, isCheck ? 129 : 184);
        } else {
          this.doc.setFont('helvetica', 'normal');
          this.doc.setTextColor(71, 85, 105);
        }

        let lineY = this.currentY + 11;
        for (const line of lines) {
          this.doc.text(line, colX + 6, lineY);
          lineY += 11;
        }

        // Cell right border
        this.doc.setDrawColor(241, 245, 249);
        this.doc.setLineWidth(0.5);
        this.doc.line(colX + w, this.currentY, colX + w, this.currentY + rowHeight);

        colX += w;
      }

      // Bottom row line
      this.doc.setDrawColor(226, 232, 240);
      this.doc.setLineWidth(0.5);
      this.doc.line(this.marginLeft, this.currentY + rowHeight, this.pageWidth - this.marginRight, this.currentY + rowHeight);

      this.currentY += rowHeight;
    }
  }

  public finalizeDocument() {
    const totalPages = this.doc.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);

      // Running Bottom Footer
      const footerY = this.pageHeight - 20;

      this.doc.setDrawColor(226, 232, 240);
      this.doc.setLineWidth(0.5);
      this.doc.line(this.marginLeft, footerY - 6, this.pageWidth - this.marginRight, footerY - 6);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(148, 163, 184);
      this.doc.text(`Notling Database Export • ${this.dbTitle}`, this.marginLeft, footerY + 4);

      const pageStr = `Page ${i} of ${totalPages}`;
      const pageStrWidth = this.doc.getTextWidth(pageStr);
      this.doc.text(pageStr, this.pageWidth - this.marginRight - pageStrWidth, footerY + 4);
    }
  }

  public download(filename: string) {
    this.finalizeDocument();
    this.doc.save(filename);
  }
}

/**
 * Custom export implementation: Generates and downloads a high-quality PDF document (.pdf)
 */
export async function exportPageToPDFCustom(page: ExportablePage, customFilename?: string): Promise<void> {
  const pageTitle = page.title || 'Untitled Document';
  const icon = page.icon || null;

  const builder = new PagePDFBuilder(pageTitle, icon);
  builder.renderCoverHeader();

  if (Array.isArray(page.content) && page.content.length > 0) {
    await builder.processBlocks(page.content);
  } else if (typeof page.content === 'string' && page.content.trim()) {
    builder.renderParagraph(page.content);
  } else if (page.contentText && page.contentText.trim()) {
    builder.renderParagraph(page.contentText);
  } else {
    builder.renderParagraph('Empty document.');
  }

  const cleanName =
    pageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'document';
  const filename = customFilename || `${cleanName}.pdf`;

  builder.download(filename);
}

/**
 * Custom export implementation: Generates and downloads a print-ready Database PDF table (.pdf)
 */
export async function exportDatabaseToPDFCustom(
  databaseData: ExportDatabaseData,
  customFilename?: string
): Promise<void> {
  const dbTitle = databaseData.database?.title || 'Untitled Database';
  const icon = databaseData.database?.icon || '📊';

  const properties = databaseData.properties || [];
  const items = databaseData.items || [];
  const relatedLookup = databaseData.relatedItems;

  const builder = new DatabasePDFBuilder(dbTitle, icon);
  builder.renderDatabaseHeader(items.length);
  builder.renderTable(properties, items, relatedLookup);

  const cleanName =
    dbTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'database';
  const filename = customFilename || `${cleanName}.pdf`;

  builder.download(filename);
}
