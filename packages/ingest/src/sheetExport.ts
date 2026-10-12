import { parseCsv } from './csv';

/**
 * A whole Google Sheet exported as text, each tab starting with «## Sheet name: <tab>» and followed by its rows
 * as CSV lines (parse_oop.py `sections`). Turns it into tabs for parseSheet.
 */
export function parseSheetExport(text: string): { name: string; rows: string[][] }[] {
  const tabs: { name: string; lines: string[] }[] = [];
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (line.startsWith('## Sheet name:')) tabs.push({ name: line.slice(line.indexOf(':') + 1).trim(), lines: [] });
    else tabs[tabs.length - 1]?.lines.push(line);
  }
  return tabs.map((t) => ({ name: t.name, rows: parseCsv(t.lines.join('\n'), ',') }));
}
