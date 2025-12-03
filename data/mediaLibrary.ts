export type MediaKey =
  | 'cityProper'
  | 'mariaCristinaFalls'
  | 'tinagoFalls'
  | 'timogaSprings'
  | 'paseoDeSantiago'
  | 'mimbalotFalls'
  | 'macaraegHouse'
  | 'chedingsPeanuts'
  | 'titaFannies'
  | 'timogaLechon'
  | 'goHotels'
  | 'tinagoCottages'
  | 'jackosKananan'
  | 'delectaDiner'
  | 'npcNaturesPark'
  | 'buruunMarket'
  | 'sukangPinakurat';

const DEFAULT_MEDIA = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80';

const mediaLibrary: Record<MediaKey, string> = {
  cityProper: 'https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?auto=format&fit=crop&w=900&q=80',
  mariaCristinaFalls: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80',
  tinagoFalls: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80',
  timogaSprings: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80',
  paseoDeSantiago: 'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=900&q=80',
  mimbalotFalls: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80',
  macaraegHouse: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80',
  chedingsPeanuts: 'https://images.unsplash.com/photo-1505250469679-203ad9ced0cb?auto=format&fit=crop&w=900&q=80',
  titaFannies: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
  timogaLechon: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
  goHotels: 'https://images.unsplash.com/photo-1501117716987-c8e1ecb210cc?auto=format&fit=crop&w=900&q=80',
  tinagoCottages: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80',
  jackosKananan: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=900&q=80',
  delectaDiner: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
  npcNaturesPark: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80',
  buruunMarket: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=900&q=80',
  sukangPinakurat: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80'
};

export const getMedia = (key: MediaKey): string => mediaLibrary[key] ?? DEFAULT_MEDIA;

export const getFallbackMedia = (): string => DEFAULT_MEDIA;
