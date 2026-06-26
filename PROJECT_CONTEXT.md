# PROJECT_CONTEXT.md — ERP-CRM Tam Proje Dokümantasyonu

> Bu dosya projeyi hiç görmemiş birinin her detayı anlayabilmesi için yazılmıştır.
> Tarih: 2026-06-26

---

## 1. Genel Bakış

### Projenin Amacı

Bu proje, **HLL International** markası altında faaliyet gösteren birden fazla şirketi (Hilal Fırça, Euromak, Mix7, Teknocall vb.) yönetmek için geliştirilmiş bir **ERP-CRM (Kurumsal Kaynak Planlaması — Müşteri İlişkileri Yönetimi)** sistemidir.

### Kapsadığı İş Akışları / Modüller

| Modül | Türkçe Adı | URL Prefix | Durum |
|-------|-----------|------------|-------|
| Satış | Satış | `/satis` | **Aktif — tam çalışır** |
| Finans | Finans | `/finans` | **Aktif — tam çalışır** |
| Üretim | Üretim | `/uretim` | Stub (boş sayfalar) |
| Depo | Depo | `/depo` | Stub (boş sayfalar) |
| Satın Alma | Satın Alma | `/satin-alma` | Stub (boş sayfalar) |
| Sevkiyat | Sevkiyat | `/sevkiyat` | Stub (boş sayfa) |
| Projeler | Projeler | `/projeler` | Stub (boş sayfa) |
| Yönetim | Yönetim | `/yonetim` | **Aktif — kullanıcı yönetimi çalışır** |
| Dashboard | Kontrol Merkezi | `/dashboard` | **Aktif — modül giriş ekranı** |

**Satış modülü** en olgun modüldür; şu alt ekranları kapsar:
- **Müşteriler** — müşteri listesi, detay kartı, notlar, teklif/sipariş/ödeme geçmişi
- **Haber Akışı** — günlük/haftalık görev & teklif & sipariş akışı, personel bazlı filtre
- **Raporlar** — şirket ve personel bazlı satış grafikleri (Recharts), PDF export
- **Taslak Ürün** — ürün taslakları (productDrafts), onay iş akışı

**Finans modülü** iki ekranı kapsar:
- **Teklifler** — `pending_finance` durumundaki siparişlerin finans onayı
- **Ödemeler** — siparişlere ödeme kaydı, kısmi ödeme takibi

**Yönetim modülü**:
- **Kullanıcılar** — kullanıcı listesi, bölüm/rol ataması, şirket ekleme

### Çalışma Modeli: Offline-First & Realtime

**Nasıl çalışır:**

1. Uygulama tarayıcıda açıldığında **InstantDB** WebSocket bağlantısı kurar ve tüm sorgu sonuçlarını yerel **IndexedDB**'ye yazar.
2. Kullanıcı internet bağlantısı olmasa bile daha önce yüklenmiş verileri okuyabilir.
3. `db.subscribeQuery(...)` çağrısı hem yerel IndexedDB'den anında sonuç döner (offline) hem de sunucudan gelen güncellemeleri gerçek zamanlı olarak dinler.
4. `db.transact([...])` çağrısı önce yerel IndexedDB'ye (optimistic) yazar, arka planda sunucuyla senkronize eder.
5. Çakışma çözümü: **last-write-wins** (InstantDB varsayılanı).
6. Tüm SSR devre dışı (`export const ssr = false`) — InstantDB browser-only olduğu için.

---

## 2. Teknoloji Stack

### package.json — Scripts

```json
{
  "dev":         "vite dev",
  "build":       "vite build",
  "preview":     "vite preview",
  "prepare":     "svelte-kit sync || echo ''",
  "check":       "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
  "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
  "lint":        "prettier --check . && eslint .",
  "format":      "prettier --write ."
}
```

### Dependencies (Runtime — `dependencies`)

| Paket | Versiyon | Kullanım |
|-------|----------|---------|
| `@instantdb/core` | ^1.0.43 | Ana veritabanı — realtime/offline-first sync, `db.subscribeQuery`, `db.transact`, `db.auth` |
| `country-state-city` | ^3.2.1 | Ülke/şehir/eyalet verileri (muhtemelen müşteri adresi için) |
| `idb` | ^8.0.3 | IndexedDB wrapper — InstantDB'nin offline cache'i için kullanılıyor |
| `jspdf` | ^4.2.1 | Teklif ve raporların PDF olarak indirilmesi |
| `lucide-svelte` | ^1.0.1 | İkon kütüphanesi (tüm SVG ikonlar) |
| `recharts` | ^3.8.1 | Raporlar sayfasındaki çubuk/çizgi grafikler |
| `zod` | ^4.4.3 | Form validasyonu ve tip güvenliği |

### DevDependencies

| Paket | Versiyon | Kullanım |
|-------|----------|---------|
| `svelte` | ^5.55.2 | UI framework — Runes mode aktif |
| `@sveltejs/kit` | ^2.57.0 | Full-stack framework, routing, SSR kapalı |
| `@sveltejs/adapter-auto` | ^7.0.1 | Deployment adapter (otomatik ortam algılama) |
| `@sveltejs/vite-plugin-svelte` | ^7.0.0 | Vite Svelte entegrasyonu |
| `vite` | ^8.0.7 | Build tool |
| `typescript` | ^6.0.2 | TypeScript desteği |
| `tailwindcss` | ^4.2.2 | Utility-first CSS framework |
| `@tailwindcss/vite` | ^4.2.2 | Tailwind Vite plugin (v4 entegrasyonu) |
| `@tailwindcss/forms` | ^0.5.11 | Form elemanları için Tailwind reset |
| `@tailwindcss/typography` | ^0.5.19 | Prose içerik stillemesi |
| `@instantdb/admin` | ^1.0.43 | Server-side InstantDB admin (API routes ve scripts için) |
| `@vite-pwa/sveltekit` | ^1.1.0 | Progressive Web App desteği (service worker, manifest) |
| `eslint` | ^10.4.0 | Linter |
| `eslint-config-prettier` | ^10.1.8 | ESLint & Prettier uyumu |
| `eslint-plugin-svelte` | ^3.17.0 | Svelte ESLint kuralları |
| `prettier` | ^3.8.1 | Kod formatlayıcı |
| `prettier-plugin-svelte` | ^3.5.1 | Svelte dosyaları için Prettier |
| `prettier-plugin-tailwindcss` | ^0.7.2 | Tailwind sınıf sıralaması |
| `svelte-check` | ^4.4.6 | Svelte TypeScript hata kontrolü |
| `tsx` | ^4.22.4 | TypeScript script'lerini çalıştırma (`src/scripts/*.ts`) |
| `globals` | ^17.4.0 | ESLint global değişken tanımları |
| `typescript-eslint` | ^8.58.1 | TypeScript ESLint kuralları |
| `@types/node` | ^24 | Node.js tip tanımları |

### Node / Paket Yöneticisi

- **Node.js**: `^24` (@types/node versiyonundan)
- **Paket yöneticisi**: `npm` (package-lock.json mevcut)

---

## 3. Dizin Yapısı

