import { useState } from "react";
import { useAppState } from "../store/AppContext";
import { exportToPDF } from "../utils/pdfExport";
import styles from "./Summary.module.css";

export function Summary() {
  const { state, dispatch } = useAppState();
  const { files, aliases, pricePerKwh } = state;
  // Track which identifier is currently exporting
  const [exportingId, setExportingId] = useState<string | null>(null);

  const allIds = [...new Set(files.flatMap(f => Object.keys(f.consumption)))];

  function resolveLabel(id: string): string {
    const alias = aliases.find(a => a.id === id)?.alias.trim();
    return alias || id;
  }

  function totalConsumption(id: string): number {
    return files.reduce((sum, f) => sum + (f.consumption[id] ?? 0), 0);
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value.replace(",", "."));
    if (!isNaN(val) && val >= 0) {
      dispatch({ type: "SET_PRICE", payload: val });
    }
  };

  const handleExport = async (id: string) => {
    if (exportingId) return;
    setExportingId(id);
    try {
      await exportToPDF(id, files, aliases, pricePerKwh);
    } catch (e) {
      alert("Export se nezdařil. Zkontrolujte připojení k internetu.");
      console.error(e);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.priceRow}>
        <label className={styles.priceLabel} htmlFor="priceInput">
          Cena za jednotku
        </label>
        <div className={styles.priceInputWrapper}>
          <input
            id="priceInput"
            type="number"
            min="0"
            step="0.01"
            className={styles.priceInput}
            value={pricePerKwh}
            onChange={handlePriceChange}
          />
          <span className={styles.priceUnit}>Kč / kWh</span>
        </div>
      </div>

      {allIds.length === 0 ? (
        <p className={styles.empty}>Žádné identifikátory k zobrazení.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Identifikátor</th>
                <th className={styles.thRight}>Celková spotřeba</th>
                <th className={styles.thRight}>Celková cena</th>
                <th className={styles.thAction}>Export</th>
              </tr>
            </thead>
            <tbody>
              {allIds.map(id => {
                const total = totalConsumption(id);
                const isExporting = exportingId === id;
                return (
                  <tr key={id}>
                    <td className={styles.tdLabel}>{resolveLabel(id)}</td>
                    <td className={styles.tdRight}>
                      {total.toFixed(2).replace(".", ",")} kWh
                    </td>
                    <td className={styles.tdRight}>
                      {(total * pricePerKwh).toFixed(2).replace(".", ",")} Kč
                    </td>
                    <td className={styles.tdAction}>
                      <button
                        className={styles.pdfBtn}
                        onClick={() => handleExport(id)}
                        disabled={exportingId !== null}
                        title={`Exportovat PDF pro ${resolveLabel(id)}`}
                      >
                        {isExporting ? "..." : "PDF ↓"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
