# Kod Sözleşmeleri

## Buton Double-Click Koruması

Kullanıcının bir butona iki kez basmasını ve işlemin iki kez çalışmasını önlemek için aşağıdaki kalıp **zorunludur**.

```ts
let saving = $state(false);

async function save() {
    if (saving) return;        // 1. Guard: zaten çalışıyorsa çık
    saving = true;             // 2. HEMEN altında — herhangi bir await'ten ÖNCE
    try {
        await db.transact(...);
    } finally {
        saving = false;        // 3. MUTLAKA finally'de sıfırla
    }
}
```

**Buton:**
```svelte
<button
    onclick={save}
    disabled={saving}
    style={saving ? 'pointer-events: none' : ''}
>
    {saving ? '...' : 'Kaydet'}
</button>
```

### Kural

| Sıra | Satır | Açıklama |
|------|-------|----------|
| 1 | İlk satır | `if (saving) return` — guard kontrolü |
| 2 | İkinci satır | `saving = true` — **herhangi bir `await`'ten önce** |
| 3 | `finally` | `saving = false` — her durumda sıfırla |

> **Neden önemli?** `saving = true` herhangi bir `await`'ten sonra konulursa, ikinci tıklama o `await` süresi boyunca guard'ı geçer ve işlem iki kez çalışır (race condition). Bu özellikle `refreshRates()` gibi ön-işlem `await`'lerinden önce yapılmalıdır.
