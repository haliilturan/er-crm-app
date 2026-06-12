import type { InstantRules } from '@instantdb/core';
import type { AppSchema } from './schema';

/**
 * InstantDB İzin Kuralları — Geliştirme Aşaması
 *
 * Tüm create/update/delete kuralları 'auth.id != null' olarak sadeleştirildi.
 * Sebep: auth.ref('$user.profile.companyMemberships...') ve data.ref('...')
 * link traversal'ları yeni oluşturulan entity'lerde çalışmıyor ve tüm
 * transact'leri "Permission denied: not perms-pass?" ile reddediyor.
 *
 * TODO: Onboarding flow tamamlandıktan sonra kurallar aşağıdaki şekilde sıkılaştırılacak:
 *   - inCompany: data.companyId in auth.ref('$user.profile.companyMemberships.companyId')
 *   - isOwner:   data.createdBy == auth.id
 *   - isAssigned: data.assignedTo == auth.id
 *
 * Korunan kurallar (kasıtlı):
 *   - messages:      kişiye özel erişim (senderId / receiverId)
 *   - notifications: kişiye özel erişim (userId)
 *   - bazı delete:   'false' (hiç silinmemeli)
 */

const rules = {
	// ─── Varsayılan: Her şeyi reddet ──────────────────────────────────────────────
	$default: {
		allow: { $default: 'false' }
	},

	// ─── Core ─────────────────────────────────────────────────────────────────────

	companies: {
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null',
			update: 'auth.id != null',
			delete: 'false'
		}
	},

	userProfiles: {
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null',
			update: 'auth.id != null',
			delete: 'false'
		}
	},

	userCompanies: {
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null',
			update: 'auth.id != null',
			delete: 'auth.id != null'
		}
	},

	sequences: {
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null',
			update: 'auth.id != null',
			delete: 'false'
		}
	},

	// ─── Müşteriler ───────────────────────────────────────────────────────────────

	customers: {
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null',
			update: 'auth.id != null',
			delete: 'auth.id != null'
		}
	},

	customerNotes: {
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null',
			update: 'false',
			delete: 'false'
		}
	},

	// ─── Banka Hesapları ─────────────────────────────────────────────────────────

	bankAccounts: {
		allow: {
			$default: 'auth.id != null',
		}
	},

	// ─── Markalar & Ürünler ───────────────────────────────────────────────────────

	brands: {
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null',
			update: 'auth.id != null',
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
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null',
			update: 'auth.id != null',
			delete: 'auth.id != null'
		}
	},

	// ─── Taslak Ürünler ───────────────────────────────────────────────────────────

	productDrafts: {
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null',
			update: 'auth.id != null',
			delete: 'auth.id != null'
		}
	},

	productDraftParts: {
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null',
			update: 'auth.id != null',
			delete: 'auth.id != null'
		}
	},

	// ─── Siparişler ───────────────────────────────────────────────────────────────

	orders: {
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null',
			update: 'auth.id != null',
			delete: 'auth.id != null'
		}
	},

	orderItems: {
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null',
			update: 'auth.id != null',
			delete: 'auth.id != null'
		}
	},

	orderStatusHistory: {
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null',
			update: 'false',
			delete: 'false'
		}
	},

	// ─── Cross-Module ─────────────────────────────────────────────────────────────

	activityFeed: {
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null',
			update: 'false',
			delete: 'false'
		}
	},

	tasks: {
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null',
			update: 'auth.id != null',
			delete: 'auth.id != null'
		}
	},

	// ─── Mesajlaşma ── kişiye özel erişim korunuyor ───────────────────────────────

	messages: {
		allow: {
			view:   "auth.id != null && (data.senderId == auth.id || data.receiverId == auth.id)",
			create: "auth.id != null && data.senderId == auth.id",
			update: "auth.id != null && data.receiverId == auth.id",
			delete: "false"
		}
	},

	// ─── Bildirimler ── kişiye özel erişim korunuyor ─────────────────────────────

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
		allow: {
			view:   'auth.id != null',
			create: 'auth.id != null',
			update: 'auth.id != null',
			delete: 'auth.id != null'
		}
	}
} satisfies InstantRules<AppSchema>;

export default rules;
