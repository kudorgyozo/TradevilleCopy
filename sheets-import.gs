/**
 * Paste the JSON copied by the Tampermonkey script into any single cell.
 * onEdit detects it, parses it, and writes each field into a fixed
 * column (see COLUMN_MAP below), in the same row as the pasted cell.
 *
 * Keep COLUMN_MAP in sync with the `key`s in the Tampermonkey script's
 * FIELDS array (columns don't need to be contiguous or in any order).
 */
const COLUMN_MAP = {
  name: 'A',
  interest: 'B',
  maturity: 'C',
  cleanPrice: 'D',
  dirtyPrice: 'E',
  total: 'F',
  count: 'G',
};

// Number format applied to each cell on every write, so a stray paste/edit
// can never silently leave a cell in the wrong format (e.g. Date) again.
const FORMAT_MAP = {
  name: '@',            // plain text
  interest: '0.00%',    // percent, 2 decimals
  maturity: 'yyyy-mm-dd', // real date
  cleanPrice: '0.00',
  dirtyPrice: '0.00',
  total: '#,##0.00',
  count: '0',
};

function onEdit(e) {
  if (!e || !e.range) return;

  const range = e.range;
  if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) return; // only handle single-cell paste

  const raw = range.getValue();
  if (typeof raw !== 'string') return;

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return; // not JSON -> normal edit, ignore
  }
  if (!data || typeof data !== 'object') return;

  const sheet = range.getSheet();
  const row = range.getRow();

  Object.keys(COLUMN_MAP).forEach((key) => {
    const column = COLUMN_MAP[key];
    const cell = sheet.getRange(`${column}${row}`);
    cell.setNumberFormat(FORMAT_MAP[key] || '@');
    cell.setValue(normalizeValue(key, data[key]));
  });
}

function normalizeValue(key, value) {
  if (value === undefined || value === null) return '';

  if (key === 'maturity') {
    const parts = String(value).split('-').map(Number); // "2028-08-02" -> [2028, 8, 2]
    if (parts.length !== 3 || parts.some(isNaN)) return value; // unexpected format, fall back to raw text
    const [year, month, day] = parts;
    return new Date(year, month - 1, day); // built from components, not Date.parse, to avoid UTC/local timezone drift
  }

  const numeric = Number(String(value).replace(/,/g, '')); // strips thousands separators like "3,195.07"
  if (isNaN(numeric)) return value;

  // Sheets' percent format multiplies the stored number by 100 for display,
  // so a stored 5.5 shows as 550%. Store 0.055 instead so it shows as 5.50%.
  if (key === 'interest') return numeric / 100;

  return numeric;
}
