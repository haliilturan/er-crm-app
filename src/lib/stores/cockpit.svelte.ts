export type CockpitSection = 'tasks' | 'chats' | 'alerts';
export type TasksSection = 'in' | 'out';
export type CockpitUser = { id: string; firstName: string; lastName: string; email: string };

let _section = $state<CockpitSection>('tasks');
let _chat = $state<string>('recent');
let _chatSearch = $state<string>('');
let _tasksDate = $state<Date>(new Date());
let _tasksSection = $state<TasksSection>('in');
let _newTaskOpen = $state<boolean>(false);
let _appModalOpen = $state<boolean>(false);
let _users = $state<CockpitUser[]>([]);

export const cockpit = {
	get section(): CockpitSection {
		return _section;
	},
	setSection(s: CockpitSection): void {
		_section = s;
	},

	get chat(): string {
		return _chat;
	},
	setChat(id: string): void {
		_chat = id;
	},

	get chatSearch(): string {
		return _chatSearch;
	},
	setChatSearch(q: string): void {
		_chatSearch = q;
	},

	get tasksDate(): Date {
		return _tasksDate;
	},
	setTasksDate(d: Date): void {
		_tasksDate = d;
	},

	get tasksSection(): TasksSection {
		return _tasksSection;
	},
	setTasksSection(s: TasksSection): void {
		_tasksSection = s;
	},

	get newTaskOpen(): boolean {
		return _newTaskOpen;
	},
	setNewTaskOpen(open: boolean): void {
		_newTaskOpen = open;
	},

	get appModalOpen(): boolean {
		return _appModalOpen;
	},
	setAppModalOpen(open: boolean): void {
		_appModalOpen = open;
	},

	get users(): CockpitUser[] {
		return _users;
	},
	setUsers(users: CockpitUser[]): void {
		_users = users;
	}
};
