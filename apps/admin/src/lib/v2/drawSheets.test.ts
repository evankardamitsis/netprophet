import { describe, expect, it } from 'vitest';
import type { Draw } from '@netprophet/ingest';
import { drawLinks, failedSheetsMessage, mergeDrawSheets, readDrawSheets, sheetKey } from './drawSheets';

const SINGLES = 'https://docs.google.com/spreadsheets/d/singlesId/edit?gid=0';
const DOUBLES = 'https://docs.google.com/spreadsheets/d/1iLybEGaNUSAwOJiEeYI5lBBvdDo-sFB4elRJucj-h4s/edit?gid=1112043135';
const draw = (tab: string, discipline: Draw['discipline'], level: string): Draw => ({
  tab,
  title: 'MAIN DRAW (16)',
  discipline,
  level,
  format: 'knockout',
  size: 16,
  entrants: [],
  rounds: [],
  flags: [],
});

describe('draw sheet links', () => {
  it('the spreadsheet id is the key of a link, whatever tab it points at', () => {
    expect(sheetKey(DOUBLES)).toBe('1iLybEGaNUSAwOJiEeYI5lBBvdDo-sFB4elRJucj-h4s');
    expect(sheetKey(' https://example.com/x ')).toBe('https://example.com/x');
  });

  it('draw_urls first, else draw_url; blanks dropped, one link per file', () => {
    expect(
      drawLinks({
        draw_url: SINGLES,
        draw_urls: [SINGLES, ' ', DOUBLES, DOUBLES.replace('1112043135', '7')],
      }),
    ).toEqual([SINGLES, DOUBLES]);
    expect(drawLinks({ draw_url: SINGLES })).toEqual([SINGLES]);
    expect(drawLinks({ draw_url: SINGLES, draw_urls: [] })).toEqual([SINGLES]);
    expect(drawLinks({ draw_url: null })).toEqual([]);
  });
});

describe('merging the draw sheets', () => {
  it('two files with the same tab name: both draws are kept, each with its sheet, the first file first', () => {
    const { draws, failed } = mergeDrawSheets([
      { url: SINGLES, draws: [draw('40+', 'MS', '40+')] },
      {
        url: DOUBLES,
        draws: [draw('40+', 'MD', '40+'), draw('MIXED -40', 'XD', '-40')],
      },
    ]);
    expect(failed).toEqual([]);
    expect(draws.map((d) => [d.sheet, d.tab, d.discipline])).toEqual([
      [SINGLES, '40+', 'MS'],
      [DOUBLES, '40+', 'MD'],
      [DOUBLES, 'MIXED -40', 'XD'],
    ]);
  });

  it('a sheet that fails does not drop the others, and is named', async () => {
    const read = async (url: string) => {
      if (url === SINGLES) throw new Error('the sheet is not shared with the service account');
      return [draw('MD -40', 'MD', '-40')];
    };
    const { draws, failed } = await readDrawSheets([SINGLES, DOUBLES], read);
    expect(draws.map((d) => [d.sheet, d.tab])).toEqual([[DOUBLES, 'MD -40']]);
    expect(failed).toEqual([
      {
        url: SINGLES,
        error: 'the sheet is not shared with the service account',
      },
    ]);
    expect(failedSheetsMessage(failed, 2)).toBe(`1 of 2 draw sheets could not be read (${SINGLES}: the sheet is not shared with the service account)`);
  });

  it('one sheet only: the message is its error as before', () => {
    expect(failedSheetsMessage([{ url: SINGLES, error: 'boom' }], 1)).toBe('boom');
    expect(failedSheetsMessage([], 2)).toBe('');
  });
});
