<script lang="ts">
	import { onDestroy, tick } from 'svelte';

	type Option = { value: string; label: string; group?: string };
	type OptionInput = Option | string | number | Record<string, unknown>;

	let {
		label = 'Label',
		value = $bindable(''),
		placeholder = 'Seçin',
		options = [],
		required = false,
		disabled = false,
		name = '',
		searchable = true,
		searchPlaceholder = 'Ara...',
		onchange
	}: {
		label?: string;
		value?: string;
		placeholder?: string;
		options?: OptionInput[];
		required?: boolean;
		disabled?: boolean;
		name?: string;
		searchable?: boolean;
		searchPlaceholder?: string;
		onchange?: (opt: Option) => void;
	} = $props();

	let isOpen = $state(false);
	let selectRef = $state<HTMLDivElement | null>(null);
	let triggerInputRef = $state<HTMLInputElement | null>(null);
	let dropdownPortalRef = $state<HTMLDivElement | null>(null);
	let searchQuery = $state('');
	let dropdownPosition = $state({ top: 0, left: 0, width: 0 });
	let scrollResizeCleanup: (() => void) | null = null;
	const listboxId = `select-listbox-${Math.random().toString(36).slice(2, 9)}`;

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	}

	function firstDefined(...vals: unknown[]): unknown {
		for (const v of vals) {
			if (v !== undefined && v !== null) return v;
		}
		return undefined;
	}

	function normalizeOptions(input: OptionInput[]): Option[] {
		const out: Option[] = [];
		for (const item of input) {
			if (typeof item === 'string' || typeof item === 'number') {
				const text = String(item);
				if (text) out.push({ value: text, label: text });
				continue;
			}
			if (!item || typeof item !== 'object') continue;
			const obj = item as Record<string, unknown>;
			const rawValue = firstDefined(obj.value, obj.id, obj.key, obj.name, obj.label, obj.title);
			const rawLabel = firstDefined(obj.label, obj.name, obj.title, obj.value, obj.id, obj.key);
			const vs = rawValue === undefined ? '' : String(rawValue);
			const ls = rawLabel === undefined ? vs : String(rawLabel);
			if (!vs && !ls) continue;
			out.push({ value: vs, label: ls || vs, group: typeof obj.group === 'string' ? obj.group : undefined });
		}
		return out;
	}

	function groupOptions(opts: Option[]): Record<string, Option[]> {
		const groups: Record<string, Option[]> = { '': [] };
		opts.forEach((opt) => {
			const g = opt.group || '';
			if (!groups[g]) groups[g] = [];
			groups[g].push(opt);
		});
		return groups;
	}

	function filterGrouped(groups: Record<string, Option[]>, q: string): Record<string, Option[]> {
		const out: Record<string, Option[]> = {};
		for (const [g, opts] of Object.entries(groups)) {
			const filtered = opts.filter((o) => o.label.toLowerCase().includes(q));
			if (filtered.length) out[g] = filtered;
		}
		return out;
	}

	let normalizedOptions = $derived(normalizeOptions(options));
	let selectedOption = $derived(normalizedOptions.find((o) => o.value === value));
	let displayText = $derived(selectedOption?.label ?? '');
	let filled = $derived(!!value);
	let grouped = $derived(groupOptions(normalizedOptions.filter((o) => o.value !== '')));
	let filteredGrouped = $derived(
		searchQuery.trim() ? filterGrouped(grouped, searchQuery.trim().toLowerCase()) : grouped
	);
	let triggerValue = $derived(isOpen ? searchQuery : displayText);

	function closeDropdown() {
		isOpen = false;
		searchQuery = '';
		const fn = scrollResizeCleanup;
		scrollResizeCleanup = null;
		fn?.();
	}

	async function openList() {
		if (disabled) return;
		isOpen = true;
		searchQuery = '';
		await tick();
		if (selectRef) {
			const r = selectRef.getBoundingClientRect();
			dropdownPosition = { top: r.bottom + 4, left: r.left, width: r.width };
		}
		triggerInputRef?.focus();
		const closeOnScrollResize = (e: Event) => {
			const target = e.target;
			if (dropdownPortalRef && target instanceof Node && dropdownPortalRef.contains(target)) return;
			closeDropdown();
		};
		window.addEventListener('scroll', closeOnScrollResize, true);
		window.addEventListener('resize', closeOnScrollResize);
		scrollResizeCleanup = () => {
			window.removeEventListener('scroll', closeOnScrollResize, true);
			window.removeEventListener('resize', closeOnScrollResize);
		};
	}

	function toggleList(e?: MouseEvent) {
		e?.preventDefault();
		e?.stopPropagation();
		isOpen ? closeDropdown() : openList();
	}

	function selectOption(opt: Option) {
		value = opt.value;
		closeDropdown();
		onchange?.(opt);
	}

	function handleClickOutside(e: MouseEvent) {
		if (!isOpen) return;
		const t = e.target as Node;
		if (selectRef && !selectRef.contains(t) && !dropdownPortalRef?.contains(t)) {
			closeDropdown();
		}
	}

	onDestroy(() => scrollResizeCleanup?.());
