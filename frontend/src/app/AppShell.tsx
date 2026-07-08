import { Outlet } from "react-router-dom";
import { TopBar } from "./components/TopBar";
import { BottomNav } from "./components/BottomNav";
import "./AppShell.css";

// Layout base do app: barra superior + conteúdo roteado + navegação inferior.
export function AppShell() {
  return (
    <div className="app-shell">
      <TopBar />
      <main className="app-shell__content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
