<script lang="ts">
	import { untrack, tick } from 'svelte';
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
	import { ChevronLeft, ChevronRight, MessageCircle, Share2 } from 'lucide-svelte';
	import SearchInput from './SearchInput.svelte';
	import TextInput from './TextInput.svelte';
	import TextArea from './TextArea.svelte';
	import Select from './Select.svelte';
	import ToastGroup from './ToastGroup.svelte';
	import { db, id, tx } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import { chatBridge } from '$lib/stores/chat.svelte';

	type CockpitTab = 'tasks' | 'chats' | 'pulse';

	let activeTab    = $state<CockpitTab>('tasks');
	let taskSubTab   = $state<'received' | 'quote_tracking' | 'sent' | 'new'>('received');
	let chatSearch   = $state('');
	let expandedId   = $state<string | null>(null);
	let completing   = $state<string | null>(null);

	// ─── Date / week navigation ───────────────────────────────────────────────
	const TR_DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

	function toLocalDateStr(d: Date): string {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	const TODAY_STR   = toLocalDateStr(new Date());
	let activeDateObj = new SvelteDate();
	let activeDay     = $derived(toLocalDateStr(activeDateObj));

	let weekOffset = $state(0);

	const weekDays = $derived.by(() => {
		// Pure timestamp arithmetic — no Date mutation
		const now    = activeDateObj.getTime(); // reactive via SvelteDate
		const tmpDow = activeDateObj.getDay();
		const diff   = tmpDow === 0 ? 6 : tmpDow - 1;
		const monMs  = now - diff * 86_400_000 + weekOffset * 7 * 86_400_000;
		return Array.from({ length: 7 }, (_, i) => {
			const d = new Date(monMs + i * 86_400_000);
			return { key: toLocalDateStr(d), label: TR_DAYS[d.getDay()], date: d.getDate() };
		});
	});

	function selectDay(key: string) {
		const [y, m, d] = key.split('-').map(Number);
		activeDateObj.setFullYear(y, m - 1, d);
	}

	// ─── Tasks subscription ───────────────────────────────────────────────────
	let tasks        = $state<any[]>([]);
	let tasksLoading = $state(true);

	$effect(() => {
		const uid = authStore.userId;
		if (!uid) return;
		return db.subscribeQuery(
			{ tasks: { $: { where: { assignedTo: uid }, order: { createdAt: 'desc' } } } },
			(res) => { untrack(() => { tasks = res.data?.tasks ?? []; tasksLoading = false; }); }
		);
	});

	// ─── ActivityFeed subscription ────────────────────────────────────────────
	let activities        = $state<any[]>([]);
	let activitiesLoading = $state(true);

	$effect(() => {
		const uid = authStore.userId;
		if (!uid) return;
		return db.subscribeQuery(
			{ activityFeed: { $: { order: { createdAt: 'desc' }, limit: 50 } } },
			(res) => { untrack(() => { activities = res.data?.activityFeed ?? []; activitiesLoading = false; }); }
		);
	});

	// ─── Orders map (for order tracking tasks) ───────────────────────────────
	let ordersMap = $state<Record<string, any>>({});

	$effect(() => {
		const cid = authStore.activeCompanyId;
		if (!cid) return;
		return db.subscribeQuery(
			{ orders: { $: { where: { companyId: cid, status: { in: ['draft', 'pending_finance'] } } }, customer: {} } },
			(res) => {
				untrack(() => {
					const list = (res.data?.orders ?? []) as any[];
					ordersMap = Object.fromEntries(list.map((q) => [q.id, q]));
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
						id: c.id, name: String(c.name ?? '')
					}));
				});
			}
		);
	});

	// ─── Task form state ─────────────────────────────────────────────────────
	let newTask   = $state({ title: '', description: '', customerId: '', assignedTo: '' });
	let saving    = $state(false);
	let formError = $state('');
	let toasts    = $state<Array<{ id: string; description: string; dismissible: boolean }>>([]);

	async function saveTask() {
		const uid = authStore.userId;
		const cid = authStore.activeCompanyId;
		if (!uid || !cid) return;
		if (!newTask.title.trim()) { formError = 'Başlık zorunludur.'; return; }
		saving = true; formError = '';
		try {
			const newId = id();
			await db.transact([
				tx.tasks[newId].update({
					title:      newTask.title.trim(),
					type:       'manual',
					status:     'pending',
					assignedTo: newTask.assignedTo || uid,
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
			toasts = [...toasts, { id: String(Date.now()), description: 'Görev oluşturuldu ✓', dismissible: true }];
			newTask = { title: '', description: '', customerId: '', assignedTo: '' };
			taskSubTab = 'received';
		} catch (err) {
			console.error('saveTask error:', err);
			formError = 'Görev kaydedilemedi. Tekrar deneyin.';
		} finally {
			saving = false;
		}
	}

	async function completeTask(taskId: string) {
		completing = taskId;
		try {
			await db.transact([tx.tasks[taskId].update({ status: 'done' })]);
			expandedId = null;
		} finally {
			completing = null;
		}
	}

	// ─── Helpers ─────────────────────────────────────────────────────────────
	function fmtShortDate(ts: number): string {
		return new Date(ts).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
	}

	function fmtActiveDay(iso: string): string {
		const [y, m, d] = iso.split('-').map(Number);
		return new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
	}

	function relTime(ts: number): string {
		const m = Math.floor((Date.now() - ts) / 60000);
		if (m < 1)  return 'Az önce';
		if (m < 60) return `${m}dk önce`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}s önce`;
		return `${Math.floor(h / 24)}g önce`;
	}

	function taskStatus(t: any): 'pending' | 'overdue' | 'done' | 'dismissed' {
		if (t.status === 'done')      return 'done';
		if (t.status === 'dismissed') return 'dismissed';
		if (t.dueAt && t.dueAt < Date.now()) return 'overdue';
		return 'pending';
	}

	const ACTIVITY_LABELS: Record<string, string> = {
		order_created:   'Yeni sipariş oluşturuldu',
		order_submitted: 'Sipariş onaya gönderildi',
		order_approved:  'Sipariş onaylandı',
		order_rejected:  'Sipariş reddedildi',
		customer_added:  'Yeni müşteri eklendi'
	};

	function activityLabel(type: string): string { return ACTIVITY_LABELS[type] ?? type; }
	function activityDesc(a: any): string {
		return a.relatedEntityNumber ?? a.customerCompanyName ?? a.actorName ?? '';
	}

	function daysSince(ts: number): number {
		return Math.floor((Date.now() - ts) / 86_400_000);
	}

	function fmtMoney(amount: number, currency: string): string {
		return (amount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ' + currency;
	}

	// ─── Profiles for Chats ─────────────────────────────────────────────────
	let allProfiles     = $state<any[]>([]);
	let profilesLoading = $state(true);
	let selectedChat    = $state<{ userId: string; profile: any } | null>(null);
	let messages        = $state<any[]>([]);
	let messagesLoading = $state(true);
	let messageInput    = $state('');
	let chatScrollEl    = $state<HTMLElement | null>(null);

	$effect(() => {
		const uid = authStore.userId;
		if (!uid) return;
		return db.subscribeQuery(
			{ userProfiles: {} },
			(res) => {
				untrack(() => {
					const all = (res.data?.userProfiles ?? []) as any[];
					allProfiles     = all.filter((p) => p.userId !== uid);
					profilesLoading = false;
				});
			}
		);
	});

	$effect(() => {
		const me   = authStore.userId;
		const them = selectedChat?.userId;
		if (!me || !them) {
			messages        = [];
			messagesLoading = false;
			return;
		}
		messagesLoading = true;
		return db.subscribeQuery(
			{
				messages: {
					$: {
						where: {
							or: [
								{ senderId: me, receiverId: them },
								{ senderId: them, receiverId: me }
							]
						},
						order: { createdAt: 'asc' }
					}
				}
			},
			(res) => {
				untrack(() => { messages = res.data?.messages ?? []; messagesLoading = false; });
			}
		);
	});

	$effect(() => {
		void messages.length;
		tick().then(() => {
			if (chatScrollEl) chatScrollEl.scrollTop = chatScrollEl.scrollHeight;
		});
	});

	const filteredProfiles = $derived(
		chatSearch.trim()
			? allProfiles.filter((p) =>
					(p.fullName ?? '').toLowerCase().includes(chatSearch.toLowerCase())
				)
			: allProfiles
	);

	function displayName(profile: any): string {
		return profile?.fullName || profile?.email?.split('@')[0] || 'Kullanıcı';
	}

	function initials(profile: any): string {
		return displayName(profile)
			.split(' ')
			.slice(0, 2)
			.map((w: string) => w[0] ?? '')
			.join('')
			.toUpperCase();
	}

	async function teklifLinkiKopyala(orderId: string) {
		const order = ordersMap[orderId];
		const customerId = (order?.customer as any)?.id;
		const link = customerId
			? `${window.location.origin}/satis/musteriler/${customerId}/teklifler`
			: `${window.location.origin}/satis/musteriler`;
		await navigator.clipboard.writeText(link);
		toasts = [...toasts, { id: String(Date.now()), description: 'Teklif linki kopyalandı ✓', dismissible: true }];
	}

	function fmtMsgTime(ts: number): string {
		const d   = new Date(ts);
		const now = new Date();
		const today = d.toDateString() === now.toDateString();
		return today
			? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
			: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	}

	async function sendMessage() {
		if (!messageInput.trim() || !selectedChat?.userId || !authStore.userId) return;
		const text = messageInput.trim();
		messageInput = '';
		try {
			const msgId = id();
			await db.transact([
				tx.messages[msgId].update({
					senderId:   authStore.userId,
					receiverId: selectedChat.userId,
					content:    text,
					companyId:  authStore.activeCompanyId ?? '',
					createdAt:  Date.now()
				})
			]);
		} catch (err) {
			console.error('[Chat] send error:', err);
			messageInput = text;
		}
	}

	// ─── Inbox (okunmamış sayısı + okundu işareti) ────────────────────────────
	let inboxMessages = $state<any[]>([]);

	$effect(() => {
		const uid = authStore.userId;
		if (!uid) return;
		return db.subscribeQuery(
			{ messages: { $: { where: { receiverId: uid } } } },
			(res) => { untrack(() => { inboxMessages = res.data?.messages ?? []; }); }
		);
	});

	const unreadCount = $derived(
		inboxMessages.filter((m: any) => !m.readAt).length
	);

	const unreadByUser = $derived(
		inboxMessages.reduce<Record<string, number>>((acc, m: any) => {
			if (!m.readAt) acc[m.senderId] = (acc[m.senderId] ?? 0) + 1;
			return acc;
		}, {})
	);

	// Sohbet açıkken gelen mesajları otomatik okundu yap
	$effect(() => {
		if (!selectedChat?.userId) return;
		const unread = inboxMessages.filter(
			(m: any) => m.senderId === selectedChat.userId && !m.readAt
		);
		if (!unread.length) return;
		db.transact(unread.map((m: any) => tx.messages[m.id].update({ readAt: Date.now() })));
	});

	// Layout'tan toast tıklamasıyla sohbet aç (chatBridge)
	$effect(() => {
		const pending = chatBridge.pendingUserId;
		if (!pending) return;
		const profile = allProfiles.find((p) => p.userId === pending);
		if (profile) {
			untrack(() => {
				activeTab    = 'chats';
				selectedChat = { userId: pending, profile };
				chatBridge.consume();
			});
		} else if (!profilesLoading) {
			untrack(() => chatBridge.consume());
		}
	});

	// Zil ikonundan Pulse sekmesini aç
	$effect(() => {
		if (!chatBridge.pulseSignal) return;
		untrack(() => {
			activeTab = 'pulse';
			chatBridge.consumePulse();
		});
	});

	// ─── Bildirimler (Pulse sekmesi için) ────────────────────────────────────
	let myNotifications      = $state<any[]>([]);
	let notificationsLoading = $state(true);

	$effect(() => {
		const uid = authStore.userId;
		if (!uid) return;
		return db.subscribeQuery(
			{ notifications: { $: { where: { userId: uid }, order: { createdAt: 'desc' }, limit: 30 } } },
			(res) => { untrack(() => { myNotifications = res.data?.notifications ?? []; notificationsLoading = false; }); }
		);
	});

	// Pulse açılınca bildirimleri okundu yap
	$effect(() => {
		if (activeTab !== 'pulse') return;
		const unread = myNotifications.filter((n: any) => !n.readAt);
		if (!unread.length) return;
		db.transact(unread.map((n: any) => tx.notifications[n.id].update({ readAt: Date.now() })));
	});

	// ─── Derived ─────────────────────────────────────────────────────────────
	const customersById = $derived(Object.fromEntries(formCustomers.map((c) => [c.id, c.name])));

	const activeDayTasks = $derived(
		tasks.filter((t) => {
			if (!t.dueAt) return true;
			return toLocalDateStr(new Date(t.dueAt)) === activeDay;
		})
	);

	const activePendingCount = $derived(tasks.filter((t) => t.status === 'pending').length);

	const quoteTrackingTasks = $derived(
		tasks.filter((t) => t.orderId && t.status !== 'done' && t.status !== 'dismissed')
	);

	const pendingQuoteCount = $derived(quoteTrackingTasks.length);

	const sortedQuoteTrackingTasks = $derived(
		[...quoteTrackingTasks].sort((a, b) => daysSince(b.createdAt) - daysSince(a.createdAt))
	);

	// ─── Auto-close order tasks when order moves to production ───────────────
	const autoClosedIds = new SvelteSet<string>();

	$effect(() => {
		const qMap   = ordersMap;
		const tList  = tasks;

		const toClose = tList.filter((t) => {
			if (!t.orderId || t.status === 'done' || t.status === 'dismissed') return false;
			if (untrack(() => autoClosedIds.has(t.id))) return false;
			const q = qMap[t.orderId];
			if (!q) return false;
			return q.status === 'in_production';
		});

		if (!toClose.length) return;
		untrack(() => toClose.forEach((t) => autoClosedIds.add(t.id)));
		const now = Date.now();
		db.transact(toClose.map((t) => tx.tasks[t.id].update({ status: 'done', completedAt: now })));
	});

	const teklifler = $derived(Object.values(ordersMap) as any[]);

	// Counts tasks that have a dueAt on each day of the week strip
	const taskCountByDay = $derived(
		tasks.reduce<Record<string, number>>((acc, t) => {
			if (!t.dueAt || t.status === 'done' || t.status === 'dismissed') return acc;
			const key = toLocalDateStr(new Date(t.dueAt));
			acc[key] = (acc[key] ?? 0) + 1;
			return acc;
		}, {})
	);
</script>

<div class="relative flex flex-col h-full overflow-hidden bg-[#111111]">

	<!-- ═══ TOP BAR ═══════════════════════════════════════════════════════════ -->
	<div class="shrink-0 flex items-center justify-between px-4 pt-4 pb-3">
		<!-- Tabs -->
		<div class="flex gap-0.5 bg-[#1a1a1a] rounded-full p-0.5">
			<button
				type="button"
				onclick={() => (activeTab = 'tasks')}
				class="relative px-3 py-1 rounded-full text-xs font-medium transition-colors
					{activeTab === 'tasks' ? 'bg-white text-black' : 'text-[#666] hover:text-white'}"
			>
				Görevler
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'chats')}
				class="relative px-3 py-1 rounded-full text-xs font-medium transition-colors
					{activeTab === 'chats' ? 'bg-white text-black' : 'text-[#666] hover:text-white'}"
			>
				Mesajlar
				{#if unreadCount > 0}
					<span class="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-red-500 flex items-center justify-center text-[8px] font-bold text-white px-0.5">{unreadCount > 9 ? '9+' : unreadCount}</span>
				{/if}
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'pulse')}
				class="px-3 py-1 rounded-full text-xs font-medium transition-colors
					{activeTab === 'pulse' ? 'bg-white text-black' : 'text-[#666] hover:text-white'}"
			>
				Pulse
			</button>
		</div>

		<!-- Avatar -->
		<button
			type="button"
			aria-label="Profil"
			class="w-8 h-8 rounded-full bg-[#222] border border-[#2a2a2a] flex items-center justify-center text-[#666] hover:text-white transition-colors"
		>
			<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
			</svg>
		</button>
	</div>

	<!-- ═══ PANEL BODY ════════════════════════════════════════════════════════ -->
	<div class="flex-1 overflow-y-auto px-4 pb-4" style="scrollbar-width: none;">

		<!-- ── TASKS ────────────────────────────────────────────────────────── -->
		{#if activeTab === 'tasks'}

			<!-- Header -->
			<div class="mb-4">
				<h3 class="text-base font-bold text-white">Görev Yönetimi</h3>
				<div class="flex items-center gap-2 mt-0.5">
					<p class="text-xs text-[#555]">{activePendingCount} Aktif görev</p>
					{#if pendingQuoteCount > 0}
						<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-orange-950/70 text-orange-300 border border-orange-800/40">
							{pendingQuoteCount} Teklif Takibi
						</span>
					{/if}
				</div>
			</div>

			<!-- ── Weekly calendar strip ─────────────────────────────────── -->
			<div class="flex items-center gap-1 mb-4">
				<!-- Prev week -->
				<button
					type="button"
					onclick={() => weekOffset--}
					aria-label="Önceki hafta"
					class="shrink-0 w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[#555] hover:text-white transition-colors"
				>
					<ChevronLeft size={14} />
				</button>

				<!-- Day pills -->
				<div class="flex flex-1 gap-1 overflow-hidden">
					{#each weekDays as day (day.key)}
						{@const isActive = day.key === activeDay}
						{@const isT      = day.key === TODAY_STR}
						{@const hasTasks = (taskCountByDay[day.key] ?? 0) > 0}
						<button
							type="button"
							onclick={() => selectDay(day.key)}
							class="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-colors
								{isActive ? 'bg-white' : isT ? 'bg-[#222] border border-[#333]' : 'bg-[#1a1a1a] hover:bg-[#222]'}"
						>
							<span class="text-[9px] font-medium uppercase
								{isActive ? 'text-[#777]' : 'text-[#444]'}">{day.label}</span>
							<span class="text-sm font-semibold leading-none
								{isActive ? 'text-black' : 'text-white'}">{day.date}</span>
							<!-- Task dot -->
							{#if hasTasks && !isActive}
								<span class="w-1 h-1 rounded-full bg-blue-500"></span>
							{:else}
								<span class="w-1 h-1"></span>
							{/if}
						</button>
					{/each}
				</div>

				<!-- Next week -->
				<button
					type="button"
					onclick={() => weekOffset++}
					aria-label="Sonraki hafta"
					class="shrink-0 w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[#555] hover:text-white transition-colors"
				>
					<ChevronRight size={14} />
				</button>
			</div>

			<!-- Active day label -->
			<p class="text-xs text-[#444] mb-3">{fmtActiveDay(activeDay)}</p>

			<!-- ── Sub tabs ──────────────────────────────────────────────── -->
			<div class="flex gap-0.5 mb-3 bg-[#1a1a1a] rounded-full p-0.5">
				{#each (['received', 'sent', 'new'] as const) as sub (sub)}
					<button
						type="button"
						onclick={() => { taskSubTab = sub; if (sub !== 'new') formError = ''; }}
						class="relative flex-1 py-1 rounded-full text-xs font-medium transition-colors
							{taskSubTab === sub ? 'bg-white text-black' : 'text-[#555] hover:text-white'}"
					>
						{sub === 'received' ? 'Alınan' : sub === 'sent' ? 'Gönderilenler' : 'Yeni'}
					</button>
				{/each}
			</div>

			<!-- ── New task form ─────────────────────────────────────────── -->
			{#if taskSubTab === 'new'}
				<div class="bg-[#1a1a1a] rounded-2xl p-4 flex flex-col gap-3 border border-[#2a2a2a]">
					<p class="text-xs text-[#555]">Son tarih: <span class="text-[#777]">{fmtActiveDay(activeDay)}</span></p>
					<TextInput label="Başlık" bind:value={newTask.title} placeholder="Görev başlığı" required />
					<TextArea  label="Açıklama" bind:value={newTask.description} placeholder="Opsiyonel..." rows={2} />
					<Select
						label="İlgili Müşteri"
						bind:value={newTask.customerId}
						options={formCustomers.map((c) => ({ value: c.id, label: c.name }))}
						placeholder="Müşteri seçin (opsiyonel)"
					/>
					<Select
						label="Atanacak Personel"
						bind:value={newTask.assignedTo}
						options={allProfiles.map((p) => ({ value: p.userId, label: p.fullName ?? p.email ?? p.userId }))}
						placeholder="Bana ata (varsayılan)"
					/>
					{#if formError}<p class="text-xs text-red-400">{formError}</p>{/if}
					<div class="flex gap-2 pt-1">
						<button
							type="button"
							onclick={() => { taskSubTab = 'received'; formError = ''; }}
							class="flex-1 bg-[#222] text-white rounded-full px-4 py-2 text-xs transition-colors hover:bg-[#2a2a2a]"
						>İptal</button>
						<button
							type="button"
							onclick={saveTask}
							disabled={saving}
							class="flex-1 bg-white text-black rounded-full px-4 py-2 text-xs font-medium transition-opacity disabled:opacity-50"
						>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
					</div>
				</div>

			<!-- ── Teklif Takibi listesi ─────────────────────────────────── -->
			{:else if taskSubTab === 'quote_tracking'}
				<div class="flex flex-col gap-2">
					{#if sortedQuoteTrackingTasks.length === 0}
						<div class="flex flex-col items-center gap-2 py-8 text-[#444]">
							<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
							</svg>
							<p class="text-xs">Bekleyen teklif takibi görevi yok</p>
						</div>
					{:else}
						{#each sortedQuoteTrackingTasks as task (task.id)}
							{@const q       = ordersMap[task.orderId]}
							{@const days    = daysSince(task.createdAt)}
							{@const overdue = days >= 7}
							<div class="rounded-2xl border px-3 py-3 bg-[#1a1a1a] transition-colors
								{overdue ? 'border-red-900/40' : 'border-[#222]'}">
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<p class="text-sm font-semibold text-white leading-tight truncate">
											{q?.customer?.name ?? task.title ?? '—'}
										</p>
										<p class="text-[10px] text-[#555] mt-0.5">{q?.orderNumber ?? ''}</p>
									</div>
									<div class="flex flex-col items-end gap-1 shrink-0">
										{#if overdue}
											<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-950/70 text-red-400 border border-red-800/40">
												Gecikmiş
											</span>
										{/if}
										<span class="text-[10px] text-[#555]">{days}g bekliyor</span>
									</div>
								</div>
								<div class="flex items-center justify-between mt-2">
									<span class="text-[10px] text-[#444]">{fmtShortDate(task.createdAt)}</span>
									{#if q?.totalWithVat}
										<span class="text-xs font-medium text-[#777]">{fmtMoney(q.totalWithVat, q.currency)}</span>
									{/if}
								</div>
							</div>
						{/each}
					{/if}
				</div>

			<!-- ── Task list ─────────────────────────────────────────────── -->
			{:else}
				<div class="flex flex-col gap-2">
					{#if tasksLoading}
						{#each [1, 2, 3] as _, i (i)}
							<div class="h-14 rounded-2xl bg-[#1a1a1a] animate-pulse"></div>
						{/each}
					{:else if activeDayTasks.length === 0}
						<div class="flex flex-col items-center gap-2 py-8 text-[#444]">
							<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
							</svg>
							<p class="text-xs">Bu gün için görev yok</p>
						</div>
					{:else}
						{#each activeDayTasks as task (task.id)}
							{@const st         = taskStatus(task)}
							{@const isDone     = st === 'done'}
							{@const isExpanded = expandedId === task.id}
							{@const initial    = (task.title ?? '?').trim().slice(0, 1).toUpperCase()}
							<div
								class="rounded-2xl border transition-all cursor-pointer
									{isDone
										? 'bg-green-950/40 border-green-900/30'
										: 'bg-[#1a1a1a] border-[#222] hover:border-[#2a2a2a]'}"
								role="button"
								tabindex="0"
								onclick={() => (expandedId = isExpanded ? null : task.id)}
								onkeydown={(e) => e.key === 'Enter' && (expandedId = isExpanded ? null : task.id)}
							>
								<div class="flex gap-3 px-3 py-3">
									<!-- Left indicator -->
									<div class="shrink-0 mt-0.5">
										{#if isDone}
											<div class="w-8 h-8 rounded-full bg-green-900/60 flex items-center justify-center">
												<svg class="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
													<path d="M5 13l4 4L19 7"/>
												</svg>
											</div>
										{:else if st === 'overdue'}
											<div class="w-8 h-8 rounded-full bg-orange-900/40 border border-orange-700/40 flex items-center justify-center text-xs font-bold text-orange-400">
												{initial}
											</div>
										{:else}
											<div class="w-8 h-8 rounded-full bg-[#222] border border-[#2a2a2a] flex items-center justify-center text-xs font-bold text-[#666]">
												{initial}
											</div>
										{/if}
									</div>

									<!-- Content -->
									<div class="flex-1 min-w-0">
										<!-- Title row -->
										<div class="flex items-start justify-between gap-2">
											<p class="text-sm font-medium leading-tight
												{isDone ? 'line-through text-green-400/50' : st === 'overdue' ? 'text-orange-300' : 'text-white'}">
												{task.title ?? '(Başlıksız)'}
											</p>
											<span class="text-[10px] text-[#444] shrink-0 whitespace-nowrap mt-px">
												{fmtShortDate(task.dueAt ?? task.createdAt)}
											</span>
										</div>

										<!-- Description -->
										{#if task.description}
											<p class="text-xs text-[#555] mt-0.5 {isExpanded ? '' : 'truncate'}">
												{task.description}
											</p>
										{/if}

										<!-- Order tracking badge + info -->
										{#if task.orderId}
											<span class="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-orange-950/70 text-orange-300 border border-orange-800/40">
												Teklif Takibi
											</span>
											{@const q = ordersMap[task.orderId]}
											{#if q}
												<p class="text-[10px] text-[#555] mt-0.5 leading-tight">
													{q.customer?.name ?? ''}
													{#if q.totalWithVat}· {fmtMoney(q.totalWithVat, q.currency)}{/if}
												</p>
											{/if}
										{/if}

										<!-- Expanded section -->
										{#if isExpanded}
											{#if task.relatedEntityType === 'customer' && customersById[task.relatedEntityId]}
												<p class="text-xs text-[#444] mt-2">
													İlgili müşteri: <span class="text-[#666]">{customersById[task.relatedEntityId]}</span>
												</p>
											{/if}

											{#if !isDone && st !== 'dismissed'}
												<div
													class="flex items-center gap-1.5 mt-3"
													role="presentation"
													onclick={(e) => e.stopPropagation()}
												>
													<!-- Close -->
													<button
														type="button"
														onclick={() => (expandedId = null)}
														class="px-2.5 py-1 rounded-full border border-[#2a2a2a] text-[10px] text-[#666] hover:text-white hover:border-[#444] transition-colors"
													>Kapat</button>

													<!-- Message icon -->
													<button
														type="button"
														aria-label="Mesaj gönder"
														class="w-6 h-6 rounded-full bg-[#222] border border-[#2a2a2a] flex items-center justify-center text-[#555] hover:text-white transition-colors"
													>
														<MessageCircle size={11} />
													</button>

													<!-- Share icon -->
													{#if task.orderId}
														<button
															type="button"
															aria-label="Teklif linkini kopyala"
															title="Teklif linkini kopyala"
															onclick={() => teklifLinkiKopyala(task.orderId)}
															class="w-6 h-6 rounded-full bg-[#222] border border-[#2a2a2a] flex items-center justify-center text-[#555] hover:text-white transition-colors"
														>
															<Share2 size={11} />
														</button>
													{/if}

													<!-- Complete -->
													<button
														type="button"
														onclick={() => completeTask(task.id)}
														disabled={completing === task.id}
														class="ml-auto px-3 py-1 rounded-full bg-white text-black text-[10px] font-semibold hover:bg-[#e8e8e8] transition-colors disabled:opacity-50"
													>
														{completing === task.id ? '…' : 'Tamamla'}
													</button>
												</div>
											{/if}
										{/if}
									</div>
								</div>
							</div>
						{/each}
					{/if}
				</div>

				<!-- ── Teklif takip görevleri (yalnızca Alınan sekmesinde) ────── -->
				{#if taskSubTab === 'received'}
					{@const now = Date.now()}
					{@const takipGorevleri = tasks.filter(t => t.orderId && t.status === 'pending' && (t.dueAt ?? Infinity) <= now)}
					{#if takipGorevleri.length > 0}
						<div class="mt-4">
							{#each takipGorevleri as gorev (gorev.id)}
								{@const q = ordersMap[gorev.orderId]}
								<div class="flex items-center justify-between rounded-lg border border-orange-900/40 bg-[#1a1a1a] px-4 py-3 mb-2">
									<div class="min-w-0 flex-1">
										<p class="text-sm font-medium text-white truncate">{gorev.title}</p>
										<p class="text-xs text-[#666]">{q?.customer?.name ?? ''}</p>
									</div>
									<div class="shrink-0 ml-3 flex flex-col items-end gap-1">
										<span class="text-[9px] font-bold text-orange-400 uppercase">Vadesi Geçti</span>
										{#if q?.totalWithVat}
											<span class="text-xs text-[#888]">{fmtMoney(q.totalWithVat, q.currency)}</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				{/if}
			{/if}

		<!-- ── CHATS ─────────────────────────────────────────────────────── -->
		{:else if activeTab === 'chats'}

			{#if selectedChat}
				<!-- ── Chat view ──────────────────────────────────────────── -->
				<div class="flex items-center gap-2 mb-3">
					<button
						type="button"
						onclick={() => { selectedChat = null; messageInput = ''; }}
						class="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[#555] hover:text-white transition-colors shrink-0"
					>
						<ChevronLeft size={14} />
					</button>
					<div class="w-8 h-8 rounded-full bg-[#222] border border-[#2a2a2a] flex items-center justify-center text-xs font-bold text-white shrink-0">
						{initials(selectedChat.profile)}
					</div>
					<div class="min-w-0">
						<p class="text-sm font-semibold text-white leading-tight truncate">{displayName(selectedChat.profile)}</p>
						{#if selectedChat.profile.email}
							<p class="text-[10px] text-[#444] truncate">{selectedChat.profile.email}</p>
						{/if}
					</div>
				</div>

				<!-- Messages area -->
				<div
					bind:this={chatScrollEl}
					class="h-[280px] overflow-y-auto flex flex-col gap-2 mb-3 pr-0.5"
					style="scrollbar-width: thin; scrollbar-color: #2a2a2a transparent;"
				>
					{#if messagesLoading}
						{#each [1, 2, 3] as _, i (i)}
							<div class="h-8 rounded-2xl bg-[#1a1a1a] animate-pulse {i % 2 === 0 ? 'w-2/3 self-end' : 'w-1/2 self-start'}"></div>
						{/each}
					{:else if messages.length === 0}
						<div class="flex flex-col items-center gap-2 py-8 text-[#333]">
							<svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
							</svg>
							<p class="text-xs text-[#3a3a3a]">Henüz mesaj yok</p>
						</div>
					{:else}
						{#each messages as msg (msg.id)}
							{@const isMe = msg.senderId === authStore.userId}
							<div class="flex {isMe ? 'justify-end' : 'justify-start'}">
								<div class="max-w-[78%] px-3 py-2 rounded-2xl {isMe
									? 'bg-white text-black rounded-br-md'
									: 'bg-[#1e1e1e] text-white border border-[#252525] rounded-bl-md'}">
									<p class="text-xs leading-relaxed break-words">{msg.content}</p>
									<p class="text-[9px] mt-0.5 {isMe ? 'text-black/40' : 'text-[#444]'} text-right flex items-center justify-end gap-0.5">
										<span>{fmtMsgTime(msg.createdAt)}</span>
										{#if isMe}
											<span class="{msg.readAt ? 'text-blue-500' : 'text-black/30'}">{msg.readAt ? '✓✓' : '✓'}</span>
										{/if}
									</p>
								</div>
							</div>
						{/each}
					{/if}
				</div>

				<!-- Input row -->
				<div class="flex gap-2">
					<input
						bind:value={messageInput}
						onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
						placeholder="Mesaj yaz..."
						class="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-4 py-2 text-xs text-white placeholder-[#3a3a3a] focus:outline-none focus:border-[#333] transition-colors"
					/>
					<button
						type="button"
						aria-label="Gönder"
						onclick={sendMessage}
						disabled={!messageInput.trim()}
						class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black disabled:opacity-25 transition-opacity shrink-0"
					>
						<svg class="w-3.5 h-3.5 -mr-px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
						</svg>
					</button>
				</div>

			{:else}
				<!-- ── Users list ──────────────────────────────────────────── -->
				<div class="mb-4">
					<h3 class="text-base font-bold text-white">Mesajlar</h3>
					{#if !profilesLoading}
						<p class="text-xs text-[#555]">{allProfiles.length} kullanıcı</p>
					{/if}
				</div>
				<div class="mb-3">
					<SearchInput bind:value={chatSearch} placeholder="Kullanıcı ara..." />
				</div>

				{#if profilesLoading}
					{#each [1, 2, 3] as _, i (i)}
						<div class="h-14 rounded-2xl bg-[#1a1a1a] animate-pulse mb-2"></div>
					{/each}
				{:else if filteredProfiles.length === 0}
					<div class="flex flex-col items-center gap-2 py-8 text-[#444]">
						<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
						</svg>
						<p class="text-xs">
							{chatSearch.trim() ? 'Kullanıcı bulunamadı' : 'Başka kullanıcı yok'}
						</p>
					</div>
				{:else}
					<div class="flex flex-col gap-2">
						{#each filteredProfiles as profile (profile.id)}
							<button
								type="button"
								onclick={() => (selectedChat = { userId: profile.userId, profile })}
								class="flex items-center gap-3 w-full rounded-2xl bg-[#1a1a1a] border border-[#222] px-3 py-3 text-left transition-colors hover:bg-[#202020] hover:border-[#2a2a2a]"
							>
								<div class="w-9 h-9 rounded-full bg-[#222] border border-[#2a2a2a] flex items-center justify-center text-sm font-bold text-white shrink-0">
									{initials(profile)}
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-sm font-medium text-white truncate">{displayName(profile)}</p>
									{#if profile.email}
										<p class="text-xs text-[#555] truncate">{profile.email}</p>
									{/if}
								</div>
								{#if (unreadByUser[profile.userId] ?? 0) > 0}
									<span class="min-w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white px-1 shrink-0">
										{unreadByUser[profile.userId] > 9 ? '9+' : unreadByUser[profile.userId]}
									</span>
								{:else}
									<svg class="w-3.5 h-3.5 text-[#333] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<path d="M9 18l6-6-6-6"/>
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			{/if}

		<!-- ── PULSE ─────────────────────────────────────────────────────── -->
		{:else}
			<div class="mb-4">
				<h3 class="text-base font-bold text-white">Pulse</h3>
				<p class="text-xs text-[#555]">{activities.length} aktivite</p>
			</div>

			<!-- Bildirimler -->
			{#if !notificationsLoading && myNotifications.length > 0}
				<div class="mb-5">
					<p class="text-[10px] font-semibold text-[#444] uppercase tracking-wider mb-2">Bildirimler</p>
					<div class="flex flex-col gap-1.5">
						{#each myNotifications as notif (notif.id)}
							{@const isUnread = !notif.readAt}
							<div class="rounded-2xl border px-3 py-2.5 flex items-start gap-2.5
								{isUnread ? 'bg-[#1a1610] border-[#2d2510]' : 'bg-[#141414] border-[#1e1e1e]'}">
								<div class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5
									{isUnread ? 'bg-blue-900/50 text-blue-300' : 'bg-[#1e1e1e] text-[#555]'}">
									{(notif.actorName ?? notif.title ?? '?')[0]?.toUpperCase() ?? '?'}
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-xs leading-tight {isUnread ? 'text-white' : 'text-[#777]'}">
										<span class="font-semibold">{notif.title}</span>
									</p>
									<p class="text-[10px] text-[#555] truncate mt-0.5">{notif.body}</p>
									<p class="text-[10px] text-[#3a3a3a] mt-0.5">{relTime(notif.createdAt)}</p>
								</div>
								{#if isUnread}
									<div class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5"></div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Aktivite akışı -->
			<div class="flex flex-col gap-2">
				{#if activitiesLoading}
					{#each [1, 2, 3] as _, i (i)}
						<div class="h-16 rounded-2xl bg-[#1a1a1a] animate-pulse"></div>
					{/each}
				{:else if activities.length === 0}
					<div class="flex flex-col items-center gap-2 py-8 text-[#444]">
						<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
						</svg>
						<p class="text-xs">Henüz aktivite yok</p>
					</div>
				{:else}
					{#each activities as act (act.id)}
						<div class="bg-[#1a1a1a] rounded-2xl border border-[#1e1e1e] px-4 py-3 flex items-start gap-3">
							<div class="w-8 h-8 rounded-full bg-[#222] border border-[#2a2a2a] flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
								{(act.actorName ?? '?').split(' ').map((w: string) => w[0] ?? '').slice(0, 2).join('').toUpperCase()}
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-sm text-white leading-tight">
									<span class="font-semibold">{act.actorName ?? '—'}</span>
									<span class="text-[#888]">
										{#if act.description}
											&#32;{act.description}
										{:else}
											&#32;{activityLabel(act.type)}
										{/if}
									</span>
								</p>
								{#if act.relatedEntityNumber}
									<p class="text-[10px] text-[#555] mt-0.5 font-mono truncate">{act.relatedEntityNumber}</p>
								{/if}
								<p class="text-[10px] text-[#444] mt-0.5">{relTime(act.createdAt)}</p>
							</div>
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
