import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT} from './cli.mjs';

const base=path.join(ROOT,'work'),port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const dest=path.resolve(base,'.'+(pathname==='/'?'/preview/index.html':pathname));
    if(!dest.startsWith(base+path.sep)){res.writeHead(403).end();return;}
    const bytes=await fs.readFile(dest);res.writeHead(200,{'Content-Type':types[path.extname(dest)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(bytes);
  }catch{res.writeHead(404).end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`README preview: http://127.0.0.1:${port}/preview/index.html\nSynthetic charts: http://127.0.0.1:${port}/fixture/index.html`));
