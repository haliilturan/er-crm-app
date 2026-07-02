<script lang="ts">
	let {
		label = '',
		variant = 'default'
	}: {
		label?: string;
		variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
	} = $props();

	const variantClass: Record<string, string> = {
		default: 'bg-[var(--hb-tag)] text-[var(--hb-title)]',
		success: 'bg-[#1a2a1a] text-green-400',
		warning: 'bg-[#2a1e0a] text-amber-400',
		danger:  'bg-[#2a1a1a] text-[#ff4444]',
		info:    'bg-[#1a1a2a] text-blue-400'
	};
</script>

<span
	class="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold
		{variantClass[variant]}"
>
	{label}
</span>
