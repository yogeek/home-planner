import { useState } from 'react';
import { useStore, useMe } from '../store';
import { Creature } from '../components/Creature';
import { catInfo } from '../zones';
import { api, getToken } from '../api';
import { useEscape } from '../useEscape';
import type { AppState } from '../types';
import { pushSupported, subscribePush } from '../push';
import { TaskSettings } from './TaskSettings';
import { MembersManager } from './MembersManager';
import { GoalSheet } from '../components/GoalSheet';
import { memberColor } from '../components/Harvest';
import { PinPad } from '../components/PinPad';
import { timeOfDay } from '../components/VillageScene';
import { shortDay } from '../zones';
import { addDays } from '@shared/dates';
import './more.css';

export function More() {
  const state = useStore((s) => s.state);
  const me = useMe();
  const setChildMode = useStore((s) => s.setChildMode);
  const setDashboard = useStore((s) => s.setDashboard);
  const comfort = useStore((s) => s.comfort);
  const setComfort = useStore((s) => s.setComfort);
  const chooseMember = useStore((s) => s.chooseMember);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const call = useStore((s) => s.call);

  if (!state || !me) return null;
  const members = state.members;
  const children = members.filter((m) => m.role === 'child');
  const time = timeOfDay(new Date(state.now));
  const title = time === 'aube' ? 'Le coin du matin' : time === 'jour' ? 'Le coin de la famille' : 'Le coin du soir';

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

  const doneThisWeek = state.week.filter((o) => o.status === 'done').length;
  const monthTotal = (m: { id: string }) => state.monthTotals[m.id]?.total ?? 0;

  return (
    <div className="screen more-screen">
      <div className="title-row">
        <h2>{title}</h2>
      </div>

      {/* Qui utilise l'app (changement de profil, mode enfant) */}
      <div className="card more-card profile-card">
        <div className="profile-current">
          {me && <Creature species={me.creature} size={44} />}
          <div>
            <span className="muted">Tu es</span>
            <strong className="profile-name">{me?.name}</strong>
          </div>
        </div>
        <div className="profile-actions">
          <button className="btn" onClick={() => chooseMember('')}>
            🔄 Changer de personne
          </button>
          {children.map((c) => (
            <button key={c.id} className="btn secondary" onClick={() => setChildMode(c.id)}>
              🧸 Mode {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* La récolte de la semaine, en détail */}
      <div className="card more-card">
        <h3>🌾 La récolte en détail</h3>
        <p className="muted">
          Cette semaine, vous avez accompli <strong>{doneThisWeek}</strong> mission{doneThisWeek > 1 ? 's' : ''}{' '}
          ensemble.
        </p>
        <div className="bal-duo">
          {members.map((a) => {
            const v = state.weekGlands[a.id] ?? 0;
            const maxG = Math.max(1, ...members.map((m) => state.weekGlands[m.id] ?? 0));
            return (
              <div key={a.id} className="bal-row">
                <Creature species={a.creature} size={32} />
                <div className="bal-bar">
                  <div className="bal-fill" style={{ width: `${Math.max(4, (v / maxG) * 100)}%`, background: memberColor(members, a.id) }} />
                </div>
                <span className="bal-num">{v} 🌰</span>
              </div>
            );
          })}
        </div>
        <p className="muted bal-month">
          Sur les 4 dernières semaines : {members.map((m) => `${m.name} ${monthTotal(m)} 🌰`).join(' · ')}
        </p>
      </div>

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
          {weekDone.slice(0, 15).map((o) => {
            const who = state.members.find((m) => m.id === o.assignee);
            const hearts = state.thanks.filter((t) => t.occurrenceId === o.id);
            const thanked = hearts.some((t) => t.from === me.id);
            return (
              <li key={o.id}>
                {who && <Creature species={who.creature} size={22} />}
                <span className="journal-text">
                  <strong>{who?.name}</strong> · {o.title} {catInfo(state.categories, o.zone).emoji}
                  {hearts.length > 0 && <span className="journal-hearts"> {'💛'.repeat(Math.min(hearts.length, 5))}</span>}
                </span>
                {o.assignee !== me.id && (
                  <button
                    className={`journal-thanks ${thanked ? 'on' : ''}`}
                    disabled={thanked}
                    onClick={() => void call(`/occurrences/${o.id}/thanks`, { from: me.id })}
                    aria-label={thanked ? `Merci envoyé à ${who?.name}` : `Dire merci à ${who?.name} pour ${o.title}`}
                  >
                    {thanked ? '💛' : 'Merci'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* La vie de famille : objectif, vacances, récompenses, code parent */}
      <div className="card more-card">
        <h3>👪 Vie de famille</h3>
        <div className="family-rows">
          <button className="family-row" onClick={() => setGoalOpen(true)}>
            <span>🎯 Objectif de la semaine</span>
            <span className="muted">
              {state.settings.weeklyGoal ? `${state.settings.weeklyGoal} 🌰${state.settings.goalReward ? ` → ${state.settings.goalReward}` : ''}` : 'aucun'}
            </span>
          </button>
          <button className="family-row" onClick={() => setPauseOpen(true)}>
            <span>🏖️ Mode vacances</span>
            <span className="muted">
              {state.settings.pauseUntil && state.settings.pauseUntil >= state.today
                ? `jusqu'au ${shortDay(state.settings.pauseUntil)}`
                : 'désactivé'}
            </span>
          </button>
          <button className="family-row" onClick={() => setRewardsOpen(true)}>
            <span>🎁 Récompenses des enfants</span>
            <span className="muted">{state.rewards.length ? `${state.rewards.length} récompense${state.rewards.length > 1 ? 's' : ''}` : 'à créer'}</span>
          </button>
          <button className="family-row" onClick={() => setPinOpen(true)}>
            <span>🔒 Code parent</span>
            <span className="muted">{state.settings.hasPin ? 'activé' : 'aucun'}</span>
          </button>
        </div>
      </div>

      {/* Confort de lecture */}
      <div className="card more-card">
        <h3>🔎 Confort de lecture</h3>
        <p className="muted">Agrandit les textes de toute l'application, pour lire plus facilement.</p>
        <label className="comfort-toggle">
          <input type="checkbox" checked={comfort} onChange={(e) => setComfort(e.target.checked)} />
          Vue confortable (gros texte)
        </label>
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
        <button className="btn secondary" onClick={() => setMembersOpen(true)}>
          👪 Gérer les habitants
        </button>
        <button className="btn secondary" onClick={() => setSettingsOpen(true)}>
          🛠️ Régler les tâches du foyer
        </button>
        <button className="btn secondary" onClick={() => setDashboard(true)}>
          🖼️ Mode tableau du foyer (tablette)
        </button>
        <button className="btn secondary" onClick={share}>
          {copied ? 'Lien copié ! ✅' : '💌 Inviter sur cet appareil-là'}
        </button>
      </div>

      {/* Zone dangereuse */}
      <div className="card more-card danger-card">
        <h3>⚠️ Zone dangereuse</h3>
        <p className="muted">
          Remettre le village à zéro efface tout, pour tout le monde : habitants, noisettes, niveau, déblocages,
          historique, tâches et liste de courses. Utile pour repartir sur de bonnes bases ou après des tests.
        </p>
        <button className="btn danger-btn" onClick={() => setResetOpen(true)}>
          🧨 Réinitialiser le village...
        </button>
      </div>

      <p className="more-footer muted">Le Village · fait avec 🌰 pour la famille</p>

      {settingsOpen && <TaskSettings onClose={() => setSettingsOpen(false)} />}
      {membersOpen && <MembersManager onClose={() => setMembersOpen(false)} />}
      {resetOpen && <ResetSheet onClose={() => setResetOpen(false)} />}
      {goalOpen && <GoalSheet onClose={() => setGoalOpen(false)} />}
      {pauseOpen && <PauseSheet onClose={() => setPauseOpen(false)} />}
      {pinOpen && <PinSettings onClose={() => setPinOpen(false)} />}
      {rewardsOpen && <RewardsSheet onClose={() => setRewardsOpen(false)} />}
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
          <li>les {`noisettes`}, le niveau et tous les déblocages du village,</li>
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

/** Mode vacances : plus de tâches récurrentes ni de rappels, les zones ne se ternissent pas */
function PauseSheet({ onClose }: { onClose: () => void }) {
  useEscape(onClose);
  const state = useStore((s) => s.state);
  const call = useStore((s) => s.call);
  const notifyInfo = useStore((s) => s.notifyInfo);
  const [until, setUntil] = useState(state?.settings.pauseUntil ?? '');
  if (!state) return null;
  const active = !!state.settings.pauseUntil && state.settings.pauseUntil >= state.today;

  async function save(v: string | null) {
    if (await call('/settings', { pauseUntil: v }, 'PUT')) {
      notifyInfo(v ? `Bonnes vacances ! 🏖️ Jusqu'au ${shortDay(v)}` : 'Le village reprend vie 🌱');
      onClose();
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>🏖️ Mode vacances</h3>
        <p className="muted">
          Toute la famille part ? Pendant les vacances, plus de tâches récurrentes ni de rappels, et les zones du village
          ne se ternissent pas. Les tâches ponctuelles restent. Pour une seule personne absente, passe plutôt par « Gérer
          les habitants ».
        </p>
        <div className="move-row wrap">
          {[
            { label: 'Ce week-end', v: addDays(state.today, Math.max(1, 6 - ((new Date(state.today + 'T12:00:00Z').getUTCDay() + 6) % 7))) },
            { label: '1 semaine', v: addDays(state.today, 6) },
            { label: '2 semaines', v: addDays(state.today, 13) },
            { label: '3 semaines', v: addDays(state.today, 20) },
          ].map((o) => (
            <button key={o.label} aria-pressed={until === o.v} className={`move-chip ${until === o.v ? 'active' : ''}`} onClick={() => setUntil(o.v)}>
              {o.label}
            </button>
          ))}
          <label className="move-chip tset-date">
            jusqu'au
            <input type="date" min={state.today} value={until} onChange={(e) => setUntil(e.target.value)} />
          </label>
        </div>
        <button className="btn sheet-close" disabled={!until} onClick={() => void save(until)}>
          {active ? 'Modifier les vacances' : 'Partir en vacances'}
        </button>
        {active && (
          <button className="btn secondary sheet-close" onClick={() => void save(null)}>
            Nous sommes rentrés !
          </button>
        )}
      </div>
    </div>
  );
}

/** Code parent : protège la validation des missions, la sortie du mode enfant et les récompenses */
function PinSettings({ onClose }: { onClose: () => void }) {
  useEscape(onClose);
  const state = useStore((s) => s.state);
  const call = useStore((s) => s.call);
  const notifyInfo = useStore((s) => s.notifyInfo);
  const [oldPin, setOldPin] = useState<string | null>(state?.settings.hasPin ? null : '');
  const [pin, setPin] = useState('');
  if (!state) return null;

  if (oldPin === null) {
    return <PinPad title="Code actuel" onClose={onClose} onSuccess={(p) => setOldPin(p)} />;
  }

  async function save(newPin: string) {
    if (await call('/pin', { pin: newPin, oldPin }, 'POST')) {
      notifyInfo(newPin ? 'Code parent enregistré 🔒' : 'Code parent retiré');
      onClose();
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>🔒 Code parent</h3>
        <p className="muted">
          4 chiffres que les enfants ne connaissent pas. Il sera demandé pour valider une mission enfant, sortir du mode
          enfant et offrir une récompense.
        </p>
        <input
          className="ob-input pin-input"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          placeholder="• • • •"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          aria-label="Nouveau code à 4 chiffres"
        />
        <button className="btn sheet-close" disabled={pin.length !== 4} onClick={() => void save(pin)}>
          Enregistrer le code
        </button>
        {state.settings.hasPin && (
          <button className="btn secondary sheet-close" onClick={() => void save('')}>
            Retirer le code
          </button>
        )}
      </div>
    </div>
  );
}

/** Récompenses que les enfants obtiennent avec leurs noisettes */
function RewardsSheet({ onClose }: { onClose: () => void }) {
  useEscape(onClose);
  const state = useStore((s) => s.state);
  const call = useStore((s) => s.call);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎁');
  const [cost, setCost] = useState(20);
  if (!state) return null;
  const young = state.members.filter((m) => m.role !== 'adult');

  async function add() {
    if (!title.trim()) return;
    if (await call('/rewards', { title: title.trim(), emoji, cost })) {
      setTitle('');
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>🎁 Les récompenses</h3>
        <p className="muted">
          Les enfants et ados dépensent les noisettes qu'ils ont gagnées. Elles ne sont pas retirées du village : c'est
          une tirelire à part.
        </p>
        {young.length > 0 && (
          <p className="muted">
            Tirelires :{' '}
            {young.map((m) => `${m.name} ${(state.stars[m.id]?.earned ?? 0) - (state.stars[m.id]?.spent ?? 0)} 🌰`).join(' · ')}
          </p>
        )}
        <ul className="reward-list">
          {state.rewards.map((r) => (
            <li key={r.id}>
              <span className="reward-emoji">{r.emoji}</span>
              <span className="reward-title">{r.title}</span>
              <span className="muted">{r.cost} 🌰</span>
              <button className="reward-del" onClick={() => void call(`/rewards/${r.id}`, {}, 'DELETE')} aria-label={`Supprimer ${r.title}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="move-row wrap">
          {['🎁', '🛝', '🍦', '🎬', '📚', '🎮', '🏖️', '🍕'].map((e) => (
            <button key={e} aria-pressed={emoji === e} className={`move-chip ${emoji === e ? 'active' : ''}`} onClick={() => setEmoji(e)}>
              {e}
            </button>
          ))}
        </div>
        <input
          className="ob-input"
          placeholder="ex : sortie au parc, une glace, choisir le film"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={60}
        />
        <div className="move-row wrap">
          {[10, 20, 30, 50, 100].map((c) => (
            <button key={c} aria-pressed={cost === c} className={`move-chip ${cost === c ? 'active' : ''}`} onClick={() => setCost(c)}>
              {c} 🌰
            </button>
          ))}
        </div>
        <button className="btn sheet-close" disabled={!title.trim()} onClick={() => void add()}>
          Ajouter la récompense
        </button>
        {state.claims.length > 0 && (
          <p className="muted">
            Dernières obtenues :{' '}
            {state.claims
              .slice(0, 5)
              .map((c) => `${state.members.find((m) => m.id === c.memberId)?.name ?? '?'} ${c.emoji} ${c.title}`)
              .join(' · ')}
          </p>
        )}
        <button className="btn secondary sheet-close" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  );
}
