import fs from "fs";
import { JSDOM } from "jsdom";

const dom = new JSDOM("");
global.window = dom.window as any;
global.document = dom.window.document as any;
global.navigator = dom.window.navigator as any;
if (!global.DOMMatrix) (global as any).DOMMatrix = dom.window.DOMMatrix || class DOMMatrix {};
if (!global.Path2D) (global as any).Path2D = dom.window.Path2D || class Path2D {};
if (!global.ImageData) (global as any).ImageData = dom.window.ImageData || class ImageData {};

const pdfParse = require("pdf-parse");

async function test() {
    try {
        const buffer = fs.readFileSync("docs/FD - MT265 Maté sportif v0.pdf");
        const data = await pdfParse(buffer);
        console.log("SUCCESS length:", data.text.length);
        console.log("TEXT SAMPLE:", data.text.substring(0, 200).replace(/\n/g, " "));
    } catch(e) {
        console.error("PDF PARSE ERROR:", e);
    }
}
test();
