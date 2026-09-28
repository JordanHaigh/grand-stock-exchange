import { useCallback, useEffect, useMemo, useState } from 'react';

const API = 'https://prices.runescape.wiki/api/v1/osrs';
const SEED = [
  { id: 4151, name: 'Abyssal whip', icon: '⚔', category: 'Weapons', low: 2451200, high: 2465000, change: 1.82, volume: 183 },
  { id: 11840, name: 'Dragon boots', icon: '◈', category: 'Armour', low: 1878000, high: 1892000, change: -.64, volume: 92 },
  { id: 560, name: 'Death rune', icon: '✦', category: 'Runes', low: 205, high: 208, change: .48, volume: 18420 },
  { id: 2, name: 'Cannonball', icon: '●', category: 'Ammo', low: 211, high: 214, change: -1.13, volume: 9341 },
  { id: 11212, name: 'Dragon arrow', icon: '➶', category: 'Ammo', low: 1160, high: 1184, change: 2.41, volume: 419 },
  { id: 995, name: 'Coins', icon: '◉', category: 'Currency', low: 1, high: 1, change: 0, volume: 0 },
];
const ICONS = { 4151: '⚔', 11840: '◈', 560: '✦', 2: '●', 11212: '➶', 995: '◉' };
const initialStore = { snapshots: [], forecasts: [], watchlist: SEED.map(x => x.id) };
function readStore() { try { return { ...initialStore, ...JSON.parse(localStorage.getItem('ge-ledger-v1') || '{}') }; } catch { return initialStore; } }
const fmt = n => Number(n || 0).toLocaleString('en-US');
const compact = n => { n = Number(n || 0); if (n >= 1e9) return `${(n / 1e9).toFixed(1)}b`; if (n >= 1e6) return `${(n / 1e6).toFixed(1)}m`; if (n >= 1e4) return `${(n / 1e3).toFixed(1)}k`; return fmt(n); };
const pct = n => `${n > 0 ? '+' : ''}${Number(n || 0).toFixed(2)}%`;
const avg = x => Math.round((x.low + x.high) / 2);

