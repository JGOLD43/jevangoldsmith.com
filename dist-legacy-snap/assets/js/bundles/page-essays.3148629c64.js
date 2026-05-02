
/* vendor/dompurify/purify.min.js */
/*! @license DOMPurify 3.2.4 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.2.4/LICENSE */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e="undefined"!=typeof globalThis?globalThis:e||self).DOMPurify=t()}(this,(function(){"use strict";const{entries:e,setPrototypeOf:t,isFrozen:n,getPrototypeOf:o,getOwnPropertyDescriptor:r}=Object;let{freeze:i,seal:a,create:l}=Object,{apply:c,construct:s}="undefined"!=typeof Reflect&&Reflect;i||(i=function(e){return e}),a||(a=function(e){return e}),c||(c=function(e,t,n){return e.apply(t,n)}),s||(s=function(e,t){return new e(...t)});const u=R(Array.prototype.forEach),m=R(Array.prototype.lastIndexOf),p=R(Array.prototype.pop),f=R(Array.prototype.push),d=R(Array.prototype.splice),h=R(String.prototype.toLowerCase),g=R(String.prototype.toString),T=R(String.prototype.match),y=R(String.prototype.replace),E=R(String.prototype.indexOf),A=R(String.prototype.trim),_=R(Object.prototype.hasOwnProperty),S=R(RegExp.prototype.test),b=(N=TypeError,function(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];return s(N,t)});var N;function R(e){return function(t){for(var n=arguments.length,o=new Array(n>1?n-1:0),r=1;r<n;r++)o[r-1]=arguments[r];return c(e,t,o)}}function w(e,o){let r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:h;t&&t(e,null);let i=o.length;for(;i--;){let t=o[i];if("string"==typeof t){const e=r(t);e!==t&&(n(o)||(o[i]=e),t=e)}e[t]=!0}return e}function O(e){for(let t=0;t<e.length;t++){_(e,t)||(e[t]=null)}return e}function D(t){const n=l(null);for(const[o,r]of e(t)){_(t,o)&&(Array.isArray(r)?n[o]=O(r):r&&"object"==typeof r&&r.constructor===Object?n[o]=D(r):n[o]=r)}return n}function v(e,t){for(;null!==e;){const n=r(e,t);if(n){if(n.get)return R(n.get);if("function"==typeof n.value)return R(n.value)}e=o(e)}return function(){return null}}const L=i(["a","abbr","acronym","address","area","article","aside","audio","b","bdi","bdo","big","blink","blockquote","body","br","button","canvas","caption","center","cite","code","col","colgroup","content","data","datalist","dd","decorator","del","details","dfn","dialog","dir","div","dl","dt","element","em","fieldset","figcaption","figure","font","footer","form","h1","h2","h3","h4","h5","h6","head","header","hgroup","hr","html","i","img","input","ins","kbd","label","legend","li","main","map","mark","marquee","menu","menuitem","meter","nav","nobr","ol","optgroup","option","output","p","picture","pre","progress","q","rp","rt","ruby","s","samp","section","select","shadow","small","source","spacer","span","strike","strong","style","sub","summary","sup","table","tbody","td","template","textarea","tfoot","th","thead","time","tr","track","tt","u","ul","var","video","wbr"]),C=i(["svg","a","altglyph","altglyphdef","altglyphitem","animatecolor","animatemotion","animatetransform","circle","clippath","defs","desc","ellipse","filter","font","g","glyph","glyphref","hkern","image","line","lineargradient","marker","mask","metadata","mpath","path","pattern","polygon","polyline","radialgradient","rect","stop","style","switch","symbol","text","textpath","title","tref","tspan","view","vkern"]),x=i(["feBlend","feColorMatrix","feComponentTransfer","feComposite","feConvolveMatrix","feDiffuseLighting","feDisplacementMap","feDistantLight","feDropShadow","feFlood","feFuncA","feFuncB","feFuncG","feFuncR","feGaussianBlur","feImage","feMerge","feMergeNode","feMorphology","feOffset","fePointLight","feSpecularLighting","feSpotLight","feTile","feTurbulence"]),M=i(["animate","color-profile","cursor","discard","font-face","font-face-format","font-face-name","font-face-src","font-face-uri","foreignobject","hatch","hatchpath","mesh","meshgradient","meshpatch","meshrow","missing-glyph","script","set","solidcolor","unknown","use"]),k=i(["math","menclose","merror","mfenced","mfrac","mglyph","mi","mlabeledtr","mmultiscripts","mn","mo","mover","mpadded","mphantom","mroot","mrow","ms","mspace","msqrt","mstyle","msub","msup","msubsup","mtable","mtd","mtext","mtr","munder","munderover","mprescripts"]),I=i(["maction","maligngroup","malignmark","mlongdiv","mscarries","mscarry","msgroup","mstack","msline","msrow","semantics","annotation","annotation-xml","mprescripts","none"]),U=i(["#text"]),z=i(["accept","action","align","alt","autocapitalize","autocomplete","autopictureinpicture","autoplay","background","bgcolor","border","capture","cellpadding","cellspacing","checked","cite","class","clear","color","cols","colspan","controls","controlslist","coords","crossorigin","datetime","decoding","default","dir","disabled","disablepictureinpicture","disableremoteplayback","download","draggable","enctype","enterkeyhint","face","for","headers","height","hidden","high","href","hreflang","id","inputmode","integrity","ismap","kind","label","lang","list","loading","loop","low","max","maxlength","media","method","min","minlength","multiple","muted","name","nonce","noshade","novalidate","nowrap","open","optimum","pattern","placeholder","playsinline","popover","popovertarget","popovertargetaction","poster","preload","pubdate","radiogroup","readonly","rel","required","rev","reversed","role","rows","rowspan","spellcheck","scope","selected","shape","size","sizes","span","srclang","start","src","srcset","step","style","summary","tabindex","title","translate","type","usemap","valign","value","width","wrap","xmlns","slot"]),P=i(["accent-height","accumulate","additive","alignment-baseline","amplitude","ascent","attributename","attributetype","azimuth","basefrequency","baseline-shift","begin","bias","by","class","clip","clippathunits","clip-path","clip-rule","color","color-interpolation","color-interpolation-filters","color-profile","color-rendering","cx","cy","d","dx","dy","diffuseconstant","direction","display","divisor","dur","edgemode","elevation","end","exponent","fill","fill-opacity","fill-rule","filter","filterunits","flood-color","flood-opacity","font-family","font-size","font-size-adjust","font-stretch","font-style","font-variant","font-weight","fx","fy","g1","g2","glyph-name","glyphref","gradientunits","gradienttransform","height","href","id","image-rendering","in","in2","intercept","k","k1","k2","k3","k4","kerning","keypoints","keysplines","keytimes","lang","lengthadjust","letter-spacing","kernelmatrix","kernelunitlength","lighting-color","local","marker-end","marker-mid","marker-start","markerheight","markerunits","markerwidth","maskcontentunits","maskunits","max","mask","media","method","mode","min","name","numoctaves","offset","operator","opacity","order","orient","orientation","origin","overflow","paint-order","path","pathlength","patterncontentunits","patterntransform","patternunits","points","preservealpha","preserveaspectratio","primitiveunits","r","rx","ry","radius","refx","refy","repeatcount","repeatdur","restart","result","rotate","scale","seed","shape-rendering","slope","specularconstant","specularexponent","spreadmethod","startoffset","stddeviation","stitchtiles","stop-color","stop-opacity","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke","stroke-width","style","surfacescale","systemlanguage","tabindex","tablevalues","targetx","targety","transform","transform-origin","text-anchor","text-decoration","text-rendering","textlength","type","u1","u2","unicode","values","viewbox","visibility","version","vert-adv-y","vert-origin-x","vert-origin-y","width","word-spacing","wrap","writing-mode","xchannelselector","ychannelselector","x","x1","x2","xmlns","y","y1","y2","z","zoomandpan"]),H=i(["accent","accentunder","align","bevelled","close","columnsalign","columnlines","columnspan","denomalign","depth","dir","display","displaystyle","encoding","fence","frame","height","href","id","largeop","length","linethickness","lspace","lquote","mathbackground","mathcolor","mathsize","mathvariant","maxsize","minsize","movablelimits","notation","numalign","open","rowalign","rowlines","rowspacing","rowspan","rspace","rquote","scriptlevel","scriptminsize","scriptsizemultiplier","selection","separator","separators","stretchy","subscriptshift","supscriptshift","symmetric","voffset","width","xmlns"]),F=i(["xlink:href","xml:id","xlink:title","xml:space","xmlns:xlink"]),B=a(/\{\{[\w\W]*|[\w\W]*\}\}/gm),W=a(/<%[\w\W]*|[\w\W]*%>/gm),G=a(/\$\{[\w\W]*/gm),Y=a(/^data-[\-\w.\u00B7-\uFFFF]+$/),j=a(/^aria-[\-\w]+$/),X=a(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i),q=a(/^(?:\w+script|data):/i),$=a(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g),K=a(/^html$/i),V=a(/^[a-z][.\w]*(-[.\w]+)+$/i);var Z=Object.freeze({__proto__:null,ARIA_ATTR:j,ATTR_WHITESPACE:$,CUSTOM_ELEMENT:V,DATA_ATTR:Y,DOCTYPE_NAME:K,ERB_EXPR:W,IS_ALLOWED_URI:X,IS_SCRIPT_OR_DATA:q,MUSTACHE_EXPR:B,TMPLIT_EXPR:G});const J=1,Q=3,ee=7,te=8,ne=9,oe=function(){return"undefined"==typeof window?null:window};var re=function t(){let n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:oe();const o=e=>t(e);if(o.version="3.2.4",o.removed=[],!n||!n.document||n.document.nodeType!==ne||!n.Element)return o.isSupported=!1,o;let{document:r}=n;const a=r,c=a.currentScript,{DocumentFragment:s,HTMLTemplateElement:N,Node:R,Element:O,NodeFilter:B,NamedNodeMap:W=n.NamedNodeMap||n.MozNamedAttrMap,HTMLFormElement:G,DOMParser:Y,trustedTypes:j}=n,q=O.prototype,$=v(q,"cloneNode"),V=v(q,"remove"),re=v(q,"nextSibling"),ie=v(q,"childNodes"),ae=v(q,"parentNode");if("function"==typeof N){const e=r.createElement("template");e.content&&e.content.ownerDocument&&(r=e.content.ownerDocument)}let le,ce="";const{implementation:se,createNodeIterator:ue,createDocumentFragment:me,getElementsByTagName:pe}=r,{importNode:fe}=a;let de={afterSanitizeAttributes:[],afterSanitizeElements:[],afterSanitizeShadowDOM:[],beforeSanitizeAttributes:[],beforeSanitizeElements:[],beforeSanitizeShadowDOM:[],uponSanitizeAttribute:[],uponSanitizeElement:[],uponSanitizeShadowNode:[]};o.isSupported="function"==typeof e&&"function"==typeof ae&&se&&void 0!==se.createHTMLDocument;const{MUSTACHE_EXPR:he,ERB_EXPR:ge,TMPLIT_EXPR:Te,DATA_ATTR:ye,ARIA_ATTR:Ee,IS_SCRIPT_OR_DATA:Ae,ATTR_WHITESPACE:_e,CUSTOM_ELEMENT:Se}=Z;let{IS_ALLOWED_URI:be}=Z,Ne=null;const Re=w({},[...L,...C,...x,...k,...U]);let we=null;const Oe=w({},[...z,...P,...H,...F]);let De=Object.seal(l(null,{tagNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},allowCustomizedBuiltInElements:{writable:!0,configurable:!1,enumerable:!0,value:!1}})),ve=null,Le=null,Ce=!0,xe=!0,Me=!1,ke=!0,Ie=!1,Ue=!0,ze=!1,Pe=!1,He=!1,Fe=!1,Be=!1,We=!1,Ge=!0,Ye=!1,je=!0,Xe=!1,qe={},$e=null;const Ke=w({},["annotation-xml","audio","colgroup","desc","foreignobject","head","iframe","math","mi","mn","mo","ms","mtext","noembed","noframes","noscript","plaintext","script","style","svg","template","thead","title","video","xmp"]);let Ve=null;const Ze=w({},["audio","video","img","source","image","track"]);let Je=null;const Qe=w({},["alt","class","for","id","label","name","pattern","placeholder","role","summary","title","value","style","xmlns"]),et="http://www.w3.org/1998/Math/MathML",tt="http://www.w3.org/2000/svg",nt="http://www.w3.org/1999/xhtml";let ot=nt,rt=!1,it=null;const at=w({},[et,tt,nt],g);let lt=w({},["mi","mo","mn","ms","mtext"]),ct=w({},["annotation-xml"]);const st=w({},["title","style","font","a","script"]);let ut=null;const mt=["application/xhtml+xml","text/html"];let pt=null,ft=null;const dt=r.createElement("form"),ht=function(e){return e instanceof RegExp||e instanceof Function},gt=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};if(!ft||ft!==e){if(e&&"object"==typeof e||(e={}),e=D(e),ut=-1===mt.indexOf(e.PARSER_MEDIA_TYPE)?"text/html":e.PARSER_MEDIA_TYPE,pt="application/xhtml+xml"===ut?g:h,Ne=_(e,"ALLOWED_TAGS")?w({},e.ALLOWED_TAGS,pt):Re,we=_(e,"ALLOWED_ATTR")?w({},e.ALLOWED_ATTR,pt):Oe,it=_(e,"ALLOWED_NAMESPACES")?w({},e.ALLOWED_NAMESPACES,g):at,Je=_(e,"ADD_URI_SAFE_ATTR")?w(D(Qe),e.ADD_URI_SAFE_ATTR,pt):Qe,Ve=_(e,"ADD_DATA_URI_TAGS")?w(D(Ze),e.ADD_DATA_URI_TAGS,pt):Ze,$e=_(e,"FORBID_CONTENTS")?w({},e.FORBID_CONTENTS,pt):Ke,ve=_(e,"FORBID_TAGS")?w({},e.FORBID_TAGS,pt):{},Le=_(e,"FORBID_ATTR")?w({},e.FORBID_ATTR,pt):{},qe=!!_(e,"USE_PROFILES")&&e.USE_PROFILES,Ce=!1!==e.ALLOW_ARIA_ATTR,xe=!1!==e.ALLOW_DATA_ATTR,Me=e.ALLOW_UNKNOWN_PROTOCOLS||!1,ke=!1!==e.ALLOW_SELF_CLOSE_IN_ATTR,Ie=e.SAFE_FOR_TEMPLATES||!1,Ue=!1!==e.SAFE_FOR_XML,ze=e.WHOLE_DOCUMENT||!1,Fe=e.RETURN_DOM||!1,Be=e.RETURN_DOM_FRAGMENT||!1,We=e.RETURN_TRUSTED_TYPE||!1,He=e.FORCE_BODY||!1,Ge=!1!==e.SANITIZE_DOM,Ye=e.SANITIZE_NAMED_PROPS||!1,je=!1!==e.KEEP_CONTENT,Xe=e.IN_PLACE||!1,be=e.ALLOWED_URI_REGEXP||X,ot=e.NAMESPACE||nt,lt=e.MATHML_TEXT_INTEGRATION_POINTS||lt,ct=e.HTML_INTEGRATION_POINTS||ct,De=e.CUSTOM_ELEMENT_HANDLING||{},e.CUSTOM_ELEMENT_HANDLING&&ht(e.CUSTOM_ELEMENT_HANDLING.tagNameCheck)&&(De.tagNameCheck=e.CUSTOM_ELEMENT_HANDLING.tagNameCheck),e.CUSTOM_ELEMENT_HANDLING&&ht(e.CUSTOM_ELEMENT_HANDLING.attributeNameCheck)&&(De.attributeNameCheck=e.CUSTOM_ELEMENT_HANDLING.attributeNameCheck),e.CUSTOM_ELEMENT_HANDLING&&"boolean"==typeof e.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements&&(De.allowCustomizedBuiltInElements=e.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements),Ie&&(xe=!1),Be&&(Fe=!0),qe&&(Ne=w({},U),we=[],!0===qe.html&&(w(Ne,L),w(we,z)),!0===qe.svg&&(w(Ne,C),w(we,P),w(we,F)),!0===qe.svgFilters&&(w(Ne,x),w(we,P),w(we,F)),!0===qe.mathMl&&(w(Ne,k),w(we,H),w(we,F))),e.ADD_TAGS&&(Ne===Re&&(Ne=D(Ne)),w(Ne,e.ADD_TAGS,pt)),e.ADD_ATTR&&(we===Oe&&(we=D(we)),w(we,e.ADD_ATTR,pt)),e.ADD_URI_SAFE_ATTR&&w(Je,e.ADD_URI_SAFE_ATTR,pt),e.FORBID_CONTENTS&&($e===Ke&&($e=D($e)),w($e,e.FORBID_CONTENTS,pt)),je&&(Ne["#text"]=!0),ze&&w(Ne,["html","head","body"]),Ne.table&&(w(Ne,["tbody"]),delete ve.tbody),e.TRUSTED_TYPES_POLICY){if("function"!=typeof e.TRUSTED_TYPES_POLICY.createHTML)throw b('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');if("function"!=typeof e.TRUSTED_TYPES_POLICY.createScriptURL)throw b('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');le=e.TRUSTED_TYPES_POLICY,ce=le.createHTML("")}else void 0===le&&(le=function(e,t){if("object"!=typeof e||"function"!=typeof e.createPolicy)return null;let n=null;const o="data-tt-policy-suffix";t&&t.hasAttribute(o)&&(n=t.getAttribute(o));const r="dompurify"+(n?"#"+n:"");try{return e.createPolicy(r,{createHTML:e=>e,createScriptURL:e=>e})}catch(e){return console.warn("TrustedTypes policy "+r+" could not be created."),null}}(j,c)),null!==le&&"string"==typeof ce&&(ce=le.createHTML(""));i&&i(e),ft=e}},Tt=w({},[...C,...x,...M]),yt=w({},[...k,...I]),Et=function(e){f(o.removed,{element:e});try{ae(e).removeChild(e)}catch(t){V(e)}},At=function(e,t){try{f(o.removed,{attribute:t.getAttributeNode(e),from:t})}catch(e){f(o.removed,{attribute:null,from:t})}if(t.removeAttribute(e),"is"===e)if(Fe||Be)try{Et(t)}catch(e){}else try{t.setAttribute(e,"")}catch(e){}},_t=function(e){let t=null,n=null;if(He)e="<remove></remove>"+e;else{const t=T(e,/^[\r\n\t ]+/);n=t&&t[0]}"application/xhtml+xml"===ut&&ot===nt&&(e='<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>'+e+"</body></html>");const o=le?le.createHTML(e):e;if(ot===nt)try{t=(new Y).parseFromString(o,ut)}catch(e){}if(!t||!t.documentElement){t=se.createDocument(ot,"template",null);try{t.documentElement.innerHTML=rt?ce:o}catch(e){}}const i=t.body||t.documentElement;return e&&n&&i.insertBefore(r.createTextNode(n),i.childNodes[0]||null),ot===nt?pe.call(t,ze?"html":"body")[0]:ze?t.documentElement:i},St=function(e){return ue.call(e.ownerDocument||e,e,B.SHOW_ELEMENT|B.SHOW_COMMENT|B.SHOW_TEXT|B.SHOW_PROCESSING_INSTRUCTION|B.SHOW_CDATA_SECTION,null)},bt=function(e){return e instanceof G&&("string"!=typeof e.nodeName||"string"!=typeof e.textContent||"function"!=typeof e.removeChild||!(e.attributes instanceof W)||"function"!=typeof e.removeAttribute||"function"!=typeof e.setAttribute||"string"!=typeof e.namespaceURI||"function"!=typeof e.insertBefore||"function"!=typeof e.hasChildNodes)},Nt=function(e){return"function"==typeof R&&e instanceof R};function Rt(e,t,n){u(e,(e=>{e.call(o,t,n,ft)}))}const wt=function(e){let t=null;if(Rt(de.beforeSanitizeElements,e,null),bt(e))return Et(e),!0;const n=pt(e.nodeName);if(Rt(de.uponSanitizeElement,e,{tagName:n,allowedTags:Ne}),e.hasChildNodes()&&!Nt(e.firstElementChild)&&S(/<[/\w]/g,e.innerHTML)&&S(/<[/\w]/g,e.textContent))return Et(e),!0;if(e.nodeType===ee)return Et(e),!0;if(Ue&&e.nodeType===te&&S(/<[/\w]/g,e.data))return Et(e),!0;if(!Ne[n]||ve[n]){if(!ve[n]&&Dt(n)){if(De.tagNameCheck instanceof RegExp&&S(De.tagNameCheck,n))return!1;if(De.tagNameCheck instanceof Function&&De.tagNameCheck(n))return!1}if(je&&!$e[n]){const t=ae(e)||e.parentNode,n=ie(e)||e.childNodes;if(n&&t){for(let o=n.length-1;o>=0;--o){const r=$(n[o],!0);r.__removalCount=(e.__removalCount||0)+1,t.insertBefore(r,re(e))}}}return Et(e),!0}return e instanceof O&&!function(e){let t=ae(e);t&&t.tagName||(t={namespaceURI:ot,tagName:"template"});const n=h(e.tagName),o=h(t.tagName);return!!it[e.namespaceURI]&&(e.namespaceURI===tt?t.namespaceURI===nt?"svg"===n:t.namespaceURI===et?"svg"===n&&("annotation-xml"===o||lt[o]):Boolean(Tt[n]):e.namespaceURI===et?t.namespaceURI===nt?"math"===n:t.namespaceURI===tt?"math"===n&&ct[o]:Boolean(yt[n]):e.namespaceURI===nt?!(t.namespaceURI===tt&&!ct[o])&&!(t.namespaceURI===et&&!lt[o])&&!yt[n]&&(st[n]||!Tt[n]):!("application/xhtml+xml"!==ut||!it[e.namespaceURI]))}(e)?(Et(e),!0):"noscript"!==n&&"noembed"!==n&&"noframes"!==n||!S(/<\/no(script|embed|frames)/i,e.innerHTML)?(Ie&&e.nodeType===Q&&(t=e.textContent,u([he,ge,Te],(e=>{t=y(t,e," ")})),e.textContent!==t&&(f(o.removed,{element:e.cloneNode()}),e.textContent=t)),Rt(de.afterSanitizeElements,e,null),!1):(Et(e),!0)},Ot=function(e,t,n){if(Ge&&("id"===t||"name"===t)&&(n in r||n in dt))return!1;if(xe&&!Le[t]&&S(ye,t));else if(Ce&&S(Ee,t));else if(!we[t]||Le[t]){if(!(Dt(e)&&(De.tagNameCheck instanceof RegExp&&S(De.tagNameCheck,e)||De.tagNameCheck instanceof Function&&De.tagNameCheck(e))&&(De.attributeNameCheck instanceof RegExp&&S(De.attributeNameCheck,t)||De.attributeNameCheck instanceof Function&&De.attributeNameCheck(t))||"is"===t&&De.allowCustomizedBuiltInElements&&(De.tagNameCheck instanceof RegExp&&S(De.tagNameCheck,n)||De.tagNameCheck instanceof Function&&De.tagNameCheck(n))))return!1}else if(Je[t]);else if(S(be,y(n,_e,"")));else if("src"!==t&&"xlink:href"!==t&&"href"!==t||"script"===e||0!==E(n,"data:")||!Ve[e]){if(Me&&!S(Ae,y(n,_e,"")));else if(n)return!1}else;return!0},Dt=function(e){return"annotation-xml"!==e&&T(e,Se)},vt=function(e){Rt(de.beforeSanitizeAttributes,e,null);const{attributes:t}=e;if(!t||bt(e))return;const n={attrName:"",attrValue:"",keepAttr:!0,allowedAttributes:we,forceKeepAttr:void 0};let r=t.length;for(;r--;){const i=t[r],{name:a,namespaceURI:l,value:c}=i,s=pt(a);let m="value"===a?c:A(c);if(n.attrName=s,n.attrValue=m,n.keepAttr=!0,n.forceKeepAttr=void 0,Rt(de.uponSanitizeAttribute,e,n),m=n.attrValue,!Ye||"id"!==s&&"name"!==s||(At(a,e),m="user-content-"+m),Ue&&S(/((--!?|])>)|<\/(style|title)/i,m)){At(a,e);continue}if(n.forceKeepAttr)continue;if(At(a,e),!n.keepAttr)continue;if(!ke&&S(/\/>/i,m)){At(a,e);continue}Ie&&u([he,ge,Te],(e=>{m=y(m,e," ")}));const f=pt(e.nodeName);if(Ot(f,s,m)){if(le&&"object"==typeof j&&"function"==typeof j.getAttributeType)if(l);else switch(j.getAttributeType(f,s)){case"TrustedHTML":m=le.createHTML(m);break;case"TrustedScriptURL":m=le.createScriptURL(m)}try{l?e.setAttributeNS(l,a,m):e.setAttribute(a,m),bt(e)?Et(e):p(o.removed)}catch(e){}}}Rt(de.afterSanitizeAttributes,e,null)},Lt=function e(t){let n=null;const o=St(t);for(Rt(de.beforeSanitizeShadowDOM,t,null);n=o.nextNode();)Rt(de.uponSanitizeShadowNode,n,null),wt(n),vt(n),n.content instanceof s&&e(n.content);Rt(de.afterSanitizeShadowDOM,t,null)};return o.sanitize=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},n=null,r=null,i=null,l=null;if(rt=!e,rt&&(e="\x3c!--\x3e"),"string"!=typeof e&&!Nt(e)){if("function"!=typeof e.toString)throw b("toString is not a function");if("string"!=typeof(e=e.toString()))throw b("dirty is not a string, aborting")}if(!o.isSupported)return e;if(Pe||gt(t),o.removed=[],"string"==typeof e&&(Xe=!1),Xe){if(e.nodeName){const t=pt(e.nodeName);if(!Ne[t]||ve[t])throw b("root node is forbidden and cannot be sanitized in-place")}}else if(e instanceof R)n=_t("\x3c!----\x3e"),r=n.ownerDocument.importNode(e,!0),r.nodeType===J&&"BODY"===r.nodeName||"HTML"===r.nodeName?n=r:n.appendChild(r);else{if(!Fe&&!Ie&&!ze&&-1===e.indexOf("<"))return le&&We?le.createHTML(e):e;if(n=_t(e),!n)return Fe?null:We?ce:""}n&&He&&Et(n.firstChild);const c=St(Xe?e:n);for(;i=c.nextNode();)wt(i),vt(i),i.content instanceof s&&Lt(i.content);if(Xe)return e;if(Fe){if(Be)for(l=me.call(n.ownerDocument);n.firstChild;)l.appendChild(n.firstChild);else l=n;return(we.shadowroot||we.shadowrootmode)&&(l=fe.call(a,l,!0)),l}let m=ze?n.outerHTML:n.innerHTML;return ze&&Ne["!doctype"]&&n.ownerDocument&&n.ownerDocument.doctype&&n.ownerDocument.doctype.name&&S(K,n.ownerDocument.doctype.name)&&(m="<!DOCTYPE "+n.ownerDocument.doctype.name+">\n"+m),Ie&&u([he,ge,Te],(e=>{m=y(m,e," ")})),le&&We?le.createHTML(m):m},o.setConfig=function(){gt(arguments.length>0&&void 0!==arguments[0]?arguments[0]:{}),Pe=!0},o.clearConfig=function(){ft=null,Pe=!1},o.isValidAttribute=function(e,t,n){ft||gt({});const o=pt(e),r=pt(t);return Ot(o,r,n)},o.addHook=function(e,t){"function"==typeof t&&f(de[e],t)},o.removeHook=function(e,t){if(void 0!==t){const n=m(de[e],t);return-1===n?void 0:d(de[e],n,1)[0]}return p(de[e])},o.removeHooks=function(e){de[e]=[]},o.removeAllHooks=function(){de={afterSanitizeAttributes:[],afterSanitizeElements:[],afterSanitizeShadowDOM:[],beforeSanitizeAttributes:[],beforeSanitizeElements:[],beforeSanitizeShadowDOM:[],uponSanitizeAttribute:[],uponSanitizeElement:[],uponSanitizeShadowNode:[]}},o}();return re}));
//# sourceMappingURL=purify.min.js.map



