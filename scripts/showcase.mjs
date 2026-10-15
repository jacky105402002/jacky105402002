import {xml} from './core.mjs';

// Art is a conceptual project cover, not a screenshot of a product UI.
export function responsiveImage(name, alt, href) {
  // GitHub keeps a sidebar at tablet widths, leaving the README much narrower.
  const picture=`<picture>\n  <source media="(max-width: 900px)" srcset="assets/generated/${name}-mobile.svg">\n  <img src="assets/generated/${name}.svg" alt="${xml(alt)}" width="720">\n</picture>`;
  return href ? `<a href="${xml(href)}">\n${picture}\n</a>` : picture;
}

export function renderShowcase(projects, snapshot, tokens) {
  const c=tokens.colors, font=xml(tokens.typography.sans), out={};
  const text=(x,y,value,size=22,color=c.text,weight=400,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" ${extra}>${xml(value)}</text>`;
  const box=(x,y,w,h,stroke=c.border,fill=c.surface,r=10)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
  const line=(x1,y1,x2,y2,color=c.border)=>`<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${color}"/>`;
  const svg=(id,w,h,title,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${xml(title)}</title><desc id="${id}-desc">${xml(title)}。重要說明與連結另以原生文字呈現。</desc><g font-family="${font}">${box(.5,.5,w-1,h-1,c.border,c.background,14)}${body}</g></svg>\n`;

  projects.forEach((project,i)=>{
    const p=project.showcase, accent=i%2?c.secondary:c.primary, index=String(i+1).padStart(2,'0');
    for(const mobile of [false,true]){
      const w=mobile?360:720,h=mobile?216:224,name=`project-${i+1}${mobile?'-mobile':''}`;
      let body=`<path d="M24 1H${w-24}" stroke="${accent}" stroke-width="2"/>`;
      body+=text(24,40,`${index} / ${p.category}`,mobile?20:18,accent,500);
      body+=text(24,mobile?88:101,p.name,mobile?32:38,c.text,600);
      if(mobile){
        const ys=158;
        p.steps.forEach((step,j)=>{
          const x=24+j*108;
          if(j<2)body+=line(x+94,ys,x+108,ys,accent);
          body+=box(x,ys-24,96,48,c.border,c.surface,8)+text(x+48,ys+8,step,22,c.text,500,'text-anchor="middle"');
        });
      }else{
        body+=text(24,139,p.caption,22,c.textMuted);
        body+=line(24,182,190,182)+text(24,207,p.kind==='workflow'?'METHOD / SYSTEM':'TOOLS / DELIVERY',16,c.textMuted);
        if(p.kind==='workflow'){
          // A visible loop represents iteration, not task completion status.
          body+=`<path d="M453 61H661V174H453Z" fill="none" stroke="${accent}" stroke-opacity=".45"/>`;
          p.steps.forEach((step,j)=>{
            const y=32+j*58,x=432+j*16;
            body+=box(x,y,232,46,c.border,c.surface,8)+text(x+18,y+30,`0${j+1}`,18,accent)+text(x+66,y+30,step,22);
            body+=`<circle cx="${x+211}" cy="${y+23}" r="3" fill="${accent}"/>`;
          });
        }else{
          body+=box(446,35,214,140,c.border,c.background,12)+box(430,47,214,140,c.border,c.surface,12)+box(414,59,214,140,accent,c.surface,12);
          body+=text(438,96,'< / >',30,accent,500)+line(438,114,604,114);
          body+=text(438,146,'React + Vite',22,c.text,500)+text(438,179,'IIS / Zeabur',18,c.textMuted);
        }
      }
      out[`${name}.svg`]=svg(name,w,h,`${p.name}：${p.steps.join(' → ')}，專案概念封面`,body);
    }
  });

  for(const mobile of [false,true]){
    const name=`overview${mobile?'-mobile':''}`,w=mobile?360:720,h=mobile?284:190;
    let body=text(24,36,'DEVELOPMENT / SNAPSHOT',mobile?19:18,c.textMuted,500);
    if(snapshot.status!=='ok'){
      body+=text(24,105,'資料尚未取得',mobile?26:32,c.text,500);
    }else{
      const metrics=[
        [snapshot.contributionTotals.calendar,'期間可見貢獻',c.primary],
        [snapshot.currentRepositoryTotals.repositoryCount,'公開原創專案',c.text],
        [snapshot.currentRepositoryTotals.stars,'專案 Stars',c.secondary]
      ];
      metrics.forEach(([value,label,color],i)=>{
        const formatted=new Intl.NumberFormat('en-US').format(value);
        if(mobile){
          const y=96+i*76;
          if(i)body+=line(24,y-51,336,y-51);
          body+=text(24,y,label,22,c.textMuted);
          body+=text(336,y+2,formatted,Math.min(40,160/(formatted.length*.63)),color,600,'text-anchor="end"');
        }else{
          const x=24+i*232;
          if(i)body+=line(x-16,65,x-16,158);
          body+=text(x,111,formatted,Math.min(46,200/(formatted.length*.63)),color,600);
          body+=text(x,153,label,22,c.textMuted);
        }
      });
    }
    out[`${name}.svg`]=svg(name,w,h,snapshot.status==='ok'?`${snapshot.period.from} 至 ${snapshot.period.through}，${snapshot.contributionTotals.calendar} 次可見貢獻；目前 ${snapshot.currentRepositoryTotals.repositoryCount} 個公開原創專案、${snapshot.currentRepositoryTotals.stars} 顆 Stars`:'開發概覽：資料尚未取得',body);
  }
  return out;
}
