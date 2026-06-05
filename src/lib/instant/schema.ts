import { i } from '@instantdb/core';

const schema = i.schema({
	entities: {
		// ─── Built-in auth entity ─────────────────────────────────────────────────
		$users: i.entity({
			email: i.string().unique().indexed()
		}),

		// ─── Core ─────────────────────────────────────────────────────────────────

		/**
		 * Şirketler: Hilal Fırça, Euromak, Mix7 (ve ileride eklenecekler)
		 */
		companies: i.entity({
			name: i.string().indexed(),
			slug: i.string().unique(),
			logoUrl: i.string().optional(),
			isActive: i.boolean(),
			createdAt: i.number()
		}),

		/**
		 * $users'a bağlı genişletilmiş profil.
		 * Auth'dan sonra oluşturulur, uygulama içi kullanıcı verisi burada.
		 */
		userProfiles: i.entity({
			email: i.string().unique().indexed(),
			fullName: i.string().indexed(),
			photoUrl: i.string().optional(),
			phone: i.string().optional(),
			createdAt: i.number(),
			updatedAt: i.number().optional()
		}),

		/**
		 * Kullanıcı–şirket junction tablosu.
		 * Bir kullanıcı birden fazla şirkette, farklı rollerle bulunabilir.
		 */
		userCompanies: i.entity({
			userId: i.string().indexed(),
			companyId: i.string().indexed(),
			// "admin" | "member" | "viewer"
			role: i.string().indexed(),
			joinedAt: i.number()
		}),

		/**
		 * Teklif / sipariş numarası üretmek için sıra sayacı.
		 * key = "{companySlug}-{type}-{year}" (örn. "hf-quote-2025") — unique.
		 */
		sequences: i.entity({
			key: i.string().unique(),
			companyId: i.string().indexed(),
			// "quote" | "order"
			type: i.string().indexed(),
			year: i.number(),
			lastValue: i.number(),
			updatedAt: i.number()
		}),

		// ─── Müşteriler ───────────────────────────────────────────────────────────

		customers: i.entity({
			name: i.string().indexed(),
			// Türkçe karakter normalize edilmiş hali — "Fırça" → "firca"
			nameSearch: i.string().indexed(),
			phone: i.string().indexed(),
			email: i.string().optional(),
			country: i.string().optional(),
			city: i.string().optional(),
			address: i.string().optional(),
			taxNumber: i.string().optional(),
			// "individual" | "corporate"
			companyType: i.string(),
			// "lead" | "active" | "inactive"
			status: i.string().indexed(),
			// "referral" | "web" | "cold" | "other"
			source: i.string().optional(),
			contactName: i.string().optional(),
			contactTitle: i.string().optional(),
			companyId: i.string().indexed(),
			assignedTo: i.string().indexed(),
			createdBy: i.string(),
			createdAt: i.number().indexed(),
			updatedBy: i.string().optional(),
			updatedAt: i.number().optional()
		}),

		/**
		 * Append-only müşteri notları. Düzenleme ve silme yoktur.
		 */
		customerNotes: i.entity({
			title: i.string().optional(),
			content: i.string(),
			companyId: i.string().indexed(),
			customerId: i.string().indexed(),
			createdBy: i.string(),
			createdAt: i.number().indexed()
		}),

		// ─── Ürünler & Markalar ───────────────────────────────────────────────────

		brands: i.entity({
			name: i.string().indexed(),
			slug: i.string().unique(),
			logoUrl: i.string().optional(),
			companyId: i.string().indexed(),
			isActive: i.boolean(),
			createdAt: i.number()
		}),

		products: i.entity({
			name: i.string().indexed(),
			nameSearch: i.string().indexed(),
			sku: i.string().unique(),
			brandId: i.string().indexed(),
			companyId: i.string().indexed(),
			category: i.string().indexed(),
			applicationArea: i.string().optional(),
			// "ready" | "custom"
			type: i.string().indexed(),
			// "active" | "inactive" | "draft"
			status: i.string().indexed(),
			description: i.string().optional(),
			technicalDescription: i.string().optional(),
			// string[] — Uploadthing URL'leri
			photoUrls: i.json().optional(),
			technicalDrawingUrl: i.string().optional(),
			basePrice: i.number().optional(),
			vatRate: i.number(),
			unit: i.string(),
			createdBy: i.string(),
			createdAt: i.number(),
			updatedBy: i.string().optional(),
			updatedAt: i.number().optional()
		}),

		/**
		 * Ürünle birlikte gelen parçalar / eşantiyon / hediyeler.
		 */
		productParts: i.entity({
			productId: i.string().indexed(),
			name: i.string(),
			quantity: i.number(),
			isGift: i.boolean(),
			notes: i.string().optional(),
			sortOrder: i.number()
		}),

		// ─── Taslak Ürünler ───────────────────────────────────────────────────────

		/**
		 * Onaylandığında products entity'sine kopyalanır (promotedToProductId dolar).
		 */
		productDrafts: i.entity({
			name: i.string().indexed(),
			nameSearch: i.string().indexed(),
			sku: i.string().optional(),
			brandId: i.string().indexed(),
			companyId: i.string().indexed(),
			category: i.string().optional(),
			applicationArea: i.string().optional(),
			// "ready" | "custom"
			type: i.string().indexed(),
			// "draft" | "review" | "approved" | "rejected"
			status: i.string().indexed(),
			description: i.string().optional(),
			technicalDescription: i.string().optional(),
			// string[]
			photoUrls: i.json().optional(),
			technicalDrawingUrl: i.string().optional(),
			basePrice: i.number().optional(),
			vatRate: i.number().optional(),
			unit: i.string().optional(),
			promotedToProductId: i.string().optional(),
			// Hilal Fırça maliyet hesaplama placeholder — ileride yapılandırılacak
			customCalcData: i.json().optional(),
			reviewNotes: i.string().optional(),
			createdBy: i.string(),
			createdAt: i.number(),
			updatedBy: i.string().optional(),
			updatedAt: i.number().optional()
		}),

		productDraftParts: i.entity({
			productDraftId: i.string().indexed(),
			name: i.string(),
			quantity: i.number(),
			isGift: i.boolean(),
			notes: i.string().optional(),
			sortOrder: i.number()
		}),

		// ─── Teklifler ────────────────────────────────────────────────────────────

		quotes: i.entity({
			// Örn: "HF-2025-0001"
			quoteNumber: i.string().unique(),
			customerId: i.string().indexed(),
			companyId: i.string().indexed(),
			assignedTo: i.string().indexed(),
			// "draft" | "pending_finance" | "approved" | "rejected" | "cancelled"
			status: i.string().indexed(),
			rejectionReason: i.string().optional(),
			approvedBy: i.string().optional(),
			approvedAt: i.number().optional(),
			// "TRY" | "USD" | "EUR" | "GBP"
			currency: i.string(),
			exchangeRate: i.number().optional(),
			exchangeRateDate: i.number().optional(),
			subtotal: i.number(),
			totalVat: i.number(),
			totalWithVat: i.number(),
			discountTotal: i.number().optional(),
			// "warehouse_pickup" | "cargo" | "our_vehicle" | "customer_vehicle"
			deliveryType: i.string().optional(),
			// "cash" | "credit_30" | "credit_60" | "credit_90" | "installment"
			paymentType: i.string().optional(),
			deliveryAddress: i.string().optional(),
			deliveryCity: i.string().optional(),
			deliveryCountry: i.string().optional(),
			estimatedDeliveryDate: i.number().optional(),
			validUntil: i.number().optional(),
			// "tr" | "en"
			language: i.string(),
			notes: i.string().optional(),
			internalNotes: i.string().optional(),
			createdBy: i.string(),
			createdAt: i.number().indexed(),
			updatedBy: i.string().optional(),
			updatedAt: i.number().optional()
		}),

		/**
		 * Teklif satırları — ürün verileri snapshot olarak taşınır.
		 * isIncludedPart = true olanlar eşantiyon/hediye satırlarıdır (fiyat: 0).
		 */
		quoteItems: i.entity({
			quoteId: i.string().indexed(),
			// Custom item'larda null olabilir
			productId: i.string().optional(),
			// Eşantiyon satırı için üst satır ID'si
			parentItemId: i.string().optional(),
			isIncludedPart: i.boolean(),
			productName: i.string(),
			productSku: i.string().optional(),
			brandName: i.string().optional(),
			unit: i.string(),
			quantity: i.number(),
			listPrice: i.number(),
			discountRate: i.number(),
			unitPrice: i.number(),
			vatRate: i.number(),
			vatAmount: i.number(),
			lineTotal: i.number(),
			lineTotalWithVat: i.number(),
			notes: i.string().optional(),
			sortOrder: i.number()
		}),

		/**
		 * Teklif durum geçiş logu — tüm status değişiklikleri burada saklanır.
		 */
		quoteStatusHistory: i.entity({
			quoteId: i.string().indexed(),
			fromStatus: i.string(),
			toStatus: i.string(),
			changedBy: i.string(),
			// Reddetme durumunda zorunlu, diğerlerinde opsiyonel
			reason: i.string().optional(),
			changedAt: i.number().indexed()
		}),

		// ─── Siparişler ───────────────────────────────────────────────────────────

		/**
		 * Teklif onaylandığında otomatik oluşturulur.
		 * Teklif verileri kopyalanır — orderItems ayrı snapshot olarak tutulur.
		 */
		orders: i.entity({
			// Örn: "SIP-2025-0001"
			orderNumber: i.string().unique(),
			quoteId: i.string().indexed(),
			customerId: i.string().indexed(),
			companyId: i.string().indexed(),
			// "pending_production" | "in_production" | "ready" | "shipped" | "delivered" | "cancelled"
			status: i.string().indexed(),
			currency: i.string(),
			subtotal: i.number(),
			totalVat: i.number(),
			totalWithVat: i.number(),
			deliveryType: i.string().optional(),
			paymentType: i.string().optional(),
			deliveryAddress: i.string().optional(),
			deliveryCity: i.string().optional(),
			deliveryCountry: i.string().optional(),
			notes: i.string().optional(),
			approvedBy: i.string(),
			approvedAt: i.number(),
			createdBy: i.string(),
			createdAt: i.number().indexed(),
			updatedBy: i.string().optional(),
			updatedAt: i.number().optional()
		}),

		/**
		 * quoteItems'ın sipariş anındaki dondurulmuş kopyası.
		 * Teklif sonradan değişse de sipariş verileri korunur.
		 */
		orderItems: i.entity({
			orderId: i.string().indexed(),
			productId: i.string().optional(),
			parentItemId: i.string().optional(),
			isIncludedPart: i.boolean(),
			productName: i.string(),
			productSku: i.string().optional(),
			brandName: i.string().optional(),
			unit: i.string(),
			quantity: i.number(),
			listPrice: i.number(),
			discountRate: i.number(),
			unitPrice: i.number(),
			vatRate: i.number(),
			vatAmount: i.number(),
			lineTotal: i.number(),
			lineTotalWithVat: i.number(),
			notes: i.string().optional(),
			sortOrder: i.number()
		}),

		// ─── Cross-Module ─────────────────────────────────────────────────────────

		/**
		 * Şirket genelinde olay akışı.
		 * Tüm görüntüleme verileri snapshot olarak taşınır — join olmadan render edilir.
		 */
		activityFeed: i.entity({
			// "quote_created" | "quote_updated" | "quote_submitted" |
			// "quote_approved" | "quote_rejected" | "order_created" | "customer_added"
			type: i.string().indexed(),
			companyId: i.string().indexed(),
			actorId: i.string().indexed(),
			actorName: i.string(),
			actorPhotoUrl: i.string().optional(),
			// string[] — üstte gösterilecek şirket logoları (max 3)
			actorCompanyIds: i.json().optional(),
			customerId: i.string().optional(),
			customerContactName: i.string().optional(),
			customerCompanyName: i.string().optional(),
			// "quote" | "order" | "customer"
			relatedEntityType: i.string(),
			relatedEntityId: i.string(),
			// Örn: "HF-2025-0001"
			relatedEntityNumber: i.string().optional(),
			amount: i.number().optional(),
			currency: i.string().optional(),
			brandId: i.string().optional(),
			brandName: i.string().optional(),
			// Aksiyon tipine özel ek veri
			metadata: i.json().optional(),
			createdAt: i.number().indexed()
		}),

		/**
		 * Kişisel görev ve bildirimler.
		 * Status geçişlerinde otomatik, aynı transaction içinde yazılır.
		 */
		tasks: i.entity({
			// "quote_submitted" | "quote_approved" | "quote_rejected" | "order_created"
			type: i.string().indexed(),
			title: i.string(),
			description: i.string().optional(),
			// "quote" | "order" | "customer"
			relatedEntityType: i.string().optional(),
			relatedEntityId: i.string().optional(),
			assignedTo: i.string().indexed(),
			companyId: i.string().indexed(),
			// "pending" | "done" | "dismissed"
			status: i.string().indexed(),
			dueAt: i.number().optional(),
			createdBy: i.string(),
			createdAt: i.number().indexed(),
			updatedAt: i.number().optional()
		})
	},

	links: {
		// ─── Core ───────────────────────────────────────────────────────────────

		profileUser: {
			forward: { on: 'userProfiles', has: 'one', label: 'user' },
			reverse: { on: '$users', has: 'one', label: 'profile' }
		},
		userCompanyProfile: {
			forward: { on: 'userCompanies', has: 'one', label: 'profile' },
			reverse: { on: 'userProfiles', has: 'many', label: 'companyMemberships' }
		},
		userCompanyOrg: {
			forward: { on: 'userCompanies', has: 'one', label: 'company' },
			reverse: { on: 'companies', has: 'many', label: 'members' }
		},

		// ─── Müşteriler ─────────────────────────────────────────────────────────

		customerOrg: {
			forward: { on: 'customers', has: 'one', label: 'company' },
			reverse: { on: 'companies', has: 'many', label: 'customers' }
		},
		customerAssignee: {
			forward: { on: 'customers', has: 'one', label: 'assignee' },
			reverse: { on: 'userProfiles', has: 'many', label: 'assignedCustomers' }
		},
		customerNoteCustomer: {
			forward: { on: 'customerNotes', has: 'one', label: 'customer' },
			reverse: { on: 'customers', has: 'many', label: 'notes' }
		},
		customerNoteAuthor: {
			forward: { on: 'customerNotes', has: 'one', label: 'author' },
			reverse: { on: 'userProfiles', has: 'many', label: 'writtenNotes' }
		},

		// ─── Markalar & Ürünler ──────────────────────────────────────────────────

		brandOrg: {
			forward: { on: 'brands', has: 'one', label: 'company' },
			reverse: { on: 'companies', has: 'many', label: 'brands' }
		},
		productBrand: {
			forward: { on: 'products', has: 'one', label: 'brand' },
			reverse: { on: 'brands', has: 'many', label: 'products' }
		},
		productPartProduct: {
			forward: { on: 'productParts', has: 'one', label: 'product' },
			reverse: { on: 'products', has: 'many', label: 'parts' }
		},

		// ─── Taslak Ürünler ──────────────────────────────────────────────────────

		productDraftBrand: {
			forward: { on: 'productDrafts', has: 'one', label: 'brand' },
			reverse: { on: 'brands', has: 'many', label: 'drafts' }
		},
		productDraftPartDraft: {
			forward: { on: 'productDraftParts', has: 'one', label: 'productDraft' },
			reverse: { on: 'productDrafts', has: 'many', label: 'parts' }
		},

		// ─── Teklifler ───────────────────────────────────────────────────────────

		quoteCustomer: {
			forward: { on: 'quotes', has: 'one', label: 'customer' },
			reverse: { on: 'customers', has: 'many', label: 'quotes' }
		},
		quoteAssignee: {
			forward: { on: 'quotes', has: 'one', label: 'assignee' },
			reverse: { on: 'userProfiles', has: 'many', label: 'assignedQuotes' }
		},
		quoteItemQuote: {
			forward: { on: 'quoteItems', has: 'one', label: 'quote' },
			reverse: { on: 'quotes', has: 'many', label: 'items' }
		},
		quoteItemProduct: {
			forward: { on: 'quoteItems', has: 'one', label: 'product' },
			reverse: { on: 'products', has: 'many', label: 'quoteItems' }
		},
		// Self-referential: eşantiyon satırlarının üst satıra bağlantısı
		quoteItemParent: {
			forward: { on: 'quoteItems', has: 'one', label: 'parent' },
			reverse: { on: 'quoteItems', has: 'many', label: 'children' }
		},
		quoteStatusQuote: {
			forward: { on: 'quoteStatusHistory', has: 'one', label: 'quote' },
			reverse: { on: 'quotes', has: 'many', label: 'statusHistory' }
		},

		// ─── Siparişler ──────────────────────────────────────────────────────────

		// Bir tekliften en fazla bir sipariş oluşur
		orderQuote: {
			forward: { on: 'orders', has: 'one', label: 'sourceQuote' },
			reverse: { on: 'quotes', has: 'one', label: 'order' }
		},
		orderCustomer: {
			forward: { on: 'orders', has: 'one', label: 'customer' },
			reverse: { on: 'customers', has: 'many', label: 'orders' }
		},
		orderItemOrder: {
			forward: { on: 'orderItems', has: 'one', label: 'order' },
			reverse: { on: 'orders', has: 'many', label: 'items' }
		},
		// Self-referential: eşantiyon satırları için
		orderItemParent: {
			forward: { on: 'orderItems', has: 'one', label: 'parent' },
			reverse: { on: 'orderItems', has: 'many', label: 'children' }
		},

		// ─── Activity Feed ───────────────────────────────────────────────────────

		activityFeedCustomer: {
			forward: { on: 'activityFeed', has: 'one', label: 'customer' },
			reverse: { on: 'customers', has: 'many', label: 'activityFeed' }
		},
		activityFeedActor: {
			forward: { on: 'activityFeed', has: 'one', label: 'actor' },
			reverse: { on: 'userProfiles', has: 'many', label: 'activities' }
		},

		// ─── Görevler ────────────────────────────────────────────────────────────

		taskAssignee: {
			forward: { on: 'tasks', has: 'one', label: 'assignee' },
			reverse: { on: 'userProfiles', has: 'many', label: 'assignedTasks' }
		}
	}
});

export type AppSchema = typeof schema;
export default schema;
