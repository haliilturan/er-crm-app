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
		<label for={id} class="text-xs text-[var(--hb-body)]">
			{label}{#if required}<span class="text-[var(--hb-accent)] ml-0.5">*</span>{/if}
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
		class="w-full bg-[var(--hb-field)] border rounded-lg px-3 py-2 text-white text-sm
			placeholder-[var(--hb-faint)] outline-none transition-colors
			focus:border-[var(--hb-highlight)]
			disabled:opacity-50 disabled:cursor-not-allowed
			{error ? 'border-[var(--hb-accent)]' : 'border-[var(--hb-border)]'}"
	/>
	{#if error}
		<p class="text-xs text-[var(--hb-accent)]">{error}</p>
	{/if}
</div>