/* js/sanitize.js */
// Shared sanitization utilities for XSS prevention

/**
 * Escape HTML special characters in text strings.
 * Use for ANY text data injected via innerHTML (titles, authors, categories, etc.)
 */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Sanitize HTML content that intentionally contains markup.
 * Use for rich content fields (essay.content, adventure.content, skill.fullContent).
 * Requires DOMPurify to be loaded first.
 */
function sanitizeHTML(html) {
    if (!html) return '';
    if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li',
                           'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
                           'img', 'figure', 'figcaption', 'div', 'span', 'hr', 'table', 'thead',
                           'tbody', 'tr', 'th', 'td', 'sup', 'sub', 'mark'],
            ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'id',
                           'width', 'height', 'loading', 'decoding'],
            ALLOW_DATA_ATTR: false,
            ADD_ATTR: ['target'],
        });
    }
    // Fallback: strip all tags if DOMPurify not loaded
    return html.replace(/<script[\s\S]*?<\/script>/gi, '')
               .replace(/on\w+\s*=/gi, 'data-removed=');
}

/**
 * Escape a string for safe use inside an HTML attribute value.
 * Use when interpolating into onclick, href, data-*, etc.
 */
function escapeAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Return a safe, escaped URL for href/src-like attributes.
 * Allows http(s), mailto, tel, #hash, and relative paths.
 */
