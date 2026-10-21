import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'node:fs/promises';
const pdf=await PDFDocument.create();
const serif=await pdf.embedFont(StandardFonts.TimesRoman),sans=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
const ink=rgb(.12,.16,.1),muted=rgb(.4,.46,.36),orange=rgb(.7,.38,.2);
const pages=[
 {eyebrow:'YOUR FIRST CHAPTER',title:['A calmer page.','A clearer mind.'],subtitle:'Welcome to your study desk.',body:[['01   MAKE YOURSELF AT HOME','Add a PDF from your device. Give it a subject, and keep your','textbooks, lecture slides, and revision notes together.'],['02   TURN DOWN THE GLARE','Open a document to see a black page with light text. Use','the Inverted button whenever you want the original colors.'],['03   THINK ON THE PAGE','Choose Draw in the PDF toolbar and write with your pen.','Use Highlight or Add text to make the important bits yours.']],foot:'Your notes. Your device. Your own pace.'},
 {eyebrow:'A LITTLE PRACTICE',title:['Good ideas start','with a scribble.'],subtitle:'Try writing a note in the space below.',body:[['A SIMPLE THOUGHT EXPERIMENT','What is one thing you would like to understand better today?','Write it down. Sketch a diagram. Connect a few dots.']],foot:'Tip: use your pen to write and a finger to scroll.'},
 {eyebrow:'PICK UP WHERE YOU LEFT OFF',title:['Saved for','another day.'],subtitle:'Your study desk remembers.',body:[['EVERY FIVE MINUTES','Your open PDF and notes save to this device automatically.','Press Ctrl+S or choose Save whenever you want.'],['WHEN YOU MOVE ON','Returning to the library or closing the app saves your work.','Open your PDF again to continue on the same page.'],['TAKE YOUR NOTES WITH YOU','Export PDF writes an ordinary PDF with your annotations.','The colors stay normal; inversion is a reading preference.']],foot:'No account. No cloud. Just a little room to learn.'},
];
for(let i=0;i<pages.length;i++){
 const data=pages[i],page=pdf.addPage([595.28,841.89]);
 page.drawRectangle({x:0,y:0,width:595.28,height:841.89,color:rgb(1,1,1)});
 page.drawText('inverted / PDF WRITER',{x:55,y:783,size:10,font:bold,color:ink});page.drawLine({start:{x:55,y:763},end:{x:540,y:763},thickness:.6,color:rgb(.8,.83,.77)});
 page.drawText(data.eyebrow,{x:55,y:712,size:9,font:bold,color:orange});
 data.title.forEach((line,j)=>page.drawText(line,{x:55,y:645-j*54,size:48,font:serif,color:ink}));
 page.drawText(data.subtitle,{x:55,y:535,size:13,font:sans,color:muted});
 let y=470;
 for(const block of data.body){page.drawText(block[0],{x:55,y,size:9,font:bold,color:orange});page.drawText(block[1],{x:55,y:y-25,size:12,font:sans,color:ink});page.drawText(block[2],{x:55,y:y-44,size:12,font:sans,color:ink});y-=116;}
 if(i===1){for(let y=150;y<365;y+=28)page.drawLine({start:{x:55,y},end:{x:540,y},thickness:.5,color:rgb(.86,.89,.83)});}
 page.drawLine({start:{x:55,y:78},end:{x:540,y:78},thickness:.6,color:rgb(.8,.83,.77)});page.drawText(data.foot,{x:55,y:55,size:9,font:sans,color:muted});page.drawText(String(i+1).padStart(2,'0'),{x:525,y:55,size:9,font:sans,color:muted});
}
pdf.setTitle('Welcome to your study desk');pdf.setAuthor('Inverted PDF Writer');
await fs.writeFile(new URL('../assets/welcome.pdf',import.meta.url),await pdf.save());
