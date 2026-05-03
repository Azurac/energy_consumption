import { useAppState } from "../store/AppContext";
import type { ConflictInfo } from "../types";
import styles from "./ConflictModal.module.css";

function formatConsumption(consumption: Record<string, number>): string {
  return Object.entries(consumption)
    .map(([id, val]) => `${id}: ${val.toFixed(2).replace(".", ",")} kWh`)
    .join(", ");
}

interface ConflictCardProps {
  conflict: ConflictInfo;
  onResolve: (accept: boolean) => void;
  onDismiss: () => void;
}

function ConflictCard({ conflict, onResolve, onDismiss }: ConflictCardProps) {
  if (conflict.isIdentical) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.iconInfo}>ℹ</span>
          <strong>Identický soubor</strong>
        </div>
        <p className={styles.description}>
          Soubor <code>{conflict.fileName}</code> ({conflict.existing.label}) je
          již načten a data jsou shodná.
        </p>
        <div className={styles.actions}>
          <button className={styles.btnSecondary} onClick={onDismiss}>
            Zavřít
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.iconWarn}>⚠</span>
        <strong>Konflikt — {conflict.existing.label}</strong>
      </div>
      <p className={styles.description}>
        Soubor <code>{conflict.fileName}</code> obsahuje data pro měsíc, který
        je již načten.
      </p>
      <div className={styles.comparison}>
        <div className={styles.compCol}>
          <div className={styles.compLabel}>Stávající</div>
          <div className={styles.compFileName}>{conflict.existing.fileName}</div>
          <div className={styles.compData}>{formatConsumption(conflict.existing.consumption)}</div>
        </div>
        <div className={styles.compDivider}>vs</div>
        <div className={styles.compCol}>
          <div className={styles.compLabel}>Nový</div>
          <div className={styles.compFileName}>{conflict.incoming.fileName}</div>
          <div className={styles.compData}>{formatConsumption(conflict.incoming.consumption)}</div>
        </div>
      </div>
      <div className={styles.actions}>
        <button className={styles.btnSecondary} onClick={() => onResolve(false)}>
          Ponechat stávající
        </button>
        <button className={styles.btnDanger} onClick={() => onResolve(true)}>
          Přepsat novým
        </button>
      </div>
    </div>
  );
}

export function ConflictModal() {
  const { state, dispatch } = useAppState();
  const { pendingConflicts } = state;

  if (pendingConflicts.length === 0) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>
          {pendingConflicts.length === 1 ? "Upozornění" : `Upozornění (${pendingConflicts.length})`}
        </h2>
        <div className={styles.list}>
          {pendingConflicts.map(conflict => (
            <ConflictCard
              key={conflict.yearMonth}
              conflict={conflict}
              onResolve={accept =>
                dispatch({ type: "RESOLVE_CONFLICT", payload: { yearMonth: conflict.yearMonth, accept } })
              }
              onDismiss={() =>
                dispatch({ type: "DISMISS_CONFLICT", payload: conflict.yearMonth })
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