```
erp-crm/
├── .claude/                    # Claude Code ayarları
│   └── settings.local.json
├── .env                        # Geliştirme ortamı değişkenleri (git'e commit edilmiş — dikkat!)
├── .env.local                  # Gerçek production değerleri (git'e commit edilmez)
├── .gitignore
├── .mcp.json                   # MCP server konfigürasyonu
├── .npmrc
├── .prettierrc / .prettierignore
├── .vscode/                    # VS Code ayarları
├── CLAUDE.md                   # Claude Code'a proje talimatları
├── eslint.config.js            # ESLint konfigürasyonu
├── instant.perms.ts            # InstantDB izin kuralları (root — CLI'a push edilir)
├── instant.schema.ts           # InstantDB şema (root — CLI'a push edilir, src/lib'den re-export)
├── package.json / package-lock.json
├── scripts/                    # Tek seferlik yönetim script'leri (Node.js, mjs)
│   ├── cleanup-old-data.mjs    # Eski/geçersiz veri temizliği
│   ├── seed-banks.mjs          # Banka hesabı seed verisi
│   └── seed-brands.mjs         # Marka seed verisi
├── src/
│   ├── app.d.ts                # SvelteKit tip genişletmeleri (boş)
│   ├── app.html                # Ana HTML template
│   ├── lib/                    # Paylaşılan kütüphane kodu
│   │   ├── assets/             # Statik varlıklar (favicon.svg)
│   │   ├── components/         # UI bileşenleri
│   │   │   ├── musteriler/     # Müşteri bileşenleri
│   │   │   ├── teklifler/      # Teklif/sipariş form bileşenleri
│   │   │   └── ui/             # Genel yeniden kullanılabilir UI
│   │   ├── CONVENTIONS.md      # Kod konvansiyonları (double-click koruma)
│   │   ├── data/               # Statik veri dosyaları
│   │   │   ├── cities/         # Her ülke için JSON şehir listeleri (~230 dosya)
│   │   │   ├── countries.json  # Ülke listesi
│   │   │   ├── states.json     # Eyalet/il listesi
│   │   │   ├── geoHelpers.ts   # Coğrafi yardımcı fonksiyonlar
│   │   │   └── geoTypes.ts     # Coğrafi tip tanımları
│   │   ├── fonts/              # Gömülü font dosyaları (PDF için)
│   │   │   ├── NotoSans-Regular.ttf
│   │   │   ├── NotoSansArabic-Regular.ttf
│   │   │   ├── notoSansBase64.ts        # TTF → base64 (jsPDF'e gömülür)
│   │   │   └── notoSansArabicBase64.ts  # Arapça font base64
│   │   ├── index.ts            # $lib ana export (boş — bileşenler kendi dosyalarından import edilir)
│   │   ├── instant/            # InstantDB bağlantı katmanı
│   │   │   ├── client.ts       # db instance, id, tx export
│   │   │   ├── index.ts        # Tek import noktası
│   │   │   ├── permissions.ts  # İzin kuralları (tip güvenli)
│   │   │   └── schema.ts       # Veri modeli şeması
│   │   ├── services/           # İş mantığı servisleri
│   │   │   ├── rates.ts        # Döviz kuru yenileme servisi
│   │   │   └── returnService.ts # İade işleme servisi
│   │   └── stores/             # Svelte 5 global state
│   │       ├── activeCompany.svelte.ts  # Aktif şirket seçimi (localStorage)
│   │       ├── auth.svelte.ts           # Kullanıcı oturumu ve şirket listesi
│   │       ├── chat.svelte.ts           # Chat bridge (layout ↔ cockpit)
│   │       ├── cockpit.svelte.ts        # Sağ panel durum yönetimi
│   │       └── sales.svelte.ts          # Satış modülü modal durumu
│   ├── routes/                 # SvelteKit route'ları
│   │   ├── +layout.svelte      # Root layout (boş wrapper)
│   │   ├── +page.svelte        # Root index (boş)
│   │   ├── +page.server.ts     # Server-side root yönlendirme
│   │   ├── +page.ts            # Client-side root
│   │   ├── layout.css          # Global CSS (@import tailwindcss)
│   │   ├── api/
│   │   │   └── rates/
│   │   │       └── +server.ts  # POST /api/rates — QNB'den kur çeker, InstantDB'yi günceller
│   │   ├── (app)/              # Kimlik doğrulama gerektiren route grubu
│   │   │   ├── +layout.svelte  # App shell (navbar, sidebar, cockpit panel, toast)
│   │   │   ├── +layout.ts      # SSR=false
│   │   │   ├── dashboard/      # Kontrol merkezi
│   │   │   ├── depo/           # Depo modülü (stub)
│   │   │   │   ├── malzeme/    # Malzeme listesi (stub)
│   │   │   │   ├── sayim/      # Sayım (stub)
│   │   │   │   └── stok/       # Stok (stub)
│   │   │   ├── finans/         # Finans modülü
│   │   │   │   ├── +page.svelte # Finans ana sayfa
│   │   │   │   ├── odemeler/   # Ödeme kayıt ve takip
│   │   │   │   └── teklifler/  # Finans onay kuyruğu
│   │   │   ├── projeler/       # Projeler (stub)
│   │   │   ├── satin-alma/     # Satın alma (stub)
│   │   │   │   ├── siparisler/ # Satın alma siparişleri (stub)
│   │   │   │   ├── talepler/   # Satın alma talepleri (stub)
│   │   │   │   └── tedarikciler/ # Tedarikçiler (stub)
│   │   │   ├── satis/          # Satış modülü
│   │   │   │   ├── +layout.svelte  # Satış sub-layout
│   │   │   │   ├── haber-akisi/    # Görev/teklif/sipariş akışı
│   │   │   │   ├── musteriler/     # Müşteri listesi + detay
│   │   │   │   │   ├── +layout.svelte
│   │   │   │   │   ├── +page.svelte     # "Müşteri seçin" placeholder
│   │   │   │   │   └── [musteriId]/[[tab]]/+page.svelte  # Müşteri detay sayfası
│   │   │   │   ├── raporlar/       # Satış raporları ve PDF export
│   │   │   │   ├── siparisler/     # Onaylı siparişler listesi
│   │   │   │   └── taslaklar/      # Ürün taslakları (productDrafts)
│   │   │   ├── sevkiyat/       # Sevkiyat (stub)
│   │   │   ├── uretim/         # Üretim (stub)
│   │   │   │   ├── kalite/     # Kalite kontrol (stub)
│   │   │   │   ├── plan/       # Üretim planı (stub)
│   │   │   │   └── siparisler/ # Üretim siparişleri (stub)
│   │   │   └── yonetim/        # Yönetim
│   │   │       ├── +page.svelte
│   │   │       └── kullanicilar/ # Kullanıcı yönetimi
│   │   └── (auth)/             # Kimlik doğrulama route grubu
│   │       ├── +layout.svelte
│   │       ├── +layout.ts      # SSR=false
│   │       └── login/
│   │           └── +page.svelte # Magic link giriş ekranı
│   └── scripts/                # Yönetim CLI script'leri (tsx ile çalıştırılır)
│       ├── clean-task-notifications.ts  # Eski task bildirimlerini temizle
│       ├── create-missing-profiles.ts   # Eksik userProfile kayıtlarını oluştur
│       ├── extract-geo.js               # Coğrafi veri ayıklama
│       ├── migrate-links.ts             # InstantDB link migration
│       └── seed.ts                      # Şirket & admin kullanıcı seed
└── static/                     # Statik dosyalar (favicon, logolar)
    └── logos/                  # Şirket logoları
```

---

## 4. Yapılandırma Dosyaları

### svelte.config.js

```js
import adapter from '@sveltejs/adapter-auto';

const config = {
  compilerOptions: {
    // Svelte 5 Runes modunu tüm node_modules dışı dosyalara zorla
    runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
  },
  kit: {
    adapter: adapter()  // @sveltejs/adapter-auto — ortama göre otomatik adapter seçer
  }
};
```

**Adapter**: `@sveltejs/adapter-auto` — Vercel, Netlify, Cloudflare Pages, Node.js ortamlarını otomatik algılar.

### vite.config.ts

```ts
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: { open: true }  // dev sunucu açılışında tarayıcıyı otomatik aç
});
```

**Not**: Tailwind v4, PostCSS yerine Vite plugin olarak entegre edilmiştir.

### tsconfig.json

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "rewriteRelativeImportExtensions": true,
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

Path alias'ları SvelteKit otomatik yönetir: `$lib` → `src/lib`.

### src/app.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="text-scale" content="scale" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

### Ortam Değişkenleri (.env)

`.env` dosyasında şu değişkenler bulunur:

