import { useState } from 'react';
import { api } from '../api';
import { useEscape } from '../useEscape';
import './pinpad.css';

/** Pavé du code parent (4 chiffres). Vérifie auprès du serveur puis rend la main avec le code saisi. */
export function PinPad({ title, onSuccess, onClose }: { title: string; onSuccess: (pin: string) => void; onClose: () => void }) {
  useEscape(onClose);
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);

  async function press(d: string) {
    if (busy) return;
    const next = (pin + d).slice(0, 4);
    setWrong(false);
    setPin(next);
    if (next.length < 4) return;
    setBusy(true);
    try {
      const r = await api<{ ok: boolean }>('/pin/check', { body: { pin: next } });
      if (r.ok) onSuccess(next);
      else {
        setWrong(true);
        setPin('');
      }
    } catch {
      setWrong(true);
      setPin('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet pinpad" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <h3>🔒 {title}</h3>
        <p className="muted">{wrong ? 'Ce n’est pas le bon code, réessaie.' : 'Code parent à 4 chiffres'}</p>
        <div className={`pin-dots ${wrong ? 'shake' : ''}`} aria-live="polite" aria-label={`${pin.length} chiffres saisis`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`pin-dot ${i < pin.length ? 'on' : ''}`} />
          ))}
        </div>
        <div className="pin-keys">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} className="pin-key" onClick={() => void press(d)}>
              {d}
            </button>
          ))}
          <button className="pin-key ghost" onClick={onClose} aria-label="Annuler">
            ✕
          </button>
          <button className="pin-key" onClick={() => void press('0')}>
            0
          </button>
          <button className="pin-key ghost" onClick={() => setPin(pin.slice(0, -1))} aria-label="Effacer">
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
