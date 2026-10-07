import {dateRange,periodFor,makeSnapshot,LEVELS} from '../../scripts/core.mjs';

// Synthetic, deterministic values. Never copied to the publish directory.
export function fixtureSnapshot(){
  const fetchedAt='2026-10-07T00:23:00.000Z',period=periodFor('2026-10-07');
  const days=dateRange(period.from,period.through).map((date,i)=>{const count=i>332?i%8+1:i%9===0?0:(i*13+3)%8;return {date,contributionCount:count,contributionLevel:LEVELS[count===0?0:Math.min(4,Math.ceil(count/2))]};});
  return makeSnapshot({login:'jacky105402002',fetchedAt,fixture:true,repositories:[
    {name:'sample-app',url:'https://github.com/jacky105402002/sample-app',description:'Synthetic fixture',stars:8,languagesBytes:{TypeScript:6200,JavaScript:2100,CSS:1700}},
    {name:'sample-tool',url:'https://github.com/jacky105402002/sample-tool',description:'Synthetic fixture',stars:3,languagesBytes:{Python:1800,HTML:500,Shell:200,Rust:700}}
  ],collection:{totalCommitContributions:520,totalIssueContributions:12,totalPullRequestContributions:28,totalPullRequestReviewContributions:9,contributionCalendar:{totalContributions:days.reduce((s,d)=>s+d.contributionCount,0),weeks:[{contributionDays:days}]}}});
}
