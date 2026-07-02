<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any */
	import { onMount, untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { db, id, tx } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import { chatBridge } from '$lib/stores/chat.svelte';
	import CockpitPanel from '$lib/components/ui/CockpitPanel.svelte';

	let { children }: { children: Snippet } = $props();

	onMount(() => {
		authStore.init();
	});

	$effect(() => {
		if (authStore.ready && !authStore.userId) {
			window.location.replace('/login');
		}
	});

	// ─── Module definitions ───────────────────────────────────────────────────────
	type SubPage = { label: string; href: string };
	type AppModule = {
		id: string;
		label: string;
		href: string;
		path: string;
		subPages: SubPage[];
	};

	const modules: AppModule[] = [
		{
			id: 'satis',
			label: 'Satış',
			href: '/satis',
			path: 'M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z',
			subPages: [
				{ label: 'Müşteriler',  href: '/satis/musteriler' },
				{ label: 'Haber Akışı', href: '/satis/haber-akisi' },
				{ label: 'Raporlar',    href: '/satis/raporlar' },
				{ label: 'Taslak Ürün', href: '/satis/taslaklar' }
			]
		},
		{
			id: 'uretim',
			label: 'Üretim',
			href: '/uretim',
			path: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
			subPages: [
				{ label: 'Siparişler', href: '/uretim/siparisler' },
				{ label: 'Üretim Planı', href: '/uretim/plan' },
				{ label: 'Kalite', href: '/uretim/kalite' }
			]
		},
		{
			id: 'depo',
			label: 'Depo',
			href: '/depo',
			path: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
			subPages: [
				{ label: 'Stok', href: '/depo/stok' },
				{ label: 'Malzeme', href: '/depo/malzeme' },
				{ label: 'Sayım', href: '/depo/sayim' }
			]
		},
		{
			id: 'satin-alma',
			label: 'Satın Alma',
			href: '/satin-alma',
			path: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z',
			subPages: [
				{ label: 'Talepler', href: '/satin-alma/talepler' },
				{ label: 'Tedarikçiler', href: '/satin-alma/tedarikciler' },
				{ label: 'Siparişler', href: '/satin-alma/siparisler' }
			]
		},
		{
			id: 'sevkiyat',
			label: 'Sevkiyat',
			href: '/sevkiyat',
			path: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12',
			subPages: []
		},
		{
			id: 'finans',
			label: 'Finans',
			href: '/finans',
			path: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
			subPages: [
				{ label: 'Teklifler', href: '/finans/teklifler' },
				{ label: 'Ödemeler',  href: '/finans/odemeler' }
			]
		},
		{
			id: 'projeler',
			label: 'Projeler',
			href: '/projeler',
			path: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z',
			subPages: []
		},
		{
			id: 'yonetim',
			label: 'Yönetim',
			href: '/yonetim',
			path: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
			subPages: [{ label: 'Kullanıcılar', href: '/yonetim/kullanicilar' }]
		}
	];

	let activeModule = $derived(
		modules.find((m) => page.url.pathname.startsWith(m.href)) ?? null
	);

	async function navigateToModule(mod: AppModule) {
		// @ts-expect-error — SvelteKit typed routes string parametresini kabul etmiyor
		await goto(resolve(mod.subPages[0]?.href ?? mod.href));
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const navHref = (path: string): any => resolve(path as any);

	function initial(name: string): string {
		return name.trim()[0]?.toUpperCase() ?? '?';
	}

	function signOut() {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto('/login');
		db.auth.signOut();
		authStore.destroy();
	}

	// ─── Layout subscriptions ──────────────────────────────────────────────────

	let layoutProfiles = $state<any[]>([]);
	$effect(() => {
		const uid = authStore.userId;
		if (!uid) return;
		return db.subscribeQuery(
			{ userProfiles: {} },
			(res) => { untrack(() => { layoutProfiles = res.data?.userProfiles ?? []; }); }
		);
	});

	let bellCount = $state(0);
	$effect(() => {
		const uid = authStore.userId;
		if (!uid) return;
		return db.subscribeQuery(
			{ notifications: { $: { where: { userId: uid } } } },
			(res) => {
				untrack(() => {
					bellCount = ((res.data?.notifications ?? []) as any[]).filter((n) => !n.readAt).length;
				});
			}
		);
	});

	type LayoutToast = { id: string; senderId: string; inis: string; name: string; preview: string };
	let layoutToasts     = $state<LayoutToast[]>([]);
	const _layoutSeen    = new SvelteSet<string>();
	let _layoutReady     = false;

	$effect(() => {
		const uid = authStore.userId;
		if (!uid) return;
		return db.subscribeQuery(
			{ messages: { $: { where: { receiverId: uid }, order: { createdAt: 'desc' }, limit: 100 } } },
			(res) => {
				untrack(() => {
					const all = (res.data?.messages ?? []) as any[];
					if (!_layoutReady) {
						for (const m of all) _layoutSeen.add(m.id);
						_layoutReady = true;
						return;
					}
					for (const m of all) {
						if (_layoutSeen.has(m.id)) continue;
						_layoutSeen.add(m.id);

						const sp   = layoutProfiles.find((p: any) => p.userId === m.senderId);
						const name = sp?.fullName || sp?.email?.split('@')[0] || 'Biri';
						const inis = name.split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase();
						const body = String(m.content ?? '').slice(0, 120);

						// notifications namespace'ine yaz
						const nid = id();
						db.transact([
							tx.notifications[nid].update({
								userId:    uid,
								type:      'message',
								title:     name,
								body,
								entityId:  m.senderId,
								actorName: name,
								createdAt: Date.now()
							})
						]).catch(() => {});

						// Toast göster (max 3)
						if (layoutToasts.length >= 3) continue;
						const tid = `lt-${m.id}`;
						layoutToasts = [...layoutToasts, { id: tid, senderId: m.senderId, inis, name, preview: String(m.content ?? '').slice(0, 60) }];
						setTimeout(() => {
							layoutToasts = layoutToasts.filter((t) => t.id !== tid);
						}, 5000);
					}
				});
			}
		);
	});

</script>

<!-- ─── Loading ────────────────────────────────────────────────────────────────── -->
{#if !authStore.ready}
	<div class="flex h-screen items-center justify-center bg-[var(--hb-bg)]">
		<div class="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent opacity-30"></div>
	</div>

<!-- ─── App shell ──────────────────────────────────────────────────────────────── -->
{:else if authStore.userId}
	<div class="flex h-screen flex-col overflow-hidden bg-[var(--hb-bg)]">

		<!-- ═══ Top Navbar ════════════════════════════════════════════════════════════ -->
		<header class="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--hb-border)] bg-[var(--hb-panel)] px-4">

			<!-- Logo + App name -->
			<div class="flex shrink-0 items-center gap-2.5">
				<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
					<svg class="h-3.5 w-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
					</svg>
				</div>
				<span class="text-sm font-semibold text-white">ERP-CRM</span>
			</div>

			<div class="h-5 w-px shrink-0 bg-[var(--hb-border)]"></div>

			<!-- Module tabs -->
			<nav class="flex flex-1 items-center gap-0.5">
				{#each modules as mod (mod.id)}
					<button
						onclick={() => navigateToModule(mod)}
						class="rounded-lg px-3 py-1.5 text-sm transition-colors
							{activeModule?.id === mod.id
								? 'bg-[var(--hb-active)] text-white font-medium'
								: 'text-[var(--hb-body)] hover:text-white hover:bg-[var(--hb-surface)]'}"
					>
						{mod.label}
					</button>
				{/each}
			</nav>

			<!-- Right actions -->
			<div class="flex shrink-0 items-center gap-1">

				<!-- Notifications -->
				<button
					aria-label="Bildirimler"
					onclick={() => chatBridge.openPulse()}
					class="relative flex h-8 w-8 items-center justify-center rounded-lg text-[var(--hb-faint)] transition-colors hover:bg-[var(--hb-surface)] hover:text-[var(--hb-body)]"
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
					</svg>
					{#if bellCount > 0}
						<span class="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-[var(--hb-accent)] flex items-center justify-center text-[8px] font-bold text-white px-0.5">{bellCount > 9 ? '9+' : bellCount}</span>
					{/if}
				</button>

				<!-- User avatar -->
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--hb-border)] bg-[var(--hb-muted)] text-xs font-medium text-[var(--hb-body)]"
					title={authStore.userEmail ?? ''}
				>
					{initial(authStore.userEmail ?? 'U')}
				</div>

				<!-- Sign out -->
				<button
					onclick={signOut}
					title="Çıkış yap"
					class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--hb-faint)] transition-colors hover:bg-[var(--hb-surface)] hover:text-[var(--hb-accent)]"
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
					</svg>
				</button>
			</div>
		</header>

		<!-- ═══ Body ══════════════════════════════════════════════════════════════════ -->
		<div class="flex flex-1 overflow-hidden">

			<!-- Left Sidebar -->
			<aside class="flex w-56 shrink-0 flex-col border-r border-[var(--hb-border)] bg-[var(--hb-panel)]">
				{#if activeModule}
					<div class="px-4 py-4">
						<p class="text-xs font-semibold uppercase tracking-wider text-[var(--hb-faint)]">
							{activeModule.label}
						</p>
					</div>
					<nav class="flex flex-col gap-0.5 px-2">
						{#each activeModule.subPages as subPage (subPage.href)}
							<a
								href={navHref(subPage.href)}
								class="flex items-center rounded-lg px-3 py-2 text-sm transition-colors
									{page.url.pathname.startsWith(subPage.href)
										? 'bg-[var(--hb-active)] text-white font-medium'
										: 'text-[var(--hb-body)] hover:bg-[var(--hb-surface)] hover:text-white'}"
							>
								{subPage.label}
							</a>
						{/each}
					</nav>
				{/if}
			</aside>

			<!-- ═══ Main Content ═════════════════════════════════════════════════════════ -->
			<main class="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--hb-bg)]">
				{@render children()}
			</main>

			<!-- ═══ Right Panel (Cockpit) ════════════════════════════════════════════════ -->
			<aside class="flex w-80 shrink-0 flex-col overflow-hidden border-l border-[var(--hb-border)] bg-[var(--hb-panel)]">
				<CockpitPanel />
			</aside>
		</div>

		<!-- ─── Mesaj toast'ları (sağ üst, fixed) ──────────────────────────────── -->
		{#if layoutToasts.length > 0}
			<div class="fixed top-14 right-4 flex flex-col gap-2 z-[100]" style="max-width:320px;">
				{#each layoutToasts as t (t.id)}
					<button
						type="button"
						onclick={() => {
							chatBridge.open(t.senderId);
							layoutToasts = layoutToasts.filter((x) => x.id !== t.id);
						}}
						class="flex items-center gap-3 bg-[var(--hb-list)] border border-[var(--hb-border)] rounded-lg px-4 py-3 shadow-2xl text-left w-full hover:bg-[var(--hb-list-hover)] transition-colors"
					>
						<div class="w-9 h-9 rounded-full bg-[var(--hb-muted)] border border-[var(--hb-border)] flex items-center justify-center text-sm font-bold text-white shrink-0">
							{t.inis}
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-xs text-[var(--hb-body)] mb-0.5">Yeni mesaj</p>
							<p class="text-sm text-white leading-snug truncate">
								<span class="font-semibold">{t.name}</span><span class="text-[var(--hb-body)]">:&#32;{t.preview || '…'}</span>
							</p>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/if}
