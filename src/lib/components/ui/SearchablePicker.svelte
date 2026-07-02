<script lang="ts">
	import { tick } from 'svelte';
	import SearchInput from './SearchInput.svelte';

	type PickerItem = { value: string; label: string; sub?: string };

	let {
		label = '',
		placeholder = 'Ara...',
		query = $bindable(''),
		recent = [],
		results = [],
		loading = false,
		selected = null,
		recentLabel = 'Son kullanılanlar',
		emptyText = 'Sonuç bulunamadı',
		onselect,
		onclear
	}: {
		label?: string;
		placeholder?: string;
		query?: string;
		recent?: PickerItem[];
		results?: PickerItem[];
		loading?: boolean;
		selected?: PickerItem | null;
		recentLabel?: string;
		emptyText?: string;
		onselect: (value: string) => void;
		onclear?: () => void;
	} = $props();

	// <3 harf → recent listesi; >=3 harf → arama sonuçları (parent besler).
	const searching = $derived(query.trim().length >= 3);
	const list = $derived(searching ? results : recent);

	let open = $state(false);
	let rootEl = $state<HTMLElement | null>(null);

	async function openDropdown() {
		if (open) return;
		open = true;
		await tick();
		rootEl?.querySelector('input')?.focus();
	}

	// Açan tıklamanın window listener'ına ulaşıp (re-render'da hedef DOM'dan
	// koptuğu için) anında kapanmasını engelle.
	function onControlClick(e: MouseEvent) {
		e.stopPropagation();
		openDropdown();
	}

	function close() {
		open = false;
	}

	function pick(item: PickerItem) {
		onselect(item.value);
		query = '';
		close();
	}

	function clear(e: MouseEvent) {
		e.stopPropagation();
		onclear?.();
		query = '';
	}

	function onWindowPointer(e: MouseEvent) {
		if (open && rootEl && !rootEl.contains(e.target as Node)) close();
	}

	function onKey(e: KeyboardEvent) {
		if (open && e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	}

	function onControlKey(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			openDropdown();
		}
	}
</script>

<svelte:window onclick={onWindowPointer} onkeydown={onKey} />

<div class="flex flex-col gap-1.5">
	{#if label}
		<span class="text-xs font-medium text-[#888]">{label}</span>
	{/if}

	<!-- Anchor: dropdown bunun içinde absolute konumlanır, form akışını itmez -->
	<div class="relative" bind:this={rootEl}>
		{#if open}
			<!-- Açık: kutunun kendisi arama input'u olur (SearchInput kendi kutusu) -->
			<SearchInput bind:value={query} {placeholder} />

			<!-- Yüzen dropdown (overlay) -->
			<div
				class="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#141414] shadow-xl"
			>
				{#if !searching}
					<p class="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-[#444] uppercase">
						{recentLabel}
					</p>
				{/if}

				{#if searching && loading}
					<p class="px-3 py-3 text-xs text-[#555]">Aranıyor…</p>
				{:else if list.length === 0}
					<p class="px-3 py-3 text-xs text-[#555]">{searching ? emptyText : 'Kayıt yok'}</p>
				{:else}
					<ul class="max-h-56 overflow-y-auto py-1" style="scrollbar-width: thin;">
						{#each list as item (item.value)}
							<li>
								<button
									type="button"
									onclick={() => pick(item)}
									class="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors hover:bg-[#1f1f1f]"
								>
									<span class="w-full truncate text-sm text-white">{item.label}</span>
									{#if item.sub}
										<span class="w-full truncate text-[10px] text-[#555]">{item.sub}</span>
									{/if}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{:else}
			<!-- Kapalı: tek satır select kutusu -->
			<div
				role="button"
				tabindex="0"
				onclick={onControlClick}
				onkeydown={onControlKey}
				class="flex cursor-pointer items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 transition-colors hover:border-[#3a3a3a]"
			>
				<span class="min-w-0 flex-1 truncate text-sm {selected ? 'text-white' : 'text-[#555]'}">
					{selected ? selected.label : placeholder}
				</span>
				{#if selected}
					<button
						type="button"
						onclick={clear}
						aria-label="Seçimi temizle"
						class="shrink-0 text-[#555] transition-colors hover:text-white"
					>
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
						</svg>
					</button>
				{:else}
					<svg
						class="h-4 w-4 shrink-0 text-[#555]"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				{/if}
			</div>
		{/if}
	</div>
</div>
