import type { InstantRules } from '@instantdb/core';
import type { AppSchema } from './schema';

/**
 * InstantDB İzin Kuralları
 *
 * NOT (Geliştirme Aşaması):
 *   create kuralları kasıtlı olarak sadeleştirilmiştir: auth.id != null yeterli.
 *   Bunun nedeni: userProfile onboarding flow henüz yok. link traversal
 *   (auth.ref('$user.profile.companyMemberships...')) yeni kullanıcılarda boş döner ve
 *   tüm create işlemlerini sessizce reddeder.
 *   TODO: Onboarding tamamlandıktan sonra create kuralları sıkılaştırılacak.
 *
 * view / update / delete kuralları aynı kalır (bu zaten çalışıyor).
 *
 * Link traversal sözdizimi (view/update/delete'te kullanılmaya devam ediyor):
 *   auth.ref('$user.profile.companyMemberships.companyId')
 *     $users → userProfiles (profileUser.profile) → userCompanies (userCompanyProfile.companyMemberships) → companyId
 */

const rules = {
	// ─── Varsayılan: Her şeyi reddet ──────────────────────────────────────────────
	$default: {
		allow: { $default: 'false' }
	},

	// ─── Core ─────────────────────────────────────────────────────────────────────

	companies: {
		bind: {
			isMember:
				"auth.id != null && data.id in auth.ref('$user.profile.companyMemberships.companyId')",
			isAdmin:
				"auth.id != null && 'admin' in auth.ref('$user.profile.companyMemberships.role') && data.id in auth.ref('$user.profile.companyMemberships.companyId')"
		},
		allow: {
			view: 'isMember',
			create: 'auth.id != null',
			update: 'isAdmin',
			delete: 'false'
		}
	},

	userProfiles: {
		bind: {
			isOwnProfile: "auth.id != null && data.ref('user.id') == auth.id"
		},
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			update:
				"isOwnProfile || (auth.id != null && 'admin' in auth.ref('$user.profile.companyMemberships.role'))",
			delete: 'false'
		}
	},

	userCompanies: {
		bind: {
			isOwnMembership: 'auth.id != null && data.userId == auth.id',
			isAnyAdmin:
				"auth.id != null && 'admin' in auth.ref('$user.profile.companyMemberships.role')",
			isInSameCompany:
				"auth.id != null && data.companyId in auth.ref('$user.profile.companyMemberships.companyId')"
		},
		allow: {
			view: 'isOwnMembership || isAnyAdmin || isInSameCompany',
			create: 'auth.id != null',
			update: 'isAnyAdmin',
			delete: 'isAnyAdmin'
		}
	},

	sequences: {
		bind: {
			inCompany:
				"auth.id != null && data.companyId in auth.ref('$user.profile.companyMemberships.companyId')",
			isAdmin:
				"auth.id != null && 'admin' in auth.ref('$user.profile.companyMemberships.role') && data.companyId in auth.ref('$user.profile.companyMemberships.companyId')"
		},
		allow: {
			view: 'inCompany',
			create: 'auth.id != null',
			update: 'isAdmin',
			delete: 'false'
		}
	},

	// ─── Müşteriler ───────────────────────────────────────────────────────────────

	customers: {
		bind: {
			inCompany:
				"auth.id != null && data.companyId in auth.ref('$user.profile.companyMemberships.companyId')",
			isAdmin: "'admin' in auth.ref('$user.profile.companyMemberships.role')",
			isAssigned: 'data.assignedTo == auth.id',
			isOwner: 'data.createdBy == auth.id'
		},
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null && data.createdBy == auth.id',
			update: 'inCompany && (isAssigned || isOwner || isAdmin)',
			delete: 'inCompany && isAdmin'
		}
	},

	customerNotes: {
		bind: {
			inCompany:
				"auth.id != null && data.companyId in auth.ref('$user.profile.companyMemberships.companyId')",
			canSeeCustomer:
				"data.ref('customer.assignedTo') == auth.id || 'admin' in auth.ref('$user.profile.companyMemberships.role')"
		},
		allow: {
			view: 'inCompany && canSeeCustomer',
			create: 'auth.id != null && data.createdBy == auth.id',
			update: 'false',
			delete: 'false'
		}
	},

	// ─── Markalar & Ürünler ───────────────────────────────────────────────────────

	brands: {
		bind: {
			inCompany:
				"auth.id != null && data.companyId in auth.ref('$user.profile.companyMemberships.companyId')",
			isAdmin:
				"auth.id != null && 'admin' in auth.ref('$user.profile.companyMemberships.role') && data.companyId in auth.ref('$user.profile.companyMemberships.companyId')"
		},
		allow: {
			view: 'inCompany',
			create: 'auth.id != null',
			update: 'isAdmin',
			delete: 'false'
		}
	},

	products: {
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null',
			update: 'auth.id != null',
			delete: 'auth.id != null'
		}
	},

	productParts: {
		bind: {
			inCompany:
				"auth.id != null && data.ref('product.companyId') in auth.ref('$user.profile.companyMemberships.companyId')",
			isAdmin:
				"auth.id != null && 'admin' in auth.ref('$user.profile.companyMemberships.role')",
			isProductOwner: "auth.id != null && data.ref('product.createdBy') == auth.id"
		},
		allow: {
			view: 'inCompany',
			create: 'auth.id != null',
			update: 'inCompany && (isProductOwner || isAdmin)',
			delete: 'inCompany && (isProductOwner || isAdmin)'
		}
	},

	// ─── Taslak Ürünler ───────────────────────────────────────────────────────────

	productDrafts: {
		bind: {
			inCompany:
				"auth.id != null && data.companyId in auth.ref('$user.profile.companyMemberships.companyId')",
			isAdmin: "'admin' in auth.ref('$user.profile.companyMemberships.role')",
			isOwner: 'data.createdBy == auth.id'
		},
		allow: {
			view: 'inCompany',
			create: 'auth.id != null && data.createdBy == auth.id',
			update: 'inCompany && (isOwner || isAdmin)',
			delete: 'inCompany && (isOwner || isAdmin)'
		}
	},

	productDraftParts: {
		bind: {
			inCompany:
				"auth.id != null && data.ref('productDraft.companyId') in auth.ref('$user.profile.companyMemberships.companyId')",
			isAdmin:
				"auth.id != null && 'admin' in auth.ref('$user.profile.companyMemberships.role')",
			isDraftOwner: "auth.id != null && data.ref('productDraft.createdBy') == auth.id"
		},
		allow: {
			view: 'inCompany',
			create: 'auth.id != null',
			update: 'inCompany && (isDraftOwner || isAdmin)',
			delete: 'inCompany && (isDraftOwner || isAdmin)'
		}
	},

	// ─── Teklifler ────────────────────────────────────────────────────────────────

	quotes: {
		bind: {
			inCompany:
				"auth.id != null && data.companyId in auth.ref('$user.profile.companyMemberships.companyId')",
			isAdmin: "'admin' in auth.ref('$user.profile.companyMemberships.role')",
			isFinans: "auth.id != null && 'finans' in auth.ref('$user.profile.companyMemberships.role')",
			isAssigned: 'data.assignedTo == auth.id',
			isOwner: 'data.createdBy == auth.id'
		},
		allow: {
			view:   'inCompany && (isAssigned || isAdmin || isFinans)',
			create: 'auth.id != null && data.createdBy == auth.id',
			update: 'inCompany && (isAssigned || isOwner || isAdmin || isFinans)',
			delete: 'inCompany && isAdmin'
		}
	},

	quoteItems: {
		bind: {
			inCompany:
				"auth.id != null && data.ref('quote.companyId') in auth.ref('$user.profile.companyMemberships.companyId')",
			isAdmin:
				"auth.id != null && 'admin' in auth.ref('$user.profile.companyMemberships.role')",
			isQuoteAssignee: "auth.id != null && data.ref('quote.assignedTo') == auth.id",
			isQuoteOwner: "auth.id != null && data.ref('quote.createdBy') == auth.id"
		},
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			update: 'inCompany && (isQuoteAssignee || isQuoteOwner || isAdmin)',
			delete: 'inCompany && (isQuoteAssignee || isQuoteOwner || isAdmin)'
		}
	},

	quoteStatusHistory: {
		bind: {
			inCompany:
				"auth.id != null && data.ref('quote.companyId') in auth.ref('$user.profile.companyMemberships.companyId')",
			isAdmin:
				"auth.id != null && 'admin' in auth.ref('$user.profile.companyMemberships.role')",
			isQuoteAssignee: "auth.id != null && data.ref('quote.assignedTo') == auth.id"
		},
		allow: {
			view: 'inCompany && (isQuoteAssignee || isAdmin)',
			create: 'auth.id != null && data.changedBy == auth.id',
			update: 'false',
			delete: 'false'
		}
	},

	// ─── Siparişler ───────────────────────────────────────────────────────────────

	orders: {
		bind: {
			inCompany:
				"auth.id != null && data.companyId in auth.ref('$user.profile.companyMemberships.companyId')",
			isAdmin: "'admin' in auth.ref('$user.profile.companyMemberships.role')",
			isFinans: "auth.id != null && 'finans' in auth.ref('$user.profile.companyMemberships.role')",
			isSourceQuoteAssignee:
				"auth.id != null && data.ref('sourceQuote.assignedTo') == auth.id"
		},
		allow: {
			view:   'inCompany && (isSourceQuoteAssignee || isAdmin || isFinans)',
			create: 'auth.id != null',
			update: 'inCompany && (isAdmin || isFinans)',
			delete: 'false'
		}
	},

	orderItems: {
		bind: {
			inCompany:
				"auth.id != null && data.ref('order.companyId') in auth.ref('$user.profile.companyMemberships.companyId')",
			isAdmin:
				"auth.id != null && 'admin' in auth.ref('$user.profile.companyMemberships.role')",
			isSourceQuoteAssignee:
				"auth.id != null && data.ref('order.sourceQuote.assignedTo') == auth.id"
		},
		allow: {
			view: 'auth.id != null',
			create: 'auth.id != null',
			update: 'inCompany && isAdmin',
			delete: 'false'
		}
	},

	// ─── Cross-Module ─────────────────────────────────────────────────────────────

	activityFeed: {
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null && data.actorId == auth.id',
			update: 'false',
			delete: 'false'
		}
	},

	tasks: {
		bind: {
			isAssigned: 'auth.id != null && data.assignedTo == auth.id',
			isAdmin:
				"auth.id != null && 'admin' in auth.ref('$user.profile.companyMemberships.role') && data.companyId in auth.ref('$user.profile.companyMemberships.companyId')",
			inCompany:
				"auth.id != null && data.companyId in auth.ref('$user.profile.companyMemberships.companyId')"
		},
		allow: {
			view: 'isAssigned || isAdmin',
			create: 'auth.id != null && data.createdBy == auth.id',
			update: 'isAssigned || isAdmin',
			delete: 'isAdmin'
		}
	},

	// ─── Mesajlaşma ───────────────────────────────────────────────────────────────

	messages: {
		allow: {
			view:   "auth.id != null && (data.senderId == auth.id || data.receiverId == auth.id)",
			create: "auth.id != null && data.senderId == auth.id",
			update: "auth.id != null && data.receiverId == auth.id",
			delete: "false"
		}
	},

	// ─── Bildirimler ─────────────────────────────────────────────────────────────

	notifications: {
		allow: {
			view:   'auth.id != null && data.userId == auth.id',
			create: 'auth.id != null',
			update: 'auth.id != null && data.userId == auth.id',
			delete: 'false'
		}
	},

	// ─── Ödemeler ─────────────────────────────────────────────────────────────────

	payments: {
		bind: {
			inCompany:
				"auth.id != null && data.companyId in auth.ref('$user.profile.companyMemberships.companyId')",
			isAdmin:
				"auth.id != null && 'admin' in auth.ref('$user.profile.companyMemberships.role')",
			isFinans:
				"auth.id != null && 'finans' in auth.ref('$user.profile.companyMemberships.role')"
		},
		allow: {
			view:   'inCompany',
			create: 'auth.id != null',
			update: 'inCompany && (isFinans || isAdmin)',
			delete: 'inCompany && isAdmin'
		}
	}
} satisfies InstantRules<AppSchema>;

export default rules;
