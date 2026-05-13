// Build the loading + fetchpriority attribute string for an SSR'd image
// based on its render-order index. Cards above the LCP threshold get
// loading="eager" + fetchpriority="high"; the rest get native lazy loading.

export function lcpAttrs(index: number, eagerThreshold: number): string {
    const eager = index < eagerThreshold;
    const loadingAttr = eager ? 'eager' : 'lazy';
    const priorityAttr = eager ? ' fetchpriority="high"' : '';
    return `loading="${loadingAttr}"${priorityAttr}`;
}
