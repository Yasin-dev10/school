import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const rows = JSON.parse(await fs.readFile("tmp/natiijada_rows.json", "utf8"));
const gradePoints = { "A+": 12, "A": 11, "A-": 10, "B+": 9, "B": 8, "B-": 7, "C+": 6, "C": 5, "C-": 4, "D": 3, "E": 1 };
rows.sort((a, b) => {
  const score = r => r.slice(3, 11).reduce((sum, grade) => sum + gradePoints[grade], 0) / 8;
  return score(b) - score(a) || a[0].localeCompare(b[0]);
});
const outDir = "outputs/01a03fd9-0b65-73f3-917b-faecd5354832";
await fs.mkdir(outDir, { recursive: true });

const wb = Workbook.create();
const sh = wb.worksheets.add("Kaalinta");
const map = wb.worksheets.add("Habka Xisaabta");
sh.showGridLines = false;
map.showGridLines = false;

sh.mergeCells("A1:O1");
sh.getRange("A1").values = [["NATIIJADA IYO KAALINTA FASALKA 8AAD - 2025/2026"]];
sh.mergeCells("A2:O2");
sh.getRange("A2").values = [["Dugsiga: New lafoole | Tirada ardayda: 58"]];
sh.getRange("A4:O4").values = [["Kaalinta","Rool Lambar","Magaca Ardayga","Magaca Hooyada","Tarbiyo","Carabi","Af-Soomaali","Xisaab","Cilmi Bulsho","Saynis","Ingiriisi","Teknooloji","Celceliska","Go'aan","Dhibcaha"]];

const data = rows.map(r => [null, ...r.slice(0, 13), null]);
sh.getRange(`A5:O${rows.length + 4}`).values = data;
for (let i = 5; i <= rows.length + 4; i++) {
  sh.getRange(`O${i}`).formulas = [[`=AVERAGE(VLOOKUP(E${i},'Habka Xisaabta'!$A$2:$B$12,2,FALSE),VLOOKUP(F${i},'Habka Xisaabta'!$A$2:$B$12,2,FALSE),VLOOKUP(G${i},'Habka Xisaabta'!$A$2:$B$12,2,FALSE),VLOOKUP(H${i},'Habka Xisaabta'!$A$2:$B$12,2,FALSE),VLOOKUP(I${i},'Habka Xisaabta'!$A$2:$B$12,2,FALSE),VLOOKUP(J${i},'Habka Xisaabta'!$A$2:$B$12,2,FALSE),VLOOKUP(K${i},'Habka Xisaabta'!$A$2:$B$12,2,FALSE),VLOOKUP(L${i},'Habka Xisaabta'!$A$2:$B$12,2,FALSE))`]];
  sh.getRange(`A${i}`).formulas = [[`=RANK.EQ(O${i},$O$5:$O$62,0)`]];
}

sh.getRange("A1:O1").format = { fill: "#17365D", font: { bold: true, color: "#FFFFFF", size: 16 }, horizontalAlignment: "center", verticalAlignment: "center" };
sh.getRange("A2:O2").format = { fill: "#D9EAF7", font: { bold: true, color: "#17365D" }, horizontalAlignment: "center" };
sh.getRange("A4:O4").format = { fill: "#2F75B5", font: { bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "outside", style: "thin", color: "#17365D" } };
sh.getRange("A5:O62").format.borders = { insideHorizontal: { style: "thin", color: "#D9E2F3" } };
sh.getRange("A5:A62").format = { font: { bold: true, color: "#17365D" }, horizontalAlignment: "center", numberFormat: "0" };
sh.getRange("E5:O62").format.horizontalAlignment = "center";
sh.getRange("O5:O62").format.numberFormat = "0.00";
sh.getRange("A1:O1").format.rowHeight = 30;
sh.getRange("A2:O2").format.rowHeight = 22;
sh.getRange("A4:O4").format.rowHeight = 32;
sh.getRange("A:A").format.columnWidth = 10;
sh.getRange("B:B").format.columnWidth = 16;
sh.getRange("C:C").format.columnWidth = 34;
sh.getRange("D:D").format.columnWidth = 27;
sh.getRange("E:L").format.columnWidth = 12;
sh.getRange("M:N").format.columnWidth = 13;
sh.getRange("O:O").format.columnWidth = 12;
sh.freezePanes.freezeRows(4);
sh.getRange("A5:A62").conditionalFormats.add("colorScale", { colors: ["#63BE7B", "#FFEB84", "#F8696B"] });
sh.tables.add("A4:O62", true, "NatiijadaTable").style = "TableStyleMedium2";

map.getRange("A1:B1").values = [["Darajada","Dhibcaha"]];
map.getRange("A2:B12").values = [["A+",12],["A",11],["A-",10],["B+",9],["B",8],["B-",7],["C+",6],["C",5],["C-",4],["D",3],["E",1]];
map.getRange("D1:D4").values = [["Faahfaahin"],["Kaalinta waxaa lagu saleeyey celceliska dhibcaha 8-da maaddo."],["Darajo kasta waxaa loo rogay dhibcaha ku qoran jadwalkan."],["Dhibco siman = kaalinta oo la wadaago."]];
map.getRange("A1:B1").format = { fill: "#2F75B5", font: { bold: true, color: "#FFFFFF" }, horizontalAlignment: "center" };
map.getRange("A2:B12").format.borders = { preset: "all", style: "thin", color: "#D9E2F3" };
map.getRange("B2:B12").format.numberFormat = "0";
map.getRange("D1").format = { fill: "#17365D", font: { bold: true, color: "#FFFFFF" } };
map.getRange("D2:D4").format.wrapText = true;
map.getRange("A:B").format.columnWidth = 14;
map.getRange("D:D").format.columnWidth = 56;

const inspect = await wb.inspect({ kind: "table", range: "Kaalinta!A1:O12", include: "values,formulas", tableMaxRows: 12, tableMaxCols: 15 });
console.log(inspect.ndjson);
const errors = await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
console.log(errors.ndjson);
for (const sheetName of ["Kaalinta", "Habka Xisaabta"]) {
  const preview = await wb.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(`${outDir}/${sheetName}.png`, new Uint8Array(await preview.arrayBuffer()));
}
const output = await SpreadsheetFile.exportXlsx(wb);
await output.save(`${outDir}/natiijada_iyo_kaalinta.xlsx`);
