import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true});
try{
 const page=await browser.newPage({viewport:{width:256,height:256}});
 await page.setContent('<style>body{margin:0;background:transparent}</style>'+await fs.readFile(new URL('../assets/icon.svg',import.meta.url),'utf8'));
 const png=await page.screenshot({omitBackground:true});await fs.writeFile(new URL('../assets/icon.png',import.meta.url),png);
 const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);
 await fs.writeFile(new URL('../assets/icon.ico',import.meta.url),Buffer.concat([header,png]));
}finally{await browser.close();}
