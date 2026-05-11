import{l as h,e as n,b as c,o as f,j as u,c as y}from"./collection-shared.wUOtwcxO.js";import{b as v,c as d}from"./dates.BQ2HxNv8.js";function w(e){const t=document.createElement("div");t.className="movie-card podcast-card js-zoom-item",t.dataset.spotify="episode";const a=n(e.showName||"Unknown show"),o=n(e.episodeName||"Untitled episode"),s=n(v(e.durationMs)),i=n(d(e.listenedAt)),m=e.image?`<img src="${c(e.image)}" alt="${c(e.showName||e.episodeName||"")}" class="podcast-cover" width="150" height="150" loading="lazy" decoding="async">`:'<div class="podcast-cover-placeholder">🎧</div>',g=e.episodeUrl?`<a class="spotify-episode-link" href="${c(e.episodeUrl)}" target="_blank" rel="noopener noreferrer">Open in Spotify →</a>`:"";return t.innerHTML=`
        <div class="movie-poster-wrapper">${m}</div>
        <div class="movie-info">
            <div class="movie-title-row">
                <h3 class="movie-title">${o}</h3>
            </div>
            <div class="podcast-category-badge">${a}</div>
            ${s?`<div class="spotify-episode-duration">${s}${i?` · ${i}`:""}</div>`:i?`<div class="spotify-episode-duration">${i}</div>`:""}
            ${g}
        </div>
    `,t}function $(e){const t=document.createElement("div");t.className="movie-card podcast-card js-zoom-item",t.dataset.spotify="show";const a=n(e.name||"Untitled show"),o=n(e.publisher||""),s=e.image?`<img src="${c(e.image)}" alt="${c(e.name||"")}" class="podcast-cover" width="150" height="150" loading="lazy" decoding="async">`:'<div class="podcast-cover-placeholder">🎙️</div>',i=e.url?`<a class="spotify-episode-link" href="${c(e.url)}" target="_blank" rel="noopener noreferrer">Open in Spotify →</a>`:"";return t.innerHTML=`
        <div class="movie-poster-wrapper">${s}</div>
        <div class="movie-info">
            <div class="movie-title-row">
                <h3 class="movie-title">${a}</h3>
            </div>
            ${o?`<div class="podcast-category-badge">${o}</div>`:""}
            ${i}
        </div>
    `,t}async function r(e){try{return await h(e)}catch{return null}}function l(e,t,a,o){const s=document.getElementById(e);if(!s)return;if(!a){s.textContent="";return}const i=t?` · synced ${d(t)}`:"";s.textContent=`${a} ${o}${i}`}async function b(){const e=await r("data/podcast-episodes.json");if(!e||!Array.isArray(e.episodes)||e.episodes.length===0)return;const t=document.getElementById("spotify-recent-container"),a=document.getElementById("spotify-recent-section");if(!t||!a)return;const o=e.episodes.slice(0,24),s=document.createDocumentFragment();o.forEach(i=>s.appendChild(w(i))),t.appendChild(s),a.hidden=!1,l("spotify-recent-meta",e.generatedAt,o.length,o.length===1?"recent episode":"recent episodes")}async function S(){const e=await r("data/podcast-shows.json");if(!e||!Array.isArray(e.shows)||e.shows.length===0)return;const t=document.getElementById("spotify-shows-container"),a=document.getElementById("spotify-shows-section");if(!t||!a)return;const o=document.createDocumentFragment();e.shows.forEach(s=>o.appendChild($(s))),t.appendChild(o),a.hidden=!1,l("spotify-shows-meta",e.generatedAt,e.shows.length,e.shows.length===1?"show":"shows")}let p=null;function E(){p=y({actions:{clearSearch:"clearPodcastSearch",filter:"filterPodcasts",search:"searchPodcasts",toggleDropdown:"togglePodcastListDropdown",toggleSidebar:"togglePodcastSidebar"},allButtonSelector:'.sidebar-category[data-podcast-category="all"]',buttonSelector:".sidebar-category",cardSelector:".podcast-card",categoryMode:"exact",counterId:"podcast-count",layoutId:"podcasts-layout",searchClearButtonId:"podcast-search-clear-btn",searchInputId:"podcast-search",sidebarId:"podcasts-sidebar",storageKey:"podcasts-sidebar-collapsed"})}async function C(){E(),p.init();const e=document.getElementById("podcasts-container");e&&(e.classList.add("js-zoom-grid"),u({grid:e,itemSelector:".podcast-card",triggerSelector:".podcast-card"})),b(),S()}f(C,"podcasts init");
