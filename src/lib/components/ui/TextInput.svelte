<script lang="ts">
	let {
		label = '',
		value = $bindable(''),
		placeholder = '',
		required = false,
		disabled = false,
		name = '',
		type = 'text',
		error = '',
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
		error?: string;
		id?: string;
		oninput?: (e: Event) => void;
		onchange?: (e: Event) => void;
		onfocus?: (e: FocusEvent) => void;
		onblur?: (e: FocusEvent) => void;
	} = $props();
</script>

<div class="flex flex-col gap-1.5 w-full">
	{#if label}
		<label for={id} class="text-xs text-[#888]">
			{label}{#if required}<span class="text-[#ff4444] ml-0.5">*</span>{/if}
		</label>
	{/if}
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
		class="w-full bg-[#1a1a1a] border rounded-xl px-3 py-2 text-white text-sm
			placeholder-[#555] outline-none transition-colors
			focus:border-[#444]
			disabled:opacity-50 disabled:cursor-not-allowed
			{error ? 'border-[#ff4444]' : 'border-[#2a2a2a]'}"
	/>
	{#if error}
		<p class="text-xs text-[#ff4444]">{error}</p>
	{/if}
</div>
