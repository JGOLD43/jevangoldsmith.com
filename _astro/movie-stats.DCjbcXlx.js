import{e as l,o as R,m as B,n as N}from"./collection-shared.wUOtwcxO.js";const p="movie-stats-panel";function F(s){const t=Number(s);return t?`${Math.floor(t/10)*10}s`:null}function y(s){const t=Number(s.starCount);return Number.isFinite(t)&&t>0?t:null}function d(s){const t=Number(s.timesWatched);return Number.isFinite(t)&&t>0?t:1}function H(s){const t=Array.isArray(s)?s:[],n=t.filter(a=>Number(a.runtime)>0),e=t.length,i=t.reduce((a,r)=>a+d(r),0),c=t.reduce((a,r)=>a+Number(r.runtime||0)*d(r),0),f=n.length?Math.round(n.reduce((a,r)=>a+Number(r.runtime),0)/n.length):0;let m=null,h=null;for(const a of n)(!m||Number(a.runtime)>Number(m.runtime))&&(m=a),(!h||Number(a.runtime)<Number(h.runtime))&&(h=a);const v={};for(const a of t){const r=Number(a.runtime||0)*d(a);if(r<=0)continue;const o=a.genre||"Uncategorized";v[o]=(v[o]||0)+r}const g={};for(const a of t){const r=F(a.year);r&&(g[r]=(g[r]||0)+1)}const b={1:0,2:0,3:0,4:0,5:0};for(const a of t){const r=y(a);r!=null&&(b[r]=(b[r]||0)+1)}const u={};for(const a of t){const r=y(a);if(r==null)continue;const o=a.genre||"Uncategorized";u[o]||(u[o]={sum:0,count:0}),u[o].sum+=r,u[o].count+=1}const x=Object.entries(u).map(([a,{sum:r,count:o}])=>({genre:a,avg:r/o,count:o})).sort((a,r)=>r.avg-a.avg),M=t.filter(a=>d(a)>1).sort((a,r)=>d(r)-d(a)).slice(0,5);return{totalFilms:e,totalWatches:i,totalMinutes:c,totalHours:Math.round(c/60),avgRuntime:f,longest:m,shortest:h,hoursByGenre:v,filmsByDecade:g,filmsByRating:b,avgRatingByGenre:x,mostRewatched:M,enrichedCount:n.length}}function $(s){const t=Number(s)||0;if(t<=0)return"—";const n=Math.floor(t/60),e=t%60;return n===0?`${e}m`:e===0?`${n}h`:`${n}h ${e}m`}function A(s){const t=s/60;return t>=100?`${Math.round(t)} hr`:`${t.toFixed(1)} hr`}function j(s){return`
            <div class="stats-headline-grid">
                <div class="stats-headline-card">
                    <div class="stats-headline-value">${s.totalHours.toLocaleString()}</div>
                    <div class="stats-headline-label">Total hours watched</div>
                </div>
                <div class="stats-headline-card">
                    <div class="stats-headline-value">${s.totalFilms.toLocaleString()}</div>
                    <div class="stats-headline-label">Films logged</div>
                </div>
                <div class="stats-headline-card">
                    <div class="stats-headline-value">${s.totalWatches.toLocaleString()}</div>
                    <div class="stats-headline-label">Total watches</div>
                </div>
                <div class="stats-headline-card">
                    <div class="stats-headline-value">${$(s.avgRuntime)}</div>
                    <div class="stats-headline-label">Avg runtime</div>
                </div>
            </div>
        `}function L(s){const t=(n,e)=>e?`
                <div class="stats-extreme-card">
                    <div class="stats-extreme-title">${l(n)}</div>
                    <div class="stats-extreme-movie">
                        ${e.poster?`<img src="${l(e.poster)}" alt="" class="stats-extreme-poster" loading="lazy" decoding="async">`:""}
                        <div>
                            <div class="stats-extreme-name">${l(e.title)}</div>
                            <div class="stats-extreme-meta">${l(e.year||"")} · ${l($(e.runtime))}</div>
                        </div>
                    </div>
                </div>
            `:"";return`
            <div class="stats-extremes">
                ${t("Longest film",s.longest)}
                ${t("Shortest film",s.shortest)}
            </div>
        `}function S(s){const t=Object.entries(s.hoursByGenre).sort((e,i)=>i[1]-e[1]);if(t.length===0)return"";const n=t[0][1];return`
            <section class="stats-section">
                <h3 class="stats-section-title">Hours by genre</h3>
                ${t.map(([e,i])=>{const c=n>0?Math.max(2,Math.round(i/n*100)):0;return`
                            <div class="stats-bar-row">
                                <span class="stats-bar-label">${l(e)}</span>
                                <span class="stats-bar-track"><span class="stats-bar-fill" style="width: ${c}%"></span></span>
                                <span class="stats-bar-value">${l(A(i))}</span>
                            </div>
                        `}).join("")}
            </section>
        `}function E(s){const t=Object.entries(s.filmsByDecade).sort((e,i)=>e[0].localeCompare(i[0]));if(t.length===0)return"";const n=t.reduce((e,[,i])=>Math.max(e,i),0);return`
            <section class="stats-section">
                <h3 class="stats-section-title">Films by decade</h3>
                ${t.map(([e,i])=>{const c=n>0?Math.max(2,Math.round(i/n*100)):0;return`
                            <div class="stats-bar-row">
                                <span class="stats-bar-label">${l(e)}</span>
                                <span class="stats-bar-track"><span class="stats-bar-fill" style="width: ${c}%"></span></span>
                                <span class="stats-bar-value">${i}</span>
                            </div>
                        `}).join("")}
            </section>
        `}function G(s){const t=[5,4,3,2,1].map(i=>[i,s.filmsByRating[i]||0]);if(t.reduce((i,[,c])=>i+c,0)===0)return"";const e=t.reduce((i,[,c])=>Math.max(i,c),0);return`
            <section class="stats-section">
                <h3 class="stats-section-title">Films by rating</h3>
                ${t.map(([i,c])=>{const f=e>0?Math.max(2,Math.round(c/e*100)):0;return`
                            <div class="stats-bar-row">
                                <span class="stats-bar-label">${"★".repeat(i)}</span>
                                <span class="stats-bar-track"><span class="stats-bar-fill" style="width: ${f}%"></span></span>
                                <span class="stats-bar-value">${c}</span>
                            </div>
                        `}).join("")}
            </section>
        `}function k(s){return s.avgRatingByGenre.length?`
            <section class="stats-section">
                <h3 class="stats-section-title">Avg rating by genre</h3>
                ${s.avgRatingByGenre.map(({genre:t,avg:n,count:e})=>{const i=Math.max(2,Math.round(n/5*100));return`
                            <div class="stats-bar-row">
                                <span class="stats-bar-label">${l(t)}</span>
                                <span class="stats-bar-track"><span class="stats-bar-fill" style="width: ${i}%"></span></span>
                                <span class="stats-bar-value">${n.toFixed(2)}★ <span class="stats-bar-aside">(${e})</span></span>
                            </div>
                        `}).join("")}
            </section>
        `:""}function D(s){return s.mostRewatched.length?`
            <section class="stats-section">
                <h3 class="stats-section-title">Most rewatched</h3>
                <ul class="stats-rewatch-list">
                    ${s.mostRewatched.map(t=>`
                        <li>
                            <span class="stats-rewatch-count">${d(t)}×</span>
                            <span class="stats-rewatch-title">${l(t.title)}</span>
                            <span class="stats-rewatch-year">${l(t.year||"")}</span>
                        </li>
                    `).join("")}
                </ul>
            </section>
        `:""}function I(s){return`
            <div class="stats-empty">
                <p>No runtime data yet. Run <code>npm run enrich:movies</code> with a TMDB API key to populate stats.</p>
                ${s>0?`<p class="stats-empty-meta">${s} film${s===1?"":"s"} missing runtime.</p>`:""}
            </div>
        `}function O(s){const t=document.getElementById(p);if(!t)return;const n=t.querySelector(".stats-body");if(!n)return;const e=H(s);if(e.enrichedCount===0){n.innerHTML=I(e.totalFilms);return}n.innerHTML=[j(e),L(e),S(e),E(e),G(e),k(e),D(e)].join("")}function w(s){const t=document.getElementById(p);if(!t)return;const n=document.querySelector(".stats-toggle");t.classList.toggle("collapsed",!s),t.hidden=!s,n&&(n.setAttribute("aria-expanded",s?"true":"false"),n.setAttribute("aria-label",s?"Hide watch stats":"Show watch stats"))}function T(){const s=document.getElementById(p);if(!s)return;const t=s.hasAttribute("hidden");w(t),N("movie-stats-collapsed",t?"0":"1")}function C(){if(!document.getElementById(p))return;const s=document.querySelector(".stats-toggle");s&&s.addEventListener("click",T),w(B("movie-stats-collapsed")==="0")}R(C,"movie-stats init");export{O as render};