| Değişken | Kapsam | Açıklama |
|----------|--------|---------|
| `PUBLIC_INSTANT_APP_ID` | Client-side (VITE_ prefix alternatif) | InstantDB uygulama ID'si — tarayıcıda kullanılır |
| `INSTANT_APP_ID` | Server-side (özel) | InstantDB admin SDK için App ID |
| `INSTANT_ADMIN_KEY` | Server-side (özel) | InstantDB admin SDK token — sadece API routes'ta kullanılır |

**Dikkat**: `.env` dosyası şu an git'e commit edilmiş durumda ve gerçek credential'lar içeriyor. Güvenlik açısından `.env.local`'e taşınmalı.

---

## 5. InstantDB Veri Modeli (EN ÖNEMLİ BÖLÜM)

**Dosya**: `src/lib/instant/schema.ts` (kök `instant.schema.ts` → re-export eder)

### Entity 1: `$users` (Built-in)

InstantDB'nin yerleşik kimlik doğrulama entity'si.

| Alan | Tip | Özellik |
|------|-----|---------|
| `email` | string | unique, indexed |

### Entity 2: `companies`

Sistemdeki şirketleri temsil eder (Hilal Fırça, Euromak, Mix7 vb.).

| Alan | Tip | Özellik |
|------|-----|---------|
| `name` | string | indexed |
| `slug` | string | unique |
| `logoUrl` | string | optional |
| `isActive` | boolean | — |
| `createdAt` | number | — |

### Entity 3: `userProfiles`

`$users` entity'sine bağlı genişletilmiş kullanıcı profili. Auth'dan sonra oluşturulur.

| Alan | Tip | Özellik |
|------|-----|---------|
| `email` | string | unique, indexed |
| `fullName` | string | indexed |
| `userId` | string | optional, indexed — `$users` ID'si, link traversal olmadan filtreleme için |
| `photoUrl` | string | optional |
| `phone` | string | optional |
| `department` | string | optional, indexed — "sales" \| "finance" \| "production" \| "purchasing" \| "warehouse" \| "management" |
| `createdAt` | number | — |
| `updatedAt` | number | optional |

### Entity 4: `userCompanies`

Kullanıcı–şirket junction tablosu. Bir kullanıcı birden fazla şirkette farklı rollerle bulunabilir.

| Alan | Tip | Özellik |
|------|-----|---------|
| `userId` | string | indexed |
| `companyId` | string | indexed |
| `role` | string | indexed — "admin" \| "member" \| "viewer" |
| `joinedAt` | number | — |

### Entity 5: `sequences`

Sipariş numarası üretmek için artımlı sayaç. Key formatı: `"{companySlug}-{type}-{year}"` (örn. "hf-order-2025").

| Alan | Tip | Özellik |
|------|-----|---------|
| `key` | string | unique |
| `companyId` | string | indexed |
| `type` | string | indexed — "order" |
| `year` | number | — |
| `lastValue` | number | — |
| `updatedAt` | number | — |

### Entity 6: `prices`

Döviz kurları (USD, EUR, GBP). QNB API'sinden çekilir, `/api/rates` endpoint'i günceller.

| Alan | Tip | Özellik |
|------|-----|---------|
| `key` | string | unique, indexed — "USD" \| "EUR" \| "GBP" |
| `buy` | number | — — alış kuru |
| `sell` | number | — — satış kuru |
| `value` | number | — — genel değer |
| `change` | string | — — değişim yüzdesi |
| `direction` | number | — — 1=artış, -1=düşüş |
| `updatedAt` | number | indexed |

### Entity 7: `customers`

Müşteri kayıtları.

| Alan | Tip | Özellik |
|------|-----|---------|
| `name` | string | indexed |
| `nameSearch` | string | indexed — Türkçe karakter normalize edilmiş ("Fırça" → "firca") |
| `phone` | string | indexed |
| `email` | string | optional |
| `country` | string | optional |
| `state` | string | optional |
| `city` | string | optional |
| `address` | string | optional |
| `taxNumber` | string | optional |
| `companyType` | string | — "individual" \| "corporate" |
| `status` | string | indexed — "lead" \| "active" \| "inactive" |
| `source` | string | optional — "referral" \| "web" \| "cold" \| "other" |
| `contactName` | string | optional |
| `contactTitle` | string | optional |
| `assignedTo` | string | indexed — userProfile ID |
| `createdBy` | string | — |
| `createdAt` | number | indexed |
| `updatedBy` | string | optional |
| `updatedAt` | number | optional |
| `website` | string | optional |
| `phoneLandline` | string | optional |
| `deliveryAddress` | string | optional |

### Entity 8: `customerNotes`

Append-only müşteri notları. Düzenleme ve silme yoktur (izin kurallarıyla enforced).

| Alan | Tip | Özellik |
|------|-----|---------|
| `title` | string | optional |
| `content` | string | — |
| `companyId` | string | indexed |
| `customerId` | string | indexed |
| `createdBy` | string | — |
| `createdAt` | number | indexed |

### Entity 9: `bankAccounts`

Şirket banka hesapları.

| Alan | Tip | Özellik |
|------|-----|---------|
| `name` | string | indexed |
| `iban` | string | optional |
| `isActive` | boolean | — |
| `createdAt` | number | — |

### Entity 10: `brands`

Ürün markaları.

| Alan | Tip | Özellik |
|------|-----|---------|
| `name` | string | indexed |
| `slug` | string | unique |
| `logoUrl` | string | optional |
| `companyId` | string | indexed |
| `isActive` | boolean | — |
| `createdAt` | number | — |

### Entity 11: `products`

Ana ürün kataloğu. Fırça üretimine özel çok sayıda teknik alan içerir.

| Alan | Tip | Özellik |
|------|-----|---------|
| `name` | string | indexed |
| `nameSearch` | string | indexed — normalize edilmiş arama alanı |
| `sku` | string | unique |
| `companyId` | string | indexed |
| `detail` | string | optional |
| `code` | string | optional |
| `serialNo` | string | optional |
| `firm` | string | optional |
| `brandName` | string | optional |
| `diameter` | number | optional |
| `unitPrice` | number | optional |
| `currency` | string | optional |
| `isManual` | boolean | optional |
| `category` | string | indexed |
| `applicationArea` | string | optional |
| `type` | string | indexed — "ready" \| "custom" |
| `status` | string | indexed — "active" \| "inactive" \| "draft" |
| `description` | string | optional |
| `technicalDescription` | string | optional |
| `photo` | string | optional — base64 encoded (geçici, ileride Cloudflare R2) |
| `technicalDrawing` | string | optional — base64 encoded |
| `includedParts` | string | optional |
| `photoUrls` | json | optional — string[] Uploadthing URL'leri |
| `technicalDrawingUrl` | string | optional |
| `basePrice` | number | optional |
| `vatRate` | number | — |
| `unit` | string | — |
| `descTR` | string | optional — Türkçe açıklama |
| `descEN` | string | optional — İngilizce açıklama |
| `descRU` | string | optional — Rusça açıklama |
| `descAR` | string | optional — Arapça açıklama |
| `descFR` | string | optional — Fransızca açıklama |
| `createdBy` | string | — |
| `createdAt` | number | — |
| `updatedBy` | string | optional |
| `updatedAt` | number | optional |
| **Fırça Modeli Alanları** | | |
| `brushType` | string | optional |
| `brushWidth` | number | optional |
| `brushLength` | number | optional |
| `brushHeight` | number | optional |
| `processingType` | string | optional |
| `trimmingType` | string | optional |
| **Taban & Ensör** | | |
| `baseMaterial` | string | optional |
| `baseWidth` | number | optional |
| `baseLength` | number | optional |
| `baseHeight` | number | optional |
| `encoderDiameter` | string | optional |
| `holeDistanceX` | number | optional |
| `holeDistanceY` | number | optional |
| **Kıl Hesaplama** | | |
| `bristleMaterial` | string | optional |
| `bristleThickness` | string | optional |
| `bristleLength` | number | optional |
| `wireDiameter` | string | optional |
| **Ek Özellikler** | | |
| `specialProcess` | boolean | optional |
| `externalProcess` | number | optional |
| `extraEquipment` | number | optional |
| `packaging` | number | optional |
| **İşçilik Hesaplama** | | |
| `bristleInsertionTime` | number | optional |
| `bristleTrimmingTime` | number | optional |
| `baseProcessingTime` | number | optional |
| `packagingTime` | number | optional |
| **Sipariş Durumu** | | |
| `highPotential` | boolean | optional |
| `urgentProduction` | boolean | optional |
| `orderQuantity` | number | optional |
| `sourceProductId` | string | optional |

