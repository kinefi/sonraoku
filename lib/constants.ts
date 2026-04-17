import Constants from 'expo-constants';

export const STORAGE_KEYS = {
  LANGUAGE: 'app_language',
  FONT_SIZE: 'reader_font_size',
  HIGHLIGHT_COLOR: 'default_highlight_color',
};

export const DEFAULT_FONT_SIZE = 16;

export const DATABASE_NAME = 'sonraoku.db';
export const IMAGE_CACHE_FOLDER = 'images';

export const USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

export const TIMEOUTS = {
  FETCH_HTML: 10_000,
  IMAGE_DOWNLOAD: 15_000,
  WEBVIEW_LOAD: 20_000,
  PARSER_EXECUTION: 15_000,
  STATUS_MESSAGE_RESET: 3_000,
  THEME_TRANSITION: 500,
};

export const GITHUB_URL = 'https://github.com/kinefi/sonraoku';
export const APP_VERSION = Constants.expoConfig?.version || '0.0.0';
export const APP_README = 'https://github.com/kinefi/sonraoku/blob/main/README.md';