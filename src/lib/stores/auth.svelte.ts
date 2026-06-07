import { db } from '$lib/instant';

export interface CompanyInfo {
	id: string;
	name: string;
	slug: string;
	logoUrl?: string;
	role: string;
}

let _userId    = $state<string | null>(null);
let _userEmail = $state<string | null>(null);
let _ready     = $state(false);
let _companies = $state<CompanyInfo[]>([]);
let _filter    = $state<string | 'all'>('all');

let _unsubAuth:      (() => void) | null = null;
let _unsubCompanies: (() => void) | null = null;

export const authStore = {
	get userId():    string | null  { return _userId; },
	get userEmail(): string | null  { return _userEmail; },
	get ready():     boolean        { return _ready; },
	get companies(): CompanyInfo[]  { return _companies; },
	get companyIds(): string[]      { return _companies.map((c) => c.id); },
	get activeFilter(): string | 'all' { return _filter; },
	get isAdmin(): boolean { return _companies.some((c) => c.role === 'admin'); },

	/** Sorgu yazarken kullanılacak şirket ID'si (filtre seçiliyse o, yoksa ilk) */
	get activeCompanyId(): string | null {
		if (_filter !== 'all') return _filter;
		return _companies[0]?.id ?? null;
	},

	init(): void {
		if (_unsubAuth) return;
		_unsubAuth = db.subscribeAuth((state) => {
			const uid = state.user?.id ?? null;
			_userId    = uid;
			_userEmail = state.user?.email ?? null;
			_ready     = true;

			if (!uid) {
				_companies = [];
				_unsubCompanies?.();
				_unsubCompanies = null;
				return;
			}

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

	setFilter(id: string | 'all'): void {
		_filter = id;
	},

	destroy(): void {
		_unsubAuth?.();
		_unsubCompanies?.();
		_unsubAuth      = null;
		_unsubCompanies = null;
		_userId    = null;
		_userEmail = null;
		_ready     = false;
		_companies = [];
		_filter    = 'all';
	}
};
