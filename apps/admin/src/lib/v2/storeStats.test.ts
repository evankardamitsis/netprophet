import { describe, expect, it } from 'vitest';
import { appleDaysToFetch, appleDownloads, decodeReport, playDownloads, playMonths } from './storeStats';

const HEAD = 'Provider\tSKU\tProduct Type Identifier\tUnits\tCountry Code\tDevice';

describe('appleDownloads', () => {
  it('counts first-time downloads only', () => {
    const tsv = [HEAD, 'APPLE\tnp\t1\t2\tGR\tiPhone', 'APPLE\tnp\t1T\t1\tGR\tiPad', 'APPLE\tnp\t7\t9\tGR\tiPhone', 'APPLE\tnp\t3\t4\tGR\tiPhone', 'APPLE\tpro\tIAY\t1\tGR\tiPhone'].join('\n');
    expect(appleDownloads(tsv)).toBe(3);
  });
  it('is zero for a header alone', () => expect(appleDownloads(HEAD + '\n')).toBe(0));
  it('refuses a report it cannot read', () => expect(() => appleDownloads('a\tb\n1\t2')).toThrow());
});

const PLAY = [
  'Date,Package Name,Daily Device Installs,Daily Device Uninstalls,Daily Device Upgrades,Total User Installs,Daily User Installs,Daily User Uninstalls,Active Device Installs',
  '2026-11-20,gr.monadlabs.netprophet,4,0,1,10,3,0,9',
  '2026-11-21,gr.monadlabs.netprophet,2,1,0,12,2,1,10',
].join('\r\n');

describe('playDownloads', () => {
  it('reads the daily user installs', () => {
    expect(playDownloads(PLAY)).toEqual([
      { day: '2026-11-20', downloads: 3 },
      { day: '2026-11-21', downloads: 2 },
    ]);
  });
  it('reads Play UTF-16 files', () => {
    const body = Buffer.from(PLAY, 'utf16le');
    const bytes = new Uint8Array([0xff, 0xfe, ...body]);
    expect(playDownloads(decodeReport(bytes))).toHaveLength(2);
  });
  it('reads UTF-8 with a mark too', () => {
    expect(decodeReport(new TextEncoder().encode('﻿Date'))).toBe('Date');
  });
  it('handles quoted cells', () => {
    expect(playDownloads('"Date","Daily User Installs"\n"2026-11-22","7"')).toEqual([{ day: '2026-11-22', downloads: 7 }]);
  });
});

describe('appleDaysToFetch', () => {
  it('asks for missing days and the last few again', () => {
    const have = new Set(['2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23']);
    expect(appleDaysToFetch(have, '2026-11-18', '2026-11-23', 2)).toEqual(['2026-11-18', '2026-11-22', '2026-11-23']);
  });
  it('stops at the cap, oldest first', () => {
    expect(appleDaysToFetch(new Set(), '2026-10-01', '2026-11-30', 3, 5)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']);
  });
});

describe('playMonths', () => {
  it('is last month and this one', () => expect(playMonths('2026-11-25')).toEqual(['202610', '202611']));
  it('crosses the year', () => expect(playMonths('2027-01-02')).toEqual(['202612', '202701']));
});
