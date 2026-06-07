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
		active: 'px-4 py-1.5 rounded-full bg-white text-black text-sm font-medium hover:bg-[#e0e0e0]',
		default: 'px-4 py-1.5 rounded-full bg-[#222] text-white border border-[#2a2a2a] text-sm hover:bg-[#2a2a2a]',
		ghost: 'px-4 py-1.5 rounded-full bg-transparent text-[#888] hover:text-white text-sm',
		icon: 'p-2 rounded-full bg-[#222] text-[#888] hover:text-white border border-[#2a2a2a]',
		danger: 'px-4 py-1.5 rounded-full bg-[#ff4444] text-white text-sm hover:bg-[#ff2222]'
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
