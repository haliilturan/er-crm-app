<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { User } from '@instantdb/core';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { db } from '$lib/instant';
	import { activeCompany, type CompanyInfo } from '$lib/stores/activeCompany.svelte';

	let { children }: { children: Snippet } = $props();

	// ─── Auth ────────────────────────────────────────────────────────────────────
	type AuthResult =
		| { user: User | undefined; error: undefined }
		| { user: undefined; error: { message: string } };

	let auth = $state<AuthResult>({ user: undefined, error: undefined });
	let authReady = $state(false);
	let companies = $state<CompanyInfo[]>([]);
	let switcherOpen = $state(false);
	let rightTab = $state<'tasks' | 'notifications' | 'chat'>('tasks');

	onMount(() => {
		return db.subscribeAuth((state) => {
			auth = state;
			authReady = true;
			if (!state.user) window.location.replace('/login');
		});
	});

	// ─── Company memberships ──────────────────────────────────────────────────────
	$effect(() => {
		const userId = auth.user?.id;
		if (!userId) return;

		return db.subscribeQuery(
			{ userCompanies: { $: { where: { userId } }, company: {} } },
			(result) => {
				if (result.error) return;
				const memberships = (result.data?.userCompanies ?? []) as Array<{
					id: string;
					role: string;
					company?: { id: string; name: string; slug: string; logoUrl?: string };
				}>;
				const mapped: CompanyInfo[] = memberships
					.filter((m) => !!m.company)
					.map((m) => ({
						id: m.company!.id,
						name: m.company!.name,
						slug: m.company!.slug,
						logoUrl: m.company!.logoUrl,
						role: m.role
					}));
				untrack(() => {
					companies = mapped;
					if (mapped.length) activeCompany.initFromList(mapped);
				});
			}
		);
	});

	// ─── Module definitions ───────────────────────────────────────────────────────
	const modules = [
		{
			id: 'satis',
			label: 'Satış',
			href: '/satis',
			path: 'M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z'
		},
		{
			id: 'uretim',
			label: 'Üretim',
			href: '/uretim',
			path: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
		},
		{
			id: 'depo',
			label: 'Depo',
			href: '/depo',
			path: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z'
		},
		{
			id: 'satin-alma',
			label: 'Satın Alma',
			href: '/satin-alma',
			path: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z'
		},
		{
			id: 'sevkiyat',
			label: 'Sevkiyat',
			href: '/sevkiyat',
			path: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12'
		},
		{
			id: 'finans',
			label: 'Finans',
			href: '/finans',
			path: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
		},
		{
			id: 'projeler',
			label: 'Projeler',
			href: '/projeler',
			path: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z'
		},
		{
			id: 'yonetim',
			label: 'Yönetim',
			href: '/yonetim',
			path: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z'
		}
	] as const;

	let activeModuleId = $derived(
		modules.find((m) => page.url.pathname.startsWith(m.href))?.id ?? ''
	);

	const rightTabs = [
		{ id: 'tasks' as const, label: 'Görevler' },
		{ id: 'notifications' as const, label: 'Bildirimler' },
		{ id: 'chat' as const, label: 'Sohbet' }
	];

	function initial(name: string): string {
		return name.trim()[0]?.toUpperCase() ?? '?';
	}

	function signOut() {
		db.auth.signOut();
		activeCompany.clear();
	}
</script>