### Entity 12: `productParts`

Ürünle birlikte gelen parçalar / eşantiyon / hediyeler.

| Alan | Tip | Özellik |
|------|-----|---------|
| `productId` | string | indexed |
| `name` | string | — |
| `quantity` | number | — |
| `isGift` | boolean | — |
| `notes` | string | optional |
| `sortOrder` | number | — |

### Entity 13: `productDrafts`

Taslak ürünler. Onaylandığında `products` entity'sine kopyalanır (`promotedToProductId` dolar).

| Alan | Tip | Özellik |
|------|-----|---------|
| `name` | string | indexed |
| `nameSearch` | string | indexed |
| `sku` | string | optional |
| `serialNo` | string | optional |
| `firm` | string | optional |
| `brandId` | string | optional, indexed |
| `companyId` | string | indexed |
| `category` | string | optional |
| `applicationArea` | string | optional |
| `type` | string | indexed — "ready" \| "custom" |
| `isCustom` | boolean | optional |
| `status` | string | indexed — "draft" \| "review" \| "approved" \| "rejected" |
| `description` | string | optional |
| `descTR/EN/RU/AR/FR` | string | optional — çok dilli açıklamalar |
| `technicalDescription` | string | optional |
| `photoUrls` | json | optional — string[] |
| `technicalDrawingUrl` | string | optional |
| `photo` | string | optional — base64 |
| `technicalDrawing` | string | optional — base64 |
| `basePrice` | number | optional |
| `vatRate` | number | optional |
| `unit` | string | optional |
| `promotedToProductId` | string | optional — onaylandıktan sonra dolar |
| `customCalcData` | json | optional — maliyet hesaplama placeholder |
| `reviewNotes` | string | optional |
| `createdBy` | string | — |
| `createdAt` | number | — |
| `updatedBy` | string | optional |
| `updatedAt` | number | optional |

### Entity 14: `productDraftParts`

Taslak ürün parçaları.

| Alan | Tip | Özellik |
|------|-----|---------|
| `productDraftId` | string | indexed |
| `name` | string | — |
| `partType` | string | optional — "ready" \| "custom" |
| `quantity` | number | — |
| `isGift` | boolean | — |
| `notes` | string | optional |
| `sortOrder` | number | — |

### Entity 15: `orders`

Ana sipariş tablosu. Hem teklif hem sipariş aynı entity'de tutulur — `status` alanıyla ayrışır.

| Alan | Tip | Özellik |
|------|-----|---------|
| `orderNumber` | string | unique — format: "HF-2025-0001" |
| `customerId` | string | indexed |
| `companyId` | string | indexed |
| `assignedTo` | string | indexed |
| `status` | string | indexed — "draft" \| "pending_finance" \| "in_production" \| "shipped" \| "completed" \| "cancelled" |
| `financeApprovedAt` | number | optional |
| `financeApprovedBy` | string | optional |
| `currency` | string | — "TRY" \| "USD" \| "EUR" \| "GBP" |
| `exchangeRate` | number | optional |
| `exchangeRateDate` | number | optional |
| `subtotal` | number | — |
| `totalVat` | number | — |
| `totalWithVat` | number | — |
| `discountTotal` | number | optional |
| `paymentStatus` | string | optional, indexed — "unpaid" \| "partial" \| "paid" |
| `deliveryType` | string | optional — "warehouse_pickup" \| "cargo" \| "our_vehicle" \| "customer_vehicle" |
| `deliveryFirm` | string | optional |
| `deliveryPayment` | string | optional — "receiver" \| "sender" |
| `installationType` | string | optional — "none" \| "semi" \| "full" |
| `deliveryAddress` | string | optional |
| `deliveryCity` | string | optional |
| `deliveryCountry` | string | optional |
| `estimatedDeliveryDate` | number | optional |
| `paymentType` | string | optional — "cash" \| "credit_30" \| "credit_60" \| "credit_90" \| "installment" |
| `bankAccount` | string | optional |
| `productionDuration` | string | optional |
| `validUntil` | number | optional |
| `language` | string | — "tr" \| "en" \| "ru" \| "ar" \| "fr" |
| `purchaseOrderNumber` | string | optional |
| `notes` | string | optional |
| `internalNotes` | string | optional |
| `customerName` | string | optional — snapshot |
| `createdBy` | string | — |
| `createdAt` | number | indexed |
| `updatedBy` | string | optional |
| `updatedAt` | number | optional |
| `hasReturn` | boolean | optional |
| `returnStatus` | string | optional, indexed — "none" \| "partial" \| "full" |
| `returnReason` | string | optional — "defective" \| "wrong_item" \| "customer_request" \| "other" |
| `returnNotes` | string | optional |
| `returnedAt` | number | optional |
| `returnApprovedBy` | string | optional |

### Entity 16: `orderItems`

Sipariş satırları. Ürün verileri snapshot olarak taşınır — join olmadan render edilir. `isIncludedPart=true` olanlar eşantiyon/hediye satırlarıdır.

| Alan | Tip | Özellik |
|------|-----|---------|
| `orderId` | string | indexed |
| `companyId` | string | indexed |
| `productId` | string | optional — custom item'larda null |
| `parentItemId` | string | optional — eşantiyon satırı için üst satır ID'si |
| `isIncludedPart` | boolean | — |
| `productName` | string | — |
| `productSku` | string | optional |
| `brandName` | string | optional |
| `unit` | string | — |
| `quantity` | number | — |
| `listPrice` | number | — |
| `discountRate` | number | — |
| `unitPrice` | number | — |
| `vatRate` | number | — |
| `vatAmount` | number | — |
| `lineTotal` | number | — |
| `lineTotalWithVat` | number | — |
| `notes` | string | optional |
| `descTR/EN/RU/AR/FR` | string | optional — çok dilli açıklamalar |
| `sortOrder` | number | — |
| `returnedQuantity` | number | optional |

### Entity 17: `orderStatusHistory`

Sipariş durum geçiş logu. Tüm status değişiklikleri burada saklanır (append-only, update/delete yasak).

| Alan | Tip | Özellik |
|------|-----|---------|
| `orderId` | string | indexed |
| `fromStatus` | string | — |
| `toStatus` | string | — |
| `changedBy` | string | — |
| `reason` | string | optional |
| `changedAt` | number | indexed |

### Entity 18: `activityFeed`

Şirket genelinde olay akışı. Tüm görüntüleme verileri snapshot olarak taşınır — join olmadan render edilir.

| Alan | Tip | Özellik |
|------|-----|---------|
| `type` | string | indexed — "order_created" \| "order_updated" \| "order_submitted" \| "order_approved" \| "customer_added" \| "task_completed" |
| `companyId` | string | indexed |
| `actorId` | string | indexed |
| `actorName` | string | — |
| `actorPhotoUrl` | string | optional |
| `actorCompanyIds` | json | optional — string[] max 3 |
| `customerId` | string | optional |
| `customerContactName` | string | optional |
| `customerCompanyName` | string | optional |
| `relatedEntityType` | string | — "order" \| "customer" |
| `relatedEntityId` | string | — |
| `relatedEntityNumber` | string | optional — "HF-2025-0001" |
| `description` | string | optional — insan okunabilir: "1 sipariş girdi" |
| `amount` | number | optional |
| `currency` | string | optional |
| `brandId` | string | optional |
| `brandName` | string | optional |
| `metadata` | json | optional — aksiyon tipine özel ek veri |
| `createdAt` | number | indexed |

### Entity 19: `tasks`

