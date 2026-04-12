export type Lang = 'tr' | 'en';

export const LANGUAGES: { key: Lang; label: string }[] = [
  { key: 'tr', label: 'Türkçe' },
  { key: 'en', label: 'English' },
];

const tr = {
  readingList: 'Okunacaklar',
  tags: 'Etiketler',
  settings: 'Ayarlar',
  highlights: 'Vurgular',
  language: 'Dil',
  defaultFontSize: 'Varsayılan Yazı Boyutu',
  defaultHighlightColor: 'Varsayılan Vurgulama Rengi',
  searchPlaceholder: 'Yazı veya etiket ara...',
  highlightsTitle: 'Vurgular',
  noHighlightsYet: 'Henüz vurgu eklenmemiş.',
  tagsTitle: 'Etiketler',
  noTagsYet: 'Henüz etiket eklenmemiş.',
  addTag: 'Ekle',
  tagPlaceholder: 'Yeni etiket...',
  filteringByTag: (tag: string) => `"${tag}" etiketi filtreleniyor`,

  all: 'Tümü',
  unread: 'Okunmamış',
  offline: 'Çevrimdışı',
  archived: 'Arşivlenmiş',

  noArticles: 'Herhangi bir yazı yok.',
  noArticlesHint: 'İlk yazınızı eklemek için + tuşuna basın.',

  loading: 'Yükleniyor…',

  back: '← Geri',
  share: 'Paylaş',
  offlineLabel: 'çevrimdışı',
  delete: 'Sil',
  confirmDelete: 'Silmek istediğinize emin misiniz?',
  archiveAllRead: 'Okunanları Arşivle',
  confirmArchiveRead: 'Okunmuş tüm yazıları arşivlemek istediğinize emin misiniz?',
  copy: 'Kopyala',
  copied: 'Kopyalandı',

  openInBrowser: 'Tarayıcıda Aç',
  downloadOffline: 'Çevrimdışı İndir',
  downloadSuccess: '✓ İndirme Tamamlandı',
  downloadError: '✗ İndirme Başarısız',
  couldNotLoad: (title: string) => `"${title}" yüklenemedi.`,
  noContent: 'Yazı içeriği mevcut değil.',

  saveArticle: 'Yazı Kaydet',
  save: 'Kaydet',
  invalidUrl: 'Geçerli bir URL girin',
  urlPlaceholder: 'https://ornek.com/makale',

  minutesAgo: (m: number) => `${m}dk önce`,
  hoursAgo: (h: number) => `${h}sa önce`,
  daysAgo: (d: number) => `${d}g önce`,
  readTime: (m: number) => `${m} dk okuma`,
};

const en: typeof tr = {
  readingList: 'Reading List',
  tags: 'Tags',
  settings: 'Settings',
  highlights: 'Highlights',
  language: 'Language',
  defaultFontSize: 'Default Font Size',
  defaultHighlightColor: 'Default Highlight Color',
  searchPlaceholder: 'Search articles or tags...',
  highlightsTitle: 'Highlights',
  noHighlightsYet: 'No highlights added yet.',
  tagsTitle: 'Tags',
  noTagsYet: 'No tags added yet.',
  addTag: 'Add',
  tagPlaceholder: 'New tag...',
  filteringByTag: (tag: string) => `Filtering by tag: "${tag}"`,

  all: 'All',
  unread: 'Unread',
  offline: 'Offline',
  archived: 'Archived',

  noArticles: 'No articles yet.',
  noArticlesHint: 'Press + to add your first article.',

  loading: 'Loading…',

  back: '← Back',
  share: 'Share',
  offlineLabel: 'offline',
  delete: 'Delete',
  confirmDelete: 'Are you sure you want to delete this?',
  archiveAllRead: 'Archive All Read',
  confirmArchiveRead: 'Are you sure you want to archive all read articles?',
  copy: 'Copy',
  copied: 'Copied',

  openInBrowser: 'Open in Browser',
  downloadOffline: 'Download Offline',
  downloadSuccess: '✓ Download Complete',
  downloadError: '✗ Download Failed',
  couldNotLoad: (title: string) => `"${title}" could not be loaded.`,
  noContent: 'Article content unavailable.',

  saveArticle: 'Save Article',
  save: 'Save',
  invalidUrl: 'Enter a valid URL',
  urlPlaceholder: 'https://example.com/article',

  minutesAgo: (m: number) => `${m}m ago`,
  hoursAgo: (h: number) => `${h}h ago`,
  daysAgo: (d: number) => `${d}d ago`,
  readTime: (m: number) => `${m} min read`,
};

export const translations: Record<Lang, typeof tr> = { tr, en };
export type Translations = typeof tr;
