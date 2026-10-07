import test from 'node:test';
import assert from 'node:assert/strict';
import {GitHubClient,collect} from '../scripts/github.mjs';

const response=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers});
test('pagination retrieves 101 repositories and follows only API links',async()=>{
  const base={owner:{login:'jacky105402002'},private:false,fork:false,archived:false};let calls=0;
  const client=new GitHubClient({fetchImpl:async()=>{calls++;return calls===1?response(Array.from({length:100},(_,i)=>({...base,name:`r${i}`})),200,{link:'<https://api.github.com/users/jacky105402002/repos?page=2>; rel="next"'}):response([{...base,name:'last'}]);}});
  assert.equal((await client.repositories('jacky105402002')).length,101);assert.equal(calls,2);
  const evil=new GitHubClient({fetchImpl:async()=>response([],200,{link:'<https://evil.invalid/steal>; rel="next"'})});
  await assert.rejects(evil.repositories('jacky105402002'),/pagination/);
});
test('GraphQL HTTP 200 errors rejected, no misleading partial success',async()=>{
  const c=new GitHubClient({fetchImpl:async()=>response({data:{},errors:[{message:'partial'}]})});await assert.rejects(c.request('/graphql',{query:'x'}),/incomplete/);
});
test('429 honors retry, 500 retries twice, 401 fails immediately',async()=>{
  let calls=0;const sleeps=[];
  const c=new GitHubClient({sleep:async ms=>sleeps.push(ms),fetchImpl:async()=>++calls===1?response({},429,{'retry-after':'2'}):response({ok:true})});
  assert((await c.request('/user')).data.ok);assert.deepEqual(sleeps,[2000]);
  calls=0;const bad=new GitHubClient({sleep:async()=>{},fetchImpl:async()=>{calls++;return response({},500);}});await assert.rejects(bad.request('/user'));assert.equal(calls,3);
  calls=0;const auth=new GitHubClient({fetchImpl:async()=>{calls++;return response({},401);}});await assert.rejects(auth.request('/user'));assert.equal(calls,1);
});
test('network timeout retries, excessive reset waits abort and destinations restricted',async()=>{
  let calls=0;const c=new GitHubClient({sleep:async()=>{},fetchImpl:async()=>{calls++;throw new Error('timeout with sensitive details');}});
  await assert.rejects(c.request('/user'),e=>!e.message.includes('sensitive'));assert.equal(calls,3);
  const rate=new GitHubClient({fetchImpl:async()=>response({},403,{'x-ratelimit-remaining':'0','retry-after':'999999'})});await assert.rejects(rate.request('/user'),/time budget/);
  await assert.rejects(c.request('https://evil.invalid'),/Untrusted/);
});
test('missing token fails before making network requests',async()=>{
  let calls=0;await assert.rejects(collect(new GitHubClient({fetchImpl:async()=>{calls++;}}),'jacky105402002'),/TOKEN/);assert.equal(calls,0);
});
test('failure on second repository page rejects entire collection',async()=>{
  let calls=0;const c=new GitHubClient({fetchImpl:async()=>++calls===1?response([],200,{link:'<https://api.github.com/users/jacky105402002/repos?page=2>; rel="next"'}):response({},404)});
  await assert.rejects(c.repositories('jacky105402002'));assert.equal(calls,2);
});
