// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from '@instantdb/core';

const rules = {
	products: {
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			delete: 'auth.id != null',
			update: 'auth.id != null'
		}
	},
	orderItems: {
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			delete: 'auth.id != null',
			update: 'auth.id != null'
		}
	},
	customers: {
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			delete: 'auth.id != null',
			update: 'auth.id != null'
		}
	},
	tasks: {
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			delete: 'auth.id != null',
			update: 'auth.id != null'
		}
	},
	notifications: {
		allow: {
			view: 'auth.id != null && data.userId == auth.id',
			create: 'auth.id != null',
			delete: 'false',
			update: 'auth.id != null && data.userId == auth.id'
		}
	},
	sequences: {
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			delete: 'false',
			update: 'auth.id != null'
		}
	},
	orderStatusHistory: {
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null',
			update: 'auth.id != null',
			delete: 'auth.id != null'
		}
	},
	productParts: {
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			delete: 'auth.id != null',
			update: 'auth.id != null'
		}
	},
	activityFeed: {
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			delete: 'auth.id != null',
			update: 'auth.id != null'
		}
	},
	productDrafts: {
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			delete: 'auth.id != null',
			update: 'auth.id != null'
		}
	},
	productDraftParts: {
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			delete: 'auth.id != null',
			update: 'auth.id != null'
		}
	},
	payments: {
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			delete: 'auth.id != null',
			update: 'auth.id != null'
		}
	},
	$default: {
		allow: {
			$default: 'false'
		}
	},
	companies: {
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			delete: 'false',
			update: 'auth.id != null'
		}
	},
	messages: {
		allow: {
			view: 'auth.id != null && (data.senderId == auth.id || data.receiverId == auth.id)',
			create: 'auth.id != null && data.senderId == auth.id',
			delete: 'false',
			update: 'auth.id != null && data.receiverId == auth.id'
		}
	},
	userCompanies: {
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			delete: 'auth.id != null',
			update: 'auth.id != null'
		}
	},
	bankAccounts: {
		allow: {
			$default: 'auth.id != null',
		}
	},
	brands: {
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			delete: 'false',
			update: 'auth.id != null'
		}
	},
	customerNotes: {
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			delete: 'false',
			update: 'false'
		}
	},
	orders: {
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			delete: 'auth.id != null',
			update: 'auth.id != null'
		}
	},
	prices: {
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			update: 'auth.id != null',
			delete: 'auth.id != null'
		}
	},
	userProfiles: {
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			delete: 'false',
			update: 'auth.id != null'
		}
	}
} satisfies InstantRules;

export default rules;
