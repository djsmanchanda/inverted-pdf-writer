// Pen input reaches PDF.js unchanged. Touch pans the document unless explicitly enabled.
let penActive=false;
const touches=new Map();
const inViewer=event=>event.target.closest?.('#viewerContainer');
document.addEventListener('pointerdown',event=>{
 if(!inViewer(event))return;
 if(event.pointerType==='pen'){penActive=true;return;}
 if(event.pointerType==='touch'&&!document.documentElement.classList.contains('finger-drawing')){
  event.preventDefault();event.stopImmediatePropagation();
  touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
  event.target.setPointerCapture?.(event.pointerId);
 }
},{capture:true,passive:false});
document.addEventListener('pointermove',event=>{
 const previous=touches.get(event.pointerId);if(!previous)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(!penActive&&touches.size===1){const container=document.querySelector('#viewerContainer');container.scrollTop+=previous.y-event.clientY;container.scrollLeft+=previous.x-event.clientX;}
 touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
},{capture:true,passive:false});
for(const type of ['pointerup','pointercancel'])document.addEventListener(type,event=>{
 if(event.pointerType==='pen')penActive=false;
 if(touches.has(event.pointerId)){touches.delete(event.pointerId);event.preventDefault();event.stopImmediatePropagation();}
},{capture:true,passive:false});
