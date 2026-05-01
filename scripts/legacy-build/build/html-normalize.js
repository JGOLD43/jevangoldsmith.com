const path = require('path');

function createHtmlNormalizers({ remoteAssets, escapeHtmlAttr, absolutizeAsset }) {
  function setHtmlAttribute(tag, name, value) {
    const escaped = escapeHtmlAttr(value);
    const pattern = new RegExp(`\\s${name}=(["'])[^"']*\\1`, 'i');
    if (pattern.test(tag)) return tag.replace(pattern, ` ${name}="${escaped}"`);
    return tag.replace(/>$/, ` ${name}="${escaped}">`);
  }

  function ensureHtmlAttribute(tag, name, value) {
    if (new RegExp(`\\s${name}=`, 'i').test(tag)) return tag;
    return setHtmlAttribute(tag, name, value);
  }

  // Wrap an optimized <img> in <picture> with AVIF + WebP sources.
  // Variants on disk are sibling files at the same width set; we generate the
  // alternate srcsets by swapping the extension on each entry.
  function wrapInPicture(imgTag, jpgSrcset, sizes, hasAvif = true, hasWebp = true) {
    if (!jpgSrcset) return imgTag;
    const avifSrcset = jpgSrcset.replace(/\.(jpg|jpeg|png)\b/gi, '.avif');
    const webpSrcset = jpgSrcset.replace(/\.(jpg|jpeg|png)\b/gi, '.webp');
    const sizesAttr = sizes ? ` sizes="${escapeHtmlAttr(sizes)}"` : '';
    const avifSource = hasAvif ? `<source type="image/avif" srcset="${escapeHtmlAttr(avifSrcset)}"${sizesAttr}>` : '';
    const webpSource = hasWebp ? `<source type="image/webp" srcset="${escapeHtmlAttr(webpSrcset)}"${sizesAttr}>` : '';
    return `<picture>${avifSource}${webpSource}${imgTag}</picture>`;
  }

  function optimizeGeneratedRaster(tag, original, replacement, srcset, sizes) {
    if (!tag.includes(`src="${original}"`) && !tag.includes(`src='${original}'`)) return tag;
    if (/srcset=/i.test(tag)) return tag;
    let next = setHtmlAttribute(tag, 'src', replacement);
    next = setHtmlAttribute(next, 'srcset', srcset);
    next = setHtmlAttribute(next, 'sizes', sizes);
    next = ensureHtmlAttribute(next, 'loading', 'lazy');
    next = ensureHtmlAttribute(next, 'decoding', 'async');
    return next;
  }

  // Extract srcset + sizes from an <img> tag and wrap it in <picture>
  // with AVIF + WebP sources. Skipped if the tag has no srcset or no
  // raster format we have alternates for.
  function wrapImgIfHasSrcset(imgTag) {
    if (!/^<img\b/i.test(imgTag)) return imgTag;
    const srcsetMatch = imgTag.match(/\ssrcset=(["'])([^"']+)\1/i);
    if (!srcsetMatch) return imgTag;
    const srcset = srcsetMatch[2];
    if (!/\.(jpg|jpeg|png)\b/i.test(srcset)) return imgTag;
    const sizesMatch = imgTag.match(/\ssizes=(["'])([^"']+)\1/i);
    const sizes = sizesMatch ? sizesMatch[2] : '';
    return wrapInPicture(imgTag, srcset, sizes, true, true);
  }

  function remoteAssetFor(url, preferredWidth = 800, format = 'jpg') {
    if (!url || !/^https?:\/\//i.test(url)) return url;
    let normalizedUrl = url.replace(/&amp;/g, '&');
    let entry = remoteAssets[normalizedUrl];
    if (!entry && /images\.unsplash\.com/i.test(normalizedUrl) && /[?&]w=1200\b/.test(normalizedUrl)) {
      normalizedUrl = normalizedUrl.replace(/([?&]w=)1200\b/, '$1800');
      entry = remoteAssets[normalizedUrl];
    }
    if (!entry && /images\.unsplash\.com/i.test(normalizedUrl) && /[?&]w=800\b/.test(normalizedUrl)) {
      normalizedUrl = normalizedUrl.replace(/([?&]w=)800\b/, '$1400');
      entry = remoteAssets[normalizedUrl];
    }
    if (!entry) return url;
    const widths = (entry.widths || Object.keys(entry.formats || {}).map(Number)).sort((a, b) => a - b);
    const width = widths.find((candidate) => candidate >= preferredWidth) || widths[widths.length - 1];
    return entry.formats?.[width]?.[format] || entry.formats?.[width]?.jpg || url;
  }

  function remoteAssetSrcset(url, format = 'jpg') {
    const entry = remoteAssets[url.replace(/&amp;/g, '&')];
    if (!entry) return '';
    const widths = (entry.widths || Object.keys(entry.formats || {}).map(Number)).sort((a, b) => a - b);
    return widths
      .map((width) => entry.formats?.[width]?.[format] ? `${entry.formats[width][format]} ${width}w` : '')
      .filter(Boolean)
      .join(', ');
  }

  function localizeRemainingRemoteAssetReferences(html) {
    let next = html;
    for (const url of Object.keys(remoteAssets)) {
      const local = absolutizeAsset(remoteAssetFor(url, 1200));
      next = next.split(url).join(local);
      next = next.split(url.replace(/&/g, '&amp;')).join(local);
    }
    return next;
  }

  function optimizeLocalImageReferences(html) {
    // Compute byte ranges for every existing <picture>...</picture> block so we
    // can skip <img> tags inside them (they're already wrapped — wrapping again
    // would produce <picture><picture>).
    const pictureRanges = [];
    {
      const re = /<picture\b[\s\S]*?<\/picture>/gi;
      let m;
      while ((m = re.exec(html)) !== null) pictureRanges.push([m.index, m.index + m[0].length]);
    }
    const insidePicture = (offset) => pictureRanges.some(([s, e]) => offset >= s && offset < e);

    return html.replace(/<img\b[^>]*>/gi, (tag, offset) => {
      if (insidePicture(offset)) return tag;

      const remoteMatch = tag.match(/\ssrc=(["'])(https:\/\/(?:images\.unsplash\.com|covers\.openlibrary\.org)\/[^"']+)\1/i);
      if (remoteMatch && !/srcset=/i.test(tag)) {
        const url = remoteMatch[2].replace(/&amp;/g, '&');
        const replacement = remoteAssetFor(url, /covers\.openlibrary\.org/i.test(url) ? 360 : 800);
        if (replacement !== url) {
          let remote = setHtmlAttribute(tag, 'src', replacement);
          remote = setHtmlAttribute(remote, 'srcset', remoteAssetSrcset(url));
          remote = setHtmlAttribute(remote, 'sizes', /covers\.openlibrary\.org/i.test(url) ? '(max-width: 768px) 38vw, 180px' : '(max-width: 768px) 92vw, 640px');
          remote = ensureHtmlAttribute(remote, 'loading', 'lazy');
          remote = ensureHtmlAttribute(remote, 'decoding', 'async');
          return wrapImgIfHasSrcset(remote);
        }
      }

      const peopleMatch = tag.match(/\ssrc=(["'])images\/people\/([^"']+)\1/i);
      if (peopleMatch && !/srcset=/i.test(tag)) {
        const basename = path.parse(peopleMatch[2]).name;
        let people = setHtmlAttribute(tag, 'src', `images/generated/people/${basename}-400.jpg`);
        people = setHtmlAttribute(people, 'srcset', `images/generated/people/${basename}-200.jpg 200w, images/generated/people/${basename}-400.jpg 400w, images/generated/people/${basename}-800.jpg 800w`);
        people = setHtmlAttribute(people, 'sizes', '(max-width: 768px) 42vw, 220px');
        people = ensureHtmlAttribute(people, 'width', '400');
        people = ensureHtmlAttribute(people, 'height', '400');
        people = ensureHtmlAttribute(people, 'loading', 'lazy');
        people = ensureHtmlAttribute(people, 'decoding', 'async');
        return wrapImgIfHasSrcset(people);
      }

      let next = optimizeGeneratedRaster(
        tag,
        'images/logo.png',
        'images/generated/logo/logo-nav-352.png',
        'images/generated/logo/logo-nav-88.png 88w, images/generated/logo/logo-nav-176.png 176w, images/generated/logo/logo-nav-264.png 264w, images/generated/logo/logo-nav-352.png 352w',
        '88px'
      );
      if (next.includes('images/generated/logo/logo-nav-352.png')) {
        next = ensureHtmlAttribute(next, 'width', '88');
        next = ensureHtmlAttribute(next, 'height', '80');
      }
      next = optimizeGeneratedRaster(
        next,
        'images/profile.jpg',
        'images/generated/profile/profile-720.jpg',
        'images/generated/profile/profile-360.jpg 360w, images/generated/profile/profile-520.jpg 520w, images/generated/profile/profile-720.jpg 720w, images/generated/profile/profile-960.jpg 960w',
        '(max-width: 768px) 82vw, 480px'
      );
      next = optimizeGeneratedRaster(
        next,
        'images/zen-nature.jpg',
        'images/generated/content/zen-nature-720.jpg',
        'images/generated/content/zen-nature-320.jpg 320w, images/generated/content/zen-nature-480.jpg 480w, images/generated/content/zen-nature-720.jpg 720w, images/generated/content/zen-nature-960.jpg 960w, images/generated/content/zen-nature-1200.jpg 1200w',
        '(max-width: 768px) 92vw, 640px'
      );
      // Final pass: any <img> not inside an existing <picture> that has a srcset
      // gets wrapped so modern browsers prefer AVIF/WebP fallbacks.
      return wrapImgIfHasSrcset(next);
    });
  }

  function removeStaticLeafletTags(html) {
    return html
      .replace(/\n?\s*<link\s+rel=["']stylesheet["']\s+href=["']vendor\/leaflet\/leaflet\.css["'][^>]*>/gi, '')
      .replace(/\n?\s*<script\s+src=["']vendor\/leaflet\/leaflet\.js["']><\/script>/gi, '');
  }

  function removeExternalFontLinks(html) {
    return html
      .replace(/\n?\s*<link\s+rel=["']preconnect["']\s+href=["']https:\/\/fonts\.googleapis\.com["'][^>]*>/gi, '')
      .replace(/\n?\s*<link\s+rel=["']preconnect["']\s+href=["']https:\/\/fonts\.gstatic\.com["'][^>]*>/gi, '')
      .replace(/\n?\s*<link\s+href=["']https:\/\/fonts\.googleapis\.com\/css2\?family=Chivo[^"']*["']\s+rel=["']stylesheet["'][^>]*>/gi, '')
      .replace(/\n?\s*<link\s+rel=["']stylesheet["']\s+href=["']https:\/\/fonts\.googleapis\.com\/css2\?family=Chivo[^"']*["'][^>]*>/gi, '');
  }

  return {
    setHtmlAttribute,
    ensureHtmlAttribute,
    optimizeGeneratedRaster,
    remoteAssetFor,
    remoteAssetSrcset,
    localizeRemainingRemoteAssetReferences,
    optimizeLocalImageReferences,
    removeStaticLeafletTags,
    removeExternalFontLinks
  };
}

module.exports = { createHtmlNormalizers };
