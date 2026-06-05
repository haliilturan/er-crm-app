<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		variant = 'default',
		disabled = false,
		type = 'button',
		onclick,
		children
	}: {
		variant?: 'default' | 'icon' | 'ghost' | 'danger';
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
		onclick?: (e: MouseEvent) => void;
		children?: Snippet;
	} = $props();

	const variantClass: Record<string, string> = {
		default: 'h-11 rounded-full px-6 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 text-[15px] font-bold',
		icon: 'h-11 w-11 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200',
		ghost: 'h-11 rounded-full px-6 bg-transparent text-gray-600 hover:bg-gray-100 text-[15px]',
		danger: 'h-11 rounded-full px-6 bg-red-600 text-white hover:bg-red-700 text-[15px] font-bold'
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
