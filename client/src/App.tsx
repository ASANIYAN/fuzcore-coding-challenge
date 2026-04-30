import { Outlet } from "react-router-dom";

export default function App() {
  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-64 bg-gradient-to-b from-app-primary-dim/80 to-transparent" />
      <div className="relative z-10 animate-in fade-in duration-300">
        <Outlet />
      </div>
    </div>
  );
}