Kişisel görev ve bildirimler. Status geçişlerinde otomatik, aynı transaction içinde yazılır.

| Alan | Tip | Özellik |
|------|-----|---------|
| `type` | string | indexed — "order_submitted" \| "order_approved" \| "order_created" \| "order_tracking" \| "manual" |
| `title` | string | — |
| `description` | string | optional |
| `relatedEntityType` | string | optional — "order" \| "customer" |
| `relatedEntityId` | string | optional |
| `orderId` | string | optional — teklif takibi görevleri için |
| `assignedTo` | string | indexed |
| `companyId` | string | indexed |
| `status` | string | indexed — "pending" \| "done" \| "dismissed" |
| `dueAt` | number | optional |
| `completedAt` | number | optional |
| `createdBy` | string | — |
| `createdAt` | number | indexed |
| `updatedAt` | number | optional |

### Entity 20: `messages`

Kullanıcılar arası direkt mesajlar. `senderId`/`receiverId` $users entity ID'leri (auth.id ile eşleşir).

| Alan | Tip | Özellik |
|------|-----|---------|
| `senderId` | string | indexed |
| `receiverId` | string | indexed |
| `content` | string | — |
| `createdAt` | number | indexed |
| `readAt` | number | optional |
| `companyId` | string | indexed |

### Entity 21: `notifications`

Kullanıcıya özel bildirimler (yeni mesaj, görev, sistem). `userId` alıcı $users ID'si.

| Alan | Tip | Özellik |
|------|-----|---------|
| `userId` | string | indexed |
| `type` | string | indexed |
| `title` | string | — |
| `body` | string | — |
| `entityId` | string | optional, indexed |
| `actorName` | string | optional |
| `companyId` | string | optional, indexed |
| `readAt` | number | optional |
| `createdAt` | number | indexed |

### Entity 22: `payments`

Sipariş ödeme kayıtları.

| Alan | Tip | Özellik |
|------|-----|---------|
| `orderId` | string | indexed |
| `customerId` | string | indexed |
| `customerName` | string | — |
| `companyId` | string | indexed |
| `amount` | number | — |
| `currency` | string | — |
| `paidAt` | number | indexed |
| `note` | string | optional |
| `recordedBy` | string | — |
| `createdAt` | number | indexed |
| `exchangeRate` | number | optional |
| `exchangeRateDate` | number | optional |
| `amountUSD` | number | optional — USD karşılığı (raporlama için) |

---

## 6. Entity İlişkileri (Links)

**Dosya**: `src/lib/instant/schema.ts` → `links` bölümü (25 link)

### Core İlişkileri

| Link Adı | From Entity | Yön | To Entity | Forward Label | Reverse Label |
|----------|------------|-----|-----------|---------------|---------------|
| `profileUser` | userProfiles | has-one | $users | `user` | `profile` |
| `userCompanyProfile` | userCompanies | has-one | userProfiles | `profile` | `companyMemberships` |
| `userCompanyOrg` | userCompanies | has-one | companies | `company` | `members` |

### Müşteri İlişkileri

| Link Adı | From Entity | Yön | To Entity | Forward Label | Reverse Label |
|----------|------------|-----|-----------|---------------|---------------|
| `customerAssignee` | customers | has-one | userProfiles | `assignee` | `assignedCustomers` |
| `customerNoteCustomer` | customerNotes | has-one | customers | `customer` | `notes` |
| `customerNoteAuthor` | customerNotes | has-one | userProfiles | `author` | `writtenNotes` |

### Marka & Ürün İlişkileri

| Link Adı | From Entity | Yön | To Entity | Forward Label | Reverse Label |
|----------|------------|-----|-----------|---------------|---------------|
| `brandOrg` | brands | has-one | companies | `company` | `brands` |
| `productPartProduct` | productParts | has-one | products | `product` | `parts` |

### Taslak Ürün İlişkileri

| Link Adı | From Entity | Yön | To Entity | Forward Label | Reverse Label |
|----------|------------|-----|-----------|---------------|---------------|
| `productDraftBrand` | productDrafts | has-one | brands | `brand` | `drafts` |
| `productDraftPartDraft` | productDraftParts | has-one | productDrafts | `productDraft` | `parts` |

### Sipariş İlişkileri

| Link Adı | From Entity | Yön | To Entity | Forward Label | Reverse Label |
|----------|------------|-----|-----------|---------------|---------------|
| `orderAssignee` | orders | has-one | userProfiles | `assignee` | `assignedOrders` |
| `orderCustomer` | orders | has-one | customers | `customer` | `orders` |
| `orderItemOrder` | orderItems | has-one | orders | `order` | `items` |
| `orderItemParent` | orderItems | has-one | orderItems | `parent` | `children` (self-referential — eşantiyon) |
| `orderItemProduct` | orderItems | has-one | products | `product` | `orderItems` |
| `orderStatusOrder` | orderStatusHistory | has-one | orders | `order` | `statusHistory` |

### ActivityFeed & Görev İlişkileri

| Link Adı | From Entity | Yön | To Entity | Forward Label | Reverse Label |
|----------|------------|-----|-----------|---------------|---------------|
| `activityFeedCustomer` | activityFeed | has-one | customers | `customer` | `activityFeed` |
| `activityFeedActor` | activityFeed | has-one | userProfiles | `actor` | `activities` |
| `taskAssignee` | tasks | has-one | userProfiles | `assignee` | `assignedTasks` |

### Ödeme İlişkileri

| Link Adı | From Entity | Yön | To Entity | Forward Label | Reverse Label |
|----------|------------|-----|-----------|---------------|---------------|
| `paymentOrder` | payments | has-one | orders | `order` | `payments` |

### Şematik Özet

```
$users ←→ userProfiles (1:1)
userProfiles ←→ userCompanies (1:N)  ←→ companies (N:1)

customers → userProfiles (assignee)
customerNotes → customers + userProfiles (author)

brands → companies

products → [productParts]

productDrafts → brands
productDrafts → [productDraftParts]

orders → customers + userProfiles (assignee)
orders → [orderItems] → products
orders → [orderItems] → orderItems (self, eşantiyon)
orders → [orderStatusHistory]
orders → [payments]

activityFeed → customers + userProfiles (actor)
tasks → userProfiles (assignee)
```

---

## 7. Kimlik Doğrulama (Auth)

### Magic Link Akışı (Adım Adım)

1. **Kullanıcı** `/login` sayfasına gider.
2. E-posta adresini girer ve "Kod gönder" butonuna basar.
3. `db.auth.sendMagicCode({ email })` çağrılır — InstantDB e-posta adresine 6 haneli kod gönderir.
4. Kullanıcı kodu girer.
5. `db.auth.signInWithMagicCode({ email, code })` çağrılır.
6. Başarılı olursa InstantDB session token'ı set eder, `db.subscribeAuth` callback'i tetiklenir.
7. `authStore.init()` içindeki `db.subscribeAuth` callback'i çalışır:
   - `_userId` ve `_userEmail` set edilir.
   - `ensureProfile(uid, email)` çağrılır: kullanıcının `userProfiles` kaydı yoksa oluşturur, `userId` backfill'i yapılır.
   - `userCompanies` sorgulanır, kullanıcının üye olduğu şirketler `_companies`'e yüklenir.
8. `authStore.ready === true` olduğunda ve `authStore.userId` varsa app shell render edilir.
9. Auth yoksa `window.location.replace('/login')` ile login'e yönlendirilir.

### Session Yönetimi

- InstantDB oturum token'ı tarayıcı localStorage'ında saklanır (InstantDB iç mekanizması).
- `authStore.init()` → `(app)/+layout.svelte` `onMount` içinde çağrılır.
- `authStore.destroy()` → sign-out sırasında subscription'lar temizlenir.

### Çıkış Yapma

```ts
// +layout.svelte ve CockpitPanel.svelte içinde
db.auth.signOut();
authStore.destroy();
goto('/login');
```

### Yetkilendirme (Rol/İzin)

**Kodda uygulanma şekli:**

