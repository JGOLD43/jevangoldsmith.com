// nav partial extracted from src/legacy/partials/nav.html.
export const NAV_TEMPLATE = `<nav class="navbar">
        <div class="container">
            <div class="navbar-left">
                <a href="index.html" class="logo">
                    <picture class="logo-static">
                        <source type="image/avif" srcset="images/generated/logo/logo-nav-88.avif 1x, images/generated/logo/logo-nav-176.avif 2x, images/generated/logo/logo-nav-264.avif 3x, images/generated/logo/logo-nav-352.avif 4x">
                        <img src="images/generated/logo/logo-nav-176.png" srcset="images/generated/logo/logo-nav-88.png 1x, images/generated/logo/logo-nav-176.png 2x, images/generated/logo/logo-nav-264.png 3x, images/generated/logo/logo-nav-352.png 4x" alt="J.GOLDSMITH" class="logo-image" width="88" height="80" decoding="async">
                    </picture>
                    <video class="logo-image logo-video" poster="images/generated/logo/logo-nav-176.png" muted playsinline loop preload="none" data-webm-1x="images/generated/video/logo-animated-176.webm" data-webm-2x="images/generated/video/logo-animated-352.webm" data-webm-3x="images/generated/video/logo-animated-528.webm" data-mp4-1x="images/generated/video/logo-animated-176.mp4" data-mp4-2x="images/generated/video/logo-animated-352.mp4" data-mp4-3x="images/generated/video/logo-animated-528.mp4"></video>
                </a>
                <div class="wisdom-ticker">
                    <div class="wisdom-ticker-track">
                        <span class="wisdom-item">Stay curious, stay humble</span>
                        <span class="wisdom-item">Build for decades, not quarters</span>
                        <span class="wisdom-item">First principles thinking</span>
                        <span class="wisdom-item">Actions reveal priorities</span>
                        <span class="wisdom-item">Compound interest in all things</span>
                        <span class="wisdom-item">Stay curious, stay humble</span>
                    </div>
                </div>
            </div>
            <ul class="nav-links">
                <li><a href="index.html" class="active">Home</a></li>
                <li class="nav-dropdown">
                    <a href="#" class="dropdown-trigger">Explore</a>
                    <div class="dropdown-menu dropdown-menu-wide">
                        <div class="dropdown-wide-header">A Collection of Thoughts</div>
                        <div class="dropdown-columns">
                            <div class="dropdown-column">
                                <a href="field-notes.html">Field Notes</a>
                                <a href="essays.html">Essays</a>
                                <a href="takes.html">Takes</a>
                                <a href="problems.html">Problems</a>
                            </div>
                            <div class="dropdown-column">
                                <a href="living-manifesto.html">Living Manifesto</a>
                                <a href="speeches.html">Speeches</a>
                                <a href="about.html">Website Purpose</a>
                                <a href="health.html">Health</a>
                            </div>
                        </div>
                    </div>
                </li>
                <li class="nav-dropdown">
                    <a href="#" class="dropdown-trigger">Content</a>
                    <div class="dropdown-menu dropdown-menu-icons">
                        <a href="https://youtube.com/@JevanGoldsmith" target="_blank" class="dropdown-icon-link" title="YouTube">
                            <svg class="ico-fill ico-24" viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#icon-youtube"/></svg>
                        </a>
                        <a href="https://instagram.com/jevangoldsmith" target="_blank" class="dropdown-icon-link" title="Instagram">
                            <svg class="ico-fill ico-24" viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#icon-instagram"/></svg>
                        </a>
                        <a href="https://x.com/JevanGoldsmith" target="_blank" class="dropdown-icon-link" title="X">
                            <svg class="ico-fill ico-24" viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#icon-x"/></svg>
                        </a>
                        <a href="https://linkedin.com/in/jevan-goldsmith-7b885a185" target="_blank" class="dropdown-icon-link" title="LinkedIn">
                            <svg class="ico-fill ico-24" viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#icon-linkedin"/></svg>
                        </a>
                        <a href="mailto:hello@jevangoldsmith.com?subject=Newsletter" class="dropdown-icon-link" title="Newsletter">
                            <svg class="ico-stroke ico-24" viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#icon-mail"/></svg>
                        </a>
                    </div>
                </li>
                <li class="nav-dropdown">
                    <a href="#" class="dropdown-trigger">Taste</a>
                    <div class="dropdown-menu dropdown-menu-wide">
                        <div class="dropdown-wide-header">Things I Interact With</div>
                        <div class="dropdown-columns">
                            <div class="dropdown-column">
                                <a href="books.html">Reading</a>
                                <a href="movies.html">Movies</a>
                                <a href="podcasts.html">Podcasts</a>
                            </div>
                            <div class="dropdown-column">
                                <a href="products.html">The Shelf</a>
                                <a href="cool-shit.html">Cool Shit</a>
                                <a href="people.html">People of History</a>
                            </div>
                        </div>
                    </div>
                </li>
                <li><a href="adventures.html">Adventures</a></li>
                <li class="nav-dropdown">
                    <a href="#" class="dropdown-trigger">Ventures</a>
                    <div class="dropdown-menu dropdown-menu-wide">
                        <div class="dropdown-wide-header">Things I think up, build and learn</div>
                        <div class="dropdown-columns">
                            <div class="dropdown-column">
                                <a href="projects.html">Projects</a>
                                <a href="challenges.html">Challenges</a>
                            </div>
                            <div class="dropdown-column">
                                <a href="free-resources.html">Resources</a>
                                <a href="lesson-logger.html">Lesson Logger</a>
                            </div>
                        </div>
                    </div>
                </li>
                
            </ul>
            <div class="navbar-right">
                <button class="theme-toggle" aria-label="Toggle theme">
                    <svg class="theme-toggle-icon icon-sun ico-stroke" viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#icon-sun"/></svg>
                    <svg class="theme-toggle-icon icon-moon ico-stroke" viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#icon-moon"/></svg>
                </button>
                <button class="mobile-menu-toggle" aria-label="Toggle menu">
                    <div class="hamburger">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </button>
                <div class="navbar-contact">
                    <a href="meet.html" class="navbar-contact-btn">
                        <span>Let's Chat</span>
                        <svg class="ico-stroke ico-18" viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#icon-send"/></svg>
                    </a>
                    <div class="navbar-contact-dropdown">
                        <div class="contact-dropdown-qr">
                            <img src="images/qr-contact.svg" alt="Scan to contact" width="120" height="120" loading="lazy" decoding="async">
                            <p>Scan to connect</p>
                        </div>
                        <div class="contact-dropdown-links">
                            <a href="contact.html">
                                <svg class="ico-stroke ico-24" viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#icon-mail"/></svg>
                                Contact Page
                            </a>
                            <a href="mailto:hello@jevangoldsmith.com">
                                <svg class="ico-stroke ico-24" viewBox="0 0 24 24" aria-hidden="true"><use href="/sprite.svg#icon-envelope"/></svg>
                                Email Me
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </nav>`;
