let _pendingUserId  = $state<string | null>(null);
let _pulseSignal    = $state(false);

export const chatBridge = {
	get pendingUserId(): string | null { return _pendingUserId; },
	open(userId: string): void { _pendingUserId = userId; },
	consume(): void { _pendingUserId = null; },

	get pulseSignal(): boolean { return _pulseSignal; },
	openPulse(): void { _pulseSignal = true; },
	consumePulse(): void { _pulseSignal = false; }
};
