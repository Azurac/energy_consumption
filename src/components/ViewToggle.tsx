import { ViewMode } from "../types";
import { useAppState } from "../store/AppContext";
import styles from "./ViewToggle.module.css";

export function ViewToggle() {
  const { state, dispatch } = useAppState();

  return (
    <div className={styles.toggle}>
      <button
        className={`${styles.btn} ${state.viewMode === ViewMode.List ? styles.active : ""}`}
        onClick={() => dispatch({ type: "SET_VIEW_MODE", payload: ViewMode.List })}
      >
        ☰ Seznam
      </button>
      <button
        className={`${styles.btn} ${state.viewMode === ViewMode.Chart ? styles.active : ""}`}
        onClick={() => dispatch({ type: "SET_VIEW_MODE", payload: ViewMode.Chart })}
      >
        ▦ Graf
      </button>
    </div>
  );
}