function sanitizeUrl(url, fallback = '#') {
    const raw = String(url || '').trim();
    if (!raw) return fallback;

    if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) {
        return escapeAttr(raw);
    }

    try {
        const parsed = new URL(raw, window.location.origin);
        const protocol = parsed.protocol.toLowerCase();
        if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:' || protocol === 'tel:') {
            return escapeAttr(raw);
        }
    } catch {
        return fallback;
    }

    return fallback;
}



/* js/collection-ui.js */
(function () {
    function toggleClearButton(buttonOrId, show, displayValue = 'flex') {
        const button = typeof buttonOrId === 'string'
            ? document.getElementById(buttonOrId)
            : buttonOrId;
        if (!button) return;
        button.style.display = show ? displayValue : 'none';
    }

    function clearClasses(elements, classes) {
        elements.forEach((element) => {
            classes.forEach((className) => element.classList.remove(className));
        });
    }

    function activateOnly(elements, activeElement, classes = ['active']) {
        clearClasses(elements, classes);
        if (!activeElement) return;
        classes.forEach((className) => activeElement.classList.add(className));
    }

    function collapseGroups({ buttonSelector, panelSelector, activeButton = null, activePanel = null }) {
        const buttons = Array.from(document.querySelectorAll(buttonSelector));
        const panels = Array.from(document.querySelectorAll(panelSelector));
        clearClasses(buttons, ['active', 'expanded']);
        clearClasses(panels, ['expanded']);
        if (activeButton) activeButton.classList.add('active');
        if (activePanel) {
            activeButton?.classList.add('expanded');
            activePanel.classList.add('expanded');
        }
    }

    function highlightAndScroll(target, { activeSelector = null, activeElement = null, transform = 'scale(1.05)', shadow = '0 8px 30px rgba(102, 126, 234, 0.3)', duration = 2000 } = {}) {
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.style.transform = transform;
        target.style.boxShadow = shadow;
        setTimeout(() => {
            target.style.transform = '';
            target.style.boxShadow = '';
        }, duration);

        if (activeSelector) {
            clearClasses(Array.from(document.querySelectorAll(activeSelector)), ['active']);
        }
        activeElement?.classList.add('active');
    }

    function closeDropdownOnOutsideClick(dropdownId, event) {
        const dropdown = document.getElementById(dropdownId);
        if (dropdown && !dropdown.contains(event.target)) {
            dropdown.classList.remove('open');
        }
    }

    function setCollapsedState({
        layout,
        sidebar,
        isCollapsed,
        layoutClass = 'sidebar-collapsed',
        sidebarClass = 'collapsed'
    }) {
        layout?.classList.toggle(layoutClass, isCollapsed);
        sidebar?.classList.toggle(sidebarClass, isCollapsed);
        return isCollapsed;
    }

    function restoreCollapsedState({
        storageKey,
        layoutId,
        sidebarId,
        defaultCollapsed = true,
        layoutClass = 'sidebar-collapsed',
        sidebarClass = 'collapsed',
        onChange = null
    }) {
        const layout = document.getElementById(layoutId);
        const sidebar = document.getElementById(sidebarId);
        if (!layout || !sidebar) return false;
        const storedValue = localStorage.getItem(storageKey);
        const isCollapsed = storedValue == null
            ? defaultCollapsed
            : storedValue !== 'false' && storedValue !== '0';
        setCollapsedState({ layout, sidebar, isCollapsed, layoutClass, sidebarClass });
        onChange?.(isCollapsed);
        return isCollapsed;
    }

    function toggleCollapsedState({
        storageKey,
        layoutId,
        sidebarId,
        layoutClass = 'sidebar-collapsed',
        sidebarClass = 'collapsed',
        onChange = null
    }) {
        const layout = document.getElementById(layoutId);
        const sidebar = document.getElementById(sidebarId);
        if (!layout || !sidebar) return false;
        const isCollapsed = !sidebar.classList.contains(sidebarClass);
        setCollapsedState({ layout, sidebar, isCollapsed, layoutClass, sidebarClass });
        localStorage.setItem(storageKey, isCollapsed ? 'true' : 'false');
        onChange?.(isCollapsed);
        return isCollapsed;
    }

    function debounce(fn, wait = 120) {
        let timeoutId = null;
        return function (...args) {
            window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => fn.apply(this, args), wait);
        };
    }

    window.JGCollectionUI = {
        activateOnly,
        closeDropdownOnOutsideClick,
        collapseGroups,
        debounce,
        highlightAndScroll,
        restoreCollapsedState,
        setCollapsedState,
        toggleCollapsedState,
        toggleClearButton
    };
}());



