/**
 * InstantDB tek instance — tüm uygulama bu db'yi kullanır.
 *
 * Gereksinim: .env.local dosyasında PUBLIC_INSTANT_APP_ID tanımlı olmalı.
 *   PUBLIC_INSTANT_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *
 * Bu modülü import eden sayfaların SSR kapalı olmalı:
 *   export const ssr = false;  ← +page.ts içinde
 * InstantDB browser-only'dir (IndexedDB + WebSocket).
 */

import { init, id, tx } from '@instantdb/core';
import { PUBLIC_INSTANT_APP_ID } from '$env/static/public';
import schema from './schema';

export const db = init({
	appId: PUBLIC_INSTANT_APP_ID,
	schema,
	// Geliştirme modunda InstantDB DevTools panelini aç
	devtool: import.meta.env.DEV
});

// Sık kullanılan InstantDB yardımcılarını db ile birlikte export et
export { id, tx };

// Tip kısayolları
export type Db = typeof db;
