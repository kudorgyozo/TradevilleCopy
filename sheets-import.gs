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
  total: 'G',
  count: 'H',
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
    sheet.getRange(`${column}${row}`).setValue(normalizeValue(key, data[key]));
  });
}

function normalizeValue(key, value) {
  if (value === undefined || value === null) return '';
  if (key === 'maturity') return value; // keep as plain text date; see note below to store as a real Date

  const numeric = Number(String(value).replace(/,/g, '')); // strips thousands separators like "3,195.07"
  if (isNaN(numeric)) return value;

  // Sheets' percent format multiplies the stored number by 100 for display,
  // so a stored 5.5 shows as 550%. Store 0.055 instead so it shows as 5.50%.
  if (key === 'interest') return numeric / 100;

  return numeric;
}
