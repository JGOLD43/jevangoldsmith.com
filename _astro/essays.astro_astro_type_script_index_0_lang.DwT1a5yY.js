import{f as b,a as v}from"./dates.BQ2HxNv8.js";import{a as E,o as C,d as I,c as x,t as S,r as $,b as w,e as i}from"./collection-shared.wUOtwcxO.js";const T=["philosophy","management","technology","personal","finance","writing"];let r=null;const s={activeCategory:"all",currentIndex:0,essays:[],filteredEssays:[],searchTerm:"",sidebarCollapsed:!1};function B(e,t){return t==="all"?e:e.filter(n=>String(n.category||"").toLowerCase()===t)}function k(e,t){const n=t.trim().toLowerCase();return n?e.filter(a=>[a.title,a.subtitle||"",a.category,a.content||""].join(" ").toLowerCase().includes(n)):e}function g(e){const t=Object.fromEntries(T.map(n=>[n,[]]));return e.forEach(n=>{const a=String(n.category||"").toLowerCase();t[a]&&t[a].push(n)}),t}function p(e,t){return e.findIndex(n=>n.id===t)}function L(e){const t=document.createElement("article");return t.className="article-full",t.id=e.id,t.innerHTML=`
        <div class="post-meta">
            <span class="post-date">${i(v(e.date))}</span>
            <span class="post-category">${i(e.category)}</span>
        </div>
        <h2>${i(e.title)}</h2>
        ${e.subtitle?`<p><em>${i(e.subtitle)}</em></p>`:""}
        ${e.content||""}
    `,t}function A(e,t){const n=document.createElement("div");n.className="essay-nav";const a=e.length,o=t<=0,d=t>=a-1,u=o?"":e[t-1].title,l=d?"":e[t+1].title;return n.innerHTML=`
        <button class="essay-nav-btn essay-nav-prev" ${o?"disabled":""} data-action="prevEssay">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span class="essay-nav-label">
                <span class="essay-nav-direction">Previous</span>
                ${u?`<span class="essay-nav-title">${i(u)}</span>`:""}
            </span>
        </button>
        <span class="essay-nav-counter">${t+1} / ${a}</span>
        <button class="essay-nav-btn essay-nav-next" ${d?"disabled":""} data-action="nextEssay">
            <span class="essay-nav-label essay-nav-label-right">
                <span class="essay-nav-direction">Next</span>
                ${l?`<span class="essay-nav-title">${i(l)}</span>`:""}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
    `,n}function f(e){document.querySelectorAll(".essay-link").forEach(t=>{t.classList.toggle("active",t.getAttribute("href")===`#${e}`)})}let m=!1;function D(e,t){const n=document.getElementById("essays-container");if(!n)return;if(!e.length){n.innerHTML='<p style="text-align: center; color: var(--text-light); padding: 3rem;">No essays published yet.</p>';return}const a=e[t];if(!m){m=!0;const o=n.querySelector("article.article-full");if(o&&o.id===a.id){f(a.id);return}}n.innerHTML="",n.appendChild(L(a)),n.appendChild(A(e,t)),f(a.id)}function M(e){const t=document.getElementById("count-all");if(t){const n=Object.values(e).reduce((a,o)=>a+o.length,0);t.textContent=String(n)}Object.keys(e).forEach(n=>{const a=e[n],o=document.getElementById(`count-${n}`),d=o?.closest(".sidebar-section"),u=document.getElementById(`category-${n}`);o&&(o.textContent=String(a.length)),d&&(d.style.display=a.length===0?"none":"block"),u&&(u.innerHTML=a.map(l=>`
                <a href="#${w(l.id)}" class="essay-link" data-action="scrollToEssay" data-action-args="${encodeURIComponent(l.id)}" data-action-eventobj="true">
                    <div>${i(l.title)}</div>
                    <div class="essay-link-date">${i(b(l.date))}</div>
                </a>
            `).join(""))})}function j(e){const t=document.getElementById("essay-count");t&&(t.textContent=String(e))}function H(){const e=document.getElementById("essays-container");e&&(e.innerHTML=`
        <div style="text-align: center; padding: 3rem;">
            <p style="color: var(--accent-color); font-size: 1.2rem; margin-bottom: 1rem;">Unable to load essays</p>
            <p style="color: var(--text-light);">Please try refreshing the page.</p>
        </div>
    `)}function y(){const e=document.querySelector(".essays-main");if(e){e.scrollIntoView({behavior:"smooth",block:"start"});return}window.scrollTo({top:0,behavior:"smooth"})}function O(){const e=$("jg-essays-data");if(!e||!Array.isArray(e.essays)){H();return}s.essays=e.essays.filter(t=>t.status==="published").sort((t,n)=>new Date(n.date).getTime()-new Date(t.date).getTime()),s.filteredEssays=s.essays,c()}function F(){const e=B(s.essays,s.activeCategory);return k(e,s.searchTerm)}function N(e){const t=Math.max(0,Math.min(s.currentIndex,Math.max(e.length-1,0)));return s.filteredEssays=e,s.currentIndex=t,{essays:e,currentIndex:t}}function c(){r?.render()}function R(){r=x({getState:()=>({...s}),getFilteredItems:()=>F(),getVisibleItems:e=>N(e),renderSidebar:()=>M(g(s.essays)),groupItems:()=>g(s.essays),renderVisibleItems:e=>D(e.essays,e.currentIndex),updateCount:e=>j(e.essays.length),updateControls:e=>S("search-clear-btn",!!e.searchTerm,"block"),group:{allButtonSelector:'[data-action="toggleCategory"][data-action-args="all"]',buttonSelector:".sidebar-category",panelForValue:e=>e==="all"?null:document.getElementById(`category-${e}`),panelSelector:".category-essays"},searchClearButtonId:"search-clear-btn",searchInputId:"essay-search",storageKey:"essays-sidebar-collapsed",layoutId:"essays-layout",sidebarId:"essays-sidebar",defaultCollapsed:!1})}function h(e){e(),s.activeCategory="all",s.currentIndex=0,r?.resetGrouping(),c()}function V(e,t){const n=t?.target?.closest(".sidebar-category"),a=e==="all"?null:document.getElementById(`category-${e}`);r?.toggleGroup({value:e,button:n,panel:a,onCollapse:()=>{s.activeCategory="all",s.currentIndex=0},onExpand:()=>{s.activeCategory=e,s.currentIndex=0}})}const G=I(e=>{h(()=>{s.searchTerm=String(e||"").trim().toLowerCase()})});function q(){r?.clearSearchInput(),h(()=>{s.searchTerm=""})}function P(){s.currentIndex<=0||(s.currentIndex-=1,c(),y())}function Y(){s.currentIndex>=s.filteredEssays.length-1||(s.currentIndex+=1,c(),y())}function z(e,t){t?.preventDefault();const n=p(s.filteredEssays,e);if(n>=0){s.currentIndex=n,c(),y();return}const a=p(s.essays,e);a<0||(s.activeCategory="all",s.currentIndex=a,r?.resetGrouping(),c(),y())}function K(){s.sidebarCollapsed=!!r?.toggleSidebar()}function U(){s.sidebarCollapsed=!!r?.restoreSidebar()}function _(){r?.toggleListDropdown()}E({clearEssaySearch:q,nextEssay:Y,prevEssay:P,scrollToEssay:z,searchEssays:G,toggleCategory:V,toggleEssaysSidebar:K,toggleListDropdown:_});function J(){R(),U(),document.addEventListener("click",e=>{r?.closeDropdownOnOutsideClick(e)}),O()}C(J,"essays init");
