/**
 * A small CSV reader for organiser files: quoted fields, doubled quotes inside quotes, CRLF, and the
 * delimiter guessed from the header line (Greek Excel saves with ";", Sheets exports ",", pasted tables "\t").
 */
export function guessDelimiter(text: string): ',' | ';' | '\t' {
  const first = text.split(/\r?\n/, 1)[0] ?? '';
  const counts = { ',': 0, ';': 0, '\t': 0 } as Record<',' | ';' | '\t', number>;
  for (const ch of first) if (ch === ',' || ch === ';' || ch === '\t') counts[ch] += 1;
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]![0] as ',' | ';' | '\t') ?? ',';
}

export function parseCsv(text: string, delimiter: string = guessDelimiter(text)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}
