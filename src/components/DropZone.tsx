import { useCallback, useState } from "react";
import { useAppState } from "../store/AppContext";
import { parseCSV } from "../utils/csvParser";
import styles from "./DropZone.module.css";

export function DropZone() {
  const { dispatch } = useAppState();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const parsed = [];
    const errors: string[] = [];

    for (const file of Array.from(fileList)) {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        errors.push(`"${file.name}" není CSV soubor.`);
        continue;
      }
      try {
        const text = await file.text();
        parsed.push(parseCSV(file.name, text));
      } catch (e) {
        errors.push(e instanceof Error ? e.message : `Chyba při načítání "${file.name}".`);
      }
    }

    if (parsed.length > 0) {
      dispatch({ type: "ADD_FILES", payload: parsed });
    }
    if (errors.length > 0) {
      setError(errors.join(" "));
    }
  }, [dispatch]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    // Reset input so the same file can be re-dropped
    e.target.value = "";
  }, [processFiles]);

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.zone} ${isDragging ? styles.dragging : ""}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <div className={styles.icon}>↓</div>
        <p className={styles.primary}>Přetáhněte CSV soubory sem</p>
        <p className={styles.secondary}>nebo</p>
        <label className={styles.fileLabel}>
          Vyberte soubory
          <input
            type="file"
            accept=".csv"
            multiple
            className={styles.fileInput}
            onChange={onInputChange}
          />
        </label>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
