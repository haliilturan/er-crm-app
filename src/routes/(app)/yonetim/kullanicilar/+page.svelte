<script lang="ts">
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { db, id, tx } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import { SectionHead, Badge } from '$lib/components/ui';

	// ── Types ──────────────────────────────────────────────────────────────────

	type CompanyRow = { id: string; name: string };

	type MembershipRow = {
		id: string;
		role: string;
		userId?: string;
		companyId?: string;
		company?: CompanyRow;
	};

	type UserRow = {
		id: string;
		fullName?: string;
		email: string;
		department?: string;
		userId?: string;
		companyMemberships?: MembershipRow[];
	};

	// ── State ──────────────────────────────────────────────────────────────────

	let users           = $state<UserRow[]>([]);
	let activeCompanies = $state<CompanyRow[]>([]);
	let loading         = $state(false);

	// Edit modal
	let editUser        = $state<UserRow | null>(null);
	let editDepartment  = $state('');
	let editRole        = $state('member');
	let editCompanyIds  = new SvelteSet<string>();
	let saving          = $state(false);
	let saveError       = $state('');

	// Add modal
	let addModalOpen   = $state(false);
	let addFullName    = $state('');
	let addEmail       = $state('');
	let addPhone       = $state('');
	let addDepartment  = $state('');
	let addRole        = $state('member');
	let addCompanyIds  = new SvelteSet<string>();
	let addSaving      = $state(false);
	let addError       = $state('');

	// ── Queries ────────────────────────────────────────────────────────────────

	$effect(() => {
		if (!authStore.isAdmin) return;
		loading = true;
		return db.subscribeQuery(
			{
				userProfiles: {
					companyMemberships: {
						company: {}
					}
				}
			},
			(result) => {
				untrack(() => {
					users   = (result.data?.userProfiles ?? []) as UserRow[];
					loading = false;
				});
			}
		);
	});

	$effect(() => {
		return db.subscribeQuery(
			{ companies: { $: { where: { isActive: true } } } },
			(result) => {
				untrack(() => {
					activeCompanies = (result.data?.companies ?? []) as CompanyRow[];
				});
			}
		);
	});

	// ── Helpers ────────────────────────────────────────────────────────────────

	const DEPT_LABELS: Record<string, string> = {
		sales:      'Satış',
		finance:    'Finans',
		production: 'Üretim',
		purchasing: 'Satın Alma',
		warehouse:  'Depo',
		management: 'Yönetim'
	};

	const DEPT_OPTIONS = Object.entries(DEPT_LABELS).map(([value, label]) => ({ value, label }));

	const ROLE_LABELS: Record<string, string> = {
		admin:  'Admin',
		member: 'Üye',
		viewer: 'İzleyici'
	};

	function highestRole(memberships: MembershipRow[] = []): string {
		if (memberships.some((m) => m.role === 'admin'))  return 'admin';
		if (memberships.some((m) => m.role === 'member')) return 'member';
		if (memberships.some((m) => m.role === 'viewer')) return 'viewer';
		return '';
	}

	function roleBadgeVariant(role: string): 'success' | 'warning' | 'default' | 'info' {
		if (role === 'admin')  return 'warning';
		if (role === 'member') return 'info';
		return 'default';
	}

	function initials(name: string): string {
		return (name ?? '?').split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
	}

	// ── Edit modal ─────────────────────────────────────────────────────────────

	function openEdit(user: UserRow) {
		const memberships = user.companyMemberships ?? [];
		editUser       = user;
		editDepartment = user.department ?? '';
		editRole       = highestRole(memberships) || 'member';
		editCompanyIds.clear();
		memberships.map((m) => m.company?.id).filter((x): x is string => !!x)
			.forEach((cid) => editCompanyIds.add(cid));
		saveError = '';
	}

	function closeEdit() {
		editUser = null;
	}

	function toggleCompany(compId: string) {
		if (editCompanyIds.has(compId)) editCompanyIds.delete(compId);
		else editCompanyIds.add(compId);
	}

	function openAdd() {
		addFullName   = '';
		addEmail      = '';
		addPhone      = '';
		addDepartment = '';
		addRole       = 'member';
		addCompanyIds.clear();
		addError      = '';
		addModalOpen  = true;
	}

	function closeAdd() { addModalOpen = false; }

	function toggleAddCompany(compId: string) {
		if (addCompanyIds.has(compId)) addCompanyIds.delete(compId);
		else addCompanyIds.add(compId);
	}

	async function addUser() {
		if (addSaving) return;
		if (!addFullName.trim()) { addError = 'Ad Soyad zorunludur.'; return; }
		if (!addEmail.trim())    { addError = 'Email zorunludur.'; return; }
		if (addCompanyIds.size === 0) { addError = 'En az bir şirket seçiniz.'; return; }

		addSaving = true;
		addError  = '';

		try {
			const now       = Date.now();
			const profileId = id();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const ops: any[] = [];

			ops.push(
				tx.userProfiles[profileId].update({
					fullName:   addFullName.trim(),
					email:      addEmail.trim(),
					phone:      addPhone.trim() || undefined,
					department: addDepartment || undefined,
					createdAt:  now,
				})
			);

			// Try to find an existing auth-linked profile for this email so
			// userCompanies.userId is populated immediately rather than waiting
			// for the user's first login.
			const existingProfile = await db.queryOnce({
				userProfiles: { $: { where: { email: addEmail.trim().toLowerCase() } } }
			});
			const realUserId = (existingProfile.data?.userProfiles ?? [])[0]?.userId ?? '';

			for (const compId of addCompanyIds) {
				const ucId = id();
				ops.push(
					(tx.userCompanies[ucId]
						.update({
							userId:    realUserId, // userId will be backfilled by ensureProfile on first login
							companyId: compId,
							role:      addRole,
							joinedAt:  now,
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						}) as any)
						.link({ profile: profileId, company: compId })
				);
			}

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await db.transact(ops as any);
			closeAdd();
		} catch (err) {
			addError = err instanceof Error ? err.message : 'Bir hata oluştu.';
		} finally {
			addSaving = false;
		}
	}

	async function saveEdit() {
		if (!editUser || saving) return;
		saving    = true;
		saveError = '';

		try {
			const now = Date.now();
			const ops: ReturnType<typeof tx.userProfiles[string]['update']>[] = [];

			// 1. Departman güncelle
			ops.push(
				tx.userProfiles[editUser.id].update({
					department: editDepartment || undefined,
					updatedAt: now
				})
			);

			const existing    = editUser.companyMemberships ?? [];
			const existingMap = new Map(
				existing
					.filter((m) => !!m.company?.id)
					.map((m) => [m.company!.id, m])
			);

			// 2. Yeni şirket bağlantıları ekle
			for (const compId of editCompanyIds) {
				if (!existingMap.has(compId)) {
					const newUcId = id();
					ops.push(
						(tx.userCompanies[newUcId]
							.update({
								userId:    editUser.userId ?? '',
								companyId: compId,
								role:      editRole,
								joinedAt:  now
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
							}) as any)
							.link({ profile: editUser.id, company: compId })
					);
				} else {
					const mem = existingMap.get(compId)!;
					if (mem.role !== editRole) {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
					ops.push(tx.userCompanies[mem.id].update({ role: editRole }) as any);
					}
				}
			}

			// 3. Kaldırılan şirket bağlantılarını sil
			for (const [compId, mem] of existingMap) {
				if (!editCompanyIds.has(compId)) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					ops.push((tx.userCompanies[mem.id] as any).delete());
				}
			}

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await db.transact(ops as any);

			if (editUser.userId) {
				const ucResult = await db.queryOnce({
					userCompanies: { $: { where: { profile: editUser.id } } }
				});
				const ucRecords = (ucResult.data?.userCompanies ?? []) as { id: string; userId?: string }[];
				const ucOps = ucRecords
					.filter((uc) => !uc.userId)
					.map((uc) => tx.userCompanies[uc.id].update({ userId: editUser!.userId! }));
				if (ucOps.length > 0) {
					await db.transact(ucOps);
				}
			}

			closeEdit();
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'Bir hata oluştu.';
		} finally {
			saving = false;
		}
	}
