export const AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000;
export class Autosave {
 constructor({save,onError,canSave=()=>true,intervalMs=AUTOSAVE_INTERVAL_MS}){this.save=save;this.onError=onError;this.canSave=canSave;this.intervalMs=intervalMs;this.pending=null;}
 start(){this.stop();this.timer=setInterval(()=>this.tick(),this.intervalMs);}
 stop(){clearInterval(this.timer);this.timer=null;}
 async tick(){
  if(this.pending || !this.canSave())return;
  this.pending=Promise.resolve().then(()=>this.save());
  try{await this.pending;}catch(error){this.onError(error);}finally{this.pending=null;}
 }
}
