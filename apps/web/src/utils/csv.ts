/**
 * Lossless RFC 4180 CSV for translation exchange. The analytics exporter's
 * cell helper flattens newlines, which would corrupt multi-line copy — these
 * round-trip cell content verbatim.
 */

const escapeCsvCell = (cell: string): string => {
  if (/[",\r\n]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
};

const UTF8_BOM = '﻿';

/** Serialize rows; prefixed with a BOM so Excel detects UTF-8. */
export const serializeCsv = (rows: readonly (readonly string[])[]): string => {
  return `${UTF8_BOM}${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')}`;
};

export const parseCsv = (text: string): string[][] => {
  const input = text.startsWith(UTF8_BOM) ? text.slice(UTF8_BOM.length) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          cell += '"';
          index++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && input[index + 1] === '\n') {
        index++;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += char;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
};

export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** Turn a content name into a safe file base name. */
export const sanitizeFileBaseName = (name: string): string => {
  return (
    name
      .trim()
      .replace(/[<>:"/\\|?*\s]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'content'
  );
};
