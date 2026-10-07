import test from 'node:test';
import assert from 'node:assert/strict';
import {periodFor,dateRange,derive,languageMetrics,validateSnapshot,selectedRepos,safeUrl,md,xml,unavailable} from '../scripts/core.mjs';
import {fixtureSnapshot} from './fixtures/profile.mjs';
import {loadConfig,outputs,reuseTimestamp} from '../scripts/cli.mjs';

const daysFor=(date,counts=[])=>{const p=periodFor(date);const dates=dateRange(p.from,p.through);return {p,days:dates.map((date,i)=>({date,count:counts[dates.length-i-1]||0,level:counts[dates.length-i-1]?'FIRST_QUARTILE':'NONE'}))};};
test('12 calendar months, including leap day, with exact daily and monthly totals',()=>{
  assert.deepEqual(periodFor('2026-10-07'),{from:'2025-11-01',through:'2026-10-07'});
  const {p,days}=daysFor('2024-03-01',[1,2,3]);
  assert(days.some(d=>d.date==='2024-02-29'));
  const m=derive(days,[],p);assert.equal(m.months.length,12);assert.equal(m.calendar,6);assert.equal(m.months.reduce((s,m)=>s+m.count,0),6);
  assert.equal(m.months.at(-1).isPartial,true);
});
test('streak today, yesterday grace, interrupted and query boundary',()=>{
  for(const [counts,current,through] of [[[1,1,1],3,'2026-10-07'],[[0,1,1],2,'2026-10-06'],[[0,0,1],0,null]]){
    const {p,days}=daysFor('2026-10-07',counts),m=derive(days,[],p);assert.equal(m.streak.current,current);assert.equal(m.streak.currentThrough,through);
  }
  const {p,days}=daysFor('2026-10-07');days.forEach(d=>{d.count=1;d.level='FIRST_QUARTILE';});
  const m=derive(days,[],p);assert.equal(m.streak.current,days.length);assert.equal(m.streak.startBoundaryReached,true);
});
test('missing, duplicate dates and negative counts rejected',()=>{
  const {p,days}=daysFor('2026-10-07');assert.throws(()=>derive(days.slice(1),[],p));
  const duplicate=structuredClone(days);duplicate[1].date=duplicate[0].date;assert.throws(()=>derive(duplicate,[],p));
  days[0].count=-1;assert.throws(()=>derive(days,[],p));
});
test('language rounding, ties, top five plus other, empty and overflow',()=>{
  assert.deepEqual(languageMetrics([{languagesBytes:{C:1,A:1,B:1}}]).map(r=>[r.name,r.percent]),[['A',33.4],['B',33.3],['C',33.3]]);
  const groups=languageMetrics([{languagesBytes:{A:8,B:7,C:6,D:5,E:4,F:3,G:2}}]);
  assert.equal(groups.length,6);assert.equal(groups[5].name,'其他');assert.equal(groups[5].bytes,5);assert.equal(Math.round(groups.reduce((s,r)=>s+r.percent,0)*10),1000);
  assert.deepEqual(languageMetrics([{languagesBytes:{}}]),[]);assert.deepEqual(languageMetrics([{languagesBytes:{A:0}}]),[]);
  assert.throws(()=>languageMetrics([{languagesBytes:{A:Number.MAX_SAFE_INTEGER,B:1}}]));
});
test('only public owned nonfork nonarchived repositories',()=>{
  const base={owner:{login:'jacky105402002'},private:false,fork:false,archived:false};
  const input=[{...base,name:'good'},{...base,name:'fork',fork:true},{...base,name:'old',archived:true},{...base,name:'secret',private:true},{...base,name:'other',owner:{login:'other'}}];
  assert.deepEqual(selectedRepos(input,'jacky105402002').map(r=>r.name),['good']);
});
test('snapshot schema rejects fabricated totals, secret fields and fixtures for publishing',()=>{
  const s=fixtureSnapshot();assert.throws(()=>validateSnapshot(s));assert.doesNotThrow(()=>validateSnapshot(s,{allowFixture:true}));
  const changed=structuredClone(s);changed.contributionTotals.calendar++;assert.throws(()=>validateSnapshot(changed,{allowFixture:true}));
  const extra=structuredClone(s);extra.accessToken='not-a-real-token';assert.throws(()=>validateSnapshot(extra,{allowFixture:true}));
  const nested=structuredClone(s);nested.daily[0].privateRepo='hidden';assert.throws(()=>validateSnapshot(nested,{allowFixture:true}));
  assert.doesNotThrow(()=>validateSnapshot(unavailable(s.login)));
});
test('URLs and text escape malicious input without invoking it',()=>{
  for(const value of ['javascript:alert(1)','http://example.org','https://user:password@example.org'])assert.throws(()=>safeUrl(value));
  assert.equal(xml('<script>&"'), '&lt;script&gt;&amp;&quot;');
  assert(!md('<script>\n[x](javascript:alert(1))').includes('<script>'));
});
test('all cards deterministic, accessible, bounded in size and share snapshot data',async()=>{
  const config=await loadConfig(),s=fixtureSnapshot();
  const first=outputs(config,s,{allowFixture:true});assert.deepEqual(first,outputs(config,s,{allowFixture:true}));
  assert.equal(Object.keys(first).filter(f=>f.endsWith('.svg')).length,6);
  assert.match(first['README.md'],/示意資料，非 Jacky/);assert(first['README.md'].includes(String(s.contributionTotals.calendar)));
  for(const [p,v]of Object.entries(first).filter(([p])=>p.endsWith('.svg'))){assert(v.includes('<title '));assert(v.includes('<desc '));assert(Buffer.byteLength(v)<100000,p);assert(!/<script|foreignObject/.test(v));}
});
test('same-day identical snapshot retains original public timestamp',()=>{
  const old=fixtureSnapshot(),next={...old,lastSuccessfulFetchAt:'2026-10-07T08:00:00.000Z'};
  assert.deepEqual(reuseTimestamp(next,old),old);
});
