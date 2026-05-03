import { useAppState } from "../store/AppContext";
import styles from "./AliasTable.module.css";

export function AliasTable() {
  const { state, dispatch } = useAppState();
  const { aliases } = state;

  if (aliases.length === 0) {
    return <p className={styles.empty}>Žádné identifikátory zatím nejsou načteny.</p>;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Identifikátor</th>
            <th>Alias (zobrazovaný název)</th>
          </tr>
        </thead>
        <tbody>
          {aliases.map(({ id, alias }) => (
            <tr key={id}>
              <td className={styles.tdId}>{id}</td>
              <td>
                <input
                  type="text"
                  className={styles.input}
                  value={alias}
                  placeholder={id}
                  onChange={e =>
                    dispatch({ type: "SET_ALIAS", payload: { id, alias: e.target.value } })
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
