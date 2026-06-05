## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: prettier, eslint, tailwindcss, mcp

---

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

# Proje: ERP-CRM — Svelte + InstantDB Offline-First

## Stack
- SvelteKit + Svelte 5 Runes
- InstantDB (realtime + offline sync)
- Tailwind CSS + shadcn-svelte
- PWA (vite-pwa/sveltekit)
- TypeScript + Zod

## Çalışma Modu
- Her yeni özellik için önce PLAN yaz, sonra kod yaz
- Plan onaylanmadan kod yazma
- Her adımda "✅ Plan" veya "🔨 Implementation" başlığı kullan

## Mimari Kararlar
- Offline-first: her mutation önce IndexedDB'ye yazılır
- Conflict resolution: last-write-wins (InstantDB default)
- State yönetimi: Svelte $state + InstantDB useQuery
- Tüm sorgular InstantDB üzerinden, direkt fetch yok

## Plan Modu Kuralları
1. Özellik isteği gelince önce bileşenleri listele
2. Veri akışını (read/write/sync) açıkla
3. Etkilenecek dosyaları listele
4. Onay bekle, sonra kodla