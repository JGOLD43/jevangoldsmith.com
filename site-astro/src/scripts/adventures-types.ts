export interface AdventureMapCenter {
    lat: number;
    lng: number;
}

export interface AdventureGalleryItem {
    caption?: string;
    src?: string;
    thumbnail?: string;
}

export interface AdventureRecord {
    content?: string;
    duration?: string;
    endDate?: string;
    gallery?: AdventureGalleryItem[];
    heroImage?: string;
    highlights?: string[];
    id: string;
    location?: string;
    mapCenter?: AdventureMapCenter;
    region?: string;
    shortDescription?: string;
    startDate?: string;
    status?: string;
    subtitle?: string;
    title?: string;
}
