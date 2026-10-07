import {xml, md, mdUrl} from './core.mjs';

const number=n=>new Intl.NumberFormat('en-US').format(n);
function wrap(value,limit=34){
  const lines=[];let line='',size=0;
  for(const ch of String(value)){const w=/[\u0000-\u007F]/.test(ch)?1:2;if(size+w>limit){lines.push(line);line='';size=0;}line+=ch;size+=w;}
  if(line)lines.push(line);return lines;
}
export function renderCards(profile,s,t) {
  const c=t.colors,sz=t.typography.sizes,w=t.card.width,p=t.card.padding;
  const text=(x,y,value,{size=sz.label,color=c.text,weight=400,anchor='start',mono=false}={})=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}"${mono?` font-family="${xml(t.typography.mono)}"`:''}>${xml(value)}</text>`;
  const line=(y)=>`<path d="M20 ${y}H340" stroke="${c.border}"/>`;
  const svg=(id,title,height,body,desc=title)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${xml(title)}</title><desc id="${id}-desc">${xml(desc)}</desc><g font-family="${xml(t.typography.sans)}"><rect x="0.5" y="0.5" width="359" height="${height-1}" rx="${t.radii.card}" fill="${c.surface}" stroke="${c.border}"/>${body}</g></svg>\n`;
  const header=title=>`<rect x="20" y="24" width="24" height="3" rx="1.5" fill="${c.primary}"/>${text(20,60,title,{size:sz.heading,weight:600})}`;
  const date=s.status==='ok'?`資料截至 ${s.sourceDate}`:'資料尚未取得';
  const period=s.status==='ok'?`${s.period.from} — ${s.period.through}`:'近 12 個月份';
  const footer=(height)=>line(height-48)+text(20,height-20,date,{color:c.textMuted});
  const empty=(key,title)=>{const h=t.components[key].minHeight;return svg(key,title,h,header(title)+text(20,96,period,{color:c.textMuted})+text(180,Math.round(h/2)+12,'資料尚未取得',{anchor:'middle',color:c.textMuted})+footer(h));};
  const cards={};
  // The wide banner is branding only; all essential copy remains native Markdown.
  cards['hero.svg']=`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="112" viewBox="0 0 720 112" role="img" aria-labelledby="hero-title hero-desc"><title id="hero-title">${xml(profile.displayName)} · BUILD &amp; REFINE</title><desc id="hero-desc">深海青綠個人識別橫幅；個人介紹與作品列於下方。</desc><rect width="720" height="112" rx="12" fill="${c.background}"/><path d="M0 110H720" stroke="${c.primary}" stroke-width="4"/><g fill="none" stroke="${c.primary}" stroke-width="2" opacity=".35"><path d="M470 112L570 12H670L570 112M560 112L660 12H760"/><circle cx="652" cy="56" r="32"/></g><g font-family="${xml(t.typography.sans)}"><text x="28" y="70" font-size="48" font-weight="600" fill="${c.text}">${xml(profile.displayName)}</text><text x="220" y="67" font-size="22" letter-spacing="2" fill="${c.primary}">BUILD &amp; REFINE</text></g></svg>\n`;
  const names={activity:'GitHub 動態',streak:'連續貢獻',languages:'語言分布',monthly:'每月貢獻',calendar:'貢獻日曆'};
  if(s.status!=='ok'){for(const [key,title]of Object.entries(names))cards[`${key}.svg`]=empty(key,title);return cards;}
  const a=s.contributionTotals;
  const metrics=[['GitHub 可見貢獻',a.calendar],['Commit 貢獻',a.commits],['PR 貢獻',a.pullRequests],['Issue 貢獻',a.issues],['Review 貢獻',a.reviews]];
  const cols=metrics.some(([,n])=>number(n).length>7)?1:2;
  let body=header(names.activity)+text(20,91,'近 12 個月份',{color:c.textMuted})+text(20,116,period,{color:c.textMuted});
  const rows=Math.ceil(metrics.length/cols),h=Math.max(440,rows*82+260);
  metrics.forEach(([label,n],i)=>{const x=20+(i%cols)*168,y=158+Math.floor(i/cols)*82;const valueSize=cols===1?Math.min(sz.metric,320/(number(n).length*.62)):sz.metric;body+=text(x,y,label,{color:c.textMuted})+text(x,y+38,number(n),{size:Math.max(16,valueSize),color:c.primary,mono:true});});
  body+=line(h-124)+text(20,h-96,`目前公開原創專案  ${number(s.currentRepositoryTotals.repositoryCount)}`)+text(20,h-69,`目前收到 Stars  ${number(s.currentRepositoryTotals.stars)}`)+footer(h);
  cards['activity.svg']=svg('activity',names.activity,h,body,`${period}，GitHub 可見貢獻 ${a.calendar}`);
  const st=s.streak,sh=300;
  body=header(names.streak)+text(20,96,'目前連續',{color:c.textMuted})+text(20,139,`${st.startBoundaryReached?'至少 ':''}${number(st.current)} 天`,{size:sz.metric,color:c.primary,mono:true})+text(20,171,st.currentThrough?`截至 ${st.currentThrough}`:'今日與昨日皆無貢獻',{color:c.textMuted})+text(20,218,`期間內最長  ${number(st.longestInPeriod)} 天`,{color:c.secondary})+footer(sh);
  cards['streak.svg']=svg('streak',names.streak,sh,body,`${period}，期間內最長 ${st.longestInPeriod} 天`);
  const langs=s.languages;
  const labelRows=langs.map(r=>({...r,lines:wrap(r.name,23)}));
  const lh=Math.max(440,356+labelRows.reduce((n,r)=>n+r.lines.length*24+16,0));
  body=header(names.languages)+text(20,91,'公開原創專案 · 程式碼位元組',{color:c.textMuted});
  if(langs.length){
    const circumference=2*Math.PI*62;let offset=0;
    for(let i=0;i<langs.length;i++){const length=circumference*langs[i].percent/100;body+=`<circle cx="180" cy="185" r="62" fill="none" stroke="${c.languageSeries[i]}" stroke-width="20" stroke-dasharray="${length.toFixed(4)} ${circumference.toFixed(4)}" stroke-dashoffset="${(-offset).toFixed(4)}" transform="rotate(-90 180 185)"/>`;offset+=length;}
    body+=text(180,183,String(langs.length),{size:sz.metric,anchor:'middle'})+text(180,209,'語言分類',{color:c.textMuted,anchor:'middle'});
    let y=290;for(let i=0;i<labelRows.length;i++){const r=labelRows[i];body+=`<rect x="20" y="${y-12}" width="10" height="10" rx="2" fill="${c.languageSeries[i]}"/>`;r.lines.forEach((l,j)=>body+=text(42,y+j*24,l));body+=text(340,y,`${r.percent.toFixed(1)}%`,{anchor:'end',mono:true,color:c.textMuted});y+=r.lines.length*24+16;}
  }else body+=text(180,185,'尚無可統計的程式碼',{anchor:'middle',color:c.textMuted});
  body+=text(20,lh-70,'程式碼分布不代表熟練度',{color:c.textMuted})+footer(lh);
  cards['languages.svg']=svg('languages',names.languages,lh,body);
  const mh=340,max=Math.max(...s.months.map(r=>r.count)),plotTop=140,plotBottom=240;
  body=header(names.monthly)+text(20,91,'單位：貢獻 · 本月尚未結束',{color:c.textMuted})+text(20,117,period,{color:c.textMuted});
  body+=`<path d="M20 ${plotBottom}H340" stroke="${c.border}"/>`+text(340,135,number(max),{anchor:'end',color:c.textMuted});
  s.months.forEach((r,i)=>{const bar=max?Math.max(r.count?2:0,(plotBottom-plotTop)*r.count/max):0,x=24+i*26.4;body+=`<rect x="${x.toFixed(1)}" y="${(plotBottom-bar).toFixed(1)}" width="17" height="${bar.toFixed(1)}" rx="2" fill="${r.isPartial?c.secondary:c.primary}"><title>${xml(r.month)}：${r.count}</title></rect>`;if(i%3===0)body+=text(x,265,r.month.slice(5)+'月',{color:c.textMuted});});
  if(!max)body+=text(180,200,'此期間無貢獻',{anchor:'middle',color:c.textMuted});
  body+=footer(mh);cards['monthly.svg']=svg('monthly',names.monthly,mh,body);
  const ch=260,offset=new Date(`${s.period.from}T00:00:00Z`).getUTCDay(),weeks=Math.ceil((s.daily.length+offset)/7),pitch=320/weeks,cell=Math.min(5,pitch-.8);
  body=header(names.calendar)+text(20,91,period,{color:c.textMuted});
  s.daily.forEach((d,i)=>{const n=i+offset,x=20+Math.floor(n/7)*pitch,y=114+(n%7)*9;body+=`<rect x="${x.toFixed(2)}" y="${y}" width="${cell.toFixed(2)}" height="7" rx="1" fill="${c.contributionLevels[d.level]}"><title>${d.date}：${d.count}</title></rect>`;});
  body+=text(20,199,'少',{color:c.textMuted});Object.values(c.contributionLevels).forEach((color,i)=>{body+=`<rect x="${49+i*17}" y="186" width="12" height="12" rx="2" fill="${color}"/>`;});body+=text(144,199,'多',{color:c.textMuted})+footer(ch);
  cards['calendar.svg']=svg('calendar',names.calendar,ch,body,`${period}，${a.calendar} 次可見貢獻`);
  return cards;
}
function details(s){
  const table=(heads,rows)=>`| ${heads.join(' | ')} |\n| ${heads.map(()=>'---').join(' | ')} |\n${rows.map(r=>`| ${r.map(v=>md(String(v))).join(' | ')} |`).join('\n')}`;
  return `<details>\n<summary>統計口徑與完整數據</summary>\n\n貢獻依 GitHub 可見資料計算，可能包含已公開的匿名私人貢獻。期間包括尚未結束的本月；Commit 等細項不一定加總成總貢獻。\n\n公開專案及 Stars 是目前值，排除 fork 與封存專案。語言占比按相同專案集合的程式碼位元組計算，不代表工時或技能熟練度。\n\n${table(['指標','數值'],[['GitHub 可見貢獻',s.contributionTotals.calendar],['Commit 貢獻',s.contributionTotals.commits],['PR 貢獻',s.contributionTotals.pullRequests],['Issue 貢獻',s.contributionTotals.issues],['Review 貢獻',s.contributionTotals.reviews],['目前公開原創專案',s.currentRepositoryTotals.repositoryCount],['目前 Stars',s.currentRepositoryTotals.stars],['目前連續天數',`${s.streak.startBoundaryReached?'至少 ':''}${s.streak.current}`],['連續天數截至',s.streak.currentThrough||'今日與昨日皆無貢獻'],['期間內最長連續天數',s.streak.longestInPeriod]])}\n\n${table(['月份','貢獻','狀態'],s.months.map(r=>[r.month,r.count,r.isPartial?'本月未結束':'完整月份']))}\n\n${table(['語言分類','程式碼 bytes','占比'],s.languages.map(r=>[r.name,r.bytes,`${r.percent.toFixed(1)}%`]))}\n\n${table(['日期','貢獻'],s.daily.map(d=>[d.date,d.count]))}\n\n</details>`;
}
const chartLabels=[['activity','活動摘要'],['streak','連續貢獻'],['languages','語言分布'],['monthly','每月貢獻'],['calendar','每日貢獻日曆']];
function summary(s){
  return [
    [number(s.contributionTotals.calendar),'次可見貢獻', '近 12 個月份'],
    [number(s.currentRepositoryTotals.repositoryCount),'個公開原創專案','目前，排除封存專案'],
    [number(s.currentRepositoryTotals.stars),'顆 Stars','上述專案目前累計']
  ];
}
function updated(s){return new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(s.lastSuccessfulFetchAt));}
export function renderReadme(profile,projects,s,template){
  const links=profile.links.map(l=>`[${md(l.label)}](${mdUrl(l.url)})`).join(' · ');
  let activity;
  if(s.status==='ok'){
    activity=`${s.fixture?'> **示意資料，非 Jacky 的真實統計。**\n\n':''}`+
      summary(s).map(([n,label,scope])=>`- **${n} ${label}** · ${scope}`).join('\n')+
      `\n\n貢獻期間：${s.period.from} — ${s.period.through}（含尚未結束的本月）。\n\n`+
      (s.languages.length?`程式碼以 **${s.languages.slice(0,3).map(r=>md(r.name)).join('、')}** 為主；依公開原創專案的程式碼量統計，不代表熟練度。\n\n`:'')+
      `<details>\n<summary>展開活動圖表</summary>\n\n`+
      chartLabels.map(([file,alt])=>`![${alt}，${s.period.from} 至 ${s.period.through}；另附文字數據](assets/generated/${file}.svg)`).join('\n\n')+
      `\n\n</details>\n\n`+details(s)+`\n\n<sub>最後更新：${updated(s)}（台灣時間）</sub>`;
  }else activity='統計資料尚未取得，更新成功後將顯示貢獻與公開專案摘要。';
  const values={NAME:md(profile.displayName),BIO:md(profile.bio),TAGLINE:md(profile.tagline),FOCUS:`**目前關注：** ${profile.focus.map(md).join(' · ')}`,PROJECTS:projects.map((p,i)=>`### ${String(i+1).padStart(2,'0')} / ${md(p.title)}\n\n${md(p.summary)}\n\n[閱讀專案與使用說明 →](https://github.com/${p.repo})${p.demoUrl?` · [開啟 Demo](${mdUrl(p.demoUrl)})`:''}`).join('\n\n'),ACTIVITY:activity,LINKS:links?`## 找到我\n\n${links}\n`:''};
  return template.replace(/\{\{([A-Z]+)\}\}/g,(_,k)=>{if(!(k in values))throw new Error(`Unknown template field: ${k}`);return values[k];}).replace(/\n{3,}/g,'\n\n').trimEnd()+'\n';
}
export function renderPreview(profile,projects,s){
  const activity=s.status==='ok'?`${s.fixture?'<aside>示意資料，非 Jacky 的真實統計。</aside>':''}<ul>${summary(s).map(([n,label,scope])=>`<li><strong>${n} ${label}</strong> · ${scope}</li>`).join('')}</ul><p>貢獻期間：${s.period.from} — ${s.period.through}（含尚未結束的本月）。</p>${s.languages.length?`<p>程式碼以 <strong>${s.languages.slice(0,3).map(r=>xml(r.name)).join('、')}</strong> 為主；依公開原創專案的程式碼量統計，不代表熟練度。</p>`:''}<details><summary>展開活動圖表</summary>${chartLabels.map(([key,label])=>`<p><img src="assets/generated/${key}.svg" alt="${label}"></p>`).join('')}</details><details><summary>統計口徑與完整數據</summary><p>本機預覽的完整文字表格請見 <a href="README.md">生成的 README</a>；GitHub 會直接在此展開表格。</p></details><p><small>最後更新：${updated(s)}（台灣時間）</small></p>`:'<p>統計資料尚未取得，更新成功後將顯示貢獻與公開專案摘要。</p>';
  return `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jacky GitHub README 預覽</title><style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0d1117;color:#e6edf3;font:16px/1.6 "Segoe UI","Microsoft JhengHei",sans-serif}main{max-width:880px;margin:24px auto;padding:32px;border:1px solid #344754;border-radius:6px}h1{font-size:32px}h2{font-size:24px;margin-top:28px}h1,h2{border-bottom:1px solid #344754;padding-bottom:8px}h3{font-size:20px;margin-top:24px}a{color:#85aeff;text-underline-offset:4px;overflow-wrap:anywhere}img{max-width:100%;height:auto}img.hero{width:720px}details{margin:12px 0}summary{cursor:pointer}li{margin:6px 0}small{color:#afbfcd}aside{padding:16px;border-left:3px solid #48d6b0;background:#192833}@media(max-width:600px){main{margin:16px;padding:24px}h1{font-size:26px}}</style><main><p><img class="hero" src="assets/generated/hero.svg" alt="${xml(profile.displayName)} · BUILD &amp; REFINE"></p><h1>${xml(profile.tagline)}</h1><p>${xml(profile.bio)}</p><p><strong>目前關注：</strong> ${profile.focus.map(xml).join(' · ')}</p><h2>精選作品</h2>${projects.map((p,i)=>`<h3>${String(i+1).padStart(2,'0')} / ${xml(p.title)}</h3><p>${xml(p.summary)}</p><p><a href="https://github.com/${p.repo}">閱讀專案與使用說明 →</a>${p.demoUrl?` · <a href="${xml(p.demoUrl)}">開啟 Demo</a>`:''}</p>`).join('')}<h2>開發足跡</h2>${activity}${profile.links.length?`<h2>找到我</h2><p>${profile.links.map(l=>`<a href="${xml(l.url)}">${xml(l.label)}</a>`).join(' · ')}</p>`:''}</main></html>\n`;
}