</script>

<!-- ── Yetkisiz erişim ───────────────────────────────────────────────────────── -->
{#if !authStore.isAdmin}
	<div class="flex h-full items-center justify-center">
		<div class="text-center">
			<p class="text-base font-semibold text-[#ff4444]">Yetkisiz Erişim</p>
			<p class="mt-1 text-sm text-[#555]">Bu sayfayı görüntülemek için admin yetkisi gereklidir.</p>
		</div>
	</div>

{:else}
	<div class="flex h-full flex-col overflow-hidden">

		<!-- Header -->
		<div class="shrink-0 border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between gap-4">
			<SectionHead title="Kullanıcı Yönetimi" description="Kullanıcı rolleri, departmanlar ve şirket bağlantıları" />
			<button
				onclick={openAdd}
				class="shrink-0 rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-[#aaa] transition hover:border-[#444] hover:text-white"
			>
				+ Yeni Kullanıcı
			</button>
		</div>

		<!-- List -->
		<div class="flex-1 overflow-y-auto p-4" style="scrollbar-width: thin;">
			{#if loading}
				<div class="flex h-32 items-center justify-center">
					<div class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent opacity-30"></div>
				</div>

			{:else if users.length === 0}
				<div class="flex h-32 items-center justify-center text-sm text-[#555]">
					Kullanıcı bulunamadı.
				</div>

			{:else}
				<div class="flex flex-col gap-2 max-w-3xl">
					{#each users as user, i (user.id ?? `idx-${i}`)}
						{@const memberships = user.companyMemberships ?? []}
						{@const role = highestRole(memberships)}
						{@const isActive = memberships.length > 0}

						<div class="flex items-center justify-between gap-4 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-5 py-4">
							<!-- Avatar + info -->
							<div class="flex items-center gap-3 min-w-0">
								<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2a2a2a] text-xs font-bold text-[#888]">
									{initials(user.fullName ?? user.email)}
								</div>
								<div class="min-w-0">
									<p class="text-sm font-medium text-white truncate">
										{user.fullName ?? '—'}
									</p>
									<p class="text-xs text-[#555] truncate">{user.email}</p>
								</div>
							</div>

							<!-- Meta badges -->
							<div class="flex shrink-0 flex-wrap items-center gap-2">
								{#if user.department && DEPT_LABELS[user.department]}
									<span class="rounded bg-[#222] px-2 py-0.5 text-[10px] font-medium text-[#888]">
										{DEPT_LABELS[user.department]}
									</span>
								{/if}

								{#if role}
									<Badge label={ROLE_LABELS[role] ?? role} variant={roleBadgeVariant(role)} />
								{/if}

								<Badge
									label={isActive ? 'Aktif' : 'Pasif'}
									variant={isActive ? 'success' : 'default'}
								/>

								{#each memberships as mem, mi (mem.id ?? `idx-${mi}`)}
									{#if mem.company}
										<span class="rounded bg-[#1e1e2e] px-2 py-0.5 text-[10px] text-[#888]">
											{mem.company.name}
										</span>
									{/if}
								{/each}

								<button
									onclick={() => openEdit(user)}
									class="rounded-lg border border-[#2a2a2a] px-3 py-1 text-xs text-[#666] transition hover:border-[#444] hover:text-white"
								>
									Düzenle
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- ── Add Modal ─────────────────────────────────────────────────────────────── -->
{#if addModalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="Yeni Kullanıcı"
		tabindex="-1"
		onclick={closeAdd}
		onkeydown={(e) => e.key === 'Escape' && closeAdd()}
	>
		<div
			class="relative w-[440px] max-h-[85vh] flex flex-col rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl"
			role="presentation"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="shrink-0 flex items-center justify-between border-b border-[#2a2a2a] px-6 py-4">
				<p class="text-sm font-bold text-white">Yeni Kullanıcı</p>
				<button
					onclick={closeAdd}
					class="flex h-7 w-7 items-center justify-center rounded-full text-[#555] transition hover:bg-[#2a2a2a] hover:text-white"
					aria-label="Kapat"
				>
					<svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
						<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
					</svg>
				</button>
			</div>

			<!-- Body -->
			<div class="flex-1 overflow-y-auto p-6" style="scrollbar-width: thin;">
				<div class="flex flex-col gap-5">

					<!-- Ad Soyad -->
					<div>
						<label for="add-fullname" class="mb-1.5 block text-xs text-[#777]">Ad Soyad <span class="text-[#ff4444]">*</span></label>
						<input
							id="add-fullname"
							type="text"
							bind:value={addFullName}
							placeholder="Ahmet Yılmaz"
							class="w-full rounded-lg border border-[#2a2a2a] bg-[#111] px-3 py-2 text-sm text-white placeholder-[#444] focus:border-[#444] focus:outline-none"
						/>
					</div>

					<!-- Email -->
					<div>
						<label for="add-email" class="mb-1.5 block text-xs text-[#777]">Email <span class="text-[#ff4444]">*</span></label>
						<input
							id="add-email"
							type="email"
							bind:value={addEmail}
							placeholder="ahmet@sirket.com"
							class="w-full rounded-lg border border-[#2a2a2a] bg-[#111] px-3 py-2 text-sm text-white placeholder-[#444] focus:border-[#444] focus:outline-none"
						/>
					</div>

					<!-- Telefon -->
					<div>
						<label for="add-phone" class="mb-1.5 block text-xs text-[#777]">Telefon</label>
						<input
							id="add-phone"
							type="text"
							bind:value={addPhone}
							placeholder="+90 555 000 00 00"
							class="w-full rounded-lg border border-[#2a2a2a] bg-[#111] px-3 py-2 text-sm text-white placeholder-[#444] focus:border-[#444] focus:outline-none"
						/>
					</div>

					<!-- Departman -->
					<div>
						<label for="add-dept" class="mb-1.5 block text-xs text-[#777]">Departman</label>
						<select
							id="add-dept"
							bind:value={addDepartment}
							class="w-full rounded-lg border border-[#2a2a2a] bg-[#111] px-3 py-2 text-sm text-white focus:border-[#444] focus:outline-none"
						>
							<option value="">— Seçilmedi —</option>
							{#each DEPT_OPTIONS as opt (opt.value)}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					</div>

					<!-- Rol -->
					<div>
						<p class="mb-1.5 text-xs text-[#777]">Rol</p>
						<div class="flex gap-2">
							{#each ['admin', 'member', 'viewer'] as role (role)}
								<button
									type="button"
									onclick={() => (addRole = role)}
									class="flex-1 rounded-lg border py-2 text-xs font-medium transition
										{addRole === role
											? 'border-white bg-white text-black'
											: 'border-[#2a2a2a] text-[#666] hover:border-[#444] hover:text-white'}"
								>
									{ROLE_LABELS[role]}
								</button>
							{/each}
						</div>
					</div>

					<!-- Şirketler -->
					<div>
						<p class="mb-1.5 text-xs text-[#777]">Şirketler <span class="text-[#ff4444]">*</span></p>
						<div class="flex flex-col gap-2">
							{#each activeCompanies as company, ci (company.id ?? `idx-${ci}`)}
								<label class="flex cursor-pointer items-center gap-3 rounded-lg border border-[#2a2a2a] px-4 py-2.5 transition hover:border-[#444]">
									<input
										type="checkbox"
										checked={addCompanyIds.has(company.id)}
										onchange={() => toggleAddCompany(company.id)}
										class="h-4 w-4 accent-white"
									/>
									<span class="text-sm text-[#ccc]">{company.name}</span>
								</label>
							{/each}
							{#if activeCompanies.length === 0}
								<p class="text-xs text-[#555]">Aktif şirket bulunamadı.</p>
							{/if}
						</div>
					</div>

					{#if addError}
						<p class="text-xs text-[#ff4444]">{addError}</p>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="shrink-0 flex justify-end gap-2 border-t border-[#2a2a2a] px-6 py-4">
				<button
					onclick={closeAdd}
					class="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-[#aaa] transition hover:bg-[#222]"
				>
					İptal
				</button>
				<button
					onclick={addUser}
					disabled={addSaving}
					style={addSaving ? 'pointer-events: none' : ''}
					class="rounded-lg border border-white/20 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-[#e0e0e0] disabled:opacity-40"
				>
					{addSaving ? 'Kaydediliyor…' : 'Kullanıcı Ekle'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Edit Modal ────────────────────────────────────────────────────────────── -->
{#if editUser}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="Kullanıcı Düzenle"
		tabindex="-1"
		onclick={closeEdit}
		onkeydown={(e) => e.key === 'Escape' && closeEdit()}
	>
		<div
			class="relative w-[440px] max-h-[85vh] flex flex-col rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl"
			role="presentation"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Modal header -->
			<div class="shrink-0 flex items-center justify-between border-b border-[#2a2a2a] px-6 py-4">
				<div>
					<p class="text-sm font-bold text-white">{editUser.fullName ?? editUser.email}</p>
					<p class="text-xs text-[#555] mt-0.5">{editUser.email}</p>
				</div>
				<button
					onclick={closeEdit}
					class="flex h-7 w-7 items-center justify-center rounded-full text-[#555] transition hover:bg-[#2a2a2a] hover:text-white"
					aria-label="Kapat"
				>
					<svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
						<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
					</svg>
				</button>
			</div>

			<!-- Modal body -->
			<div class="flex-1 overflow-y-auto p-6" style="scrollbar-width: thin;">
				<div class="flex flex-col gap-5">

					<!-- Departman -->
					<div>
						<label for="edit-dept" class="mb-1.5 block text-xs text-[#777]">Departman</label>
						<select
							id="edit-dept"
							bind:value={editDepartment}
							class="w-full rounded-lg border border-[#2a2a2a] bg-[#111] px-3 py-2 text-sm text-white focus:border-[#444] focus:outline-none"
						>
							<option value="">— Seçilmedi —</option>
							{#each DEPT_OPTIONS as opt (opt.value)}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					</div>

					<!-- Rol -->
					<div>
						<p class="mb-1.5 text-xs text-[#777]">Rol</p>
						<div class="flex gap-2">
							{#each ['admin', 'member', 'viewer'] as role (role)}
								<button
									type="button"
									onclick={() => (editRole = role)}
									class="flex-1 rounded-lg border py-2 text-xs font-medium transition
										{editRole === role
											? 'border-white bg-white text-black'
											: 'border-[#2a2a2a] text-[#666] hover:border-[#444] hover:text-white'}"
								>
									{ROLE_LABELS[role]}
								</button>
							{/each}
						</div>
					</div>

					<!-- Şirket bağlantıları -->
					<div>
						<p class="mb-1.5 text-xs text-[#777]">Şirket Bağlantıları</p>
						<div class="flex flex-col gap-2">
							{#each activeCompanies as company, ci (company.id ?? `idx-${ci}`)}
								<label class="flex cursor-pointer items-center gap-3 rounded-lg border border-[#2a2a2a] px-4 py-2.5 transition hover:border-[#444]">
									<input
										type="checkbox"
										checked={editCompanyIds.has(company.id)}
										onchange={() => toggleCompany(company.id)}
										class="h-4 w-4 accent-white"
									/>
									<span class="text-sm text-[#ccc]">{company.name}</span>
								</label>
							{/each}
							{#if activeCompanies.length === 0}
								<p class="text-xs text-[#555]">Aktif şirket bulunamadı.</p>
							{/if}
						</div>
					</div>

					{#if saveError}
						<p class="text-xs text-[#ff4444]">{saveError}</p>
					{/if}
				</div>
			</div>

			<!-- Modal footer -->
			<div class="shrink-0 flex justify-end gap-2 border-t border-[#2a2a2a] px-6 py-4">
				<button
					onclick={closeEdit}
					class="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-[#aaa] transition hover:bg-[#222]"
				>
					İptal
				</button>
				<button
					onclick={saveEdit}
					disabled={saving}
					style={saving ? 'pointer-events: none' : ''}
					class="rounded-lg border border-white/20 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-[#e0e0e0] disabled:opacity-40"
				>
					{saving ? 'Kaydediliyor…' : 'Kaydet'}
				</button>
			</div>
		</div>
	</div>
{/if}
