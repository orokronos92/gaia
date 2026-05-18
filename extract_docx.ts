import * as fs from 'fs';
import * as mammoth from 'mammoth';

async function extract() {
    try {
        const result = await mammoth.extractRawText({ path: 'docs/PRO-QHS-013 PROCEDURE VERIFICATION DETIQUETAGE.docx' });
        fs.writeFileSync('extracted_procedure_utf8.txt', result.value, 'utf-8');
        console.log("Done");
    } catch (e) {
        console.error(e);
    }
}
extract();