<!-- ─── Loading ────────────────────────────────────────────────────────────────── -->
{#if !authReady}
	<div class="flex h-screen items-center justify-center bg-gray-950">
		<div class="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
	</div>

<!-- ─── App shell ──────────────────────────────────────────────────────────────── -->
{:else if auth.user}
	<div class="flex h-screen overflow-hidden">

		<!-- ═══ Left Nav ════════════════════════════════════════════════════════════ -->
		<nav class="relative flex w-[72px] shrink-0 flex-col items-center gap-1 bg-gray-900 py-4">

			<!-- Logo -->
			<div class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
				<svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
				</svg>
			</div>

			<!-- Company switcher ──────────────────────────────────────────────────── -->
			<div class="relative mb-1">
				<button
					onclick={() => (switcherOpen = !switcherOpen)}
					title={activeCompany.current?.name ?? 'Şirket Seç'}
					class="flex h-10 w-10 items-center justify-center rounded-xl transition-colors
						hover:bg-gray-800 {switcherOpen ? 'bg-gray-800' : ''}"
				>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-xs font-bold text-white">
						{activeCompany.current ? initial(activeCompany.current.name) : '?'}
					</div>
				</button>

				{#if switcherOpen}
					<!-- Click-away overlay -->
					<div
						class="fixed inset-0 z-40"
						role="presentation"
						onclick={() => (switcherOpen = false)}
					></div>

					<!-- Switcher popover -->
					<div class="absolute left-full top-0 z-50 ml-3 w-56 overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-2xl">
						<p class="border-b border-gray-700 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
							Şirket Seç
						</p>
						<div class="p-1.5">
							{#each companies as company (company.id)}
								<button
									onclick={() => {
										activeCompany.switchTo(company);
										switcherOpen = false;
									}}
									class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors
										{activeCompany.current?.id === company.id
											? 'bg-blue-600 text-white'
											: 'text-gray-300 hover:bg-gray-700'}"
								>
									<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-500 text-[10px] font-bold text-white">
										{initial(company.name)}
									</div>
									<span class="flex-1 truncate text-left font-medium">{company.name}</span>
									<span class="shrink-0 text-[10px] capitalize opacity-60">{company.role}</span>
								</button>
							{/each}
							{#if companies.length === 0}
								<p class="px-3 py-2 text-xs text-gray-500">Şirket bulunamadı</p>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Divider -->
			<div class="mb-2 w-8 border-t border-gray-700/60"></div>

			<!-- Module nav ────────────────────────────────────────────────────────── -->
			<div class="flex flex-1 flex-col items-center gap-0.5 overflow-y-auto" style="scrollbar-width: none;">
				{#each modules as mod (mod.id)}
					<button
						onclick={() => goto(mod.href)}
						title={mod.label}
						class="flex h-11 w-11 items-center justify-center rounded-xl transition-colors
							{activeModuleId === mod.id
								? 'bg-blue-600 text-white'
								: 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'}"
					>
						<svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<path d={mod.path} />
						</svg>
					</button>
				{/each}
			</div>

			<!-- Divider -->
			<div class="mt-2 mb-2 w-8 border-t border-gray-700/60"></div>

			<!-- User avatar -->
			<div
				class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-700 text-sm font-medium text-gray-300"
				title={auth.user?.email ?? ''}
			>
				{initial(auth.user?.email ?? 'U')}
			</div>

			<!-- Sign out -->
			<button
				onclick={signOut}
				title="Çıkış yap"
				class="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-800 hover:text-red-400"
			>
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
				</svg>
			</button>
		</nav>

		<!-- ═══ Main Content ═════════════════════════════════════════════════════════ -->
		<main class="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
			{@render children()}
		</main>

		<!-- ═══ Right Panel (Cockpit) ════════════════════════════════════════════════ -->
		<aside class="flex w-72 shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white">

			<!-- Tab bar -->
			<div class="flex shrink-0 items-center gap-1 border-b border-gray-100 px-4 py-2.5">
				{#each rightTabs as tab (tab.id)}
					<button
						onclick={() => (rightTab = tab.id)}
						class="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors
							{rightTab === tab.id
								? 'bg-blue-600 text-white'
								: 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}"
					>
						{tab.label}
					</button>
				{/each}
			</div>

			<!-- Panel body -->
			<div class="flex-1 overflow-y-auto p-4">
				{#if rightTab === 'tasks'}
					<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
						Bekleyen Görevler
					</p>
					<div class="rounded-xl border border-dashed border-gray-200 py-10 text-center">
						<svg class="mx-auto mb-2 h-8 w-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
						</svg>
						<p class="text-sm text-gray-400">Bekleyen görev yok</p>
					</div>

				{:else if rightTab === 'notifications'}
					<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
						Bildirimler
					</p>
					<div class="rounded-xl border border-dashed border-gray-200 py-10 text-center">
						<svg class="mx-auto mb-2 h-8 w-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
						</svg>
						<p class="text-sm text-gray-400">Bildirim yok</p>
					</div>

				{:else}
					<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
						Sohbet
					</p>
					<div class="rounded-xl border border-dashed border-gray-200 py-10 text-center">
						<svg class="mx-auto mb-2 h-8 w-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
						</svg>
						<p class="text-sm text-gray-400">Yakında aktif olacak</p>
					</div>
				{/if}
			</div>
		</aside>
	</div>
{/if}
