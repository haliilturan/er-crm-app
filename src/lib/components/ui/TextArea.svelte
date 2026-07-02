<script lang="ts">
	let {
		label = 'Label',
		value = $bindable(''),
		placeholder = '',
		required = false,
		disabled = false,
		name = '',
		rows = 4,
		id = `textarea-${Math.random().toString(36).slice(2, 9)}`,
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
		rows?: number;
		id?: string;
		oninput?: (e: Event) => void;
		onchange?: (e: Event) => void;
		onfocus?: (e: FocusEvent) => void;
		onblur?: (e: FocusEvent) => void;
	} = $props();

	let filled = $derived(value.length > 0);
</script>

<div
	class="flex flex-col rounded-lg px-3 py-2.5 w-full border transition-colors
		bg-[var(--hb-field)] border-[var(--hb-border)] focus-within:border-[var(--hb-highlight)]"
>
	<label
		for={id}
		class="text-xs leading-none mb-2 cursor-pointer transition-colors
			{filled ? 'text-[var(--hb-faint)]' : 'text-[var(--hb-body)]'}"
	>
		{label}{required ? ' *' : ''}
	</label>
	<textarea
		{id}
		{name}
		{placeholder}
		{disabled}
		{required}
		{rows}
		{oninput}
		{onchange}
		{onfocus}
		{onblur}
		bind:value
		class="bg-transparent border-none outline-none resize-none text-sm text-white
			placeholder-[var(--hb-faint)] w-full leading-relaxed
			disabled:opacity-50 disabled:cursor-not-allowed"
	></textarea>
</div>
