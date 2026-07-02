<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		variant = 'default',
		disabled = false,
		type = 'button',
		onclick,
		children
	}: {
		variant?: 'default' | 'active' | 'icon' | 'ghost' | 'danger';
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
		onclick?: (e: MouseEvent) => void;
		children?: Snippet;
	} = $props();

	const variantClass: Record<string, string> = {
		active: 'px-4 py-1.5 rounded-full bg-[var(--hb-active)] text-white text-sm font-medium hover:bg-[var(--hb-hover)]',
		default: 'px-4 py-1.5 rounded-full bg-[var(--hb-muted)] text-[var(--hb-body)] text-sm hover:bg-[var(--hb-hover)] hover:text-white',
		ghost: 'px-4 py-1.5 rounded-full bg-transparent text-[var(--hb-body)] hover:text-white text-sm',
		icon: 'p-2 rounded-full bg-[var(--hb-muted)] text-[var(--hb-body)] hover:text-white',
		danger: 'px-4 py-1.5 rounded-full bg-[var(--hb-accent)] text-white text-sm hover:opacity-90'
	};
</script>

<button
	{type}
	{disabled}
	{onclick}
	class="inline-flex items-center justify-center gap-1.5 transition-colors select-none
		focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
		[&_svg]:w-5 [&_svg]:h-5 [&_svg]:shrink-0 {variantClass[variant]}"
>
	{@render children?.()}
</button>