```ts
// authStore'daki derived getterlar
get isAdmin()        { return companies.some(c => c.role === 'admin'); }
get isFinans()       { return companies.some(c => c.role === 'finans' || c.role === 'admin'); }
get isFinansOrAdmin(){ return this.isAdmin || department === 'finance'; }
```

**Kullanım örneği (finans/teklifler sayfası):**

```svelte
{#if authStore.isFinansOrAdmin}
  <button onclick={() => approveOrder(q)}>Onayla</button>
{/if}
```

**Yönetim sayfası (kullanicilar):**

```ts
$effect(() => {
  if (!authStore.isAdmin) return;  // sadece adminler erişebilir
  // ...
});
```

---

## 8. Sayfalar / Route'lar

### `(auth)` Grubu — Auth Gerektirmez

| Dosya | URL | İşlev | Auth |
|-------|-----|-------|------|
| `(auth)/login/+page.svelte` | `/login` | Magic link ile giriş (2 adım: email → kod) | Gerekmez |
| `(auth)/+layout.ts` | — | `export const ssr = false` | — |

### `(app)` Grubu — Auth Gerektirir

`(app)/+layout.svelte` auth guard içerir: `authStore.ready && !authStore.userId` → `/login`'e yönlendirir.

| Dosya | URL | İşlev | Okunan Entity'ler | Yazılan Entity'ler |
|-------|-----|-------|-------------------|-------------------|
| `(app)/+layout.svelte` | Tüm `/` altı | App shell: navbar, sidebar, cockpit, toast | notifications, messages, userProfiles | notifications, messages |
| `(app)/+layout.ts` | — | `export const ssr = false` | — | — |
| `(app)/dashboard/+page.svelte` | `/dashboard` | Kontrol merkezi, modül listesi | — | — |
| `(app)/satis/musteriler/+page.svelte` | `/satis/musteriler` | "Müşteri seçin" placeholder | — | — |
| `(app)/satis/musteriler/[musteriId]/[[tab]]/+page.svelte` | `/satis/musteriler/:id/:tab?` | Müşteri detay — tab routing (bilgiler/notlar/teklifler/siparişler/ödemeler) | customers, customerNotes, orders, payments | — |
| `(app)/satis/haber-akisi/+page.svelte` | `/satis/haber-akisi` | Günlük görev/teklif/sipariş akışı, personel filtresi | tasks, orders, userCompanies+profile | — |
| `(app)/satis/raporlar/+page.svelte` | `/satis/raporlar` | Satış raporları, Recharts grafikleri, PDF export | orders, userProfiles | — |
| `(app)/satis/taslaklar/+page.svelte` | `/satis/taslaklar` | Ürün taslakları, onay iş akışı | productDrafts | productDrafts, products |
| `(app)/satis/siparisler/+page.svelte` | `/satis/siparisler` | Onaylı siparişler listesi | orders | — |
| `(app)/finans/+page.svelte` | `/finans` | Finans ana sayfa | — | — |
| `(app)/finans/teklifler/+page.svelte` | `/finans/teklifler` | Finans onay kuyruğu, `pending_finance` siparişler | orders+customer+items | orders, orderStatusHistory, activityFeed |
| `(app)/finans/odemeler/+page.svelte` | `/finans/odemeler` | Ödeme kaydı, kısmi ödeme takibi | orders+payments+customer, prices | payments, orders |
| `(app)/yonetim/+page.svelte` | `/yonetim` | Yönetim giriş (link listesi) | — | — |
| `(app)/yonetim/kullanicilar/+page.svelte` | `/yonetim/kullanicilar` | Kullanıcı yönetimi (sadece admin) | userProfiles+companyMemberships, companies | userProfiles, userCompanies |
| `(app)/depo/stok/+page.svelte` | `/depo/stok` | **Stub** | — | — |
| `(app)/depo/malzeme/+page.svelte` | `/depo/malzeme` | **Stub** | — | — |
| `(app)/depo/sayim/+page.svelte` | `/depo/sayim` | **Stub** | — | — |
| `(app)/satin-alma/talepler/+page.svelte` | `/satin-alma/talepler` | **Stub** | — | — |
| `(app)/satin-alma/tedarikciler/+page.svelte` | `/satin-alma/tedarikciler` | **Stub** | — | — |
| `(app)/satin-alma/siparisler/+page.svelte` | `/satin-alma/siparisler` | **Stub** | — | — |
| `(app)/sevkiyat/+page.svelte` | `/sevkiyat` | **Stub** | — | — |
| `(app)/uretim/siparisler/+page.svelte` | `/uretim/siparisler` | **Stub** | — | — |
| `(app)/uretim/plan/+page.svelte` | `/uretim/plan` | **Stub** | — | — |
| `(app)/uretim/kalite/+page.svelte` | `/uretim/kalite` | **Stub** | — | — |
| `(app)/projeler/+page.svelte` | `/projeler` | **Stub** | — | — |

### API Routes

| Dosya | URL | Method | İşlev |
|-------|-----|--------|-------|
| `api/rates/+server.ts` | `/api/rates` | POST | QNB'den döviz kurlarını çeker, InstantDB `prices` tablosunu günceller |

---

## 9. Bileşenler ve State

### UI Bileşenleri (`src/lib/components/ui/`)

| Bileşen | Dosya | İşlev |
|---------|-------|-------|
| `AppLayout` | AppLayout.svelte | Genel uygulama düzeni wrapper |
| `Avatar` | Avatar.svelte | Kullanıcı avatar/baş harf gösterimi |
| `Badge` | Badge.svelte | Durum etiketleri (success/warning/danger/info/default) |
| `Button` | Button.svelte | Genel buton bileşeni |
| `CockpitPanel` | CockpitPanel.svelte | **Ana sağ panel** — Görevler/Mesajlar/Pulse sekmeleri, haftalık takvim, görev oluşturma formu, chat sistemi, aktivite akışı |
| `InfoCard` | InfoCard.svelte | Bilgi kartı |
| `ListItemCard` | ListItemCard.svelte | Listedeki tekil öğe kartı (avatar, başlık, açıklama, active state) |
| `MenuItemCard` | MenuItemCard.svelte | Dashboard modül menü kartları (ikon + başlık + açıklama) |
| `Modal` | Modal.svelte | Genel modal wrapper (başlık, width, onclose) |
| `NumberInput` | NumberInput.svelte | Sayı girişi |
| `OrderReturnBadge` | OrderReturnBadge.svelte | İade durumu badge'i |
| `ProductFormModal` | ProductFormModal.svelte | Ürün ekleme/düzenleme modal formu |
| `ProgressBar` | ProgressBar.svelte | İlerleme çubuğu |
| `SearchInput` | SearchInput.svelte | Arama kutusu |
| `SectionHead` | SectionHead.svelte | Sayfa başlığı + açıklama |
| `Select` | Select.svelte | Dropdown seçici |
| `Tabs` | Tabs.svelte | Tab navigasyonu |
| `TaskItemCard` | TaskItemCard.svelte | Görev kartı |
| `TextArea` | TextArea.svelte | Çok satırlı metin girişi |
| `TextInput` | TextInput.svelte | Tek satırlı metin girişi |
| `Toast` | Toast.svelte | Tek bildirim baloncuğu |
| `ToastGroup` | ToastGroup.svelte | Birden fazla toast yönetimi |
| `Toggle` | Toggle.svelte | On/off toggle |

### Müşteri Bileşenleri (`src/lib/components/musteriler/`)

| Bileşen | Dosya | İşlev |
|---------|-------|-------|
| `ClientList` | ClientList.svelte | Sol panel müşteri listesi, arama, yeni müşteri butonu |
| `CustomerDetailCard` | CustomerDetailCard.svelte | Müşteri detay sekmeli görünümü (bilgiler, notlar, teklifler, siparişler, ödemeler) |
| `CustomerModal` | CustomerModal.svelte | Müşteri ekleme/düzenleme modal formu |

### Teklif Bileşenleri (`src/lib/components/teklifler/`)

