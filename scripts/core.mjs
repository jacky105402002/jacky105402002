import assert from 'node:assert/strict';

export const LEVELS = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];
export const REPO_SCOPE = 'public-owned-nonfork-unarchived';
export const CONTRIBUTION_SCOPE = 'github-visible-including-public-anonymous-counts';
export function validDate(s) {
  assert(typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s), 'Invalid calendar date');
  assert(new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s, 'Invalid calendar date');
  return s;
}
export function dayAdd(s, n) { return new Date(Date.parse(`${validDate(s)}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10); }
export function periodFor(through) {
  validDate(through);
  const [y, m] = through.split('-').map(Number);
  return {from: new Date(Date.UTC(y, m - 12, 1)).toISOString().slice(0, 10), through};
}
export function dateRange(from, through) {
  validDate(from); validDate(through);
  const days = Math.round((Date.parse(through) - Date.parse(from)) / 86400000);
  assert(days >= 0 && days <= 366, 'Invalid period');
  return Array.from({length: days + 1}, (_, i) => dayAdd(from, i));
}
export function count(n, label = 'count') { assert(Number.isSafeInteger(n) && n >= 0, `Invalid ${label}`); return n; }
export function safeText(value, limit = 1000) {
  assert(typeof value === 'string' && value.length <= limit && !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value), 'Invalid text');
  return value;
}
export function safeUrl(value) {
  safeText(value, 2048);
  const u = new URL(value);
  assert(u.protocol === 'https:' && !u.username && !u.password, 'Only HTTPS links without credentials are allowed');
  return u.href;
}
export function xml(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])); }
export function md(value) { return safeText(String(value), 5000).replace(/\r?\n/g, ' ').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\\`*_{}\[\]()!|#]/g, '\\$&'); }
export function mdUrl(value) { return safeUrl(value).replace(/[()<>\s]/g, c => encodeURIComponent(c)); }
export function validateConfig(profile, projects, tokens) {
  assert(profile.login === 'jacky105402002', 'Unexpected profile account');
  safeText(profile.displayName, 40); safeText(profile.tagline, 40); safeText(profile.bio, 300);
  assert(Array.isArray(profile.focus) && profile.focus.length <= 6); profile.focus.forEach(x => safeText(x, 40));
  assert(Array.isArray(profile.links)); profile.links.forEach(x => {safeText(x.label, 40); safeUrl(x.url);});
  assert(Array.isArray(projects) && projects.length >= 2 && projects.length <= 3);
  assert(new Set(projects.map(p => p.repo)).size === projects.length, 'Duplicate featured repo');
  projects.forEach(p => {
    assert(/^jacky105402002\/[\w.-]+$/.test(p.repo), 'Invalid featured repo');
    safeText(p.title, 100); safeText(p.summary, 300); validDate(p.verifiedAt); safeUrl(p.source);
    if (p.demoUrl) safeUrl(p.demoUrl);
  });
  const hex = v => assert(/^#[0-9A-Fa-f]{6}$/.test(v), 'Invalid color token');
  for (const v of Object.values(tokens.colors)) {
    if (typeof v === 'string') hex(v); else Object.values(v).forEach(hex);
  }
  assert(tokens.card.width === 360 && tokens.card.padding === 20, 'Unsupported card geometry');
  safeText(tokens.typography.sans, 200); safeText(tokens.typography.mono, 200);
  for (const value of Object.values(tokens.typography.sizes)) assert(Number.isFinite(value) && value >= 16 && value <= 64);
  assert(tokens.colors.languageSeries.length === 6); LEVELS.forEach(x => hex(tokens.colors.contributionLevels[x]));
  return true;
}
export function selectedRepos(repos, login) {
  assert(Array.isArray(repos));
  const selected = repos.filter(r => r.owner?.login?.toLowerCase() === login.toLowerCase() && r.private === false && r.fork === false && r.archived === false);
  assert(new Set(selected.map(x => x.name)).size === selected.length, 'Duplicate repository page');
  return selected.sort((a,b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}
export function languageMetrics(repos) {
  const totals = new Map();
  for (const r of repos) for (const [name, bytes] of Object.entries(r.languagesBytes)) {
    safeText(name, 100); count(bytes, 'language bytes');
    totals.set(name, count((totals.get(name) || 0) + bytes));
  }
  let rows = [...totals].filter(([,b]) => b > 0).map(([name, bytes]) => ({name, bytes})).sort((a,b) => b.bytes - a.bytes || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  if (rows.length > 5) rows = [...rows.slice(0,5), {name:'其他', bytes:rows.slice(5).reduce((s,r)=>count(s+r.bytes),0)}];
  const total = rows.reduce((s,r) => count(s+r.bytes), 0);
  if (!total) return [];
  const units = rows.map(r => Number(BigInt(r.bytes) * 1000n / BigInt(total)));
  const rank = rows.map((r,i) => ({i, remainder:BigInt(r.bytes)*1000n%BigInt(total)})).sort((a,b)=> a.remainder===b.remainder ? a.i-b.i : a.remainder>b.remainder ? -1:1);
  for(let left=1000-units.reduce((s,n)=>s+n,0),i=0; i<left; i++) units[rank[i].i]++;
  return rows.map((r,i) => ({...r, percent:units[i]/10}));
}
export function derive(daily, repositories, period) {
  const expected = dateRange(period.from, period.through);
  assert(daily.length === expected.length, 'Missing contribution dates');
  daily.forEach((d,i) => {assert.deepEqual(Object.keys(d).sort(),['count','date','level']);assert(d.date === expected[i], 'Missing, duplicate or unordered contribution date');count(d.count);assert(LEVELS.includes(d.level));assert((d.count===0)===(d.level==='NONE'), 'Contribution level mismatch');});
  const months = [];
  for (const d of daily) {
    const month=d.date.slice(0,7);
    if (months.at(-1)?.month!==month) months.push({month,count:0,isPartial:month===period.through.slice(0,7)});
    months.at(-1).count=count(months.at(-1).count+d.count);
  }
  assert(months.length===12, 'Expected 12 calendar months');
  let run=0,longest=0;
  for(const d of daily){run=d.count>0?run+1:0;longest=Math.max(longest,run);}
  let end=daily.length-1;
  if(daily[end].count===0)end--;
  let current=0;
  for(let i=end;i>=0 && daily[i].count>0;i--)current++;
  return {
    currentRepositoryTotals:{repositoryCount:repositories.length,stars:repositories.reduce((s,r)=>count(s+count(r.stars)),0)},
    languages:languageMetrics(repositories),months,
    streak:{current,currentThrough:current?daily[end].date:null,longestInPeriod:longest,startBoundaryReached:current>0 && end-current+1===0},
    calendar:daily.reduce((s,d)=>count(s+d.count),0)
  };
}
export function unavailable(login) {
  return {schemaVersion:'1.0.0',login,status:'unavailable',sourceDate:null,lastSuccessfulFetchAt:null,period:null,repositoryScope:REPO_SCOPE,contributionScope:CONTRIBUTION_SCOPE,repositories:[],daily:[],contributionTotals:null,currentRepositoryTotals:null,languages:[],months:[],streak:null};
}
export function makeSnapshot({login, fetchedAt, repositories, collection, fixture=false}) {
  const sourceDate=fetchedAt.slice(0,10),period=periodFor(sourceDate);
  const daily=collection.contributionCalendar.weeks.flatMap(w=>w.contributionDays).filter(d=>d.date>=period.from && d.date<=sourceDate).map(d=>({date:d.date,count:d.contributionCount,level:d.contributionLevel})).sort((a,b)=>a.date.localeCompare(b.date));
  const derived=derive(daily,repositories,period);
  assert(derived.calendar===collection.contributionCalendar.totalContributions,'Calendar total mismatch');
  const s={...unavailable(login),status:'ok',sourceDate,lastSuccessfulFetchAt:fetchedAt,period,repositories,daily,
    contributionTotals:{calendar:derived.calendar,commits:collection.totalCommitContributions,issues:collection.totalIssueContributions,pullRequests:collection.totalPullRequestContributions,reviews:collection.totalPullRequestReviewContributions},
    currentRepositoryTotals:derived.currentRepositoryTotals,languages:derived.languages,months:derived.months,streak:derived.streak};
  if(fixture)s.fixture=true;
  validateSnapshot(s,{allowFixture:fixture});return s;
}
export function validateSnapshot(s,{allowFixture=false}={}) {
  assert(s.schemaVersion==='1.0.0' && s.login==='jacky105402002','Invalid snapshot identity');
  assert(!s.fixture || allowFixture,'Fixture data cannot be published');
  assert(s.repositoryScope===REPO_SCOPE && s.contributionScope===CONTRIBUTION_SCOPE);
  const allowed=new Set(Object.keys(unavailable(s.login)).concat(allowFixture?['fixture']:[]));
  assert(Object.keys(s).every(k=>allowed.has(k)), 'Unknown snapshot field');
  if(s.status==='unavailable'){assert.deepEqual(s,unavailable(s.login));return true;}
  assert(s.status==='ok'); validDate(s.sourceDate);
  assert(new Date(s.lastSuccessfulFetchAt).toISOString()===s.lastSuccessfulFetchAt,'Invalid fetch timestamp');
  assert(s.lastSuccessfulFetchAt.slice(0,10)===s.sourceDate);
  assert.deepEqual(s.period,periodFor(s.sourceDate));
  assert(new Set(s.repositories.map(r=>r.name)).size===s.repositories.length);
  s.repositories.forEach(r=>{
    assert.deepEqual(Object.keys(r).sort(),['description','languagesBytes','name','stars','url']);
    assert(/^[\w.-]+$/.test(r.name));
    assert(r.url===`https://github.com/${s.login}/${r.name}`,'Unexpected repository URL');
    safeText(r.description,1000);count(r.stars);
    assert(r.languagesBytes && typeof r.languagesBytes==='object' && !Array.isArray(r.languagesBytes));
  });
  const d=derive(s.daily,s.repositories,s.period);
  assert.deepEqual(Object.keys(s.contributionTotals).sort(),['calendar','commits','issues','pullRequests','reviews']);
  Object.values(s.contributionTotals).forEach(n=>count(n));
  assert(s.contributionTotals.calendar===d.calendar);
  for(const key of ['currentRepositoryTotals','languages','months','streak'])assert.deepEqual(s[key],d[key]);
  return true;
}
