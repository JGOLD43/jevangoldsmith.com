import{l as y,b as r,e as s,a as h,o as v,c as k}from"./collection-shared.wUOtwcxO.js";function $(e,l=2500){const o=window;if(typeof o.requestIdleCallback=="function"){o.requestIdleCallback(e,{timeout:l});return}setTimeout(e,Math.min(l,1500))}function S(e){return String(e||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}const P="/api/v1/people-modal.json";let i=null;function w(){i||b()}function b(){return i||(i=y(P).then(e=>{const l=Array.isArray(e)?e:[];return new Map(l.map(o=>[S(o.name),o]))}).catch(e=>(console.error("Failed to load people modal data",e),i=null,new Map)),i)}let f=null;function m(e,l,o){const a=e[l]||[];return a.length?`
        <div class="person-detail-books">
            <p class="person-detail-section-label">${s(o)}</p>
            <div class="person-detail-book-list">
                ${a.map(t=>`
                    <a class="person-detail-book-link" href="${r(t.href)}">
                        ${t.coverImage?`<img class="person-detail-book-cover" src="${r(t.coverImage)}" alt="${r(t.title)} cover" loading="lazy" decoding="async">`:'<span class="person-detail-book-cover person-detail-book-cover-fallback" aria-hidden="true"></span>'}
                        <span class="person-detail-book-meta">
                            <span class="person-detail-book-title">${s(t.label)}</span>
                            ${t.author?`<span class="person-detail-book-author">${s(t.author)}</span>`:""}
                        </span>
                    </a>
                `).join("")}
            </div>
        </div>
    `:""}function E(e){return`${m(e,"books","Books")}${m(e,"movies","Movies")}`}function I(){let e=document.getElementById("person-detail-modal");return e||(e=document.createElement("div"),e.id="person-detail-modal",e.className="person-detail-modal",e.setAttribute("aria-hidden","true"),document.body.appendChild(e),e)}function g(){const e=document.getElementById("person-detail-modal");e&&(e.classList.remove("open"),e.setAttribute("aria-hidden","true"),document.body.classList.remove("person-detail-open"),f?.focus?.(),f=null)}function L(e,l){const o=I();f=l||document.activeElement,o.innerHTML=`
        <div class="person-detail-backdrop" data-action="close-person-detail"></div>
        <article class="person-detail-panel" role="dialog" aria-modal="true" aria-labelledby="person-detail-title">
            <button class="person-detail-close" type="button" data-action="close-person-detail" aria-label="Close person detail">X</button>
            <div class="person-detail-hero">
                <div class="person-detail-image-wrap">
                    <img src="${r(e.image)}" alt="${r(e.name)}" class="person-detail-image" srcset="${r(e.srcset||"")}" sizes="(max-width: 768px) 78vw, 320px" width="400" height="400" loading="lazy" decoding="async">
                </div>
                <div class="person-detail-copy">
                    <p class="person-detail-kicker">${s(e.title)}</p>
                    <h2 id="person-detail-title">${s(e.name)}</h2>
                    <p class="person-detail-bio">${s(e.bio||e.lesson)}</p>
                    <p class="person-detail-blurb">${s(e.lesson)}</p>
                    ${e.profileHref?`<a class="person-detail-profile-link" href="${r(e.profileHref)}">View profile</a>`:""}
                </div>
            </div>
            ${E(e)}
        </article>
    `,o.classList.add("open"),o.setAttribute("aria-hidden","false"),document.body.classList.add("person-detail-open"),o.querySelector(".person-detail-close")?.focus?.()}function M(e){const l=document.querySelector(".people-grid");if(!l)return;async function o(a){const n=(await e()).get(a.dataset.personId||"");n&&L(n,a)}l.addEventListener("click",a=>{const t=a.target?.closest?.(".person-card");t&&o(t)}),l.addEventListener("keydown",a=>{const t=a;if(t.key!=="Enter"&&t.key!==" ")return;const n=a.target?.closest?.(".person-card");n&&(a.preventDefault(),o(n))}),document.addEventListener("click",a=>{a.target?.closest?.('[data-action="close-person-detail"]')&&g()}),document.addEventListener("keydown",a=>{a.key==="Escape"&&g()})}let d="all";function C(e){return d==="all"||e.dataset.sourceType===d}function A(){document.querySelectorAll(".people-source-filter-btn").forEach(e=>{e.classList.toggle("active",e.dataset.actionArgs===d)})}function c(e,l){const o=document.getElementById(e);o&&(o.textContent=String(l))}function D(e){const l=d==="all"?e:e.filter(t=>t.dataset.sourceType===d),o=e.reduce((t,n)=>{const p=n.dataset.sourceType||"nonfiction";return t[p]=(t[p]||0)+1,t},{fiction:0,nonfiction:0}),a=l.reduce((t,n)=>{const p=n.dataset.category||"";return t[p]=(t[p]||0)+1,t},{});c("people-source-count-all",e.length),c("people-source-count-nonfiction",o.nonfiction||0),c("people-source-count-fiction",o.fiction||0),c("count-people-all",l.length),["business","writers","science","creators"].forEach(t=>{c(`count-people-${t}`,a[t]||0)})}function B({allCards:e,visibleCards:l}){const o=new Set(l),a=[];e.forEach(t=>{const n=o.has(t)&&C(t);t.style.display=n?"block":"none",n&&a.push(t)}),c("people-count",a.length),D(e),A()}function F(e){h({filterPeopleSource(l,o){d=l||"all";const a=o?.target?.closest(".people-source-filter-btn");a&&(document.querySelectorAll(".people-source-filter-btn").forEach(t=>t.classList.remove("active")),a.classList.add("active")),e()?.render()}})}let u=null;async function T(){u=k({actions:{clearSearch:"clearPeopleSearch",filter:"filterByCategory",search:"filterPeople",toggleSidebar:"togglePeopleSidebar"},allButtonSelector:'[data-action="filterByCategory"][data-action-args="all"]',buttonSelector:".sidebar-category",cardSelector:".person-card",categoryMode:"exact",counterId:"people-count",layoutId:"people-layout",searchClearButtonId:"people-search-clear-btn",searchClearDisplay:"block",searchInputId:"people-search",sidebarId:"people-sidebar",storageKey:"people-sidebar-collapsed",onRender:B,useDisplayStyle:!0}),F(()=>u),u.init(),M(b),$(w)}v(T,"people init");
