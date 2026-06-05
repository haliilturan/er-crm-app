<script lang="ts">
	let {
		label = 'Label',
		value = $bindable(''),
		placeholder = '',
		required = false,
		disabled = false,
		name = '',
		type = 'text',
		id = `input-${Math.random().toString(36).slice(2, 9)}`,
		oninput,
		onchange,
		onfocus,
		onblur
	}: {
		label?: string;
		value?: string;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		name?: string;
		type?: 'text' | 'email' | 'password' | 'tel' | 'url';
		id?: string;
		oninput?: (e: Event) => void;
		onchange?: (e: Event) => void;
		onfocus?: (e: FocusEvent) => void;
		onblur?: (e: FocusEvent) => void;
	} = $props();

	let filled = $derived(value.length > 0);
</script>

<div
	class="flex flex-col justify-center rounded-lg px-5 h-[72px] w-full border transition-colors
		bg-gray-50 border-gray-200 focus-within:bg-white focus-within:border-blue-400"
>
	<label
		for={id}
		class="text-[11px] font-bold leading-none mb-1.5 cursor-pointer transition-colors
			{filled ? 'text-gray-300' : 'text-gray-500'}"
	>
		{label}{required ? ' *' : ''}
	</label>
	<input
		{id}
		{type}
		{name}
		{placeholder}
		{disabled}
		{required}
		{oninput}
		{onchange}
		{onfocus}
		{onblur}
		bind:value
		class="bg-transparent border-none outline-none text-[15px] text-gray-800
			placeholder-gray-300 w-full leading-none
			disabled:opacity-50 disabled:cursor-not-allowed"
	/>
</div>
