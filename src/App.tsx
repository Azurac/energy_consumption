import { AppProvider, useAppState } from "./store/AppContext";
import { ViewMode } from "./types";
import { DropZone } from "./components/DropZone";
import { Section } from "./components/Section";
import { ViewToggle } from "./components/ViewToggle";
import { FileList } from "./components/FileList";
import { ConsumptionChart } from "./components/ConsumptionChart";
import { AliasTable } from "./components/AliasTable";
import { Summary } from "./components/Summary";
import { ConflictModal } from "./components/ConflictModal";
import styles from "./App.module.css";

function AppContent() {
  const { state } = useAppState();

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.appTitle}>Spotřeba energie</h1>
        <p className={styles.appSubtitle}>Zpracování a přehled dat ze CSV souborů</p>
      </header>

      <main className={styles.main}>
        <Section title="Načtení souborů">
          <DropZone />
        </Section>

        <Section
          title="Data"
          action={<ViewToggle />}
        >
          {state.viewMode === ViewMode.List ? <FileList /> : <ConsumptionChart />}
        </Section>

        <Section title="Identifikátory a aliasy">
          <AliasTable />
        </Section>

        <Section title="Souhrn a export">
          <Summary />
        </Section>
      </main>

      <ConflictModal />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
