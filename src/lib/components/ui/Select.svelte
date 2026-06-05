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
		class="flex items-center rounded-lg px-5 h-[72px] w-full border transition-colors
			{isOpen ? 'bg-white border-blue-400' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}
			{disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}"
		role="combobox"
		aria-expanded={isOpen}
		aria-haspopup="listbox"
		aria-controls={listboxId}
	>
		<div class="flex flex-col justify-center flex-1 min-w-0 gap-1.5">
			<span
				class="text-[11px] font-bold leading-none transition-colors
					{filled ? 'text-gray-300' : 'text-gray-500'}"
			>
				{label}{required ? ' *' : ''}
			</span>
			<input
				bind:this={triggerInputRef}
				type="text"
				class="bg-transparent border-none outline-none text-[15px] leading-none
					{filled ? 'text-gray-800' : 'text-gray-400'} cursor-pointer"
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
			class="flex items-center justify-center shrink-0 ml-3 p-1.5 rounded
				text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
			onclick={toggleList}
			aria-label={isOpen ? 'Kapat' : 'Aç'}
		>
			<svg
				class="w-4 h-4 transition-transform {isOpen ? 'rotate-180' : ''}"
				viewBox="0 0 20 16"
				fill="currentColor"
			>
				<polygon points="10,16 0,0 20,0" />
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
				class="bg-white border border-gray-200 rounded-lg shadow-lg py-2 max-h-60 overflow-y-auto"
				id={listboxId}
				role="listbox"
			>
				{#each Object.entries(filteredGrouped) as [group, opts]}
					{#if group}
						<div class="px-4 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
							{group}
						</div>
					{/if}
					{#each opts as opt}
						<button
							type="button"
							class="flex w-full px-4 py-2.5 text-[15px] text-left transition-colors
								{opt.value === value
									? 'bg-blue-50 text-blue-700 font-medium'
									: 'text-gray-700 hover:bg-gray-50'}"
							role="option"
							aria-selected={opt.value === value}
							onclick={() => selectOption(opt)}
						>
							{opt.label}
						</button>
					{/each}
				{/each}
				{#if searchQuery.trim() && Object.keys(filteredGrouped).length === 0}
					<div class="px-4 py-3 text-sm text-gray-400 text-center">Sonuç bulunamadı</div>
				{/if}
			</div>
		</div>
	{/if}

	<input type="hidden" {name} {value} />
</div>
