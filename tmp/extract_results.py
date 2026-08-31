import json
import pdfplumber

source = r"C:\Users\yasin\Downloads\natiijada dugsiga.pdf"
rows = []
with pdfplumber.open(source) as pdf:
    for page in pdf.pages:
        for table in page.extract_tables():
            for row in table[1:]:
                if row and row[0] and row[0].startswith("KGS-"):
                    rows.append(row)

with open("tmp/natiijada_rows.json", "w", encoding="utf-8") as f:
    json.dump(rows, f, ensure_ascii=False, indent=2)

assert len(rows) == 58, len(rows)
