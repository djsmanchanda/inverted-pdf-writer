import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const mime = {'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.pdf':'application/pdf','.png':'image/png','.json':'application/json','.ftl':'text/plain','.bcmap':'application/octet-stream'};
http.createServer(async(req,res)=>{
 try {
  const name = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(name === '/') { res.writeHead(302,{Location:'/app/index.html'});res.end();return; }
  const file = path.resolve(root, '.' + (name === '/' ? '/app/index.html' : name));
  if (!file.startsWith(root + path.sep) || !(await stat(file)).isFile()) throw Error('Not found');
  res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream');
  res.end(await readFile(file));
 } catch { res.writeHead(404);res.end('Not found'); }
}).listen(Number(process.env.PORT || 4173),'0.0.0.0',()=>console.log('Preview: http://localhost:4173'));