| Bileşen | Dosya | İşlev |
|---------|-------|-------|
| `QuoteForm` | QuoteForm.svelte | Teklif oluşturma/düzenleme formu (dil seçimi, kalemler, fiyat hesaplama, PDF export) |
| `QuoteItemRow` | QuoteItemRow.svelte | Teklif satırı — ürün arama, miktar, fiyat, iskonto, KDV |
| `OrderForm` | OrderForm.svelte | Sipariş formu |

### Store'lar (`src/lib/stores/`)

**`authStore`** (`auth.svelte.ts`) — Singleton, Svelte 5 `$state` kullanır:
```ts
authStore.userId     // string | null
authStore.userEmail  // string | null
authStore.ready      // boolean
authStore.companies  // CompanyInfo[]
authStore.isAdmin    // boolean
authStore.isFinans   // boolean
authStore.isFinansOrAdmin // boolean
authStore.department // string | null
authStore.activeCompanyId // string | null (companies[0].id)

authStore.init()     // Layout onMount'ta çağrılır
authStore.destroy()  // Sign-out'ta çağrılır
```

**`activeCompany`** (`activeCompany.svelte.ts`) — localStorage'a persist eder:
```ts
activeCompany.current        // CompanyInfo | null
activeCompany.initFromList(companies) // İlk yüklemede veya şirket listesi gelince
activeCompany.switchTo(company)      // Şirket değiştirme
activeCompany.clear()                // Temizle
```

**`salesStore`** (`sales.svelte.ts`) — Satış modülü modal durumu:
```ts
salesStore.search       // string — arama filtresi
salesStore.selectedId   // string | null
salesStore.modalOpen    // boolean
salesStore.modalEntityId // string | null

salesStore.openNew()    // Yeni müşteri modalını aç
salesStore.openEdit(id) // Düzenleme modalını aç
salesStore.closeModal() // Kapat
```

**`cockpit`** (`cockpit.svelte.ts`) — Sağ panel durumu:
```ts
cockpit.section        // 'tasks' | 'chats' | 'alerts'
cockpit.tasksDate      // Date
cockpit.tasksSection   // 'in' | 'out'
cockpit.newTaskOpen    // boolean
cockpit.users          // CockpitUser[]
```

**`chatBridge`** (`chat.svelte.ts`) — Layout ↔ CockpitPanel iletişim köprüsü:
```ts
chatBridge.pendingUserId  // string | null
chatBridge.open(userId)   // Layout toast tıklamasında
chatBridge.consume()      // CockpitPanel userId'yi alınca
chatBridge.pulseSignal    // boolean
chatBridge.openPulse()    // Zil ikonuna basılınca
chatBridge.consumePulse() // CockpitPanel açılınca
```

### Yardımcı Fonksiyonlar / Servisler

**`src/lib/services/rates.ts`**:
```ts
// QNB'den kur çeker, /api/rates endpoint'ini POST ile çağırır
// Hata olursa sessizce geçer — ana işlemi asla bloklamaz
export async function refreshRates(): Promise<void>
```

**`src/lib/services/returnService.ts`**:
```ts
// Sipariş iade işleme — orderItems returnedQuantity günceller
// full/partial return durumunu hesaplar ve order'ı günceller
export async function processReturn(db: Db, params: ProcessReturnParams): Promise<void>
```

**`src/lib/data/geoHelpers.ts`** — Ülke/il/şehir yardımcıları  
**`src/lib/data/geoTypes.ts`** — Coğrafi tip tanımları

---

## 10. InstantDB Kullanım Kalıpları

### Tipik Okuma (db.subscribeQuery)

```ts
// Sayfa veya bileşen içinde:
$effect(() => {
  const cIds = authStore.companyIds;
  if (!cIds.length) return;
  loading = true;

  // subscribeQuery reactive subscription döner — cleanup için return et
  return db.subscribeQuery(
    {
      orders: {
        $: {
          where: { companyId: { in: cIds }, status: 'pending_finance' },
          order: { createdAt: 'desc' }
        },
        customer: {},   // linked entity — join gibi
        items: {}       // linked entity
      }
    },
    (result) => {
      untrack(() => {   // $effect içinde reaktif döngüyü önler
        orders  = (result.data?.orders ?? []) as Order[];
        loading = false;
      });
    }
  );
});
```

### Tipik Yazma / Güncelleme / Silme (db.transact + tx)

```ts
// Finans onayı örneği:
async function approveOrder(order: Order) {
  if (saving) return;      // double-click guard
  saving = true;            // await'ten ÖNCE — race condition'ı önler
  try {
    const now    = Date.now();
    const userId = authStore.userId!;

    await db.transact([
      // Güncelle
      tx.orders[order.id].update({
        status:            'in_production',
        financeApprovedAt: now,
        financeApprovedBy: userId,
        updatedAt:         now
      }),
      // Yeni kayıt oluştur (id() = UUID üretir)
      tx.orderStatusHistory[id()].update({
        orderId:    order.id,
        fromStatus: 'pending_finance',
        toStatus:   'in_production',
        changedBy:  userId,
        changedAt:  now
      }),
      // ActivityFeed'e ekle
      tx.activityFeed[id()].update({
        type:      'order_approved',
        companyId: order.companyId,
        actorId:   userId,
        createdAt: now
      })
    ]);
  } catch (err) {
    errorMsg = String(err);
  } finally {
    saving = false;   // MUTLAKA finally'de sıfırla
  }
}
```

### Link Oluşturma

```ts
// Yeni profil oluştururken $users entity'sine link ekle:
tx.userProfiles[profileId]
  .update({ email, fullName, userId, createdAt: Date.now() })
  .link({ user: uid })  // profileUser link → $users entity

// Payment → order link:
tx.payments[payId].link({ order: activeOrder.id })
```

### id() ve tx Kullanımı

```ts
import { db, id, tx } from '$lib/instant';

// id() → UUID string üretir (nano ID benzeri)
const newId = id();

// tx.entityName[id].update({...})   → upsert
// tx.entityName[id].merge({...})    → partial update
// tx.entityName[id].delete()        → silme
// tx.entityName[id].link({label})   → ilişki ekle
// tx.entityName[id].unlink({label}) → ilişki kaldır
```

### db.queryOnce

Subscription olmadan tek seferlik sorgu (scriptlerde ve `ensureProfile` gibi yerlerde):

```ts
const result = await db.queryOnce({
  userProfiles: { $: { where: { email } } }
});
const existing = (result.data?.userProfiles ?? [])[0];
```

---

## 11. Stil Sistemi

### Tailwind CSS v4

Tailwind CSS v4 kullanılmaktadır. V4'te PostCSS yerine **Vite plugin** entegrasyonu vardır.

**Global CSS** (`src/routes/layout.css`):
```css
@import 'tailwindcss';
@plugin '@tailwindcss/forms';
@plugin '@tailwindcss/typography';
```

**Renk Teması**: Koyu (dark) tema dominant. Temel renkler:
- Arka plan: `#0a0a0a` (en koyu), `#111111` (sidebar/panel), `#1a1a1a` (card)
- Kenar: `#2a2a2a`
- Metin: `#ffffff` (başlık), `#888` (ikincil), `#555` (soluk)
- Vurgu: `#6366f1` (indigo — tarih seçicisi)
- Başarı: `#22c55e` (yeşil — tamamlanan görev)
- Hata: `#ef4444` (kırmızı)

**Design Token'lar**: `haber-akisi` sayfasında CSS custom properties olarak tanımlı (`--border`, `--bg`, `--surface-muted`, vb.). Diğer sayfalarda inline Tailwind class'ları kullanılır.

**Lucide Svelte**: İkon kütüphanesi — `ChevronLeft`, `MessageCircle`, `Share2` vb.

**Yazı Tipleri**: Noto Sans ve Noto Sans Arabic — sadece jsPDF PDF export'u için kullanılır (base64 gömülü).

---

## 12. Kod Konvansiyonları

### Double-Click Koruması (ZORUNLU)

