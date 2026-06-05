<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';

	let { children }: { children: Snippet } = $props();

	const tabs = [
		{ label: 'Müşteriler', href: '/satis/musteriler' },
		{ label: 'Haber Akışı', href: '/satis/haber-akisi' },
		{ label: 'Rapor', href: '/satis/rapor' },
		{ label: 'Taslak Ürünler', href: '/satis/taslak-urunler' }
	] as const;

	let activeHref = $derived(
		tabs.find((t) => page.url.pathname.startsWith(t.href))?.href ?? tabs[0].href
	);
</script>

<div class="flex h-full flex-col overflow-hidden">
	<!-- Sub-navigation -->
	<div class="flex-shrink-0 border-b border-gray-200 bg-white px-6">
		<nav class="-mb-px flex gap-6" aria-label="Satış alt menüsü">
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					class="border-b-2 py-3 text-sm font-medium whitespace-nowrap transition {activeHref ===
					tab.href
						? 'border-blue-600 text-blue-600'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
				>
					{tab.label}
				</a>
			{/each}
		</nav>
	</div>

	<!-- Page content -->
	<div class="flex-1 min-h-0 overflow-hidden">
		{@render children()}
	</div>
</div>
