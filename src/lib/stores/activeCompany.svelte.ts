import { browser } from '$app/environment';

const STORAGE_KEY = 'erp_active_company_id';

export interface CompanyInfo {
	id: string;
	name: string;
	slug: string;
	logoUrl?: string;
	role: string;
}

let _current = $state<CompanyInfo | null>(null);

function loadStoredId(): string | null {
	if (!browser) return null;
	return localStorage.getItem(STORAGE_KEY);
}

function persist(id: string | null): void {
	if (!browser) return;
	if (id) localStorage.setItem(STORAGE_KEY, id);
	else localStorage.removeItem(STORAGE_KEY);
}

export const activeCompany = {
	get current(): CompanyInfo | null {
		return _current;
	},

	/** İlk yüklemede şirket listesiyle birlikte çağrılır.
	 *  localStorage'da kayıtlı ID varsa onu seçer, yoksa ilk şirketi. */
	initFromList(companies: CompanyInfo[]): void {
		if (!companies.length) return;
		if (_current && companies.some((c) => c.id === _current!.id)) return;
		const savedId = loadStoredId();
		const found = savedId ? companies.find((c) => c.id === savedId) : null;
		_current = found ?? companies[0];
		persist(_current.id);
	},

	switchTo(company: CompanyInfo): void {
		_current = company;
		persist(company.id);
	},

	clear(): void {
		_current = null;
		persist(null);
	}
};
