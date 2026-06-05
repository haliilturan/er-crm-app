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
	class="flex items-center rounded-lg px-5 h-[72px] w-full border transition-colors
		bg-gray-50 border-gray-200 focus-within:bg-white focus-within:border-blue-400"
>
	<div class="flex flex-col justify-center flex-1 gap-1.5">
		<label
			for={id}
			class="text-[11px] font-bold leading-none cursor-pointer transition-colors
				{filled ? 'text-gray-300' : 'text-gray-500'}"
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
			class="bg-transparent border-none outline-none text-[15px] text-gray-800
				placeholder-gray-300 w-full leading-none
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
			class="flex items-center justify-center text-gray-400 hover:text-gray-700
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
			class="flex items-center justify-center text-gray-400 hover:text-gray-700
				disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
		>
			<svg class="w-4 h-3" viewBox="0 0 20 16" fill="currentColor">
				<polygon points="10,16 0,0 20,0" />
			</svg>
		</button>
	</div>
</div>
