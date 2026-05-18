import { resolve } from "path";
import xlsx from "xlsx";

const filePath = resolve(process.cwd(), 'docs', 'BDD étiquettes 2025 extrait dec 2025.xlsx');
const workbook = xlsx.readFile(filePath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const headers = xlsx.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];

console.log("Headers:");
headers.forEach((h, i) => {
    console.log(`[${i}] ${h}`);
});
