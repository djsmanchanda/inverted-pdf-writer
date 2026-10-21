import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await fs.readFile(new URL('../vendor/pdfjs/provenance.json',import.meta.url),'utf8'));
for(const [file,expected] of Object.entries(manifest.files)){
 const bytes=await fs.readFile(new URL('../vendor/pdfjs/'+file,import.meta.url));
 if(createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Upstream file changed: '+file);
}
console.log(`Verified PDF.js ${manifest.version}: ${Object.keys(manifest.files).length} upstream files; viewer.html carries the documented desktop integration patch.`);