/* js/collection-runtime.js */
(function () {
    function toArray(value) {
        return Array.from(value || []);
    }

    function datasetValue(element, key) {
        return element?.dataset?.[key] || '';
    }

    function selectorValue(value) {
        if (window.CSS?.escape) return window.CSS.escape(String(value));
        return String(value).replace(/["\\]/g, '\\$&');
    }

    function resolveActionButton(buttonOrEvent, selector) {
        if (buttonOrEvent?.target) return buttonOrEvent.target.closest(selector);
        if (buttonOrEvent?.matches?.(selector)) return buttonOrEvent;
        return null;
    }

    function create(config) {
        const state = {
            category: config.defaultCategory || 'all',
            search: ''
        };
        let initialized = false;

        function cards() {
            return toArray(document.querySelectorAll(config.cardSelector));
        }

        function categoryTokens(card) {
            const raw = datasetValue(card, config.categoryDataset || 'category').toLowerCase();
            if (config.categoryMode === 'exact') return [raw];
            return raw.split(/\s+/).filter(Boolean);
        }

        function matchesCategory(card) {
            if (state.category === 'all') return true;
            return categoryTokens(card).includes(String(state.category).toLowerCase());
        }

        function matchesSearch(card) {
            const query = state.search.toLowerCase();
            if (!query) return true;
            return datasetValue(card, config.searchDataset || 'search').toLowerCase().includes(query);
        }

        function visibleCards(allCards = cards()) {
            return allCards.filter((card) => matchesCategory(card) && matchesSearch(card));
        }

        function setActiveButton(button) {
            const buttons = toArray(document.querySelectorAll(config.buttonSelector || '.sidebar-category'));
            if (window.JGCollectionUI?.activateOnly) {
                window.JGCollectionUI.activateOnly(buttons, button);
                return;
            }
            buttons.forEach((item) => item.classList.remove('active'));
            button?.classList.add('active');
        }

        function allButton() {
            if (config.allButtonSelector) return document.querySelector(config.allButtonSelector);
            return document.querySelector(`${config.buttonSelector || '.sidebar-category'}[data-action-args="all"]`);
        }

        function updateClearButton() {
            if (!config.searchClearButtonId) return;
            const displayValue = config.searchClearDisplay || 'flex';
            if (window.JGCollectionUI?.toggleClearButton) {
                window.JGCollectionUI.toggleClearButton(config.searchClearButtonId, Boolean(state.search), displayValue);
                return;
            }
            const button = document.getElementById(config.searchClearButtonId);
            if (button) button.style.display = state.search ? displayValue : 'none';
        }

        function updateCount(count) {
            if (!config.counterId) return;
            const counter = document.getElementById(config.counterId);
            if (counter) counter.textContent = count;
        }

        function groupButtons() {
            return toArray(document.querySelectorAll(config.group?.buttonSelector || config.buttonSelector || '.sidebar-category'));
        }

        function resetGrouping() {
            const activeButton = config.group?.allButtonSelector
                ? document.querySelector(config.group.allButtonSelector)
                : allButton();
            if (config.group?.panelSelector) {
                window.JGCollectionUI?.collapseGroups({
                    activeButton,
                    buttonSelector: config.group.buttonSelector,
                    panelSelector: config.group.panelSelector
                });
                return;
            }
            if (window.JGCollectionUI?.activateOnly) {
                window.JGCollectionUI.activateOnly(groupButtons(), activeButton);
                return;
            }
            setActiveButton(activeButton);
        }

        function activateGrouping(button, panel = null) {
            if (config.group?.panelSelector) {
                window.JGCollectionUI?.collapseGroups({
                    activeButton: button,
                    activePanel: panel,
                    buttonSelector: config.group.buttonSelector,
                    panelSelector: config.group.panelSelector
                });
                return;
            }
            if (window.JGCollectionUI?.activateOnly) {
                window.JGCollectionUI.activateOnly(groupButtons(), button);
                return;
            }
            setActiveButton(button);
        }

        function renderManaged() {
            const managedState = config.getState();
            const filteredItems = config.getFilteredItems(managedState);
            const visibleItems = typeof config.getVisibleItems === 'function'
                ? config.getVisibleItems(filteredItems, managedState)
                : filteredItems;

            if (config.renderSidebar && config.groupItems) {
                config.renderSidebar(config.groupItems(filteredItems), managedState);
            }

            config.renderVisibleItems?.(visibleItems, managedState);
            config.updateCount?.(visibleItems, managedState);
            config.updateControls?.(managedState, filteredItems, visibleItems);
            config.onRender?.({ filteredItems, state: managedState, visibleItems });
            return visibleItems;
        }

        function renderCards() {
            const allCards = cards();
            const visible = visibleCards(allCards);
            const visibleSet = new Set(visible);
            for (const card of allCards) {
                if (config.useDisplayStyle) {
                    card.style.display = visibleSet.has(card) ? (config.visibleDisplay || 'block') : 'none';
                } else {
                    card.hidden = !visibleSet.has(card);
                }
            }
            updateCount(visible.length);
            updateClearButton();
            config.onRender?.({ allCards, state: { ...state }, visibleCards: visible });
            return visible;
        }

        function render() {
            if (typeof config.getFilteredItems === 'function') return renderManaged();
            return renderCards();
        }

        function filter(category, buttonOrEvent) {
            state.category = category || 'all';
            const button = resolveActionButton(buttonOrEvent, config.buttonSelector || '.sidebar-category')
                || document.querySelector(`${config.buttonSelector || '.sidebar-category'}[data-action-args="${selectorValue(state.category)}"]`)
                || allButton();
            setActiveButton(button);
            return render();
        }

        function search(query) {
            state.search = String(query || '').trim();
            if (config.resetCategoryOnSearch !== false) {
                state.category = 'all';
                setActiveButton(allButton());
            }
            return render();
        }

        function clearSearchInput() {
            const input = document.getElementById(config.searchInputId);
            if (input) input.value = '';
        }

        function clearSearch() {
            state.search = '';
            state.category = 'all';
            clearSearchInput();
            setActiveButton(allButton());
            return render();
        }

        function toggleSidebar() {
            if (window.JGCollectionUI?.toggleCollapsedState) {
                return window.JGCollectionUI.toggleCollapsedState({
                    storageKey: config.storageKey,
                    layoutId: config.layoutId,
                    sidebarId: config.sidebarId
                });
            }
            const layout = document.getElementById(config.layoutId);
            const sidebar = document.getElementById(config.sidebarId);
            if (!layout || !sidebar) return false;
            const isCollapsed = !sidebar.classList.contains('collapsed');
            layout.classList.toggle('sidebar-collapsed', isCollapsed);
            sidebar.classList.toggle('collapsed', isCollapsed);
            localStorage.setItem(config.storageKey, isCollapsed ? 'true' : 'false');
            return isCollapsed;
        }

        function restoreSidebar() {
            if (!config.storageKey || !window.JGCollectionUI?.restoreCollapsedState) return false;
            return window.JGCollectionUI.restoreCollapsedState({
                storageKey: config.storageKey,
                layoutId: config.layoutId,
                sidebarId: config.sidebarId,
                defaultCollapsed: config.defaultCollapsed ?? true
            });
        }

        function toggleListDropdown() {
            document.getElementById(config.dropdownId || 'list-dropdown')?.classList.toggle('open');
        }

        function closeDropdownOnOutsideClick(event) {
            if (window.JGCollectionUI?.closeDropdownOnOutsideClick) {
                window.JGCollectionUI.closeDropdownOnOutsideClick(config.dropdownId || 'list-dropdown', event);
                return;
            }
            const dropdown = document.getElementById(config.dropdownId || 'list-dropdown');
            if (dropdown && !dropdown.contains(event.target)) dropdown.classList.remove('open');
        }

        function toggleGroup({ button = null, onCollapse = null, onExpand = null, panel = null, value = 'all' }) {
            if (!config.group) return render();
            if (config.group.panelSelector) {
                const resolvedPanel = panel || config.group.panelForValue?.(value) || null;
                const isExpanded = Boolean(resolvedPanel?.classList.contains('expanded'));
                if (value === 'all' || isExpanded) {
                    onCollapse?.();
                    resetGrouping();
                    return render();
                }
                if (!button || !resolvedPanel) return render();
                onExpand?.();
                activateGrouping(button, resolvedPanel);
                return render();
            }
            activateGrouping(button || allButton());
            onExpand?.();
            return render();
        }

        function initZoom() {
            if (!config.zoom || !window.JGGridZoom) return;
            const grid = document.getElementById(config.gridId);
            if (!grid) return;
            grid.classList.add('js-zoom-grid');
            window.JGGridZoom.init({
                grid,
                anchorSelector: config.zoom.anchorSelector,
                fillH: config.zoom.fillH,
                fillW: config.zoom.fillW,
                itemSelector: config.zoom.itemSelector || config.cardSelector,
                maxScale: config.zoom.maxScale,
                triggerSelector: config.zoom.triggerSelector || config.cardSelector,
                eventName: config.zoom.eventName
            });
        }

        function registerActions() {
            if (!config.actions || !window.JGActions) return;
            const actions = {};
            if (config.actions.clearSearch) actions[config.actions.clearSearch] = clearSearch;
            if (config.actions.filter) actions[config.actions.filter] = filter;
            if (config.actions.search) actions[config.actions.search] = search;
            if (config.actions.toggleDropdown) actions[config.actions.toggleDropdown] = toggleListDropdown;
            if (config.actions.toggleSidebar) actions[config.actions.toggleSidebar] = toggleSidebar;
            window.JGActions.register(actions);
        }

        function init() {
            if (initialized) return render();
            initialized = true;
            registerActions();
            document.addEventListener('click', closeDropdownOnOutsideClick);
            restoreSidebar();
            const visible = render();
            initZoom();
            return visible;
        }

        return {
            clearSearch,
            clearSearchInput,
            closeDropdownOnOutsideClick,
            filter,
            init,
            render,
            resetGrouping,
            restoreSidebar,
            search,
            state,
            toggleGroup,
            toggleListDropdown,
            toggleSidebar,
            visibleCards
        };
    }

    window.JGCollectionRuntime = { create };
}());



/* js/data-fetch.js */
(function () {
    const manifestUrl = '/data/runtime-data-manifest.json';
    let manifestPromise = null;

    function isJsonPath(url) {
        return /\.json(?:$|\?)/i.test(url);
    }

    function relativeAssetPath(url) {
        try {
            const absolute = new URL(url, window.location.origin);
            return absolute.pathname.replace(/^\/+/, '');
        } catch {
            return String(url || '').replace(/^\/+/, '');
        }
    }

    async function loadManifest() {
        if (!manifestPromise) {
            manifestPromise = fetch(manifestUrl, { cache: 'default' })
                .then((response) => response.ok ? response.json() : { assets: {} })
                .catch(() => ({ assets: {} }));
        }
        return manifestPromise;
    }

    async function versionedUrl(url) {
        if (!url || /^https?:\/\//i.test(url) || !isJsonPath(url)) return url;
        const manifest = await loadManifest();
        const assetPath = relativeAssetPath(url.split('#')[0]);
        const version = manifest.assets?.[assetPath];
        if (!version) return url;
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}v=${version}`;
    }

    async function fetchJson(url, options = {}) {
        const target = await versionedUrl(url);
        const response = await fetch(target, {
            cache: options.cache || 'default'
        });
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.status}`);
        }
        return response.json();
    }

    async function fetchJsonWithFallback(urls, options = {}) {
        let lastError = null;
        for (const url of urls) {
            try {
                return await fetchJson(url, options);
            } catch (error) {
                lastError = error;
            }
        }
        throw lastError || new Error('Failed to load JSON');
    }

    window.JGDataFetch = {
        fetchJson,
        fetchJsonWithFallback,
        versionedUrl
    };
}());



