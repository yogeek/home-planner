import { useEscape } from '../useEscape';

/** Explique en clair les glands, les niveaux et l'esprit collectif du village */
export function GameInfo({ onClose }: { onClose: () => void }) {
  useEscape(onClose);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>Comment marche le village ? 🌰</h3>
        <ul className="gameinfo-list">
          <li>
            <strong>Les glands 🌰</strong> sont la monnaie du village. Chaque tâche accomplie en rapporte à toute la
            famille.
          </li>
          <li>
            <strong>C'est collectif</strong> : peu importe qui les gagne, ils s'additionnent et font monter le village
            de niveau.
          </li>
          <li>
            Chaque niveau <strong>débloque un embellissement</strong> pour toujours : le puits fleuri, la fontaine, les
            lampions...
          </li>
          <li>
            <strong>La récolte de la semaine</strong> montre ce que chacun a apporté. C'est fait pour s'entraider, pas
            pour se comparer.
          </li>
          <li>
            Les <strong>zones du village</strong> se ternissent doucement si on oublie leurs tâches, et brillent dès
            qu'on s'en occupe.
          </li>
        </ul>
        <button className="btn sheet-close" onClick={onClose}>
          J'ai compris !
        </button>
      </div>
    </div>
  );
}
