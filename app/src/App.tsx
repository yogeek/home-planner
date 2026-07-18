import { useEffect } from 'react';
import { useStore, useMe } from './store';
import { getToken } from './api';
import { connectWs } from './ws';
import { TabBar } from './components/TabBar';
import { Onboarding } from './screens/Onboarding';
import { ProfilePicker } from './screens/ProfilePicker';
import { Village } from './screens/Village';
import { Today } from './screens/Today';
import { Week } from './screens/Week';
import { Shopping } from './screens/Shopping';
import { More } from './screens/More';
import { ChildMode } from './screens/ChildMode';
import { Tablet } from './screens/Tablet';
import { useMediaQuery } from './useMediaQuery';

function NoToken() {
  return (
    <div className="onboarding">
      <div className="ob-panel">
        <h1>Le Village 🏡</h1>
        <p>
          Pour entrer au village, ouvre le lien secret de la famille (celui qui contient la clé). Demande-le à
          Guillaume, puis reviens ici : la porte s'ouvrira toute seule.
        </p>
      </div>
    </div>
  );
}

function ErrorToast() {
  const error = useStore((s) => s.error);
  const clearError = useStore((s) => s.clearError);
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(clearError, 4000);
    return () => clearTimeout(t);
  }, [error, clearError]);
  if (!error) return null;
  return (
    <div className="toast" role="alert">
      {error}
    </div>
  );
}

export default function App() {
  const state = useStore((s) => s.state);
  const loading = useStore((s) => s.loading);
  const tab = useStore((s) => s.tab);
  const childMode = useStore((s) => s.childMode);
  const refresh = useStore((s) => s.refresh);
  const me = useMe();
  const isTablet = useMediaQuery('(min-width: 1024px)');

  const hasToken = !!getToken();

  useEffect(() => {
    if (!hasToken) return;
    void refresh();
    connectWs();
  }, [hasToken, refresh]);

  if (!hasToken) return <NoToken />;
  if (loading || !state) return <div className="spinner" aria-label="Chargement" />;
  if (!state.onboarded) return <Onboarding />;
  if (!me) return <ProfilePicker />;
  if (me.role === 'child' || childMode) return <ChildMode />;
  if (isTablet) return <Tablet />;

  return (
    <div className="app-shell">
      {tab === 'village' && <Village />}
      {tab === 'jour' && <Today />}
      {tab === 'semaine' && <Week />}
      {tab === 'courses' && <Shopping />}
      {tab === 'plus' && <More />}
      <TabBar />
      <ErrorToast />
    </div>
  );
}
