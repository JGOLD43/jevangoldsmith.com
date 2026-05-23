// Shared collection shell types. The chrome itself is rendered by
// CollectionShell.astro so page markup stays in Astro components instead of
// build-time HTML strings.

export interface SectionItem {
  label: string;
  icon?: string;
  iconKey?: string;
  countId?: string;
  count?: string;
  tooltip?: string;
  attrs?: Record<string, string>;
  panelId?: string;
  panelClass?: string;
  panelLinks?: Array<{
    href: string;
    className: string;
    label: string;
    meta?: string;
    /** Optional thumbnail (e.g. book cover, movie poster) rendered left of the label. */
    coverUrl?: string;
    attrs?: Record<string, string>;
  }>;
  panelInnerHtml?: string;
}

export interface ListOption {
  href: string;
  label: string;
  active?: boolean;
  attrs?: Record<string, string>;
}

interface SearchConfig {
  inputId: string;
  inputClass?: string;
  placeholder?: string;
  clearButtonId?: string;
  clearAction?: string;
  searchAction?: string;
  searchUsesValue?: boolean;
  searchEvent?: string;
  wrapperClass?: string;
}

export interface CollectionConfig {
  layout: { id: string; className: string };
  sidebar: {
    id: string;
    className: string;
    collapseAction?: string;
    listAction?: string;
    currentListName?: string;
    listOptions?: ListOption[];
    search?: SearchConfig;
    loadingMessage?: string;
    sectionsWrapperId?: string;
    footerText?: string;
    footerId?: string;
    footerHidden?: boolean;
    sections: SectionItem[];
  };
  main: {
    className: string;
    titleTag?: string;
    title: string;
    subtitleHtml?: string;
    subtitleText?: string;
    counterGroupClass?: string;
    counterId: string;
    counterLabelId?: string;
    counterLabel: string;
    /** Label for the second tab in the mobile list/grid toggle. Defaults
     * to `main.title`. Keep short — surfaces on phones only. */
    mobileGridLabel?: string;
  };
}
