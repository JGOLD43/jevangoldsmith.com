import{m as s,d as c}from"./dates.BQ2HxNv8.js";import{o as f,r as u,e as d}from"./collection-shared.wUOtwcxO.js";import{s as g}from"./safe-url.3NxF-h1-.js";const t={feed:document.getElementById("feed"),feedCount:document.getElementById("feed-count"),feedEmpty:document.getElementById("feed-empty"),tagRail:document.getElementById("tag-rail"),heroCount:document.getElementById("hero-count"),heroCats:document.getElementById("hero-cats"),heroUpdated:document.getElementById("hero-updated")};function m(a,o){if(!t.feed)return;if(t.feed.children.length>0){t.feedCount&&(t.feedCount.textContent=`${a.length} items`);return}const n=Object.fromEntries(o.map(e=>[e.id,e]));t.feed.innerHTML=a.map(e=>{const r=n[e.category]||{label:e.category},i=e.image?`<img class="feed-item-image" src="${d(e.image)}" alt="${d(e.title)}" loading="lazy" decoding="async">`:"",l=e.url?`<a class="feed-item-link" href="${g(e.url)}" target="_blank" rel="noopener">Visit ${d(e.source)} →</a>`:"";return`
        <article class="feed-item type-${d(e.type)}" id="item-${d(e.id)}" data-id="${d(e.id)}" data-month="${d(s(e.date))}" data-category="${d(e.category)}">
          ${i}
          <div class="feed-item-body">
            <div class="feed-item-meta">
              <span class="feed-item-tag">${d(r.label)}</span>
              <span class="feed-item-date">${d(c(e.date))}</span>
              <span class="feed-item-source">${d(e.source||"")}</span>
            </div>
            <h3 class="feed-item-title">${d(e.title)}</h3>
            <p>${d(e.body)}</p>
            ${l}
          </div>
        </article>`}).join(""),t.feedCount&&(t.feedCount.textContent=`${a.length} items`)}function p(a,o){if(t.tagRail){if(t.tagRail.children.length===0){const n=new Map;for(const l of a)n.set(l.category,(n.get(l.category)||0)+1);const e=o.filter(l=>n.has(l.id)),r=`<button type="button" class="cool-tag-pill active" data-cat="all">All <span class="count">${a.length}</span></button>`,i=e.map(l=>`
          <button type="button" class="cool-tag-pill" data-cat="${d(l.id)}">
            <span aria-hidden="true">${d(l.emoji||"")}</span>${d(l.label)}
            <span class="count">${n.get(l.id)}</span>
          </button>`).join("");t.tagRail.innerHTML=r+i}t.tagRail.addEventListener("click",n=>{const e=n.target?.closest?.(".cool-tag-pill");e&&h(e.dataset.cat||"all")})}}function h(a){t.tagRail?.querySelectorAll(".cool-tag-pill").forEach(n=>{n.classList.toggle("active",n.dataset.cat===a)});let o=0;document.querySelectorAll(".feed-item").forEach(n=>{const e=a==="all"||n.dataset.category===a;n.hidden=!e,e&&(o+=1)}),t.feedCount&&(t.feedCount.textContent=`${o} item${o===1?"":"s"}`),t.feedEmpty&&(t.feedEmpty.hidden=o!==0)}function y(a){if(!a)return"—";const o=new Date,n=new Date(`${a}T12:00:00`),e=Math.max(0,Math.round((o.getTime()-n.getTime())/864e5));if(e===0)return"Today";if(e===1)return"1d ago";if(e<30)return`${e}d ago`;const r=Math.round(e/30);return r<12?`${r}mo ago`:`${Math.round(e/365)}y ago`}function $(a,o){t.heroCount&&(t.heroCount.textContent=String(a.length));const n=new Set(a.map(r=>r.category));t.heroCats&&(t.heroCats.textContent=String(n.size||o.length));const e=a[0]?.date;t.heroUpdated&&(t.heroUpdated.textContent=y(e))}function C(){if(!t.feed)return;const a=u("jg-cool-shit-data");if(!a){t.feed.innerHTML='<p style="color:var(--text-light)">Could not load feed.</p>';return}const o=[...a.items].sort((n,e)=>e.date.localeCompare(n.date));m(o,a.categories),p(o,a.categories),$(o,a.categories)}f(C,"cool-shit init");