/* js/action-dispatcher.js */
(function () {
    const registry = Object.create(null);

    function register(actions) {
        Object.assign(registry, actions || {});
    }

    function resolveAction(name) {
        return registry[name] || window[name];
    }

    function defaultEventType(el) {
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return 'input';
        return 'click';
    }

    function parseArgs(raw) {
        if (!raw) return [];
        return raw.split('|').map((value) => decodeURIComponent(value));
    }

    function findActionTarget(event, eventType) {
        if (eventType === 'click') {
            return event.target.closest('[data-action]');
        }
        if (event.target && event.target.matches('[data-action]')) {
            return event.target;
        }
        return null;
    }

    function runAction(event, eventType) {
        const el = findActionTarget(event, eventType);
        if (!el) return;

        const actionEvent = el.dataset.actionEvent || defaultEventType(el);
        if (actionEvent !== eventType) return;

        const fnName = el.dataset.action;
        const fn = resolveAction(fnName);
        if (typeof fn !== 'function') return;

        const args = parseArgs(el.dataset.actionArgs);
        if (el.dataset.actionValue === 'true') args.push(el.value);
        if (el.dataset.actionThis === 'true') args.push(el);
        if (el.dataset.actionEventobj === 'true') args.push(event);

        const result = fn.apply(window, args);
        if (el.dataset.actionPreventDefault === 'true' || result === false) {
            event.preventDefault();
        }
    }

    document.addEventListener('click', function (event) {
        runAction(event, 'click');
    });

    document.addEventListener('input', function (event) {
        runAction(event, 'input');
    });

    document.addEventListener('submit', function (event) {
        runAction(event, 'submit');
    });

    window.JGActions = { register };
}());