</script>

<svelte:window
	onclick={handleClickOutside}
	onkeydown={(e) => e.key === 'Escape' && closeDropdown()}
/>

<div bind:this={selectRef} class="relative w-full">
	<!-- Trigger -->
	<div
		class="flex items-center rounded-xl px-3 py-2 w-full border transition-colors
			{isOpen ? 'bg-[#222] border-[#444]' : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#444]'}
			{disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}"
		role="combobox"
		aria-expanded={isOpen}
		aria-haspopup="listbox"
		aria-controls={listboxId}
	>
		<div class="flex flex-col justify-center flex-1 min-w-0 gap-1">
			{#if label}
				<span class="text-xs text-[#888] leading-none">
					{label}{required ? ' *' : ''}
				</span>
			{/if}
			<input
				bind:this={triggerInputRef}
				type="text"
				class="bg-transparent border-none outline-none text-sm leading-none
					{filled ? 'text-white' : 'text-[#555]'} cursor-pointer"
				placeholder={isOpen && searchable ? searchPlaceholder : placeholder}
				value={triggerValue}
				{disabled}
				readonly={!searchable || !isOpen}
				oninput={(e) => {
					if (isOpen) searchQuery = (e.target as HTMLInputElement).value;
				}}
				onfocus={openList}
				onkeydown={(e) => e.key === 'Escape' && closeDropdown()}
				aria-autocomplete="list"
				aria-controls={listboxId}
			/>
		</div>
		<button
			type="button"
			class="flex items-center justify-center shrink-0 ml-2 text-[#555] hover:text-[#888] transition-colors"
			onclick={toggleList}
			aria-label={isOpen ? 'Kapat' : 'Aç'}
		>
			<svg
				class="w-4 h-4 transition-transform {isOpen ? 'rotate-180' : ''}"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M6 9l6 6 6-6" />
			</svg>
		</button>
	</div>

	<!-- Portal dropdown -->
	{#if isOpen}
		<div
			use:portal
			bind:this={dropdownPortalRef}
			class="fixed z-[10001]"
			style="top: {dropdownPosition.top}px; left: {dropdownPosition.left}px; width: {dropdownPosition.width}px; min-width: 120px;"
		>
			<div
				class="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-lg py-1.5 max-h-60 overflow-y-auto"
				id={listboxId}
				role="listbox"
			>
				{#each Object.entries(filteredGrouped) as [group, opts] (group)}
					{#if group}
						<div class="px-3 py-1 text-[11px] font-semibold text-[#555] uppercase tracking-wider">
							{group}
						</div>
					{/if}
					{#each opts as opt, i (opt.value + '|' + i)}
						<button
							type="button"
							class="flex w-full px-3 py-2 text-sm text-left transition-colors
								{opt.value === value
									? 'bg-[#333] text-white font-medium'
									: 'text-[#888] hover:bg-[#222] hover:text-white'}"
							role="option"
							aria-selected={opt.value === value}
							onclick={() => selectOption(opt)}
						>
							{opt.label}
						</button>
					{/each}
				{/each}
				{#if searchQuery.trim() && Object.keys(filteredGrouped).length === 0}
					<div class="px-3 py-2.5 text-sm text-[#555] text-center">Sonuç bulunamadı</div>
				{/if}
			</div>
		</div>
	{/if}

	<input type="hidden" {name} {value} />
</div>
