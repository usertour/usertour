import { parseCsv, serializeCsv } from '../csv';

const roundTrip = (rows: string[][]): string[][] => parseCsv(serializeCsv(rows));

describe('csv round-trip', () => {
  it('is lossless for quotes, commas and newlines', () => {
    const rows = [
      ['path', 'source', 'translation'],
      ['0.0.0:text.0.0', 'He said "hi", twice', 'Il a dit « salut »,\ndeux fois'],
    ];
    expect(roundTrip(rows)).toEqual(rows);
  });

  it('is lossless for formula-looking and apostrophe-leading text', () => {
    const rows = [
      ['-20% off today', '=SUM(A1:A9)', '+33 1 23 45 67 89'],
      ['@everyone', "'tis the season", "''double marker"],
    ];
    expect(roundTrip(rows)).toEqual(rows);
  });
});

describe('csv formula neutralization', () => {
  it('never emits a cell that spreadsheets would evaluate', () => {
    const dangerousCells = ['=HYPERLINK("http://evil.example","click")', '+1', '-2', '@handle'];
    for (const dangerousCell of dangerousCells) {
      const serialized = serializeCsv([[dangerousCell]]).slice(1); // drop the BOM
      const content = serialized.startsWith('"') ? serialized.slice(1) : serialized;
      expect(content.startsWith("'")).toBe(true);
    }
  });

  it('strips the marker back off on import', () => {
    const parsed = parseCsv("'=SUM(A1),'-plain,unrelated'quote");
    expect(parsed).toEqual([['=SUM(A1)', '-plain', "unrelated'quote"]]);
  });
});
