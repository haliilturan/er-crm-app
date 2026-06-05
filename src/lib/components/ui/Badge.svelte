<script lang="ts">
	let {
		label = '',
		variant = 'default'
	}: {
		label?: string;
		variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
	} = $props();

	const variantClass: Record<string, string> = {
		default: 'bg-gray-100 text-gray-600',
		success: 'bg-green-100 text-green-700',
		warning: 'bg-amber-100 text-amber-700',
		danger: 'bg-red-100 text-red-700',
		info: 'bg-blue-100 text-blue-700'
	};
</script>

<span
	class="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold
		{variantClass[variant]}"
>
	{label}
</span>
