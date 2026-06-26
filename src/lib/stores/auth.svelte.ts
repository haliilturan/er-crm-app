import { db, id, tx } from '$lib/instant';

export interface CompanyInfo {
	id: string;
	name: string;
	slug: string;
	logoUrl?: string;
	role: string;
}

interface UserProfile {
	id: string;
	email?: string;
	fullName?: string;
	userId?: string;
	department?: string;
	createdAt?: number;
}

let _userId     = $state<string | null>(null);
let _userEmail  = $state<string | null>(null);
let _ready      = $state(false);
let _companies  = $state<CompanyInfo[]>([]);
let _department = $state<string | null>(null);

let _unsubAuth:      (() => void) | null = null;
let _unsubCompanies: (() => void) | null = null;
let _unsubProfile:   (() => void) | null = null;

async function ensureProfile(uid: string, email: string): Promise<void> {
	try {
		const result = await db.queryOnce({
			userProfiles: { $: { where: { email } } }
		});
		const existing = (result.data?.userProfiles ?? [])[0];
		if (existing) {
			if (!existing.userId) {
				await db.transact([
					tx.userProfiles[existing.id].update({ userId: uid })
				]);
			}
			// Backfill userCompanies records that have empty userId
			const ucResult = await db.queryOnce({
				userCompanies: { $: { where: { profile: existing.id } } }
			});
			const ucRecords = (ucResult.data?.userCompanies ?? []) as { id: string; userId?: string }[];
			const ucOps = ucRecords
				.filter(uc => !uc.userId)
				.map(uc => tx.userCompanies[uc.id].update({ userId: uid }));
			if (ucOps.length > 0) {
				await db.transact(ucOps);
			}
			return;
		}

		const profileId = id();
		await db.transact([
			tx.userProfiles[profileId]
				.update({
					email,
					fullName: email.split('@')[0],
					userId:   uid,
					createdAt: Date.now()
				})
				.link({ user: uid })
		]);
	} catch (err) {
		console.error('[ensureProfile] error:', err);
	}
}

export const authStore = {
	get userId():    string | null  { return _userId; },
	get userEmail(): string | null  { return _userEmail; },
	get ready():     boolean        { return _ready; },
	get companies(): CompanyInfo[]  { return _companies; },
	get companyIds(): string[]      { return _companies.map((c) => c.id); },
	get isAdmin():         boolean         { return _companies.some((c) => c.role === 'admin'); },
	get isFinans():        boolean         { return _companies.some((c) => c.role === 'finans' || c.role === 'admin'); },
	get department():      string | null   { return _department; },
	get isFinansOrAdmin(): boolean         { return this.isAdmin || _department === 'finance'; },

	/** Sorgu yazarken kullanılacak şirket ID'si */
	get activeCompanyId(): string | null {
		return _companies[0]?.id ?? null;
	},

	init(): void {
		if (_unsubAuth) return;
		_unsubAuth = db.subscribeAuth((state) => {
			const uid   = state.user?.id ?? null;
			const email = state.user?.email ?? null;
			_userId    = uid;
			_userEmail = email;
			_ready     = true;

			if (uid && email) ensureProfile(uid, email);

			if (!uid) {
				_companies  = [];
				_department = null;
				_unsubCompanies?.();
				_unsubCompanies = null;
				_unsubProfile?.();
				_unsubProfile = null;
				return;
			}

			_unsubProfile?.();
			_unsubProfile = db.subscribeQuery(
				{ userProfiles: { $: { where: { email: email! } } } },
				(result) => {
					const profile = (result.data?.userProfiles ?? [])[0] as UserProfile;
					_department = profile?.department ?? null;
				}
			);

			_unsubCompanies?.();
			_unsubCompanies = db.subscribeQuery(
				{ userCompanies: { $: { where: { userId: uid } }, company: {} } },
				(result) => {
					if (result.error) return;
					const raw = (result.data?.userCompanies ?? []) as Array<{
						id: string;
						role: string;
						company?: { id: string; name: string; slug: string; logoUrl?: string };
					}>;
					_companies = raw
						.filter((m) => !!m.company)
						.map((m) => ({
							id:      m.company!.id,
							name:    m.company!.name,
							slug:    m.company!.slug,
							logoUrl: m.company!.logoUrl,
							role:    m.role
						}));
				}
			);
		});
	},

	destroy(): void {
		_unsubAuth?.();
		_unsubCompanies?.();
		_unsubProfile?.();
		_unsubAuth      = null;
		_unsubCompanies = null;
		_unsubProfile   = null;
		_userId     = null;
		_userEmail  = null;
		_ready      = false;
		_companies  = [];
		_department = null;
	}
};
