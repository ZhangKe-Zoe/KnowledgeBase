import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Market } from './pages/Market';
import { Watchlist } from './pages/Watchlist';
import { FundDetail } from './pages/FundDetail';
import { Strategy } from './pages/Strategy';
import { Backtest } from './pages/Backtest';
import { Report } from './pages/Report';
import { Recommend } from './pages/Recommend';

export default function App() {
  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-y-auto pb-16">
        <Routes>
          <Route path="/" element={<Navigate to="/watchlist" replace />} />
          <Route path="/market" element={<Market />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/recommend" element={<Recommend />} />
          <Route path="/fund/:code" element={<FundDetail />} />
          <Route path="/strategy" element={<Strategy />} />
          <Route path="/backtest/:strategyId" element={<Backtest />} />
          <Route path="/report/:runId" element={<Report />} />
        </Routes>
      </main>
      <nav className="fixed bottom-0 inset-x-0 flex border-t border-slate-800 bg-slate-900/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <Tab to="/watchlist" label="自选" />
        <Tab to="/recommend" label="推荐" />
        <Tab to="/market" label="行情" />
        <Tab to="/strategy" label="策略" />
      </nav>
    </div>
  );
}

function Tab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>
      <span>{label}</span>
    </NavLink>
  );
}
