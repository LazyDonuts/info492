"""Read the team's workbook; export original values without generating/enriching RFIs.
Requires openpyxl. Usage: python scripts/import-workbook.py path/to/workbook.xlsx
"""
import csv
import datetime
import json
import sys
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'data/source/ST_EastLink_DRLE_RFI_synthetic_dataset.xlsx'
workbook = openpyxl.load_workbook(source, data_only=True, read_only=True)
tables = {'RFIs': 'rfis', 'Contracts': 'contracts', 'Change_Orders': 'change_orders',
          'CO_Outcomes': 'change_order_outcomes', 'RFI_CO_Link': 'rfi_change_order_link',
          'Data_Dictionary': 'data_dictionary'}

def value(v):
    if v is None:
        return ''
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.date().isoformat() if isinstance(v, datetime.datetime) else v.isoformat()
    if isinstance(v, float) and v.is_integer():
        return int(v)
    return v

counts = {}
for sheet_name, filename in tables.items():
    rows = [list(map(value, row)) for row in workbook[sheet_name].values]
    rows = [row for row in rows if any(str(v).strip() for v in row)]
    with (ROOT / f'data/{filename}.csv').open('w', newline='', encoding='utf-8') as output:
        csv.writer(output, lineterminator='\n').writerows(rows)
    counts[filename] = len(rows) - 1
readme = '\n\n'.join(str(row[0]) for row in workbook['README'].values if row and row[0] is not None)
(ROOT / 'data/source/README-from-workbook.txt').write_text(readme + '\n')
(ROOT / 'data/source/import-report.json').write_text(json.dumps({
    'source': source.name, 'counts': counts,
    'transformation': 'ISO date strings; integral numeric values; blanks preserved. No enrichment.'
}, indent=2) + '\n')
print(json.dumps(counts))
