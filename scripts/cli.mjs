import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {validateConfig,validateSnapshot,unavailable} from './core.mjs';
import {GitHubClient,collect} from './github.mjs';
import {renderCards,renderReadme,renderPreview} from './render.mjs';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const parse=async p=>JSON.parse(await fs.readFile(p,'utf8'));
export async function loadConfig(root=ROOT){
  const [profile,projects,tokens,template]=await Promise.all([parse(path.join(root,'config/profile.json')),parse(path.join(root,'config/projects.json')),parse(path.join(root,'design/tokens.json')),fs.readFile(path.join(root,'templates/README.template.md'),'utf8')]);
  validateConfig(profile,projects,tokens);return {profile,projects,tokens,template};
}
export function outputs(config,s,{allowFixture=false}={}){
  validateSnapshot(s,{allowFixture});
  const {profile,projects,tokens,template}=config,cards=renderCards(profile,s,tokens);
  let total=0;
  for(const svg of Object.values(cards)){
    const bytes=Buffer.byteLength(svg);total+=bytes;assert(bytes<tokens.limits.svgBytes,'SVG exceeds size limit');
    assert(svg.startsWith('<svg ') && svg.includes('<title ') && svg.includes('<desc '),'Invalid SVG structure');
    assert(!/<(?:script|foreignObject|image|use)\b|\bon\w+\s*=|(?:href|src)\s*=|\{\{/i.test(svg),'Unsafe SVG output');
  }
  assert(total<tokens.limits.totalImageBytes,'Total image size exceeded');
  const readme=renderReadme(profile,projects,s,template);
  assert(!readme.includes('{{'),'Unresolved README template field');
  for(const m of readme.matchAll(/\]\(assets\/generated\/([^)]+)\)/g))assert(m[1] in cards,'Missing README image');
  return {'README.md':readme,'data/public-snapshot.json':JSON.stringify(s,null,2)+'\n',...Object.fromEntries(Object.entries(cards).map(([name,svg])=>[`assets/generated/${name}`,svg]))};
}
export async function writeTransaction(root,files,{beforeWrite=()=>{}}={}){
  // Explicit allowlist; no user-configured path is accepted.
  for(const name of Object.keys(files))assert(/^(README\.md|data\/public-snapshot\.json|assets\/generated\/(hero|activity|streak|languages|monthly|calendar)\.svg)$/.test(name),'Output path outside allowlist');
  const backups=new Map(),written=[];
  for(const name of Object.keys(files)){
    const dest=path.join(root,name);
    try{backups.set(name,await fs.readFile(dest));}catch(e){if(e.code!=='ENOENT')throw e;backups.set(name,null);}
  }
  try{
    for(const [name,value]of Object.entries(files)){
      if(backups.get(name)?.toString('utf8')===value)continue;
      const dest=path.join(root,name);await fs.mkdir(path.dirname(dest),{recursive:true});
      await beforeWrite(name);written.push(name);await fs.writeFile(dest,value,'utf8');
    }
  }catch(e){
    for(const name of written.reverse()){
      const old=backups.get(name),dest=path.join(root,name);
      if(old===null)await fs.rm(dest,{force:true});else await fs.writeFile(dest,old);
    }
    throw e;
  }
  return written.length;
}
export function reuseTimestamp(next,previous){
  if(!previous || previous.status!=='ok' || next.status!=='ok')return next;
  const a={...next,lastSuccessfulFetchAt:null},b={...previous,lastSuccessfulFetchAt:null};
  return JSON.stringify(a)===JSON.stringify(b)?{...next,lastSuccessfulFetchAt:previous.lastSuccessfulFetchAt}:next;
}
async function preview(config,s,files,dir){
  await writeTransaction(dir,files);
  await fs.writeFile(path.join(dir,'index.html'),renderPreview(config.profile,config.projects,s),'utf8');
}
export async function main(command,root=ROOT){
  const config=await loadConfig(root),snapPath=path.join(root,'data/public-snapshot.json');
  if(command==='validate'){
    try{validateSnapshot(await parse(snapPath));}catch(e){if(e.code!=='ENOENT')throw e;}
    console.log('Configuration, design tokens and available snapshot are valid.');return;
  }
  if(command==='fixture'){
    const {fixtureSnapshot}=await import('../tests/fixtures/profile.mjs');
    const s=fixtureSnapshot(),files=outputs(config,s,{allowFixture:true});
    await preview(config,s,files,path.join(root,'work/fixture'));
    console.log('Synthetic fixture preview: work/fixture/index.html (not publishable).');return;
  }
  if(!['init','build','update','check'].includes(command))throw new Error('Use validate, init, build, fixture, update or check');
  let previous;
  try{previous=await parse(snapPath);}catch(e){if(e.code!=='ENOENT')throw e;}
  if(previous)validateSnapshot(previous);
  let s;
  if(command==='init'){
    assert(!previous,'Snapshot already exists; use build or update');s=unavailable(config.profile.login);
  }else if(command==='update'){
    s=await collect(new GitHubClient({token:process.env.PROFILE_READ_TOKEN||process.env.GITHUB_TOKEN}),config.profile.login);
    s=reuseTimestamp(s,previous);
  }else{assert(previous,'No snapshot; run npm run init:profile first');s=previous;}
  const files=outputs(config,s);
  if(command==='check'){
    for(const [name,value]of Object.entries(files))assert.equal(await fs.readFile(path.join(root,name),'utf8'),value,`Generated file differs: ${name}`);
    console.log('Generated README, snapshot and all six SVGs match their inputs.');return;
  }
  const staging=path.join(root,'work/staging');await preview(config,s,files,staging);
  const changed=await writeTransaction(root,files);
  await preview(config,s,files,path.join(root,'work/preview'));
  console.log(`${changed} generated files updated. Preview: work/preview/index.html`);
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main(process.argv[2]).catch(e=>{console.error(`Profile build failed: ${e.message}`);process.exitCode=1;});
}
