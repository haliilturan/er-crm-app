<script lang="ts">
	let {
		label = 'Label',
		value = $bindable<number | null>(null),
		placeholder = '',
		required = false,
		disabled = false,
		name = '',
		min,
		max,
		step = 1,
		id = `number-${Math.random().toString(36).slice(2, 9)}`,
		oninput,
		onchange
	}: {
		label?: string;
		value?: number | null;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		name?: string;
		min?: number;
		max?: number;
		step?: number;
		id?: string;
		oninput?: (e: Event) => void;
		onchange?: (e: Event) => void;
	} = $props();

	let filled = $derived(value !== null && value !== undefined);

	// Virgül → nokta dönüşümü: Türkçe klavyede "," yazılınca NaN olmaz
	let rawText = $state(value != null ? String(value) : '');

	function handleInput(e: Event) {
		const raw = (e.target as HTMLInputElement).value;
		rawText = raw;
		const parsed = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
		if (!isNaN(parsed)) value = parsed;
		oninput?.(e);
	}

	function increment() {
		if (disabled) return;
		const next = (value ?? 0) + step;
		if (max === undefined || next <= max) { value = next; rawText = String(next); }
	}

	function decrement() {
		if (disabled) return;
		const next = (value ?? 0) - step;
		if (min === undefined || next >= min) { value = next; rawText = String(next); }
	}
</script>

<div
	class="flex items-center rounded-lg px-3 h-[56px] w-full border transition-colors
		bg-[var(--hb-field)] border-[var(--hb-border)] focus-within:border-[var(--hb-highlight)]"
>
	<div class="flex flex-col justify-center flex-1 gap-1">
		<label
			for={id}
			class="text-xs leading-none cursor-pointer transition-colors
				{filled ? 'text-[var(--hb-faint)]' : 'text-[var(--hb-body)]'}"
		>
			{label}{required ? ' *' : ''}
		</label>
		<input
			{id}
			type="text"
			inputmode="decimal"
			{name}
			{placeholder}
			{disabled}
			{required}
			value={rawText}
			oninput={handleInput}
			{onchange}
			class="bg-transparent border-none outline-none text-sm text-white
				placeholder-[var(--hb-faint)] w-full leading-none
				disabled:opacity-50 disabled:cursor-not-allowed"
		/>
	</div>
	<div class="flex flex-col items-center gap-2 ml-3 shrink-0">
		<button
			type="button"
			{disabled}
			onclick={increment}
			aria-label="Artır"
			class="flex items-center justify-center text-[var(--hb-faint)] hover:text-white
				disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
		>
			<svg class="w-4 h-3" viewBox="0 0 20 16" fill="currentColor">
				<polygon points="10,0 20,16 0,16" />
			</svg>
		</button>
		<button
			type="button"
			{disabled}
			onclick={decrement}
			aria-label="Azalt"
			class="flex items-center justify-center text-[var(--hb-faint)] hover:text-white
				disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
		>
			<svg class="w-4 h-3" viewBox="0 0 20 16" fill="currentColor">
				<polygon points="10,16 0,0 20,0" />
			</svg>
		</button>
	</div>
</div>
