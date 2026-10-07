import assert from 'node:assert/strict';
import {count, makeSnapshot, periodFor, selectedRepos, safeText} from './core.mjs';

export const API_VERSION='2026-03-10';
export class GitHubClient {
  constructor({token,fetchImpl=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),now=()=>Date.now(),budgetMs=540000}={}) {
    this.token=token;this.fetch=fetchImpl;this.sleep=sleep;this.now=now;this.deadline=now()+budgetMs;
  }
  async request(input,body) {
    const u=new URL(input,'https://api.github.com');
    assert(u.origin==='https://api.github.com' && !u.username && !u.password,'Untrusted API URL');
    for(let attempt=0;attempt<3;attempt++) {
      const remaining=this.deadline-this.now();assert(remaining>0,'API time budget exceeded');
      let response;
      try {
        response=await this.fetch(u.href,{method:body?'POST':'GET',redirect:'error',headers:{Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':API_VERSION,'User-Agent':'jacky-profile-builder',...(this.token?{Authorization:`Bearer ${this.token}`}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(Math.min(20000,remaining))});
      } catch {
        if(attempt===2)throw new Error('GitHub network request failed after retries');
        await this.pause(1000*2**attempt);continue;
      }
      const limited=response.status===429 || (response.status===403 && (response.headers.has('retry-after') || response.headers.get('x-ratelimit-remaining')==='0'));
      if(limited || response.status>=500) {
        if(attempt===2)throw new Error(`GitHub HTTP ${response.status} after retries`);
        const retry=response.headers.get('retry-after');
        const delay=retry ? (/^\d+$/.test(retry)?Number(retry)*1000:Date.parse(retry)-this.now()) : limited&&response.headers.get('x-ratelimit-reset')?Number(response.headers.get('x-ratelimit-reset'))*1000-this.now():1000*2**attempt;
        await this.pause(Math.max(1000,delay));continue;
      }
      if(!response.ok)throw new Error(`GitHub HTTP ${response.status}; check account, permissions or endpoint`);
      const data=await response.json();
      if(data.errors?.length)throw new Error('GitHub GraphQL returned incomplete data');
      return {data,headers:response.headers};
    }
  }
  async pause(ms){assert(Number.isFinite(ms) && ms < this.deadline-this.now(),'Rate limit exceeds remaining time budget');await this.sleep(ms);}
  async repositories(login) {
    let url=`https://api.github.com/users/${login}/repos?per_page=100&type=owner`;const seen=new Set(),rows=[];
    while(url){assert(!seen.has(url) && seen.size<1000,'Invalid pagination');seen.add(url);const {data,headers}=await this.request(url);assert(Array.isArray(data),'Invalid repository list');rows.push(...data);
      const next=(headers.get('link')||'').match(/<([^>]+)>;\s*rel="next"/);url=next?.[1];
      if(url){const u=new URL(url);assert(u.origin==='https://api.github.com' && u.pathname===`/users/${login}/repos`,'Invalid pagination destination');}
    }
    return selectedRepos(rows,login);
  }
}
export async function collect(client,login,at=new Date().toISOString()) {
  assert(client.token,'Set PROFILE_READ_TOKEN or GITHUB_TOKEN before updating; existing files have been preserved');
  const period=periodFor(at.slice(0,10));
  const {data}=await client.request('/graphql',{query:`query Profile($login:String!,$from:DateTime!,$to:DateTime!){ user(login:$login){ contributionsCollection(from:$from,to:$to){ totalCommitContributions totalIssueContributions totalPullRequestContributions totalPullRequestReviewContributions contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}} } } }`,variables:{login,from:`${period.from}T00:00:00Z`,to:at}});
  assert(data.data?.user?.contributionsCollection,'GitHub user or contribution data unavailable');
  const repos=await client.repositories(login),repositories=[];
  // Three requests at a time; no unbounded Promise.all on the repository list.
  for(let i=0;i<repos.length;i+=3){
    const group=await Promise.all(repos.slice(i,i+3).map(async r=>{
      const {data:languages}=await client.request(`/repos/${login}/${encodeURIComponent(r.name)}/languages`);
      assert(languages && typeof languages==='object' && !Array.isArray(languages),'Invalid languages response');
      const languagesBytes=Object.fromEntries(Object.entries(languages).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[safeText(k,100),count(v)]));
      return {name:r.name,url:`https://github.com/${login}/${r.name}`,description:safeText(r.description||'',1000),stars:count(r.stargazers_count),languagesBytes};
    }));repositories.push(...group);
  }
  return makeSnapshot({login,fetchedAt:at,repositories,collection:data.data.user.contributionsCollection});
}
