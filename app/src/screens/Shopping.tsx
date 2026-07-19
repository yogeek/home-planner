import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { AISLE_ORDER, AISLE_EMOJI } from '../zones';
import type { ShoppingItem } from '../types';
import { useEscape } from '../useEscape';
import './shopping.css';

/** Fiche article : changer de rayon ou de quantité */
function ItemSheet({ item, onClose }: { item: ShoppingItem; onClose: () => void }) {
  useEscape(onClose);
  const updateShoppingItem = useStore((s) => s.updateShoppingItem);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>{item.label}</h3>
        <p className="muted">Quantité :</p>
        <div className="move-row">
          <button
            className="move-chip"
            disabled={item.qty <= 1}
            onClick={() => void updateShoppingItem(item, { qty: item.qty - 1 })}
          >
            −
          </button>
          <span className="shop-qty-value display">×{item.qty}</span>
          <button className="move-chip" onClick={() => void updateShoppingItem(item, { qty: item.qty + 1 })}>
            +
          </button>
        </div>
        <p className="muted">Rayon :</p>
        <div className="move-row wrap">
          {AISLE_ORDER.map((a) => (
            <button
              key={a}
              className={`move-chip ${item.aisle === a ? 'active' : ''}`}
              onClick={() => {
                void updateShoppingItem(item, { aisle: a });
                onClose();
              }}
            >
              {AISLE_EMOJI[a]} {a}
            </button>
          ))}
        </div>
        <button className="btn secondary sheet-close" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  );
}

export function Shopping() {
  const state = useStore((s) => s.state);
  const addShoppingItem = useStore((s) => s.addShoppingItem);
  const toggleShoppingItem = useStore((s) => s.toggleShoppingItem);
  const removeShoppingItem = useStore((s) => s.removeShoppingItem);
  const checkoutShopping = useStore((s) => s.checkoutShopping);
  const [input, setInput] = useState('');
  const [detail, setDetail] = useState<ShoppingItem | null>(null);

  const open = useMemo(() => state?.shopping.filter((i) => i.status === 'open') ?? [], [state]);
  const checked = useMemo(() => state?.shopping.filter((i) => i.status === 'checked') ?? [], [state]);

  if (!state) return null;

  const inList = new Set(state.shopping.map((i) => i.label.toLowerCase()));
  const chips = [
    ...state.suggestions.filter((l) => !inList.has(l.toLowerCase())).map((l) => ({ label: l, due: true })),
    ...state.frequent.filter((l) => !inList.has(l.toLowerCase()) && !state.suggestions.includes(l)).map((l) => ({ label: l, due: false })),
  ].slice(0, 8);

  const byAisle = (items: ShoppingItem[]) => {
    const groups = new Map<string, ShoppingItem[]>();
    for (const aisle of AISLE_ORDER) {
      const list = items.filter((i) => i.aisle === aisle);
      if (list.length) groups.set(aisle, list);
    }
    const other = items.filter((i) => !AISLE_ORDER.includes(i.aisle as (typeof AISLE_ORDER)[number]));
    if (other.length) groups.set('autre', [...(groups.get('autre') ?? []), ...other]);
    return groups;
  };

  async function add(label: string) {
    const clean = label.trim();
    if (!clean) return;
    setInput('');
    await addShoppingItem(clean);
  }

  return (
    <div className="screen shopping-screen">
      <div className="title-row">
        <h2>Le marché</h2>
        {open.length > 0 && <span className="shop-count">{open.length} article{open.length > 1 ? 's' : ''}</span>}
      </div>

      <div className="shop-addbar">
        <input
          className="shop-input"
          placeholder="Ajouter un article..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void add(input)}
          enterKeyHint="done"
        />
        <button className="btn shop-addbtn" onClick={() => void add(input)} disabled={!input.trim()} aria-label="Ajouter">
          +
        </button>
      </div>

      {chips.length > 0 && (
        <div className="shop-chips">
          {chips.map((c) => (
            <button key={c.label} className={`shop-chip ${c.due ? 'due' : ''}`} onClick={() => void add(c.label)}>
              {c.due ? '💡 ' : '+ '}
              {c.label}
            </button>
          ))}
        </div>
      )}

      {open.length === 0 && checked.length === 0 && (
        <div className="card shop-empty">
          <p className="display">Le panier est vide 🧺</p>
          <p className="muted">Ajoute des articles au fil de la semaine, chacun voit la liste en direct.</p>
        </div>
      )}

      {[...byAisle(open)].map(([aisle, items]) => (
        <section key={aisle} className="shop-aisle">
          <h3>
            {AISLE_EMOJI[aisle]} {aisle}
          </h3>
          {items.map((item) => (
            <div key={item.id} className="shop-item">
              <button className="shop-check" onClick={() => void toggleShoppingItem(item)} aria-label={`Prendre ${item.label}`}>
                ⬜
              </button>
              <button className="shop-label" onClick={() => setDetail(item)} title="Changer de rayon ou de quantité">
                {item.label}
                {item.qty > 1 && <span className="shop-qty"> ×{item.qty}</span>}
              </button>
              <button className="shop-del" onClick={() => void removeShoppingItem(item)} aria-label={`Retirer ${item.label}`}>
                ✕
              </button>
            </div>
          ))}
        </section>
      ))}

      {checked.length > 0 && (
        <>
          <section className="shop-aisle checked">
            <h3>Dans le caddie</h3>
            {checked.map((item) => (
              <div key={item.id} className="shop-item done">
                <button className="shop-check" onClick={() => void toggleShoppingItem(item)} aria-label={`Reposer ${item.label}`}>
                  ✅
                </button>
                <span className="shop-label">
                  {item.label}
                  {item.qty > 1 && <span className="shop-qty"> ×{item.qty}</span>}
                </span>
              </div>
            ))}
          </section>
          <button className="btn shop-checkout" onClick={() => void checkoutShopping()}>
            🛒 Terminer les courses ({checked.length})
          </button>
        </>
      )}

      {detail && <ItemSheet item={state.shopping.find((i) => i.id === detail.id) ?? detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