/* js/essays.js */
const collectionUi = window.JGCollectionUI;
const dataFetch = window.JGDataFetch;
let essaysRuntime = null;

// Essays page orchestrator. State, filters, and view rendering live here because
// this page is their only consumer.
const ESSAY_CATEGORY_KEYS = ['philosophy', 'management', 'technology', 'personal', 'finance', 'writing'];

const essaysState = (() => {
    const state = {
        activeCategory: 'all',
        currentIndex: 0,
        essays: [],
        filteredEssays: [],
        searchTerm: '',
        sidebarCollapsed: false
    };

    return {
        clearSearchTerm() {
            state.searchTerm = '';
        },
        get() {
            return {
                ...state,
                essays: [...state.essays],
                filteredEssays: [...state.filteredEssays]
            };
        },
        setActiveCategory(category) {
            state.activeCategory = category || 'all';
        },
        setCurrentIndex(index) {
            state.currentIndex = index;
        },
        setEssays(essays) {
            state.essays = Array.isArray(essays) ? essays : [];
        },
        setFilteredEssays(essays) {
            state.filteredEssays = Array.isArray(essays) ? essays : [];
        },
        setSearchTerm(term) {
            state.searchTerm = String(term || '').trim().toLowerCase();
        },
        setSidebarCollapsed(collapsed) {
            state.sidebarCollapsed = Boolean(collapsed);
        }
    };
})();

function filterEssaysByCategory(essays, category) {
    if (category === 'all') {
        return essays;
    }
    return essays.filter((essay) => String(essay.category || '').toLowerCase() === category);
}

function filterEssaysBySearch(essays, term) {
    const normalized = String(term || '').trim().toLowerCase();
    if (!normalized) {
        return essays;
    }

    return essays.filter((essay) => {
        const searchable = [
            essay.title,
            essay.subtitle || '',
            essay.category,
            essay.content || ''
        ].join(' ').toLowerCase();

        return searchable.includes(normalized);
    });
}

function groupEssaysByCategory(essays) {
    const groups = ESSAY_CATEGORY_KEYS.reduce((memo, key) => {
        memo[key] = [];
        return memo;
    }, {});

    essays.forEach((essay) => {
        const key = String(essay.category || '').toLowerCase();
        if (groups[key]) {
            groups[key].push(essay);
        }
    });

    return groups;
}

