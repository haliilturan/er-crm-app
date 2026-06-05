<script lang="ts">
	let {
		title = '',
		description = '',
		value = 0,
		max = 100
	}: {
		title?: string;
		description?: string;
		value?: number;
		max?: number;
	} = $props();

	let percent = $derived(Math.min(Math.max((value / max) * 100, 0), 100));
</script>

<div class="relative flex items-center bg-gray-100 rounded-lg h-[72px] w-full overflow-hidden">
	<div
		class="absolute inset-y-0 left-0 bg-blue-500 rounded-lg transition-all duration-300"
		style="width: {percent}%"
	></div>
	<div class="relative z-10 flex flex-col justify-center px-5 gap-1">
		<span class="text-[15px] font-bold text-gray-800 leading-none">{title}</span>
		<span class="text-[15px] text-gray-500 leading-none">{description}</span>
	</div>
</div>