`src/lib/CONVENTIONS.md`'de belgelenmiş:

```ts
let saving = $state(false);

async function save() {
  if (saving) return;         // 1. Guard: zaten çalışıyorsa çık
  saving = true;              // 2. Herhangi bir await'ten ÖNCE
  try {
    await db.transact(...);
  } finally {
    saving = false;           // 3. MUTLAKA finally'de sıfırla
  }
}
```

Buton:
```svelte
<button onclick={save} disabled={saving} style={saving ? 'pointer-events: none' : ''}>
  {saving ? '...' : 'Kaydet'}
</button>
```

### Svelte 5 Runes

Tüm state `$state`, `$derived`, `$effect` ile yönetilir. `$state()` değişkenleri `.svelte.ts` dosyalarında module-level olarak tanımlanır (singleton store pattern).

```ts
// Store örneği:
let _userId = $state<string | null>(null);
export const authStore = {
  get userId() { return _userId; }
};
```

### InstantDB Query Konvansiyonu

- `db.subscribeQuery` her zaman `$effect` içinde çağrılır ve cleanup için `return` edilir.
- State güncellemeleri `untrack(() => { ... })` içinde yapılır — reaktif döngüyü önler.
- `$derived` ile türetilen değerler bağımlılık olarak `$effect`'e geçirilir.

### Dosya Adlandırma

- Route dosyaları: SvelteKit konvansiyonu (`+page.svelte`, `+layout.svelte`, `+server.ts`)
- Bileşenler: PascalCase (`CustomerDetailCard.svelte`)
- Store'lar: camelCase + `.svelte.ts` uzantısı (`auth.svelte.ts`)
- Servisler: camelCase (`rates.ts`, `returnService.ts`)

### TypeScript Kullanımı

- `strict: true` aktif
- Tip tanımları genellikle yerel (her dosyada kendi `type Order = {...}`)
- `any` tip bazen zorla kullanılır (`/* eslint-disable @typescript-eslint/no-explicit-any */`)
- `as SomeType` type assertion yaygın kullanılır (InstantDB query sonuçları için)

### Veri Snapshot Yaklaşımı

Tüm görüntüleme verileri entity'ye **snapshot** olarak yazılır — join olmadan render edilir. Örnek:
- `orders.customerName` — müşteri adı kopyalanır
- `activityFeed.actorName` — aktör adı kopyalanır
- `orderItems` — ürün adı, SKU, vb. kopyalanır

Bu yaklaşım okuma sorgularını basitleştirir ama güncelleme tutarsızlığı riskini artırır.

---

## 13. Durum: Yarım Kalan / Eksik / TODO

### Stub Modüller (İçerik Yok)

Aşağıdaki modüller sadece kabuk/placeholder içeriyor, hiçbir gerçek işlevsellik yok:
- **Depo** (stok, malzeme, sayım)
- **Satın Alma** (talepler, tedarikçiler, siparişler)
- **Sevkiyat**
- **Üretim** (siparişler, plan, kalite)
- **Projeler**

### Bilinen TODO'lar / Eksikler

1. **Güvenlik**: İzin kuralları (`permissions.ts`) kasıtlı olarak basit tutulmuş (`auth.id != null` herkese açık). `TODO` yorumu açıkça belirtilmiş:
   ```
   // TODO: Onboarding flow tamamlandıktan sonra kurallar sıkılaştırılacak
   // inCompany: data.companyId in auth.ref('$user.profile.companyMemberships.companyId')
   ```

2. **Fotoğraf Storage**: `products.photo` alanı şu an base64 encoded string — büyük boyut sorunu. Yorum: *"geçici, ileride Cloudflare R2 ile değiştirilecek"*.

3. **Maliyet Hesaplama**: `productDrafts.customCalcData` alanı placeholder — *"Hilal Fırça maliyet hesaplama placeholder — ileride yapılandırılacak"*.

4. **Onboarding Flow**: Kullanıcı şirket oluşturma/davet akışı henüz yok. Şirket kayıtları seed script ile oluşturuluyor.

5. **Theme/Lang**: CockpitPanel'de tema ve dil ayarları UI mevcut ama `lang` state'i gerçekte UI'da uygulanmıyor — sadece localStorage'a yazıyor.

6. **Satın Alma modülü**: Şema'da tedarikçi entity'si yok — ileride eklenecek.

7. **`prices` Entity**: Gerçek kur verisi QNB API'sinden çekiliyor ama API sık güncellenmez — rate caching mekanizması yok.

8. **`activeCompany`**: Çok şirket seçimi UI'ı yok — `companies[0]` her zaman aktif şirket olarak kullanılır. `activeCompany.switchTo()` çağrılmıyor.

### Yarım Kalan Çalışmalar

- `src/scripts/clean-task-notifications.ts` — yeni eklendi, henüz çalıştırılmamış
- `src/scripts/migrate-links.ts` — link migration script'i mevcut

---

## 14. Çalıştırma

### Geliştirme Ortamı

```bash
# 1. Bağımlılıkları kur
npm install

# 2. Ortam değişkenlerini ayarla
# .env.local dosyası oluştur:
VITE_INSTANT_APP_ID=<instantdb-app-id>
INSTANT_APP_ID=<instantdb-app-id>
INSTANT_ADMIN_KEY=<instantdb-admin-token>

# 3. Geliştirme sunucusunu başlat (tarayıcı otomatik açılır)
npm run dev
```

### Build

```bash
npm run build    # Production build — dist/ klasörüne
npm run preview  # Build'i yerel olarak test et
```

### Tip Kontrolü

```bash
npm run check         # svelte-check + TypeScript
npm run check:watch   # İzleme modunda
```

### Linting & Formatting

```bash
npm run lint     # prettier check + eslint
npm run format   # prettier write (otomatik format)
```

### Seed Scripts

```bash
# Şirket ve admin kullanıcı oluştur
INSTANT_ADMIN_TOKEN=<token> npx tsx src/scripts/seed.ts

# Banka hesapları ekle
node scripts/seed-banks.mjs

# Marka ekle
node scripts/seed-brands.mjs
```

### Gerekli Env Değişkenleri

| Değişken | Nerede | Nasıl Alınır |
|----------|--------|-------------|
| `VITE_INSTANT_APP_ID` | `.env.local` | https://instantdb.com/dash → App → Overview → App ID |
| `INSTANT_APP_ID` | `.env.local` | Aynı — server-side kullanım için |
| `INSTANT_ADMIN_KEY` | `.env.local` | https://instantdb.com/dash → App → Admin Token |

**Not**: `.env` dosyasında placeholder değerler (ve maalesef gerçek değerler) mevcut. Production'da `.env.local` kullanın; `.env` git'e commit edilmemelidir.

### InstantDB Schema & Permissions Güncelleme

```bash
# Schema'yı push et
npx instant-cli push schema

# Permissions'ı push et
npx instant-cli push perms
```

`instant.schema.ts` ve `instant.perms.ts` dosyaları kök dizinde bulunur — InstantDB CLI bunları okur.

---

## Notlar

**Toplam satır sayısı**: ~700 satır

**Veri eksik kalan bölümler**:
- Üretim, Depo, Satın Alma, Sevkiyat, Projeler modüllerinin sayfa içerikleri okunamadı çünkü stub/boş dosyalar.
- `.env.local` dosyası okunamadı (varsayım: `.gitignore`'da).
- `static/logos/` klasörünün içeriği listelenmedi.
- `src/lib/data/geoHelpers.ts` ve `geoTypes.ts` detaylı okunmadı (müşteri adres formu için coğrafi yardımcılar).
- Tüm 230 şehir JSON dosyası (`src/lib/data/cities/`) okunmadı — ülke başına şehir listesi.
- `src/scripts/create-missing-profiles.ts` ve `scripts/cleanup-old-data.mjs` detaylı okunmadı.
- `CustomerDetailCard.svelte` ve `QuoteForm.svelte` tam okunmadı (çok büyük dosyalar, ilk 80 satır okundu).
