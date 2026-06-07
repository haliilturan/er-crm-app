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

	function increment() {
		if (disabled) return;
		const next = (value ?? 0) + step;
		if (max === undefined || next <= max) value = next;
	}

	function decrement() {
		if (disabled) return;
		const next = (value ?? 0) - step;
		if (min === undefined || next >= min) value = next;
	}
</script>

<div
	class="flex items-center rounded-xl px-3 h-[56px] w-full border transition-colors
		bg-[#1a1a1a] border-[#2a2a2a] focus-within:border-[#555]"
>
	<div class="flex flex-col justify-center flex-1 gap-1">
		<label
			for={id}
			class="text-xs leading-none cursor-pointer transition-colors
				{filled ? 'text-[#555]' : 'text-[#888]'}"
		>
			{label}{required ? ' *' : ''}
		</label>
		<input
			{id}
			type="number"
			{name}
			{placeholder}
			{disabled}
			{required}
			{min}
			{max}
			{step}
			{oninput}
			{onchange}
			bind:value
			class="bg-transparent border-none outline-none text-sm text-white
				placeholder-[#555] w-full leading-none
				disabled:opacity-50 disabled:cursor-not-allowed
				[appearance:textfield]
				[&::-webkit-outer-spin-button]:appearance-none
				[&::-webkit-inner-spin-button]:appearance-none"
		/>
	</div>
	<div class="flex flex-col items-center gap-2 ml-3 shrink-0">
		<button
			type="button"
			{disabled}
			onclick={increment}
			aria-label="Artır"
			class="flex items-center justify-center text-[#555] hover:text-white
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
			class="flex items-center justify-center text-[#555] hover:text-white
				disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
		>
			<svg class="w-4 h-3" viewBox="0 0 20 16" fill="currentColor">
				<polygon points="10,16 0,0 20,0" />
			</svg>
		</button>
	</div>
</div>
