import { useAppState } from "../store/AppContext";
import styles from "./FileList.module.css";

export function FileList() {
  const { state, dispatch } = useAppState();
  const { files, aliases } = state;

  if (files.length === 0) {
    return <p className={styles.empty}>Žádné soubory nejsou načteny.</p>;
  }

  const sortedFiles = [...files].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

  // Collect all identifiers across all files (maintain insertion order)
  const allIds = [...new Set(sortedFiles.flatMap(f => Object.keys(f.consumption)))];

  function resolveLabel(id: string): string {
    const alias = aliases.find(a => a.id === id)?.alias.trim();
    return alias || id;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thFile}>Soubor / Měsíc</th>
              {allIds.map(id => (
                <th key={id} className={styles.thId}>{resolveLabel(id)}</th>
              ))}
              <th className={styles.thAction} />
            </tr>
          </thead>
          <tbody>
            {sortedFiles.map(file => (
              <tr key={file.yearMonth}>
                <td className={styles.tdFile}>
                  <span className={styles.month}>{file.label}</span>
                  <span className={styles.fileName}>{file.fileName}</span>
                </td>
                {allIds.map(id => (
                  <td key={id} className={styles.tdValue}>
                    {file.consumption[id] !== undefined
                      ? file.consumption[id].toFixed(2).replace(".", ",")
                      : <span className={styles.missing}>—</span>}
                  </td>
                ))}
                <td className={styles.tdAction}>
                  <button
                    className={styles.removeBtn}
                    onClick={() => dispatch({ type: "REMOVE_FILE", payload: file.yearMonth })}
                    title="Odebrat soubor"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
