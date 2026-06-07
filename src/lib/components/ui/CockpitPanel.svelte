<script lang="ts">
	import { untrack } from 'svelte';
	import SearchInput from './SearchInput.svelte';
	import TaskItemCard from './TaskItemCard.svelte';
	import TextInput from './TextInput.svelte';
	import TextArea from './TextArea.svelte';
	import Select from './Select.svelte';
	import ToastGroup from './ToastGroup.svelte';
	import { db, id, tx } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';

	type CockpitTab = 'tasks' | 'chats' | 'pulse';

	let activeTab = $state<CockpitTab>('tasks');
	let taskSubTab = $state<'received' | 'sent' | 'new'>('received');
	let chatSearch = $state('');

	// ─── Dynamic week days ────────────────────────────────────────────────────
	const DAY_NAMES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

	const weekDays = $derived.by(() => {
		const today = new Date();
		const days = [];
		for (let i = -2; i <= 2; i++) {
			const d = new Date(today);
			d.setDate(today.getDate() + i);
			days.push({
				key: d.toISOString().slice(0, 10),
				label: DAY_NAMES[d.getDay()],
				date: d.getDate()
			});
		}
		return days;
	});

	let activeDay = $state(new Date().toISOString().slice(0, 10));

	// ─── Tasks subscription ───────────────────────────────────────────────────
	let tasks = $state<any[]>([]);
	let tasksLoading = $state(true);

	$effect(() => {
		const uid = authStore.userId;
		if (!uid) return;
		return db.subscribeQuery(
			{ tasks: { $: { where: { assignedTo: uid }, order: { createdAt: 'desc' } } } },
			(res) => {
				untrack(() => {
					tasks = res.data?.tasks ?? [];
					tasksLoading = false;
				});
			}
		);
	});

	// ─── ActivityFeed subscription ────────────────────────────────────────────
	let activities = $state<any[]>([]);
	let activitiesLoading = $state(true);

	$effect(() => {
		const cid = authStore.activeCompanyId;
		if (!cid) return;
		return db.subscribeQuery(
			{
				activityFeed: {
					$: { where: { companyId: cid }, order: { createdAt: 'desc' }, limit: 20 }
				}
			},
			(res) => {
				untrack(() => {
					activities = res.data?.activityFeed ?? [];
					activitiesLoading = false;
				});
			}
		);
	});

	// ─── Customers for task form ──────────────────────────────────────────────
	let formCustomers = $state<Array<{ id: string; name: string }>>([]);

	$effect(() => {
		const uid = authStore.userId;
		if (!uid) return;
		return db.subscribeQuery(
			{ customers: { $: { where: { assignedTo: uid } } } },
			(res) => {
				untrack(() => {
					formCustomers = (res.data?.customers ?? []).map((c: any) => ({
						id: c.id,
						name: String(c.name ?? '')
					}));
				});
			}
		);
	});

	// ─── Task form state ─────────────────────────────────────────────────────
	let newTask = $state({ title: '', description: '', customerId: '' });
	let saving = $state(false);
	let formError = $state('');
	let toasts = $state<Array<{ id: string; description: string; dismissible: boolean }>>([]);

	async function saveTask() {
		const uid = authStore.userId;
		const cid = authStore.activeCompanyId;
		if (!uid || !cid) return;
		if (!newTask.title.trim()) { formError = 'Başlık zorunludur.'; return; }

		saving = true;
		formError = '';
		try {
			const newId = id();
			await db.transact([
				tx.tasks[newId].update({
					title:      newTask.title.trim(),
					type:       'manual',
					status:     'pending',
					assignedTo: uid,
					companyId:  cid,
					createdBy:  uid,
					createdAt:  Date.now(),
					...(newTask.description.trim() && { description: newTask.description.trim() }),
					...(activeDay && { dueAt: new Date(activeDay).getTime() }),
					...(newTask.customerId && {
						relatedEntityType: 'customer',
						relatedEntityId:   newTask.customerId
					})
				})
			]);
			toasts = [
				...toasts,
				{ id: String(Date.now()), description: 'Görev oluşturuldu ✓', dismissible: true }
			];
			newTask = { title: '', description: '', customerId: '' };
			taskSubTab = 'received';
		} catch (err) {
			console.error('saveTask error:', err);
			formError = 'Görev kaydedilemedi. Tekrar deneyin.';
		} finally {
			saving = false;
		}
	}

	// ─── Helpers ─────────────────────────────────────────────────────────────
	function fmtTurkishDate(iso: string): string {
		const [y, m, d] = iso.split('-').map(Number);
		return new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
	}

	function fmtShortDate(ts: number): string {
		return new Date(ts).toLocaleDateString('en', { month: 'short', day: 'numeric' });
	}

	function relTime(ts: number): string {
		const m = Math.floor((Date.now() - ts) / 60000);
		if (m < 1) return 'Az önce';
		if (m < 60) return `${m}dk önce`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}s önce`;
		return `${Math.floor(h / 24)}g önce`;
	}

	function taskStatus(t: any): 'pending' | 'overdue' | 'completed' {
		if (t.status === 'done' || t.status === 'dismissed') return 'completed';
		if (t.dueAt && t.dueAt < Date.now()) return 'overdue';
		return 'pending';
	}

	const ACTIVITY_LABELS: Record<string, string> = {
		quote_created:   'Yeni teklif oluşturuldu',
		quote_submitted: 'Teklif onaya gönderildi',
		quote_approved:  'Teklif onaylandı',
		quote_rejected:  'Teklif reddedildi',
		order_created:   'Sipariş oluşturuldu',
		customer_added:  'Yeni müşteri eklendi'
	};

	function activityLabel(type: string): string {
		return ACTIVITY_LABELS[type] ?? type;
	}

	function activityDesc(a: any): string {
		return a.relatedEntityNumber ?? a.customerCompanyName ?? a.actorName ?? '';
	}

	// ─── Derived maps ────────────────────────────────────────────────────────
	const customersById = $derived(
		Object.fromEntries(formCustomers.map((c) => [c.id, c.name]))
	);

	let activePendingCount = $derived(tasks.filter((t) => t.status === 'pending').length);

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
				<p class="text-xs text-[#888]">{activePendingCount} aktif görev</p>
			</div>

			<!-- Weekly date nav -->
			<div class="flex gap-1 mb-1">
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

			{#if taskSubTab === 'new'}
				<p class="text-xs text-[#555] text-center mb-3">
					Son tarih: <span class="text-[#888]">{fmtTurkishDate(activeDay)}</span>
				</p>
			{:else}
				<div class="mb-3"></div>
			{/if}

			<!-- Sub tabs -->
			<div class="flex gap-1 mb-3">
				{#each taskSubTabs as sub (sub.key)}
					<button
						type="button"
						onclick={() => {
							taskSubTab = sub.key;
							if (sub.key !== 'new') formError = '';
						}}
						class="px-3 py-1 rounded-full text-xs transition-colors
							{taskSubTab === sub.key ? 'bg-white text-black font-medium' : 'text-[#888] hover:text-white'}"
					>
						{sub.label}
					</button>
				{/each}
			</div>

			<!-- ── New task form ──────────────────────────────────────────────── -->
			{#if taskSubTab === 'new'}
				<div class="bg-[#1a1a1a] rounded-2xl p-4 flex flex-col gap-3 border border-[#2a2a2a]">
					<TextInput
						label="Başlık"
						bind:value={newTask.title}
						placeholder="Görev başlığı"
						required
					/>

					<TextArea
						label="Açıklama"
						bind:value={newTask.description}
						placeholder="Opsiyonel açıklama..."
						rows={3}
					/>

					<Select
						label="İlgili Müşteri"
						bind:value={newTask.customerId}
						options={formCustomers.map((c) => ({ value: c.id, label: c.name }))}
						placeholder="Müşteri seçin (opsiyonel)"
					/>

					{#if formError}
						<p class="text-xs text-red-400">{formError}</p>
					{/if}

					<div class="flex gap-2 pt-1">
						<button
							type="button"
							onclick={() => { taskSubTab = 'received'; formError = ''; }}
							class="flex-1 bg-[#222] text-white rounded-full px-4 py-2 text-sm transition-colors hover:bg-[#2a2a2a]"
						>İptal</button>
						<button
							type="button"
							onclick={saveTask}
							disabled={saving}
							class="flex-1 bg-white text-black rounded-full px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
						>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
					</div>
				</div>

			<!-- ── Task list (received / sent) ───────────────────────────────── -->
			{:else}
				<div class="flex flex-col gap-2">
					{#if tasksLoading}
						{#each [1, 2, 3] as _, i (i)}
							<div class="h-14 bg-[#222] animate-pulse rounded-2xl"></div>
						{/each}
					{:else if tasks.length === 0}
						<div class="flex flex-col items-center gap-2 py-8 text-[#555]">
							<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<path d="M9 11l3 3L22 4" />
								<path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
							</svg>
							<p class="text-sm">Henüz görev yok</p>
						</div>
					{:else}
						{#each tasks as task (task.id)}
							<TaskItemCard
								taskId={task.id}
								title={task.title ?? ''}
								description={task.description}
								date={fmtShortDate(task.dueAt ?? task.createdAt)}
								status={taskStatus(task)}
								relatedEntityType={task.relatedEntityType}
								relatedEntityName={customersById[task.relatedEntityId] ?? ''}
							/>
						{/each}
					{/if}
				</div>
			{/if}

		<!-- ═══ CHATS ══════════════════════════════════════════════════════════════ -->
		{:else if activeTab === 'chats'}
			<div class="mb-4">
				<h3 class="text-base font-bold text-white">Mesajlar</h3>
			</div>

			<div class="mb-3">
				<SearchInput bind:value={chatSearch} placeholder="Kullanıcı ara..." />
			</div>

			<div class="flex flex-col items-center gap-2 py-8 text-[#555]">
				<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
				</svg>
				<p class="text-sm">Henüz mesaj yok</p>
			</div>

		<!-- ═══ PULSE ══════════════════════════════════════════════════════════════ -->
		{:else}
			<div class="mb-4">
				<h3 class="text-base font-bold text-white">Notifications</h3>
				<p class="text-xs text-[#888]">{activities.length} aktivite</p>
			</div>

			<div class="flex flex-col gap-2">
				{#if activitiesLoading}
					{#each [1, 2, 3] as _, i (i)}
						<div class="h-14 bg-[#222] animate-pulse rounded-2xl"></div>
					{/each}
				{:else if activities.length === 0}
					<div class="flex flex-col items-center gap-2 py-8 text-[#555]">
						<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
							<path d="M13.73 21a2 2 0 01-3.46 0" />
						</svg>
						<p class="text-sm">Henüz aktivite yok</p>
					</div>
				{:else}
					{#each activities as act (act.id)}
						<div class="bg-[#1a1a1a] rounded-2xl px-4 py-3 border border-[#2a2a2a]">
							<div class="flex items-start justify-between gap-2">
								<p class="text-sm font-medium text-white leading-tight">{activityLabel(act.type)}</p>
								<span class="text-xs text-[#555] shrink-0 whitespace-nowrap">{relTime(act.createdAt)}</span>
							</div>
							<p class="text-xs text-[#888] mt-0.5">{activityDesc(act)}</p>
						</div>
					{/each}
				{/if}
			</div>
		{/if}

	</div>

	<ToastGroup
		bind:toasts
		onclose={(tid) => (toasts = toasts.filter((t) => t.id !== tid))}
	/>
</div>
