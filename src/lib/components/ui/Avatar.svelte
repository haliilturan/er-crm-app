<script lang="ts">
	let {
		image,
		name = '',
		surname = '',
		country = '',
		fallbackText = '',
		size = 'md'
	}: {
		image?: string;
		name?: string;
		surname?: string;
		country?: string;
		fallbackText?: string;
		size?: 'sm' | 'md' | 'lg';
	} = $props();

	const sizeClass: Record<string, string> = {
		sm: 'w-8 h-8 text-[10px]',
		md: 'w-12 h-12 text-xs',
		lg: 'w-16 h-16 text-sm'
	};

	let letters = $derived((() => {
		if (image) return '';
		const n = name.trim();
		const s = surname.trim();
		if (n && s) return (n[0] + s[0]).toUpperCase();
		if (n) return n.slice(0, 2).toUpperCase();
		if (s) return s.slice(0, 2).toUpperCase();
		const c = country.trim();
		if (c) return c.slice(0, 3).toUpperCase();
		if (fallbackText) return fallbackText.slice(0, 3).toUpperCase();
		return '?';
	})());
</script>

<div
	class="flex items-center justify-center rounded-full bg-gray-200 shrink-0 overflow-hidden {sizeClass[size]}"
	aria-hidden="true"
>
	{#if image}
		<img src={image} alt="" class="w-full h-full object-cover" />
	{:else}
		<span class="font-bold text-gray-500">{letters}</span>
	{/if}
</div>