function findEssayIndex(essays, essayId) {
    return essays.findIndex((essay) => essay.id === essayId);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateShort(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function createEssayArticle(essay) {
    const article = document.createElement('article');
    article.className = 'article-full';
    article.id = essay.id;
    article.innerHTML = `
        <div class="post-meta">
            <span class="post-date">${escapeHTML(formatDate(essay.date))}</span>
            <span class="post-category">${escapeHTML(essay.category)}</span>
        </div>
        <h2>${escapeHTML(essay.title)}</h2>
        ${essay.subtitle ? `<p><em>${escapeHTML(essay.subtitle)}</em></p>` : ''}
        ${sanitizeHTML(essay.content)}
    `;
    return article;
}

function createEssayNav(filteredEssays, currentIndex) {
    const nav = document.createElement('div');
    nav.className = 'essay-nav';
    const total = filteredEssays.length;
    const atStart = currentIndex <= 0;
    const atEnd = currentIndex >= total - 1;
    const prevTitle = !atStart ? filteredEssays[currentIndex - 1].title : '';
    const nextTitle = !atEnd ? filteredEssays[currentIndex + 1].title : '';

    nav.innerHTML = `
        <button class="essay-nav-btn essay-nav-prev" ${atStart ? 'disabled' : ''} data-action="prevEssay">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span class="essay-nav-label">
                <span class="essay-nav-direction">Previous</span>
                ${prevTitle ? `<span class="essay-nav-title">${escapeHTML(prevTitle)}</span>` : ''}
            </span>
        </button>
        <span class="essay-nav-counter">${currentIndex + 1} / ${total}</span>
        <button class="essay-nav-btn essay-nav-next" ${atEnd ? 'disabled' : ''} data-action="nextEssay">
            <span class="essay-nav-label essay-nav-label-right">
                <span class="essay-nav-direction">Next</span>
                ${nextTitle ? `<span class="essay-nav-title">${escapeHTML(nextTitle)}</span>` : ''}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
    `;
    return nav;
}

function updateActiveSidebarLink(essayId) {
    document.querySelectorAll('.essay-link').forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${essayId}`);
    });
}

function renderCurrentEssay(filteredEssays, currentIndex) {
    const container = document.getElementById('essays-container');
    if (!container) return;

    container.innerHTML = '';

    if (!filteredEssays.length) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 3rem;">No essays published yet.</p>';
        return;
    }

    const essay = filteredEssays[currentIndex];
    container.appendChild(createEssayArticle(essay));
    container.appendChild(createEssayNav(filteredEssays, currentIndex));
    updateActiveSidebarLink(essay.id);
}

function renderEssaySidebar(groups) {
    const countAll = document.getElementById('count-all');
    if (countAll) {
        const total = Object.values(groups).reduce((sum, essays) => sum + essays.length, 0);
        countAll.textContent = total;
    }

    Object.keys(groups).forEach((category) => {
        const essays = groups[category];
        const countEl = document.getElementById(`count-${category}`);
        const section = countEl?.closest('.sidebar-section');
        const container = document.getElementById(`category-${category}`);

        if (countEl) {
            countEl.textContent = essays.length;
        }

        if (section) {
            section.style.display = essays.length === 0 ? 'none' : 'block';
        }

        if (container) {
            container.innerHTML = essays.map((essay) => `
                <a href="#${escapeAttr(essay.id)}" class="essay-link" data-action="scrollToEssay" data-action-args="${encodeURIComponent(essay.id)}" data-action-eventobj="true">
                    <div>${escapeHTML(essay.title)}</div>
                    <div class="essay-link-date">${escapeHTML(formatDateShort(essay.date))}</div>
                </a>
            `).join('');
        }
    });
}

function updateEssayCount(count) {
    const countEl = document.getElementById('essay-count');
    if (countEl) {
        countEl.textContent = count;
    }
}

function showEssayErrorMessage() {
    const container = document.getElementById('essays-container');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <p style="color: var(--accent-color); font-size: 1.2rem; margin-bottom: 1rem;">Unable to load essays</p>
            <p style="color: var(--text-light);">Please try refreshing the page.</p>
        </div>
    `;
}

function scrollEssaysToTop() {
    const main = document.querySelector('.essays-main');
    if (main) {
        main.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadEssays() {
    try {
        const data = await dataFetch.fetchJson('data/essays.json');
        const publishedEssays = data.essays
            .filter((essay) => essay.status === 'published')
            .sort((left, right) => new Date(right.date) - new Date(left.date));

        essaysState.setEssays(publishedEssays);
        essaysState.setFilteredEssays(publishedEssays);
        renderFromState();
    } catch (error) {
        console.error('Error loading essays:', error);
        showEssayErrorMessage();
    }
}

function getDerivedEssays() {
    const state = essaysState.get();
    const categoryFiltered = filterEssaysByCategory(state.essays, state.activeCategory);
    return filterEssaysBySearch(categoryFiltered, state.searchTerm);
}

function getVisibleEssayState(filteredEssays) {
    const state = essaysState.get();
    const currentIndex = Math.max(0, Math.min(state.currentIndex, Math.max(filteredEssays.length - 1, 0)));
    essaysState.setFilteredEssays(filteredEssays);
    essaysState.setCurrentIndex(currentIndex);
    return {
        essays: filteredEssays,
        currentIndex
    };
}

function renderFromState() {
    essaysRuntime?.render();
}

function buildCollectionController() {
    essaysRuntime = window.JGCollectionRuntime.create({
        getState: () => essaysState.get(),
        getFilteredItems: () => getDerivedEssays(),
        getVisibleItems: (filteredEssays) => getVisibleEssayState(filteredEssays),
        renderSidebar: () => renderEssaySidebar(groupEssaysByCategory(essaysState.get().essays)),
        groupItems: () => groupEssaysByCategory(essaysState.get().essays),
        renderVisibleItems: (visibleState) => renderCurrentEssay(visibleState.essays, visibleState.currentIndex),
        updateCount: (visibleState) => updateEssayCount(visibleState.essays.length),
        updateControls: (state) => collectionUi.toggleClearButton('search-clear-btn', Boolean(state.searchTerm), 'block'),
        group: {
            allButtonSelector: '[data-action="toggleCategory"][data-action-args="all"]',
            buttonSelector: '.sidebar-category',
            panelForValue: (category) => category === 'all' ? null : document.getElementById(`category-${category}`),
            panelSelector: '.category-essays'
        },
        searchClearButtonId: 'search-clear-btn',
        searchInputId: 'essay-search',
        storageKey: 'essays-sidebar-collapsed',
        layoutId: 'essays-layout',
        sidebarId: 'essays-sidebar',
        defaultCollapsed: false
    });
}

function toggleCategory(category, event) {
    const button = event?.target?.closest('.sidebar-category');
    const panel = category === 'all' ? null : document.getElementById(`category-${category}`);

    essaysRuntime?.toggleGroup({
        value: category,
        button,
        panel,
        onCollapse: () => {
            essaysState.setActiveCategory('all');
            essaysState.setCurrentIndex(0);
        },
        onExpand: () => {
            essaysState.setActiveCategory(category);
            essaysState.setCurrentIndex(0);
        }
    });
}

const searchEssays = collectionUi.debounce((term) => {
    essaysState.setSearchTerm(term);
    essaysState.setActiveCategory('all');
    essaysState.setCurrentIndex(0);
    essaysRuntime?.resetGrouping();
    renderFromState();
});

function clearEssaySearch() {
    essaysRuntime?.clearSearchInput();
    essaysState.clearSearchTerm();
    essaysState.setActiveCategory('all');
    essaysState.setCurrentIndex(0);
    essaysRuntime?.resetGrouping();
    renderFromState();
}

function prevEssay() {
    const state = essaysState.get();
    if (state.currentIndex <= 0) return;
    essaysState.setCurrentIndex(state.currentIndex - 1);
    renderFromState();
    scrollEssaysToTop();
}

function nextEssay() {
    const state = essaysState.get();
    if (state.currentIndex >= state.filteredEssays.length - 1) return;
    essaysState.setCurrentIndex(state.currentIndex + 1);
    renderFromState();
    scrollEssaysToTop();
}

function scrollToEssay(essayId, event) {
    event?.preventDefault();

    const state = essaysState.get();
    const filteredIndex = findEssayIndex(state.filteredEssays, essayId);
    if (filteredIndex >= 0) {
        essaysState.setCurrentIndex(filteredIndex);
        renderFromState();
        scrollEssaysToTop();
        return;
    }

    const fullIndex = findEssayIndex(state.essays, essayId);
    if (fullIndex < 0) return;

    essaysState.setActiveCategory('all');
    essaysState.setCurrentIndex(fullIndex);
    essaysRuntime?.resetGrouping();
    renderFromState();
    scrollEssaysToTop();
}

function toggleEssaysSidebar() {
    const isCollapsed = essaysRuntime?.toggleSidebar();
    essaysState.setSidebarCollapsed(isCollapsed);
}

function restoreSidebarState() {
    const isCollapsed = essaysRuntime?.restoreSidebar();
    essaysState.setSidebarCollapsed(isCollapsed);
}

function toggleListDropdown() {
    essaysRuntime?.toggleListDropdown();
}

window.JGActions.register({
    clearEssaySearch,
    nextEssay,
    prevEssay,
    scrollToEssay,
    searchEssays,
    toggleCategory,
    toggleEssaysSidebar,
    toggleListDropdown
});

document.addEventListener('DOMContentLoaded', () => {
    buildCollectionController();
    restoreSidebarState();
    document.addEventListener('click', (event) => {
        essaysRuntime?.closeDropdownOnOutsideClick(event);
    });
    loadEssays();
});



/* js/theme.js */
// Theme Toggle and Wisdom Ticker Functionality

(function() {
    'use strict';

    // Theme Toggle
    const THEME_KEY = 'jg-theme';

    function getPreferredTheme() {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored) return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        updateToggleButton(theme);
    }

    function updateToggleButton(theme) {
        const btn = document.querySelector('.theme-toggle');
        if (!btn) return;
        const label = btn.querySelector('span');
        if (label) {
            label.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
        }
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        setTheme(next);
    }

    // Initialize theme on page load
    function initTheme() {
        const theme = getPreferredTheme();
        setTheme(theme);

        // Add click handler to toggle button
        const toggleBtn = document.querySelector('.theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
        }
    }

    // Wisdom Ticker - Short quotes that cycle through
    // Fallback quotes in case JSON fetch fails
    const fallbackQuotes = [
        "Stay curious, stay humble",
        "Build for decades, not quarters",
        "First principles thinking",
        "Actions reveal priorities",
        "Compound interest in all things",
        "Learn in public",
        "Question assumptions",
        "Simple is harder than complex",
        "The obstacle is the way",
        "Be so good they can't ignore you",
        "Comfort is the enemy of progress"
    ];

    function renderWisdomTicker(quotes) {
        const track = document.querySelector('.wisdom-ticker-track');
        if (!track) return;

        // Shuffle quotes
        const shuffled = [...quotes].sort(() => Math.random() - 0.5);

        // Take first 5 unique items, then add first one at end for seamless loop
        // This creates exactly 6 items to match the CSS animation (6 positions)
        const selected = shuffled.slice(0, 5);
        selected.push(selected[0]);

        // Build HTML with clickable links to quotes page
        track.innerHTML = selected.map(phrase =>
            `<a href="quotes.html" class="wisdom-item">${typeof escapeHTML === 'function' ? escapeHTML(phrase) : phrase}</a>`
        ).join('');
    }

    async function initWisdomTicker() {
        const track = document.querySelector('.wisdom-ticker-track');
        if (!track) return;

        try {
            // Try to fetch quotes from JSON file
            const response = await fetch('data/quotes.json');
            if (response.ok) {
                const data = await response.json();
                // Use tickerQuotes array from JSON
                if (data.tickerQuotes && data.tickerQuotes.length >= 5) {
                    renderWisdomTicker(data.tickerQuotes);
                    return;
                }
            }
        } catch (e) {
            // Fetch failed, use fallback
        }

        // Use fallback quotes if fetch failed
        renderWisdomTicker(fallbackQuotes);
    }

    // Logo video hover effect (lazy-load video source on first interaction)
    function initLogoVideo() {
        const logo = document.querySelector('.logo');
        const video = document.querySelector('.logo-video');
        if (!logo || !video) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        let sourceLoaded = false;

        function supportsVideoType(type) {
            return Boolean(video.canPlayType && video.canPlayType(type).replace('no', ''));
        }

        function densityKey() {
            const dpr = window.devicePixelRatio || 1;
            if (dpr >= 2.75) return '3x';
            if (dpr >= 1.5) return '2x';
            return '1x';
        }

        function videoSourceForDisplay() {
            const density = densityKey();
            const webm = video.getAttribute(`data-webm-${density}`);
            const mp4 = video.getAttribute(`data-mp4-${density}`);
            if (webm && supportsVideoType('video/webm; codecs="vp9"')) return webm;
            return mp4 || webm;
        }

        function ensureVideoSource() {
            if (sourceLoaded) return;
            const dataSrc = videoSourceForDisplay();
            if (!dataSrc) return;
            video.src = dataSrc;
            video.preload = 'auto';
            video.load();
            sourceLoaded = true;
        }

        function playVideo() {
            ensureVideoSource();
            if (video.readyState >= 2) {
                video.currentTime = 0;
                video.play().catch(() => {});
                return;
            }
            const playOnReady = () => {
                video.currentTime = 0;
                video.play().catch(() => {});
                video.removeEventListener('canplay', playOnReady);
            };
            video.addEventListener('canplay', playOnReady);
        }

        logo.addEventListener('mouseenter', playVideo);
        logo.addEventListener('mouseleave', () => {
            video.pause();
        });
        logo.addEventListener('touchstart', ensureVideoSource, { passive: true });
    }

    // Mobile Navigation
    function initMobileNav() {
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        const dropdowns = document.querySelectorAll('.nav-dropdown');

        if (!mobileMenuToggle || !navLinks) return;

        mobileMenuToggle.addEventListener('click', () => {
            mobileMenuToggle.classList.toggle('active');
            navLinks.classList.toggle('mobile-open');
            document.body.style.overflow = navLinks.classList.contains('mobile-open') ? 'hidden' : '';
        });

        // Handle dropdown toggles on mobile
        dropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.dropdown-trigger');
            if (trigger) {
                const handleDropdownClick = (e) => {
                    if (window.innerWidth <= 968) {
                        e.preventDefault();
                        e.stopPropagation();
                        // Close other dropdowns
                        dropdowns.forEach(d => {
                            if (d !== dropdown) {
                                d.classList.remove('mobile-dropdown-open');
                            }
                        });
                        dropdown.classList.toggle('mobile-dropdown-open');
                    }
                };
                trigger.addEventListener('click', handleDropdownClick);
                trigger.addEventListener('touchend', (e) => {
                    if (window.innerWidth <= 968) {
                        e.preventDefault();
                        handleDropdownClick(e);
                    }
                });
            }
        });

        // Close mobile menu when clicking a non-dropdown link
        navLinks.querySelectorAll('a:not(.dropdown-trigger)').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 968) {
                    mobileMenuToggle.classList.remove('active');
                    navLinks.classList.remove('mobile-open');
                    document.body.style.overflow = '';
                    dropdowns.forEach(d => d.classList.remove('mobile-dropdown-open'));
                }
            });
        });

        // Close menu when resizing to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 968) {
                mobileMenuToggle.classList.remove('active');
                navLinks.classList.remove('mobile-open');
                document.body.style.overflow = '';
                dropdowns.forEach(d => d.classList.remove('mobile-dropdown-open'));
            }
        });
    }

    // Track navbar height as a CSS variable so sticky sidebars align with the nav
    // regardless of compact/non-compact nav or resize changes.
    function syncNavHeight() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;
        const h = Math.round(navbar.getBoundingClientRect().height);
        if (h > 0) document.documentElement.style.setProperty('--nav-height', `${h}px`);
    }

    function initNavHeight() {
        syncNavHeight();
        window.addEventListener('resize', syncNavHeight);
        if (window.ResizeObserver) {
            const navbar = document.querySelector('.navbar');
            if (navbar) new ResizeObserver(syncNavHeight).observe(navbar);
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initTheme();
            initWisdomTicker();
            initLogoVideo();
            initMobileNav();
            initNavHeight();
        });
    } else {
        initTheme();
        initWisdomTicker();
        initLogoVideo();
        initMobileNav();
        initNavHeight();
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
})();



