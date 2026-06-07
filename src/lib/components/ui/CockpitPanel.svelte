<script lang="ts">
	import SearchInput from './SearchInput.svelte';
	import ListItemCard from './ListItemCard.svelte';
	import TaskItemCard from './TaskItemCard.svelte';

	type CockpitTab = 'tasks' | 'chats' | 'pulse';

	let activeTab = $state<CockpitTab>('tasks');
	let taskSubTab = $state<'received' | 'sent' | 'new'>('received');
	let activeDay = $state('TU');
	let chatSearch = $state('');

	const weekDays = [
		{ key: 'SA', label: 'SA', date: 31 },
		{ key: 'SU', label: 'SU', date: 1 },
		{ key: 'MO', label: 'MO', date: 2 },
		{ key: 'TU', label: 'TU', date: 3 },
		{ key: 'WE', label: 'WE', date: 4 }
	];

	const mockTasks = [
		{ username: 'Sarah Johnson', description: 'Follow up with client regarding proposal', date: 'Dec 3', status: 'pending' as const },
		{ username: 'Mark Chen', description: 'Prepare quarterly sales report', date: 'Dec 3', status: 'overdue' as const },
		{ username: 'Alex Turner', description: 'Review new contract terms', date: 'Dec 4', status: 'completed' as const },
		{ username: 'Lisa Park', description: 'Update CRM with meeting notes', date: 'Dec 5', status: 'pending' as const }
	];

	const mockChats = [
		{ title: 'Sarah Johnson', description: 'Product Manager', timestamp: '2h ago', avatarText: 'SJ', variant: 'avatar' as const },
		{ title: 'Mark Chen', description: 'Developer', timestamp: '5h ago', avatarText: 'MC', variant: 'avatar' as const },
		{ title: 'Lisa Park', description: 'Designer', timestamp: 'Yesterday', avatarText: 'LP', variant: 'avatar' as const }
	];

	const mockNotifications = [
		{ title: 'New offer submitted', description: 'TUR International — Offer #1042', timestamp: '1h ago' },
		{ title: 'Payment received', description: '$4,500 from Acme Corp', timestamp: '3h ago' },
		{ title: 'Task overdue', description: 'Mark Chen has an overdue task', timestamp: '5h ago' }
	];

	const filteredChats = $derived(
		chatSearch.trim()
			? mockChats.filter((c) => c.title.toLowerCase().includes(chatSearch.toLowerCase()))
			: mockChats
	);

	const cockpitTabs: { key: CockpitTab; label: string }[] = [
		{ key: 'tasks', label: 'Tasks' },
		{ key: 'chats', label: 'Chats' },
		{ key: 'pulse', label: 'Pulse' }
	];

	const taskSubTabs = [
		{ key: 'received' as const, label: 'Received' },
		{ key: 'sent' as const, label: 'Sent' },
		{ key: 'new' as const, label: 'New' }
	];
</script>

<div class="flex flex-col h-full overflow-hidden">
	<!-- Header tabs + profile icon -->
	<div class="shrink-0 flex items-center justify-between px-4 pt-4 pb-2">
		<div class="flex gap-1">
			{#each cockpitTabs as tab (tab.key)}
				<button
					type="button"
					onclick={() => (activeTab = tab.key)}
					class="px-3 py-1 rounded-full text-sm transition-colors
						{activeTab === tab.key ? 'bg-white text-black font-medium' : 'text-[#888] hover:text-white'}"
				>
					{tab.label}
				</button>
			{/each}
		</div>
		<button
			type="button"
			class="w-8 h-8 rounded-full bg-[#222] border border-[#2a2a2a] flex items-center justify-center text-[#888] hover:text-white transition-colors"
			aria-label="Profile"
		>
			<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
				<circle cx="12" cy="7" r="4" />
			</svg>
		</button>
	</div>

	<!-- Panel body -->
	<div class="flex-1 overflow-y-auto px-4 pb-4" style="scrollbar-width: none;">

		<!-- ═══ TASKS ══════════════════════════════════════════════════════════════ -->
		{#if activeTab === 'tasks'}
			<div class="mb-4">
				<h3 class="text-base font-bold text-white">Task Management</h3>
				<p class="text-xs text-[#888]">{mockTasks.filter((t) => t.status !== 'completed').length} Active tasks</p>
			</div>

			<!-- Weekly date nav -->
			<div class="flex gap-1 mb-4">
				{#each weekDays as day (day.key)}
					<button
						type="button"
						onclick={() => (activeDay = day.key)}
						class="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-colors
							{activeDay === day.key ? 'bg-white' : 'bg-[#1a1a1a] hover:bg-[#222]'}"
					>
						<span class="text-[10px] {activeDay === day.key ? 'text-[#888]' : 'text-[#555]'}">{day.label}</span>
						<span class="text-sm font-medium {activeDay === day.key ? 'text-black' : 'text-white'}">{day.date}</span>
					</button>
				{/each}
			</div>

			<!-- Sub tabs -->
			<div class="flex gap-1 mb-3">
				{#each taskSubTabs as sub (sub.key)}
					<button
						type="button"
						onclick={() => (taskSubTab = sub.key)}
						class="px-3 py-1 rounded-full text-xs transition-colors
							{taskSubTab === sub.key ? 'bg-white text-black font-medium' : 'text-[#888] hover:text-white'}"
					>
						{sub.label}
					</button>
				{/each}
			</div>

			<!-- Task list -->
			<div class="flex flex-col gap-2">
				{#each mockTasks as task (task.username + task.date)}
					<TaskItemCard
						username={task.username}
						description={task.description}
						date={task.date}
						status={task.status}
					/>
				{/each}
			</div>

		<!-- ═══ CHATS ══════════════════════════════════════════════════════════════ -->
		{:else if activeTab === 'chats'}
			<div class="mb-4">
				<h3 class="text-base font-bold text-white">Conversations</h3>
				<p class="text-xs text-[#888]">3 New chats</p>
			</div>

			<div class="mb-3">
				<SearchInput bind:value={chatSearch} placeholder="Filter in users..." />
			</div>

			<div class="flex flex-col gap-2">
				{#each filteredChats as chat (chat.title)}
					<ListItemCard
						title={chat.title}
						description={chat.description}
						timestamp={chat.timestamp}
						avatarText={chat.avatarText}
						variant={chat.variant}
					/>
				{/each}
			</div>

		<!-- ═══ PULSE ══════════════════════════════════════════════════════════════ -->
		{:else}
			<div class="mb-4">
				<h3 class="text-base font-bold text-white">Notifications</h3>
				<p class="text-xs text-[#888]">3 New alerts</p>
			</div>

			<div class="flex flex-col gap-2">
				{#each mockNotifications as notif (notif.title)}
					<div class="bg-[#1a1a1a] rounded-2xl px-4 py-3 border border-[#2a2a2a]">
						<div class="flex items-start justify-between gap-2">
							<p class="text-sm font-medium text-white leading-tight">{notif.title}</p>
							<span class="text-xs text-[#555] shrink-0 whitespace-nowrap">{notif.timestamp}</span>
						</div>
						<p class="text-xs text-[#888] mt-0.5">{notif.description}</p>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
