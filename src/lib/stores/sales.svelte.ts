let _search = $state<string>('');
let _selectedId = $state<string | null>(null);
let _modalOpen = $state<boolean>(false);
let _modalEntityId = $state<string | null>(null);

export const salesStore = {
	get search(): string {
		return _search;
	},
	setSearch(q: string): void {
		_search = q;
	},

	get selectedId(): string | null {
		return _selectedId;
	},
	setSelectedId(id: string | null): void {
		_selectedId = id;
	},

	get modalOpen(): boolean {
		return _modalOpen;
	},

	get modalEntityId(): string | null {
		return _modalEntityId;
	},

	openNew(): void {
		_modalEntityId = null;
		_modalOpen = true;
	},
	openEdit(id: string): void {
		_modalEntityId = id;
		_modalOpen = true;
	},
	closeModal(): void {
		_modalOpen = false;
		_modalEntityId = null;
	}
};
