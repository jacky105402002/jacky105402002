import test from 'node:test';
import assert from 'node:assert/strict';
import {GitHubClient,collect} from '../scripts/github.mjs';
import {fixtureSnapshot} from './fixtures/profile.mjs';
import {validateSnapshot} from '../scripts/core.mjs';

test('end-to-end API normalization uses fixed cutoff and excludes private/raw fields',async()=>{
  const sample=fixtureSnapshot(),at=sample.lastSuccessfulFetchAt;
  const contributionCalendar={totalContributions:sample.contributionTotals.calendar,weeks:[{contributionDays:sample.daily.map(d=>({date:d.date,contributionCount:d.count,contributionLevel:d.level}))}]};
  const requests=[];
  const client=new GitHubClient({token:'synthetic-token',fetchImpl:async(url,options)=>{
    requests.push(url);
    if(url.endsWith('/graphql')){
      const body=JSON.parse(options.body);assert.equal(body.variables.to,at);assert.equal(body.variables.from,'2025-11-01T00:00:00Z');
      assert.equal(options.headers['Content-Type'],'application/json');
      return Response.json({data:{user:{contributionsCollection:{totalCommitContributions:520,totalIssueContributions:12,totalPullRequestContributions:28,totalPullRequestReviewContributions:9,contributionCalendar}}}});
    }
    if(url.includes('/users/'))return Response.json([
      {name:'public-app',private:false,fork:false,archived:false,owner:{login:sample.login},stargazers_count:7,description:'Public app',rawSecret:'must never persist'},
      {name:'private-app',private:true,fork:false,archived:false,owner:{login:sample.login},stargazers_count:9}
    ]);
    if(url.endsWith('/public-app/languages'))return Response.json({TypeScript:20,CSS:10});
    throw new Error('Unexpected API URL');
  }});
  const result=await collect(client,sample.login,at);validateSnapshot(result);
  assert.equal(result.currentRepositoryTotals.repositoryCount,1);assert.equal(result.currentRepositoryTotals.stars,7);
  assert.equal(requests.length,3);assert(!JSON.stringify(result).includes('private-app'));assert(!JSON.stringify(result).includes('rawSecret'));
});