function Glyph({ item }) { return <span className="item-glyph">{item.icon || '◈'}</span>; }
function Sidebar({ watchlist, selected, items, status, updated, onSelect, onAdd }) {
  return <aside className="sidebar">
    <a className="brand" href="#overview"><span className="brand-mark">G</span><span><b>GE Ledger</b><small>OLD SCHOOL MARKET DESK</small></span></a>
    <div className="side-label">WORKSPACE</div>
    <nav className="main-nav"><a className="nav-item active" href="#overview"><span>◫</span> Overview</a><a className="nav-item" href="#watchlist"><span>☆</span> Watchlist <em>{String(watchlist.length).padStart(2, '0')}</em></a><a className="nav-item" href="#accuracy"><span>⌁</span> Forecast review</a></nav>
    <div className="side-label watch-label">YOUR WATCHLIST <button onClick={onAdd} title="Add item">+</button></div>
    <div className="sidebar-watchlist">{watchlist.map(id => items.find(x => x.id === id)).filter(Boolean).slice(0, 8).map(item => <button key={item.id} className={`side-watch ${item.id === selected ? 'selected' : ''}`} onClick={() => onSelect(item.id)}><Glyph item={item} /><span>{item.name}</span><small>{compact(avg(item))}</small></button>)}</div>
    <div className="sidebar-bottom"><div className="sync-indicator"><i /><span><b>{status}</b><small>{updated}</small></span></div><div className="side-foot">Personal trading journal <span>v0.1</span></div></div>
  </aside>;
}
function PriceChart({ item, snapshots, range, setRange }) {
  const series = useMemo(() => {
    const duration = { '1d': 864e5, '7d': 7 * 864e5, '30d': 30 * 864e5, '90d': 90 * 864e5 }[range];
    const points = snapshots.filter(s => s.itemId === item.id && s.ts >= Date.now() - duration).map(s => ({ price: (s.low + s.high) / 2 }));
    if (points.length >= 2) return points;
    const mean = avg(item);
    return Array.from({ length: 24 }, (_, i) => ({ price: mean * (1 + Math.sin((i + item.id % 13) * .68) * .008 + i / 23 * (item.change / 100)) }));
  }, [item, snapshots, range]);
  const min = Math.min(...series.map(p => p.price)); const max = Math.max(...series.map(p => p.price));
  const pad = min === max ? max * .01 : (max - min) * .18;
  const bottom = min - pad, span = max - min + 2 * pad;
  const points = series.map((p, i) => `${i / (series.length - 1) * 800},${220 - (p.price - bottom) / span * 200}`).join(' ');
  const area = `0,250 ${points} 800,250`;
  const lastY = 220 - (series.at(-1).price - bottom) / span * 200;
  return <article className="panel chart-panel"><div className="panel-heading"><div><div className="section-kicker">PRICE MOVEMENT</div><h2>{item.name}</h2></div><div className="chart-controls"><div className="range-switch">{['1d', '7d', '30d', '90d'].map((r, i) => <button key={r} className={`range ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>{['1D', '7D', '30D', '90D'][i]}</button>)}</div><span className="select-button">{item.name}⌄</span></div></div>
    <div className="chart-price-line"><b>{fmt(avg(item))} gp</b><span className={item.change >= 0 ? 'positive' : 'negative'}>{pct(item.change)}</span><small>last traded estimate</small></div>
    <div className="chart-area"><div className="y-axis"><span>{compact(max + pad)}</span><span>{compact((max + min) / 2)}</span><span>{compact(bottom)}</span></div><div className="chart-plot"><div className="chart-tooltip">{fmt(avg(item))} gp</div><svg viewBox="0 0 800 250" preserveAspectRatio="none" aria-label="Historical price chart"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#a4ce72" stopOpacity=".20"/><stop offset="100%" stopColor="#a4ce72" stopOpacity="0"/></linearGradient></defs><polygon points={area} fill="url(#fill)"/><polyline points={points} fill="none" stroke="#a4ce72" strokeWidth="2.1" vectorEffect="non-scaling-stroke"/><circle cx="800" cy={lastY} r="3.2" fill="#b9df8e"/></svg><div className="x-axis"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>NOW</span></div></div></div>
    <div className="chart-note"><span className="legend-dot" /> Market price <span className="chart-source">{snapshots.some(s => s.itemId === item.id) ? 'Saved price history' : 'Indicative preview · history builds as snapshots are saved'}</span></div>
  </article>;
}
function Movers({ items, watchlist, showAll, setShowAll, onSelect }) {
  const movers = [...items].filter(x => showAll || watchlist.includes(x.id)).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 5);
  return <article className="panel movers-panel"><div className="panel-heading"><div><div className="section-kicker">ON YOUR RADAR</div><h2>Biggest movers</h2></div><a href="#watchlist" className="text-link">View all ↗</a></div><div className="mover-tabs"><button className={`tab ${!showAll ? 'active' : ''}`} onClick={() => setShowAll(false)}>Watchlist</button><button className={`tab ${showAll ? 'active' : ''}`} onClick={() => setShowAll(true)}>All items</button><span>24H CHANGE</span></div><div className="movers-list">{movers.map(item => <button className="mover-row" key={item.id} onClick={() => onSelect(item.id)}><div className="mover-left"><Glyph item={item} /><div className="mover-name">{item.name}<div className="mover-price">{compact(avg(item))} gp</div></div></div><div className={`mover-change ${item.change >= 0 ? 'positive' : 'negative'}`}>{pct(item.change)}<small>24 hours</small></div></button>)}</div></article>;
}
function Watchlist({ items, watchlist, forecasts, onRemove, onAdd, onSelect }) {
  const [query, setQuery] = useState('');
  const rows = items.filter(x => watchlist.includes(x.id) && x.name.toLowerCase().includes(query.toLowerCase()));
  return <section className="panel watch-panel" id="watchlist"><div className="panel-heading"><div><div className="section-kicker">KEEP AN EYE ON IT</div><h2>Watchlist <span className="heading-count">{String(watchlist.length).padStart(2, '0')}</span></h2></div><div className="table-actions"><div className="search-box"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find an item…" /></div><button className="subtle-button" onClick={onAdd}>＋ Add item</button></div></div>
    <div className="table-scroll"><table><thead><tr><th>ITEM</th><th>LOW PRICE</th><th>HIGH PRICE</th><th>24H CHANGE</th><th>VOLUME</th><th>FORECAST</th><th /></tr></thead><tbody>{rows.map(item => { const forecast = forecasts.find(f => f.itemId === item.id && f.actual == null); return <tr key={item.id}><td><button className="item-cell" onClick={() => onSelect(item.id)}><Glyph item={item} /><span>{item.name}<small className="item-sub">{item.category || 'GE item'} · #{item.id}</small></span></button></td><td>{fmt(item.low)} gp</td><td>{fmt(item.high)} gp</td><td className={`table-change ${item.change >= 0 ? 'positive' : 'negative'}`}>{pct(item.change)}</td><td>{item.volume ? compact(item.volume) : '—'}</td><td>{forecast ? <span className="forecast-tag">↗ {compact(forecast.target)} gp</span> : <span className="forecast-tag none">No forecast</span>}</td><td><button className="row-menu" title="Remove from watchlist" onClick={() => onRemove(item.id)}>···</button></td></tr>; })}{!rows.length && <tr><td colSpan="7" className="empty-row">No matching items in your watchlist.</td></tr>}</tbody></table></div><div className="table-footer"><span>Showing {rows.length} item{rows.length === 1 ? '' : 's'}</span><span>Prices refresh automatically <i className="tiny-dot" /></span></div>
  </section>;
}
function ForecastReview({ forecasts, items, accuracy, onLog }) {
  const recent = forecasts.slice(0, 3);
  return <article className="panel forecast-panel"><div className="panel-heading"><div><div className="section-kicker">LEARN FROM THE MARKET</div><h2>Forecast vs actual</h2></div><a className="text-link" href="#accuracy">Review all ↗</a></div><div className="forecast-summary"><div className="accuracy-ring"><strong>{accuracy == null ? '—' : `${accuracy}%`}</strong><small>ACCURACY</small></div><div className="forecast-copy"><b>{forecasts.some(f => f.actual != null) ? `${forecasts.filter(f => f.actual != null).length} forecasts reviewed so far.` : 'Your forecast history starts here.'}</b><p>Log a price target to compare your prediction with the eventual market price.</p><button className="text-button" onClick={onLog}>Create your first forecast <span>→</span></button></div></div><div className="recent-forecast">{recent.map(f => <span className="recent-chip" key={f.id}>{items.find(x => x.id === f.itemId)?.name || f.itemName} · {compact(f.target)} gp · {f.actual == null ? `due ${new Date(f.dueAt).toLocaleDateString()}` : `actual ${compact(f.actual)} gp`}</span>)}</div></article>;
}
function ForecastModal({ items, selected, onClose, onSubmit }) {
  const [id, setId] = useState(String(selected)); const [target, setTarget] = useState(''); const [horizon, setHorizon] = useState('7'); const [notes, setNotes] = useState('');
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={onClose}>×</button><div className="section-kicker">PERSONAL TRADING JOURNAL</div><h2 id="modal-title">Log a forecast</h2><p className="modal-intro">Set a target and horizon. We’ll compare it with the market when it comes due.</p><form onSubmit={e => { e.preventDefault(); onSubmit({ itemId: Number(id), target: Number(target), horizon: Number(horizon), notes }); }}><label>ITEM<select value={id} onChange={e => setId(e.target.value)}>{items.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>YOUR TARGET PRICE<div className="input-suffix"><input type="number" min="1" value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. 2,450,000" required/><span>gp</span></div></label><label>TIME HORIZON<select value={horizon} onChange={e => setHorizon(e.target.value)}><option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days</option></select></label><label className="notes-label">WHY THIS CALL? <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes — what are you seeing?"/></label><button className="primary-button modal-submit" type="submit">Save forecast <span>→</span></button></form></section></div>;
}
function App() {
  const [store, setStore] = useState(readStore);
  const [items, setItems] = useState(SEED);
  const [allItems, setAllItems] = useState([]);
  const [selected, setSelected] = useState(4151);
  const [range, setRange] = useState('1d');
  const [showAll, setShowAll] = useState(false);
  const [status, setStatus] = useState('Connecting to market');
  const [updated, setUpdated] = useState('Prices from the OSRS Wiki');
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState('');
  const itemById = useCallback((id) => items.find(x => x.id === Number(id)) || allItems.find(x => x.id === Number(id)), [items, allItems]);
  const notify = message => { setToast(message); window.setTimeout(() => setToast(''), 2300); };
  useEffect(() => { localStorage.setItem('ge-ledger-v1', JSON.stringify(store)); }, [store]);
  const refresh = useCallback(async () => {
    try {
      setStatus('Refreshing market');
      const [mappingRes, latestRes, avgRes] = await Promise.all([fetch(`${API}/mapping`), fetch(`${API}/latest`), fetch(`${API}/5m`)]);
      if (!mappingRes.ok || !latestRes.ok) throw new Error('Market request failed');
      const [mapping, latest, avgData] = await Promise.all([mappingRes.json(), latestRes.json(), avgRes.ok ? avgRes.json() : {}]);
      const metas = new Map(mapping.map(meta => [meta.id, meta]));
      const sample = Object.entries(latest.data || {}).flatMap(([rawId, price]) => {
        const id = Number(rawId), meta = metas.get(id), low = price.low || price.high || 0, high = price.high || price.low || 0;
        if (!meta || !(low || high)) return [];
        return [{ id, name: meta.name, icon: ICONS[id] || '◈', category: 'GE item', low, high, change: 0, volume: avgData.data?.[rawId]?.volume || 0 }];
      });
      const byId = new Map(sample.map(x => [x.id, x]));
      setStore(previous => {
        const snap = Date.now();
        const nextSnapshots = [...previous.snapshots];
        for (const x of sample) nextSnapshots.push({ itemId: x.id, low: x.low, high: x.high, ts: snap });
        return { ...previous, snapshots: nextSnapshots.slice(-20000) };
      });
      const visible = [...new Set([...SEED.map(x => x.id), ...store.watchlist])].map(id => byId.get(id) || SEED.find(x => x.id === id)).filter(Boolean);
      setItems(visible.map(x => ({ ...x, icon: ICONS[x.id] || x.icon, forecast: store.forecasts.find(f => f.itemId === x.id && f.actual == null)?.target || null })));
      setAllItems(sample); setStatus('Market data connected'); setUpdated(`Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } catch { setStatus('Using preview prices'); setUpdated('Could not reach the Wiki API'); }
  }, [store.watchlist, store.forecasts]);
  useEffect(() => { refresh(); const interval = window.setInterval(refresh, 5 * 60 * 1000); return () => window.clearInterval(interval); }, [refresh]);
  useEffect(() => {
    const tick = () => setStore(previous => {
      let changed = false;
      const forecasts = previous.forecasts.map(f => {
        if (f.actual != null || f.dueAt > Date.now()) return f;
        const x = itemById(f.itemId); if (!x) return f;
        changed = true; return { ...f, actual: avg(x), resolvedAt: Date.now() };
      });
      return changed ? { ...previous, forecasts } : previous;
    });
    const timer = window.setInterval(tick, 60000); return () => window.clearInterval(timer);
  }, [itemById]);
  const watchItems = items.filter(x => store.watchlist.includes(x.id));
  const value = watchItems.reduce((sum, x) => sum + avg(x), 0);
  const closed = store.forecasts.filter(f => f.actual != null);
  const accuracy = closed.length ? Math.round(closed.reduce((sum, f) => sum + Math.max(0, 100 - Math.abs(f.actual - f.target) / Math.max(f.target, 1) * 100), 0) / closed.length) : null;
  const addItem = () => {
    const name = window.prompt('Enter an item name to search for:'); if (!name) return;
    const match = allItems.find(x => x.name.toLowerCase() === name.trim().toLowerCase()) || allItems.find(x => x.name.toLowerCase().includes(name.trim().toLowerCase()));
    if (!match) return notify('Item not found in the loaded market list.');
    setStore(s => s.watchlist.includes(match.id) ? s : { ...s, watchlist: [...s.watchlist, match.id] });
    setItems(current => current.some(x => x.id === match.id) ? current : [...current, match]); notify(`${match.name} added to your watchlist.`);
  };
  const submitForecast = data => {
    const x = itemById(data.itemId);
    setStore(s => ({ ...s, forecasts: [{ id: crypto.randomUUID(), itemId: data.itemId, itemName: x?.name, ...data, createdAt: Date.now(), dueAt: Date.now() + data.horizon * 864e5, actual: null }, ...s.forecasts] }));
    setModal(false); notify('Forecast saved. We’ll review it when it’s due.');
  };
  const remove = id => setStore(s => ({ ...s, watchlist: s.watchlist.filter(itemId => itemId !== id) }));
  const current = itemById(selected) || SEED[0];
  return <div className="app-shell">
    <Sidebar watchlist={store.watchlist} selected={selected} items={items} status={status} updated={updated} onSelect={setSelected} onAdd={addItem}/>
    <main className="main-content"><header className="topbar"><div className="crumb">MARKET DESK <span>/</span> <b>Overview</b></div><div className="top-actions"><span className="live-pill"><i/> {status === 'Market data connected' ? 'LIVE PRICES' : 'MARKET OPEN'}</span><button className="icon-button" title="Refresh prices" onClick={refresh}>↻</button><div className="avatar">J</div></div></header>
      <div className="page-wrap"><section className="welcome-row"><div><div className="eyebrow">MONDAY, SEPTEMBER 28, 2026 <span className="eyebrow-sep">•</span> GRAND EXCHANGE</div><h1>Your market, <span>in focus.</span></h1><p className="subhead">A calmer view of prices, opportunities, and how your forecasts are holding up.</p></div><button className="primary-button" onClick={() => setModal(true)}><span>＋</span> Log a forecast</button></section>
        <section className="metric-grid" aria-label="Market summary"><article className="metric-card"><div className="metric-top">WATCHLIST VALUE <span className="metric-icon gold">◈</span></div><div className="metric-value">{compact(value)} <small>gp</small></div><div className="metric-foot"><span className="positive">{watchItems.filter(x => x.change > 0).length} items up today</span><span>across {watchItems.length} items</span></div></article><article className="metric-card"><div className="metric-top">MARKET PULSE <span className="metric-icon mint">↗</span></div><div className="metric-value">{fmt(allItems.length || items.length)} <small>items</small></div><div className="metric-foot"><span className="positive">↑ {allItems.filter(x => x.change > 0).length || '—'} gainers</span><span className="negative">↓ {allItems.filter(x => x.change < 0).length || '—'} decliners</span></div></article><article className="metric-card"><div className="metric-top">FORECAST ACCURACY <span className="metric-icon lavender">⌁</span></div><div className="metric-value">{accuracy ?? '—'}<small>%</small></div><div className="metric-foot"><span className="neutral">{closed.length ? `${closed.length} outcomes reviewed` : 'Waiting for outcomes'}</span><span>{store.forecasts.length} forecasts logged</span></div></article></section>
        <section className="market-layout"><PriceChart item={current} snapshots={store.snapshots} range={range} setRange={setRange}/><Movers items={showAll && allItems.length ? allItems : items} watchlist={store.watchlist} showAll={showAll} setShowAll={setShowAll} onSelect={setSelected}/></section>
        <Watchlist items={items} watchlist={store.watchlist} forecasts={store.forecasts} onRemove={remove} onAdd={addItem} onSelect={setSelected}/>
        <section className="bottom-grid" id="accuracy"><ForecastReview forecasts={store.forecasts} items={items} accuracy={accuracy} onLog={() => setModal(true)}/><article className="panel insight-panel"><div className="insight-icon">✳</div><div className="section-kicker">A NOTE ON THE DATA</div><h2>History builds<br/>better instincts.</h2><p>GE Ledger saves price snapshots on this device. Leave it open over time to build your own history, then see where your calls land.</p><div className="storage-line"><span><i/> Local history</span><b>{store.snapshots.length} snapshots saved</b></div></article></section>
        <footer className="page-footer"><span>Market data via <a href="https://prices.runescape.wiki/" target="_blank" rel="noreferrer">OSRS Wiki Real-time Prices</a>.</span><span>Prices are indicative. Trades are simulated; no game account is connected.</span></footer>
      </div>
    </main>
    {modal && <ForecastModal key={selected} items={items} selected={selected} onClose={() => setModal(false)} onSubmit={submitForecast}/>}
    <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
  </div>;
}

export default App;
