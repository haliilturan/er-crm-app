import { tx } from '$lib/instant';
import type { Db } from '$lib/instant';

type ReturnItem = {
	orderItemId: string;
	returnedQuantity: number;
};

type ProcessReturnParams = {
	orderId: string;
	items: ReturnItem[];
	reason?: string;
	notes?: string;
	approvedBy: string;
};

export async function processReturn(db: Db, params: ProcessReturnParams): Promise<void> {
	const { orderId, items, reason, notes, approvedBy } = params;

	const result = await db.queryOnce({
		orderItems: { $: { where: { orderId } } }
	});

	const allItems = result.data?.orderItems ?? [];
	const incomingMap = new Map(items.map((it) => [it.orderItemId, it.returnedQuantity]));

	const merged = allItems.map((item) => ({
		quantity: item.quantity as number,
		returnedQuantity: incomingMap.has(item.id)
			? incomingMap.get(item.id)!
			: ((item.returnedQuantity as number | undefined) ?? 0)
	}));

	const returnStatus: 'full' | 'partial' =
		merged.length > 0 && merged.every((it) => it.returnedQuantity >= it.quantity)
			? 'full'
			: 'partial';

	const itemUpdates = items.map((returnItem) =>
		tx.orderItems[returnItem.orderItemId].update({
			returnedQuantity: returnItem.returnedQuantity
		})
	);

	await db.transact([
		...itemUpdates,
		tx.orders[orderId].update({
			hasReturn: true,
			returnStatus,
			returnReason: reason,
			returnNotes: notes,
			returnedAt: Date.now(),
			returnApprovedBy: approvedBy
		})
	]);
}
