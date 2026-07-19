import { useState } from 'react';
import { useStore, useMe } from '../store';
import { Creature } from '../components/Creature';
import { catInfo } from '../zones';
import { api, getToken } from '../api';
import { useEscape } from '../useEscape';
import type { AppState } from '../types';
import { pushSupported, subscribePush } from '../push';
import { TaskSettings } from './TaskSettings';
import './more.css';

export function More() {
  const state = useStore((s) => s.state);
  const me = useMe();
  const setChildMode = useStore((s) => s.setChildMode);
  const setDashboard = useStore((s) => s.setDashboard);
  const chooseMember = useStore((s) => s.chooseMember);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  if (!state || !me) return null;
  const adults = state.members.filter((m) => m.role === 'adult');
  const child = state.members.find((m) => m.role === 'child');
  const balance = state.balance;

  const weekDone = state.week
    .filter((o) => o.status === 'done')
    .sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''));

  const myProgress = state.progress.find((p) => p.memberId === me.id);

  async function activatePush() {
    setPushStatus('...');
    const r = await subscribePush();
    setPushStatus(
      r === 'ok'
        ? 'Notifications activées sur cet appareil ✅'
        : r === 'denied'
          ? 'Notifications refusées dans le navigateur'
          : r === 'unsupported'
            ? "Ce navigateur ne les prend pas en charge (sur iPhone : ajoute d'abord l'app à l'écran d'accueil)"
            : "Impossible d'activer, réessaie plus tard",
    );
  }

  async function share() {
    const url = `${location.origin}/?k=${encodeURIComponent(getToken() ?? '')}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Le Village', text: 'Rejoins notre village !', url });
        return;
      }
    } catch {
      // partage annulé
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const total = balance ? balance.totals[adults[0].id] + balance.totals[adults[1].id] : 0;

  return (
    <div className="screen more-screen">
      <div className="title-row">
        <h2>Le coin du soir</h2>
      </div>

      {/* Équilibre détaillé */}
      {balance && adults.length === 2 && (
        <div className="card more-card">
          <h3>⚖️ L'équilibre en détail</h3>
          <p className="muted">
            Cette semaine, vous avez accompli{' '}
            <strong>{state.week.filter((o) => o.status === 'done').length}</strong> mission
            {state.week.filter((o) => o.status === 'done').length > 1 ? 's' : ''} ensemble.
          </p>
          <div className="bal-duo">
            {adults.map((a) => {
              const v = balance.totals[a.id];
              const pct = total === 0 ? 50 : Math.round((v / total) * 100);
              return (
                <div key={a.id} className="bal-row">
                  <Creature species={a.creature} size={32} />
                  <div className="bal-bar">
                    <div className="bal-fill" style={{ width: `${Math.max(4, pct)}%`, background: a.color }} />
                  </div>
                  <span className="bal-num">
                    {v} 🌰
                  </span>
                </div>
              );
            })}
          </div>
          <p className="muted bal-month">
            Sur les 4 dernières semaines :{' '}
            {adults
              .map((a) => `${a.name} ${state.monthTotals[a.id]?.total ?? 0} 🌰`)
              .join(' · ')}
            {child && state.monthTotals[child.id] ? ` · ${child.name} ${state.monthTotals[child.id].total} 🌰` : ''}
          </p>
        </div>
      )}

      {/* Ma série */}
      {myProgress && (
        <div className="card more-card">
          <h3>🔥 Ta série</h3>
          <p>
            {myProgress.streak > 0 ? (
              <>
                <strong>{myProgress.streak} jour{myProgress.streak > 1 ? 's' : ''} d'affilée</strong> avec au moins une
                mission accomplie. Record : {myProgress.bestStreak}.
              </>
            ) : (
              <>Fais une mission aujourd'hui pour lancer ta série ! Record : {myProgress.bestStreak}.</>
            )}
          </p>
        </div>
      )}

      {/* Journal de la semaine */}
      <div className="card more-card">
        <h3>📜 Le journal du village</h3>
        {weekDone.length === 0 && <p className="muted">Rien encore cette semaine. La première mission lance l'histoire !</p>}
        <ul className="journal">
          {weekDone.slice(0, 12).map((o) => {
            const who = state.members.find((m) => m.id === o.assignee);
            return (
              <li key={o.id}>
                {who && <Creature species={who.creature} size={22} />}
                <span>
                  <strong>{who?.name}</strong> · {o.title} {catInfo(state.categories, o.zone).emoji}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Notifications */}
      <div className="card more-card">
        <h3>🔔 Rappels doux</h3>
        <p className="muted">
          Un résumé le matin, un rappel le soir seulement si besoin. {pushSupported() ? '' : "(sur iPhone : ajoute d'abord l'app à l'écran d'accueil)"}
        </p>
        <button className="btn secondary" onClick={activatePush}>
          Activer sur cet appareil
        </button>
        {pushStatus && <p className="muted push-status">{pushStatus}</p>}
      </div>

      {/* Actions */}
      <div className="more-actions">
        {child && (
          <button className="btn" onClick={() => setChildMode(true)}>
            🧸 Mode {child.name}
          </button>
        )}
        <button className="btn secondary" onClick={() => setSettingsOpen(true)}>
          🛠️ Régler les tâches du foyer
        </button>
        <button className="btn secondary" onClick={() => setDashboard(true)}>
          🖼️ Mode tableau du foyer (tablette)
        </button>
        <button className="btn secondary" onClick={share}>
          {copied ? 'Lien copié ! ✅' : '💌 Inviter sur cet appareil-là'}
        </button>
        <button className="btn secondary" onClick={() => chooseMember('')}>
          👤 Changer de profil
        </button>
      </div>

      {/* Zone dangereuse */}
      <div className="card more-card danger-card">
        <h3>⚠️ Zone dangereuse</h3>
        <p className="muted">
          Remettre le village à zéro efface tout, pour tout le monde : habitants, glands, niveau, déblocages,
          historique, tâches et liste de courses. Utile pour repartir sur de bonnes bases ou après des tests.
        </p>
        <button className="btn danger-btn" onClick={() => setResetOpen(true)}>
          🧨 Réinitialiser le village...
        </button>
      </div>

      <p className="more-footer muted">Le Village · fait avec 🌰 pour la famille</p>

      {settingsOpen && <TaskSettings onClose={() => setSettingsOpen(false)} />}
      {resetOpen && <ResetSheet onClose={() => setResetOpen(false)} />}
    </div>
  );
}

function ResetSheet({ onClose }: { onClose: () => void }) {
  useEscape(onClose);
  const applyState = useStore((s) => s.applyState);
  const chooseMember = useStore((s) => s.chooseMember);
  const setDashboard = useStore((s) => s.setDashboard);
  const setTab = useStore((s) => s.setTab);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  async function reset() {
    if (confirm.trim().toUpperCase() !== 'EFFACER' || busy) return;
    setBusy(true);
    try {
      const s = await api<AppState>('/reset', { body: { confirm: 'EFFACER' } });
      // Nettoyage local : profil, cache, file hors ligne, mode tableau
      chooseMember('');
      localStorage.removeItem('village.cache');
      localStorage.removeItem('village.queue');
      setDashboard(false);
      setTab('village');
      applyState(s);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>🧨 Réinitialiser le village ?</h3>
        <p>
          <strong>Cette action est définitive et concerne toute la famille.</strong> Elle efface :
        </p>
        <ul className="reset-list">
          <li>les habitants et leurs créatures,</li>
          <li>les {`glands`}, le niveau et tous les déblocages du village,</li>
          <li>l'historique des missions et les séries de chacun,</li>
          <li>toutes les tâches (récurrentes et ponctuelles),</li>
          <li>la liste de courses et les habitudes apprises,</li>
          <li>les catégories personnalisées et les rappels.</li>
        </ul>
        <p className="muted">Rien ne pourra être récupéré. Pour confirmer, écris EFFACER :</p>
        <input
          className="ob-input"
          placeholder="EFFACER"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoCapitalize="characters"
        />
        <button
          className="btn danger-btn sheet-close"
          disabled={confirm.trim().toUpperCase() !== 'EFFACER' || busy}
          onClick={() => void reset()}
        >
          {busy ? '...' : 'Tout effacer définitivement'}
        </button>
        <button className="btn secondary sheet-close" onClick={onClose}>
          Annuler
        </button>
      </div>
    </div>
  );
}