/* js/analytics.js */
(function () {
  const endpoint = document.querySelector('meta[name="analytics-endpoint"]')?.content || window.JG_ANALYTICS_ENDPOINT || '';
  const queueKey = 'jg_analytics_events';

  function eventPayload(name, details) {
    return {
      name,
      details: details || {},
      path: window.location.pathname,
      search: window.location.search,
      referrer: document.referrer || '',
      timestamp: new Date().toISOString()
    };
  }

  function store(payload) {
    try {
      const existing = JSON.parse(window.localStorage.getItem(queueKey) || '[]');
      existing.push(payload);
      window.localStorage.setItem(queueKey, JSON.stringify(existing.slice(-50)));
    } catch {
      // Analytics must never affect the public site experience.
    }
  }

  function plausibleName(name) {
    return name.split('_').map(function (part) {
      return part.charAt(0).toUpperCase() + part.slice(1);
    }).join(' ');
  }

  function send(payload) {
    if (window.plausible) {
      window.plausible(plausibleName(payload.name), { props: payload.details });
    }

    if (!endpoint) {
      store(payload);
      return;
    }

    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
      return;
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    }).catch(function () {
      store(payload);
    });
  }

  function track(name, details) {
    const payload = eventPayload(name, details);
    window.dispatchEvent(new CustomEvent('jg:analytics', { detail: payload }));
    send(payload);
  }

  function datasetDetails(element) {
    const details = {};
    for (const key of Object.keys(element.dataset || {})) {
      if (key === 'analytics') continue;
      details[key] = element.dataset[key];
    }
    return details;
  }

  function classifyLink(link) {
    const href = link.getAttribute('href') || '';
    if (link.dataset.analytics) return link.dataset.analytics;
    if (/^mailto:/i.test(href)) return 'contact';
    if (/^https?:\/\//i.test(href) && !href.includes(window.location.hostname)) return 'outbound';
    if (link.matches('.product-cta, .resource-link, .btn-primary, .btn-newsletter, .navbar-contact-btn')) return 'cta';
    if (href.includes('contact.html') || href.includes('meet.html')) return 'contact';
    if (href.includes('products.html')) return 'product';
    if (href.includes('free-resources.html')) return 'resource';
    return '';
  }

  document.addEventListener('click', function (event) {
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;
    const type = classifyLink(link);
    if (!type) return;

    const eventName = {
      cta: 'cta_click',
      contact: 'contact_click',
      product: 'product_click',
      resource: 'resource_click',
      outbound: 'outbound_click'
    }[type] || 'link_click';

    track(eventName, {
      ...datasetDetails(link),
      type,
      href: link.getAttribute('href'),
      label: link.textContent.trim().replace(/\s+/g, ' ').slice(0, 120)
    });
  });

  document.addEventListener('submit', function (event) {
    const form = event.target;
    if (!form || !form.matches('form')) return;
    track(form.matches('[data-newsletter-form]') ? 'newsletter_submit' : 'form_submit', {
      id: form.id || '',
      className: form.className || '',
      action: form.getAttribute('action') || ''
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    track('page_view', {
      title: document.title,
      section: document.body?.dataset?.section || ''
    });
  });

  window.JGAnalytics = { track, flushDebugEvents: function () {
    const events = JSON.parse(window.localStorage.getItem(queueKey) || '[]');
    window.localStorage.removeItem(queueKey);
    return events;
  } };
}());


