<script lang="ts">
	import { untrack } from 'svelte';
	import { SvelteDate } from 'svelte/reactivity';
	import { db } from '$lib/instant';
	import { nthBusinessDay } from '$lib/utils/date';
	import { authStore } from '$lib/stores/auth.svelte';
	import { Tabs, ListItemCard, SearchInput } from '$lib/components/ui';

	// ── Types ──────────────────────────────────────────────────────────────────

	type Profile = {
		id: string;
		fullName: string;
		photoUrl?: string;
		userId?: string;
	};

	type TaskItem = {
		id: string;
		type: string;
		title: string;
		description?: string;
		orderId?: string;
		relatedEntityId?: string;
		assignedTo: string;
		companyId: string;
		status: string;
		dueAt?: number;
		completedAt?: number;
		createdBy: string;
		createdAt: number;
	};

	type OrderLineItem = {
		id: string;
		productName: string;
		productSku?: string;
		unit: string;
		quantity: number;
		unitPrice: number;
		vatRate: number;
		lineTotalWithVat: number;
		lineTotal: number;
		isIncludedPart: boolean;
		sortOrder: number;
	};

	type OrderItem = {
		id: string;
		orderNumber: string;
		customerName?: string;
		companyId: string;
		status: string;
		currency: string;
		subtotal: number;
		totalVat: number;
		totalWithVat: number;
		assignedTo: string;
		createdBy: string;
		createdAt: number;
		notes?: string;
		customer?: { id: string; name: string };
		items?: OrderLineItem[];
	};

	type OverdueItem = {
		id: string;
		_kind: 'overdue';
		createdAt: number;
		assignedTo: string;
		title: string;
	};

	type CompletedItem = {
		id: string;
		_kind: 'completed';
		createdAt: number;
		actorId: string;
		actorName: string;
		description: string;
	};

	type FeedItem =
		| ((TaskItem | OrderItem) & { _kind: 'task' | 'order' })
		| OverdueItem
		| CompletedItem;

	// ── State ──────────────────────────────────────────────────────────────────

	let tasks    = $state<TaskItem[]>([]);
	let completedEvents = $state<{ id: string; actorId: string; actorName: string; description: string; createdAt: number }[]>([]);
	let orders   = $state<OrderItem[]>([]);
	let userList = $state<{ userId: string; role: string; profile: Profile }[]>([]);
	let loading  = $state(true);

	// Filtreler
	let selectedUserId = $state<string | null>(null);
	let userSearch     = $state('');
	let activeTab      = $state<'offers' | 'orders' | 'tasks'>('tasks');
	let modalOpen      = $state(false);
	let modalOrder     = $state<OrderItem | null>(null);

	// Pagination
	const PAGE_SIZE = 10;
	let currentPage = $state(1);

	// Search debounce
	let debouncedUserSearch = $state('');

	function closeModal() {
		modalOpen  = false;
		modalOrder = null;
	}

	// Tarih yardımcıları
	function todayLocal(): Date {
		const d = new SvelteDate();
		d.setHours(0, 0, 0, 0);
		return d;
	}

	function dateKey(d: Date): string {
		const y  = d.getFullYear();
		const m  = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${dd}`;
	}

	let selectedDate = $state<string>(dateKey(todayLocal()));

	const _ws = todayLocal();
	_ws.setDate(_ws.getDate() - 2);
	let windowStart = $state<Date>(_ws);

	function shiftWindow(dir: -1 | 1) {
		const d = new SvelteDate(windowStart);
		d.setDate(d.getDate() + dir * 7);
		windowStart = d;
	}

	// ── Derived ────────────────────────────────────────────────────────────────

	let companyIds = $derived(authStore.companyIds);

	const visibleDays = $derived((() => {
		const days: { date: Date; key: string; label: string; dayName: string }[] = [];
		for (let i = 0; i < 7; i++) {
			const d = new SvelteDate(windowStart);
			d.setDate(d.getDate() + i);
			const key     = dateKey(d);
			const dayName = d.toLocaleDateString('tr-TR', { weekday: 'short' }).toUpperCase().slice(0, 2);
			const label   = String(d.getDate());
			days.push({ date: d, key, label, dayName });
		}
		return days;
	})());

	const profileByUserId = $derived(
		Object.fromEntries(userList.map(u => [u.userId, u.profile]))
	);

	const orderById = $derived(
		Object.fromEntries(orders.map(o => [o.id, o]))
	);

	const visibleUsers = $derived(
		userList
			.filter(u => {
				if (!debouncedUserSearch) return true;
				return (u.profile?.fullName ?? '').toLowerCase().includes(debouncedUserSearch.toLowerCase());
			})
			.sort((a, b) =>
				(a.profile?.fullName ?? '').localeCompare(b.profile?.fullName ?? '', 'tr')
			)
	);

	const feedItems = $derived((() => {
		const items: FeedItem[] = [];

		function matchesDate(ts: number): boolean {
			return dateKey(new Date(ts)) === selectedDate;
		}

		function matchesUser(userId: string): boolean {
			if (!selectedUserId) return true;
			return userId === selectedUserId;
		}

		if (activeTab === 'offers') {
			orders
				.filter(o => ['draft', 'pending_finance'].includes(o.status))
				.filter(o => matchesDate(o.createdAt) && matchesUser(o.assignedTo))
				.forEach(o => items.push({ ...o, _kind: 'order' as const }));
		} else if (activeTab === 'orders') {
			orders
				.filter(o => ['in_production', 'shipped', 'completed', 'cancelled'].includes(o.status))
				.filter(o => matchesDate(o.createdAt) && matchesUser(o.assignedTo))
				.forEach(o => items.push({ ...o, _kind: 'order' as const }));
		} else {
			tasks
				.filter(t => t.status !== 'done' && matchesDate(t.completedAt ?? t.createdAt) && matchesUser(t.assignedTo))
				.forEach(t => items.push({ ...t, _kind: 'task' as const }));

			// Tamamlanan görev olayları — activityFeed (Pulse ile aynı kayıtlar).
			// Done kartı yerine "X ... tamamladı" olay satırı.
			completedEvents
				.filter(a => matchesDate(a.createdAt) && matchesUser(a.actorId))
				.forEach(a => items.push({
					id:          'completed-' + a.id,
					_kind:       'completed' as const,
					createdAt:   a.createdAt,
					actorId:     a.actorId,
					actorName:   a.actorName,
					description: a.description
				}));

			// Gecikme bildirimi: 8. iş gününde hâlâ pending görev için sentetik satır.
			// Canlı türetme (yazma yok); gelecek gün tahmini üretilmez.
			const todayKey = dateKey(todayLocal());
			tasks
				.filter(t => t.status === 'pending' && matchesUser(t.assignedTo))
				.forEach(t => {
					const oDay = nthBusinessDay(t.createdAt, 8);
					const oKey = dateKey(oDay);
					if (oKey === selectedDate && oKey <= todayKey) {
						items.push({
							id:         'overdue-' + t.id,
							_kind:      'overdue' as const,
							createdAt:  oDay.getTime(),
							assignedTo: t.assignedTo,
							title:      t.title
						});
					}
				});
		}

		const sorted = items.sort((a, b) => b.createdAt - a.createdAt);
		return [...new Map(sorted.map(i => [i.id, i])).values()];
	})());

	const totalPages     = $derived(Math.max(1, Math.ceil(feedItems.length / PAGE_SIZE)));
	const pagedFeedItems = $derived(feedItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));

	// ── Subscription ──────────────────────────────────────────────────────────

	$effect(() => {
		const cIds = companyIds;
		if (!cIds.length) return;
		loading = true;

		return db.subscribeQuery(
			{
				tasks: {
					$: { where: { companyId: { in: cIds } }, order: { createdAt: 'desc' } }
				},
				orders: {
					$: { where: { companyId: { in: cIds } }, order: { createdAt: 'desc' } },
					customer: {},
					items: {}
				},
				userCompanies: {
					$: { where: { companyId: { in: cIds } } },
					profile: {}
				},
				activityFeed: {
					$: { where: { type: 'task_completed', companyId: { in: cIds } }, order: { createdAt: 'desc' } }
				}
			},
			(result) => {
				untrack(() => {
					const rawTasks  = (result.data?.tasks  ?? []) as TaskItem[];
					const rawOrders = (result.data?.orders ?? []) as OrderItem[];
					tasks  = [...new Map(rawTasks.map(t => [t.id, t])).values()];
					orders = [...new Map(rawOrders.map(o => [o.id, o])).values()];

					const uc = (result.data?.userCompanies ?? []) as {
						userId:   string;
						role:     string;
						profile?: Profile;
					}[];
					const rawUsers = uc
						.filter(u => !!u.profile)
						.map(u => ({ userId: u.userId, role: u.role, profile: u.profile! }));
					userList = [...new Map(rawUsers.map(u => [u.userId, u])).values()];

					const rawActs = (result.data?.activityFeed ?? []) as {
						id: string; actorId: string; actorName: string; description?: string; createdAt: number;
					}[];
					completedEvents = rawActs.map(a => ({
						id: a.id, actorId: a.actorId, actorName: a.actorName, description: a.description ?? '', createdAt: a.createdAt
					}));

					loading = false;
				});
			}
		);
	});

	// Debounce userSearch — min 3 karakter
	$effect(() => {
		const val = userSearch;
		const t = setTimeout(() => {
			debouncedUserSearch = val.length >= 3 ? val : '';
		}, 300);
		return () => clearTimeout(t);
	});

	// Filtre değişince sayfa 1'e dön
	$effect(() => {
		void feedItems;
		untrack(() => { currentPage = 1; });
	});

	// ── Helpers ───────────────────────────────────────────────────────────────

	function initials(name: string): string {
		return (name ?? '?')
			.trim()
			.split(/\s+/)
			.map(w => w[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	function fmtStamp(ts: number): string {
		return new Date(ts).toLocaleDateString('tr-TR', {
			day: '2-digit', month: 'short',
			hour: '2-digit', minute: '2-digit'
		});
	}

	function fmt(n: number, currency = 'TRY'): string {
		const sym: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' };
		return `${sym[currency] ?? ''}${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	}

	const ORDER_STATUS: Record<string, { label: string }> = {
		draft:           { label: 'Taslak'       },
		pending_finance: { label: 'Finans Onayı' },
		in_production:   { label: 'Üretimde'     },
		shipped:         { label: 'Kargoda'      },
		completed:       { label: 'Tamamlandı'   },
		cancelled:       { label: 'İptal'        }
	};

	const TASK_TYPE_LABEL: Record<string, string> = {
		order_submitted: 'Teklif Gönderildi',
		order_approved:  'Sipariş Onaylandı',
		order_cancelled: 'Sipariş İptal',
		order_shipped:   'Kargoya Verildi',
		order_tracking:  'Takip',
		manual:          'Görev'
	};

	const TABS = [
		{ value: 'offers', label: 'Teklifler'  },
		{ value: 'orders', label: 'Siparişler' },
		{ value: 'tasks',  label: 'Görevler'   }
	];
</script>

<!-- ════════════════════════════════════════════════════════════════════════ -->
<div class="page">

	<!-- Sol: Kullanıcılar -->
	<div class="users-panel">
		<div class="users-head">
			<p class="users-title">Ekip</p>
		</div>
		<div class="users-search">
			<SearchInput bind:value={userSearch} placeholder="İsim ara..." />
		</div>
		<div class="users-list">
			<ListItemCard
				title="Tümü"
				avatarText="∗"
				variant="avatar"
				active={selectedUserId === null}
				onclick={() => (selectedUserId = null)}
			/>
			{#each visibleUsers as u (u.userId)}
				<ListItemCard
					title={u.profile?.fullName ?? 'Personel'}
					description={u.role === 'admin' ? 'Yönetici' : u.role === 'viewer' ? 'İzleyici' : 'Üye'}
					avatarText={initials(u.profile?.fullName ?? '?')}
					variant="avatar"
					active={selectedUserId === u.userId}
					onclick={() => (selectedUserId = u.userId)}
				/>
			{/each}
		</div>
	</div>

	<!-- Sağ: Feed -->
	<div class="feed-panel">

		<!-- TaskDate strip — yatay tarih seçici -->
		<div class="date-strip">
			<button class="date-nav" onclick={() => shiftWindow(-1)} type="button">‹</button>
			<div class="date-days">
				{#each visibleDays as day (day.key)}
					<button
						class="date-day"
						class:active={day.key === selectedDate}
						class:today={day.key === dateKey(todayLocal())}
						onclick={() => (selectedDate = day.key)}
						type="button"
					>
						<span class="day-name">{day.dayName}</span>
						<span class="day-num">{day.label}</span>
					</button>
				{/each}
			</div>
			<button class="date-nav" onclick={() => shiftWindow(1)} type="button">›</button>
		</div>

		<!-- Tab satırı -->
		<div class="tabs-row">
			<Tabs
				tabs={TABS}
				value={activeTab}
				onchange={(tab) => { activeTab = tab.value as typeof activeTab; }}
			/>
		</div>

		<!-- Feed listesi -->
		<div class="feed-list">
			{#if loading}
				{#each Array.from({length: 5}, (_, i) => i) as i (i)}
					<div class="skeleton"></div>
				{/each}
			{:else if feedItems.length === 0}
				<div class="empty-state">Bu tarihte kayıt yok</div>
			{:else}
				{#each pagedFeedItems as item (item._kind + '-' + item.id)}
					{#if item._kind === 'overdue'}
						{@const oname = profileByUserId[item.assignedTo]?.fullName ?? 'Personel'}
						<div class="news-card overdue">
							<div class="card-main">
								<span class="avatar overdue-avatar">{initials(oname)}</span>
								<span class="card-body">
									<span class="card-row">
										<span class="card-name">{oname}</span>
										<span class="card-meta">{fmtStamp(item.createdAt)}</span>
									</span>
									<span class="card-sub overdue-text">
										<strong>{oname}</strong>, {item.title} görevini yapmadı
									</span>
								</span>
							</div>
						</div>
					{:else if item._kind === 'completed'}
						{@const cname = item.actorName || 'Personel'}
						<div class="news-card completed">
							<div class="card-main">
								<span class="avatar completed-avatar">{initials(cname)}</span>
								<span class="card-body">
									<span class="card-row">
										<span class="card-name">{cname}</span>
										<span class="card-meta">{fmtStamp(item.createdAt)}</span>
									</span>
									<span class="card-sub completed-text">
										<strong>{cname}</strong> {item.description}
									</span>
								</span>
							</div>
						</div>
					{:else}
					{@const profile  = profileByUserId[item.createdBy]}
					{@const name     = profile?.fullName ?? 'Personel'}

					<div class="news-card">

						<div class="card-main">
							<span class="avatar">{initials(name)}</span>

							<span class="card-body">
								<span class="card-row">
									<span class="card-name">{name}</span>
									<span class="card-meta">{fmtStamp(item.createdAt)}</span>
								</span>
								<span class="card-row">
									{#if item._kind === 'task'}
										{@const t = item as TaskItem & { _kind: 'task' }}
										{@const relOrder = t.orderId ? orderById[t.orderId] : null}
										<span class="card-sub">
											{TASK_TYPE_LABEL[t.type] ?? t.title}
											{#if relOrder}
												· {relOrder.customerName ?? relOrder.customer?.name ?? ''}
											{/if}
										</span>
										<span class="card-tag" class:done={t.status === 'done'}>
											{t.status === 'done' ? 'Tamamlandı' : t.status === 'dismissed' ? 'Reddedildi' : 'Bekliyor'}
										</span>
									{:else}
										{@const o = item as OrderItem & { _kind: 'order' }}
										<span class="card-sub">
											{o.customerName ?? o.customer?.name ?? '—'} · {fmt(o.totalWithVat, o.currency)}
										</span>
										<span class="card-tag">
											{ORDER_STATUS[o.status]?.label ?? o.status}
										</span>
									{/if}
								</span>
								{#if item._kind === 'task' && (item as TaskItem).description}
									<span class="card-desc">{(item as TaskItem).description}</span>
								{/if}
							</span>
						</div>

					</div>
					{/if}
				{/each}
				{#if totalPages > 1}
					<div class="pagination">
						<button
							class="date-nav"
							type="button"
							disabled={currentPage === 1}
							onclick={() => (currentPage -= 1)}
						>‹</button>
						<span class="pag-info">{currentPage} / {totalPages}</span>
						<button
							class="date-nav"
							type="button"
							disabled={currentPage === totalPages}
							onclick={() => (currentPage += 1)}
						>›</button>
					</div>
				{/if}
			{/if}
		</div>

	</div>

	{#if modalOpen && modalOrder}
		{@const o = modalOrder}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal-backdrop" onclick={closeModal}>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div class="modal-box" onclick={(e) => e.stopPropagation()}>

				<div class="modal-header">
					<div class="modal-title">
						<span class="modal-order-num">{o.orderNumber}</span>
						<span class="modal-customer">{o.customer?.name ?? o.customerName ?? '—'}</span>
					</div>
					<button class="modal-close" type="button" onclick={closeModal}>✕</button>
				</div>

				<div class="modal-meta">
					<span class="meta-badge status-{o.status}">{ORDER_STATUS[o.status]?.label ?? o.status}</span>
					<span class="meta-currency">{o.currency}</span>
					{#if o.notes}
						<span class="meta-notes">{o.notes}</span>
					{/if}
				</div>

				{#if o.items && o.items.length > 0}
					<div class="modal-table-wrap">
						<table class="modal-table">
							<thead>
								<tr>
									<th>Ürün</th>
									<th>SKU</th>
									<th class="num">Miktar</th>
									<th class="num">Birim Fiyat</th>
									<th class="num">KDV %</th>
									<th class="num">Toplam</th>
								</tr>
							</thead>
							<tbody>
								{#each o.items.filter(i => !i.isIncludedPart).sort((a, b) => a.sortOrder - b.sortOrder) as row (row.id)}
									<tr>
										<td>{row.productName}</td>
										<td class="sku">{row.productSku ?? '—'}</td>
										<td class="num">{row.quantity} {row.unit}</td>
										<td class="num">{row.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
										<td class="num">%{row.vatRate}</td>
										<td class="num">{row.lineTotalWithVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="modal-empty">Kalem bilgisi yükleniyor...</p>
				{/if}

				<div class="modal-totals">
					<div class="totals-row">
						<span>Ara Toplam</span>
						<span>{(o.subtotal ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {o.currency}</span>
					</div>
					<div class="totals-row">
						<span>KDV</span>
						<span>{(o.totalVat ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {o.currency}</span>
					</div>
					<div class="totals-row grand">
						<span>Genel Toplam</span>
						<span>{o.totalWithVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {o.currency}</span>
					</div>
				</div>

			</div>
		</div>
	{/if}

</div>

<style>
.page {
	/* ── Design tokens ──────────────────────────────────────────────── */
	--border:          #1e1e1e;
	--bg:              #0a0a0a;
	--surface-muted:   #1a1a1a;
	--surface-hover:   #222;
	--list-item:       #141414;
	--list-item-hover: #1c1c1c;
	--tabs-active:     #222;
	--text-title:      #fff;
	--text-body:       #d1d5db;
	--text-faint:      #666;
	--text-tab-active: #fff;
	--accent:          #6366f1;
	--success:         #22c55e;
	--radius-card:     12px;
	--radius-md:       8px;
	--radius-pill:     999px;
	--s-2:             2px;
	--s-4:             4px;
	--s-6:             6px;
	--s-8:             8px;
	--s-10:            10px;
	--s-12:            12px;
	--s-14:            14px;
	--s-16:            16px;
	--s-18:            18px;
	--s-20:            20px;
	--s-24:            24px;
	--s-28:            28px;
	--s-32:            32px;
	--s-40:            40px;
	--fs-3xs:          9px;
	--fs-xs:           11px;
	--fs-sm:           12px;
	--fs-body:         13px;
	--fs-card-title:   14px;
	--fs-lg:           18px;

	/* ── Layout ─────────────────────────────────────────────────────── */
	display: flex;
	height: 100%;
	overflow: hidden;
}

/* ── Sol panel ──────────────────────────────────────────────────── */
.users-panel {
	width: 240px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	border-right: 1px solid var(--border);
	overflow: hidden;
}

.users-head {
	padding: var(--s-18) var(--s-20);
	border-bottom: 1px solid var(--border);
	flex-shrink: 0;
}

.users-title {
	font-size: var(--fs-card-title);
	font-weight: 700;
	color: var(--text-title);
	margin: 0;
}

.users-search {
	padding: var(--s-10) var(--s-12);
	border-bottom: 1px solid var(--border);
	flex-shrink: 0;
}

.users-list {
	flex: 1;
	overflow-y: auto;
	padding: var(--s-8);
	display: flex;
	flex-direction: column;
	gap: var(--s-2);
	scrollbar-width: thin;
}

/* ── Sağ panel ──────────────────────────────────────────────────── */
.feed-panel {
	flex: 1;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

/* ── Date strip ─────────────────────────────────────────────────── */
.date-strip {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--s-4);
	padding: var(--s-12) var(--s-16);
	border-bottom: 1px solid var(--border);
	flex-shrink: 0;
}

.date-nav {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--s-32);
	height: var(--s-32);
	border: 0;
	background: transparent;
	color: var(--text-faint);
	font-size: var(--fs-lg);
	cursor: pointer;
	border-radius: var(--radius-md);
	transition: background-color 0.15s ease, color 0.15s ease;
}

.date-nav:hover {
	background: var(--surface-hover);
	color: var(--text-title);
}

.date-nav:disabled {
	opacity: 0.3;
	cursor: default;
	pointer-events: none;
}

.date-days {
	display: flex;
	gap: var(--s-4);
	justify-content: center;
}

.date-day {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--s-2);
	padding: var(--s-6) var(--s-10);
	border: 0;
	background: transparent;
	border-radius: var(--radius-card);
	cursor: pointer;
	transition: background-color 0.15s ease;
	min-width: 48px;
}

.date-day:hover { background: var(--surface-hover); }
.date-day.active { background: var(--tabs-active); }

.day-name {
	font-size: var(--fs-3xs);
	font-weight: 700;
	color: var(--text-faint);
	letter-spacing: 0.05em;
}

.date-day.active .day-name { color: var(--text-tab-active); }

.day-num {
	font-size: var(--fs-lg);
	font-weight: 700;
	color: var(--text-body);
	line-height: 1;
}

.date-day.active .day-num               { color: var(--text-tab-active); }
.date-day.today:not(.active) .day-num   { color: var(--accent); }

/* ── Tabs ───────────────────────────────────────────────────────── */
.tabs-row {
	padding: var(--s-10) var(--s-16);
	border-bottom: 1px solid var(--border);
	flex-shrink: 0;
}

/* ── Feed list ──────────────────────────────────────────────────── */
.feed-list {
	flex: 1;
	overflow-y: auto;
	padding: var(--s-12);
	display: flex;
	flex-direction: column;
	gap: var(--s-6);
	scrollbar-width: thin;
}

/* ── News card ──────────────────────────────────────────────────── */
.news-card {
	background: var(--list-item);
	border-radius: var(--radius-card);
	overflow: hidden;
	transition: background-color 0.15s ease;
}

.news-card:hover,
.news-card.expanded {
	background: var(--list-item-hover);
}

.card-main {
	display: flex;
	align-items: flex-start;
	gap: var(--s-14);
	width: 100%;
	text-align: left;
	border: 0;
	background: transparent;
	color: inherit;
	padding: var(--s-14) var(--s-16);
	cursor: pointer;
}

.avatar {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--s-40);
	height: var(--s-40);
	border-radius: 50%;
	background: var(--surface-muted);
	color: var(--text-tab-active);
	font-size: var(--fs-xs);
	font-weight: 700;
	flex-shrink: 0;
}

.card-body {
	display: flex;
	flex-direction: column;
	gap: var(--s-4);
	min-width: 0;
	flex: 1;
}

.card-row {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: var(--s-8);
}

.card-name {
	font-weight: 700;
	font-size: var(--fs-card-title);
	color: var(--text-title);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.card-meta {
	font-size: var(--fs-xs);
	color: var(--text-faint);
	white-space: nowrap;
	flex-shrink: 0;
}

.card-sub {
	font-size: var(--fs-body);
	color: var(--text-body);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.card-tag {
	font-size: var(--fs-3xs);
	font-weight: 700;
	padding: var(--s-2) var(--s-8);
	border-radius: var(--radius-pill);
	background: var(--surface-muted);
	color: var(--text-body);
	white-space: nowrap;
	flex-shrink: 0;
}

.card-tag.done {
	background: color-mix(in srgb, var(--success) 15%, transparent);
	color: var(--success);
}

.card-desc {
	font-size: var(--fs-sm);
	color: var(--text-faint);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* ── Gecikme (overdue) satırı ───────────────────────────────────── */
.news-card.overdue {
	background: color-mix(in srgb, #ef4444 8%, var(--list-item));
}
.news-card.overdue:hover {
	background: color-mix(in srgb, #ef4444 14%, var(--list-item));
}
.overdue-avatar {
	background: color-mix(in srgb, #ef4444 20%, var(--surface-muted));
	color: #fecaca;
}
.overdue-text {
	color: #f87171;
}

/* ── Tamamlandı (completed) satırı — overdue'nun pozitif kardeşi ─── */
.news-card.completed {
	background: color-mix(in srgb, var(--success) 8%, var(--list-item));
}
.news-card.completed:hover {
	background: color-mix(in srgb, var(--success) 14%, var(--list-item));
}
.completed-avatar {
	background: color-mix(in srgb, var(--success) 20%, var(--surface-muted));
	color: #bbf7d0;
}
.completed-text {
	color: var(--success);
}

/* ── Card actions ───────────────────────────────────────────────── */
.card-actions {
	display: flex;
	align-items: center;
	gap: var(--s-8);
	padding: var(--s-10) var(--s-16);
	border-top: 1px solid var(--border);
}

.action-btn {
	padding: var(--s-6) var(--s-16);
	border-radius: var(--radius-pill);
	border: 0;
	font-weight: 700;
	font-size: var(--fs-sm);
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.action-btn.primary         { background: var(--text-title); color: var(--bg); }
.action-btn.primary:hover   { opacity: 0.85; }
.action-btn.ghost           { background: var(--surface-muted); color: var(--text-body); }
.action-btn.ghost:hover     { background: var(--surface-hover); }

.ml-auto { margin-left: auto; }

.action-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--s-32);
	height: var(--s-32);
	border-radius: 50%;
	border: 0;
	background: var(--surface-muted);
	cursor: pointer;
	font-size: var(--fs-sm);
	transition: background-color 0.15s ease;
}

.action-icon:hover { background: var(--surface-hover); }

.action-num {
	font-size: var(--fs-xs);
	color: var(--text-faint);
	font-family: monospace;
}

/* ── Pagination ─────────────────────────────────────────────────── */
.pagination {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--s-8);
	padding: var(--s-12) 0 var(--s-4);
	flex-shrink: 0;
}

.pag-info {
	font-size: var(--fs-sm);
	color: var(--text-faint);
	min-width: 52px;
	text-align: center;
}

/* ── Skeleton / empty ───────────────────────────────────────────── */
.skeleton {
	height: 72px;
	border-radius: var(--radius-card);
	background: var(--list-item);
	animation: pulse 1.4s ease-in-out infinite;
	flex-shrink: 0;
}

.empty-state {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 160px;
	font-size: var(--fs-sm);
	color: var(--text-faint);
}

@keyframes pulse {
	0%, 100% { opacity: 1;   }
	50%       { opacity: 0.4; }
}

/* ── Order Detail Modal ─────────────────────────────────────────── */
.modal-backdrop {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.72);
	z-index: 200;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--s-16);
}

.modal-box {
	background: #111;
	border: 1px solid var(--border);
	border-radius: var(--radius-card);
	width: 100%;
	max-width: 720px;
	max-height: 88vh;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: var(--s-16);
	padding: var(--s-20);
}

.modal-header {
	display: flex;
	align-items: flex-start;
	gap: var(--s-12);
}

.modal-title {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--s-4);
}

.modal-order-num {
	font-size: var(--fs-xs);
	font-family: monospace;
	color: var(--accent);
}

.modal-customer {
	font-size: var(--fs-card-title);
	font-weight: 600;
	color: var(--text-title);
}

.modal-close {
	width: var(--s-28);
	height: var(--s-28);
	border-radius: 50%;
	border: 0;
	background: var(--surface-muted);
	color: var(--text-body);
	cursor: pointer;
	font-size: var(--fs-sm);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}
.modal-close:hover { background: var(--surface-hover); }

.modal-meta {
	display: flex;
	align-items: center;
	gap: var(--s-8);
	flex-wrap: wrap;
}

.meta-badge {
	font-size: var(--fs-xs);
	padding: var(--s-2) var(--s-8);
	border-radius: var(--radius-pill);
	background: var(--surface-muted);
	color: var(--text-body);
}
.meta-currency {
	font-size: var(--fs-xs);
	color: var(--text-faint);
	font-family: monospace;
}
.meta-notes {
	font-size: var(--fs-xs);
	color: var(--text-faint);
	font-style: italic;
}

.modal-table-wrap {
	overflow-x: auto;
	border-radius: var(--radius-md);
	border: 1px solid var(--border);
}

.modal-table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--fs-sm);
}

.modal-table th,
.modal-table td {
	padding: var(--s-8) var(--s-12);
	text-align: left;
	border-bottom: 1px solid var(--border);
	color: var(--text-body);
	white-space: nowrap;
}

.modal-table th {
	font-size: var(--fs-xs);
	color: var(--text-faint);
	text-transform: uppercase;
	letter-spacing: 0.04em;
	background: var(--surface-muted);
}

.modal-table tbody tr:last-child td { border-bottom: 0; }
.modal-table tbody tr:hover td { background: var(--surface-muted); }
.modal-table .num { text-align: right; }
.modal-table .sku { font-family: monospace; color: var(--text-faint); }

.modal-empty {
	font-size: var(--fs-sm);
	color: var(--text-faint);
	text-align: center;
	padding: var(--s-24) 0;
}

.modal-totals {
	display: flex;
	flex-direction: column;
	gap: var(--s-6);
	border-top: 1px solid var(--border);
	padding-top: var(--s-12);
}

.totals-row {
	display: flex;
	justify-content: space-between;
	font-size: var(--fs-sm);
	color: var(--text-body);
}

.totals-row.grand {
	font-size: var(--fs-card-title);
	font-weight: 600;
	color: var(--text-title);
	padding-top: var(--s-6);
	border-top: 1px solid var(--border);
}
</style>
