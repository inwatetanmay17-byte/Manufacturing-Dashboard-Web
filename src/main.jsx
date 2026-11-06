import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Papa from 'papaparse';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import {
  Activity, AlertTriangle, CalendarDays, CheckCircle2, Clock3,
  Factory, Gauge, RotateCcw, SlidersHorizontal, TrendingUp
} from 'lucide-react';
import './style.css';

const DATA_URL = '/data/Manufacturing_Production_Data.csv';
const COLORS = ['#45c6d9', '#6f8cff', '#a78bfa', '#f5ad62', '#55d6a6'];
const number = (v) => Number(v || 0);
const sum = (rows, key) => rows.reduce((total, row) => total + number(row[key]), 0);
const pct = (a, b) => b ? (a / b) * 100 : 0;
const fmt = (v) => new Intl.NumberFormat('en-IN').format(Math.round(v));
const fmtPct = (v) => `${v.toFixed(2)}%`;

function SelectFilter({ label, value, onChange, options }) {
  return <label className="filter"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}>
    <option value="All">All</option>{options.map(option => <option key={option} value={option}>{option}</option>)}
  </select></label>;
}

function MetricCard({ icon: Icon, label, value, note, accent }) {
  return <article className="metric-card" style={{'--accent': accent}}>
    <div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={18}/></span></div>
    <div className="metric-value">{value}</div><div className="metric-note">{note}</div>
  </article>;
}

function ChartCard({ title, subtitle, children, className = '' }) {
  return <section className={`chart-card ${className}`}><div className="chart-heading"><div><h2>{title}</h2><p>{subtitle}</p></div></div>{children}</section>;
}

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ start: '', end: '', product: 'All', machine: 'All', shift: 'All' });

  useEffect(() => {
    fetch(DATA_URL).then(response => {
      if (!response.ok) throw new Error('Could not load the CSV dataset.');
      return response.text();
    }).then(csv => {
      const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true, dynamicTyping: true });
      const clean = parsed.data.map(row => ({
        ...row,
        Production_Date: String(row.Production_Date).slice(0, 10),
        Planned_Qty: number(row.Planned_Qty), Actual_Qty: number(row.Actual_Qty),
        Rejected_Qty: number(row.Rejected_Qty), Downtime_Min: number(row.Downtime_Min)
      }));
      setData(clean);
      const dates = clean.map(row => row.Production_Date).sort();
      setFilters(current => ({ ...current, start: dates[0] || '', end: dates[dates.length - 1] || '' }));
    }).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const options = useMemo(() => ({
    products: [...new Set(data.map(d => d.Product))].sort(),
    machines: [...new Set(data.map(d => d.Machine_ID))].sort(),
    shifts: [...new Set(data.map(d => d.Shift))].sort()
  }), [data]);

  const filtered = useMemo(() => data.filter(row =>
    (!filters.start || row.Production_Date >= filters.start) &&
    (!filters.end || row.Production_Date <= filters.end) &&
    (filters.product === 'All' || row.Product === filters.product) &&
    (filters.machine === 'All' || row.Machine_ID === filters.machine) &&
    (filters.shift === 'All' || row.Shift === filters.shift)
  ), [data, filters]);

  const totals = useMemo(() => {
    const planned = sum(filtered, 'Planned_Qty');
    const actual = sum(filtered, 'Actual_Qty');
    const rejected = sum(filtered, 'Rejected_Qty');
    return { planned, actual, rejected, downtime: sum(filtered, 'Downtime_Min'), efficiency: pct(actual, planned), rejectionRate: pct(rejected, actual) };
  }, [filtered]);

  const machineEfficiency = useMemo(() => {
    const grouped = {};
    filtered.forEach(row => {
      const g = grouped[row.Machine_ID] ||= { machine: row.Machine_ID, planned: 0, actual: 0 };
      g.planned += row.Planned_Qty; g.actual += row.Actual_Qty;
    });
    return Object.values(grouped).map(g => ({ ...g, efficiency: pct(g.actual, g.planned) })).sort((a,b) => b.efficiency-a.efficiency);
  }, [filtered]);

  const machineDowntime = useMemo(() => {
    const grouped = {};
    filtered.forEach(row => { grouped[row.Machine_ID] = (grouped[row.Machine_ID] || 0) + row.Downtime_Min; });
    return Object.entries(grouped).map(([machine, downtime]) => ({ machine, downtime })).sort((a,b) => b.downtime-a.downtime);
  }, [filtered]);

  const shiftEfficiency = useMemo(() => {
    const grouped = {};
    filtered.forEach(row => {
      const g = grouped[row.Shift] ||= { shift: `Shift ${row.Shift}`, planned: 0, actual: 0 };
      g.planned += row.Planned_Qty; g.actual += row.Actual_Qty;
    });
    return Object.values(grouped).map(g => ({ ...g, efficiency: pct(g.actual, g.planned) })).sort((a,b) => a.shift.localeCompare(b.shift));
  }, [filtered]);

  const dailyTrend = useMemo(() => {
    const grouped = {};
    filtered.forEach(row => { grouped[row.Production_Date] = (grouped[row.Production_Date] || 0) + row.Actual_Qty; });
    return Object.entries(grouped).sort(([a],[b]) => a.localeCompare(b)).map(([date, production]) => ({ date: date.slice(5), production }));
  }, [filtered]);

  const reset = () => setFilters({ start: data.map(d=>d.Production_Date).sort()[0] || '', end: data.map(d=>d.Production_Date).sort().at(-1) || '', product: 'All', machine: 'All', shift: 'All' });
  const exportCsv = () => {
    const csv = Papa.unparse(filtered);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'manufacturing-filtered-data.csv'; link.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <main className="state-screen"><div className="loader"/><p>Loading manufacturing data…</p></main>;
  if (error) return <main className="state-screen"><AlertTriangle/><h2>Dashboard couldn't load</h2><p>{error}</p></main>;

  return <main className="dashboard-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark"><Factory size={20}/></span><span>OPS<span className="brand-accent"> / INSIGHT</span></span></a><div className="topbar-right"><span className="live-dot"/> LIVE ANALYTICS <span className="topbar-divider"/> <span>PORTFOLIO PROJECT</span></div></header>
    <section className="hero" id="top"><div className="eyebrow"><span/> MANUFACTURING INTELLIGENCE</div><h1>Production <em>&</em> Quality<br/>Analysis</h1><p className="hero-copy">A focused view of factory performance — tracking output, efficiency, downtime and quality across machines and shifts.</p><div className="hero-meta"><span><CalendarDays size={15}/> JUN — AUG 2026</span><span><Activity size={15}/> {fmt(filtered.length)} RECORDS IN VIEW</span></div></section>

    <section className="filter-panel"><div className="filter-title"><div><SlidersHorizontal size={17}/><strong>Dashboard filters</strong></div><button className="reset-button" onClick={reset}><RotateCcw size={14}/> Reset all</button></div>
      <div className="filter-grid"><label className="filter"><span>From date</span><input type="date" min={data[0]?.Production_Date} max={data[data.length-1]?.Production_Date} value={filters.start} onChange={e=>setFilters(f=>({...f,start:e.target.value}))}/></label>
      <label className="filter"><span>To date</span><input type="date" min={data[0]?.Production_Date} max={data[data.length-1]?.Production_Date} value={filters.end} onChange={e=>setFilters(f=>({...f,end:e.target.value}))}/></label>
      <SelectFilter label="Product" value={filters.product} onChange={v=>setFilters(f=>({...f,product:v}))} options={options.products}/>
      <SelectFilter label="Machine ID" value={filters.machine} onChange={v=>setFilters(f=>({...f,machine:v}))} options={options.machines}/>
      <SelectFilter label="Shift" value={filters.shift} onChange={v=>setFilters(f=>({...f,shift:v}))} options={options.shifts}/></div>
    </section>

    <section className="section-block"><div className="section-label"><span>01</span> PERFORMANCE SNAPSHOT</div><div className="metrics-grid">
      <MetricCard icon={Factory} label="Total production" value={fmt(totals.actual)} note={`of ${fmt(totals.planned)} planned units`} accent="#45c6d9"/>
      <MetricCard icon={Clock3} label="Total downtime" value={`${fmt(totals.downtime)} min`} note={`${(totals.downtime/60).toFixed(1)} hours accumulated`} accent="#f5ad62"/>
      <MetricCard icon={AlertTriangle} label="Total rejected" value={fmt(totals.rejected)} note="units rejected in production" accent="#fb7185"/>
      <MetricCard icon={Gauge} label="Production efficiency" value={fmtPct(totals.efficiency)} note="actual output ÷ planned output" accent="#55d6a6"/>
      <MetricCard icon={CheckCircle2} label="Rejection rate" value={fmtPct(totals.rejectionRate)} note="rejected units ÷ actual output" accent="#a78bfa"/>
    </div></section>

    <section className="section-block"><div className="section-label"><span>02</span> OPERATIONAL BREAKDOWN</div><div className="charts-grid">
      <ChartCard title="Machine-wise production efficiency" subtitle="Actual output as a share of planned output"><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={machineEfficiency} margin={{top:12,right:12,left:0,bottom:4}}><CartesianGrid strokeDasharray="3 3" stroke="#202d3d" vertical={false}/><XAxis dataKey="machine" tick={{fill:'#91a0b4',fontSize:12}} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fill:'#91a0b4',fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#101b2a',border:'1px solid #29394d',borderRadius:10,color:'#edf4fb'}} formatter={v=>[fmtPct(v),'Efficiency']}/><Bar dataKey="efficiency" radius={[6,6,0,0]}>{machineEfficiency.map((entry,i)=><Cell key={entry.machine} fill={COLORS[i%COLORS.length]}/>)}</Bar></BarChart></ResponsiveContainer></div></ChartCard>
      <ChartCard title="Machine-wise downtime analysis" subtitle="Total unplanned and planned downtime recorded"><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={machineDowntime} margin={{top:12,right:12,left:0,bottom:4}}><CartesianGrid strokeDasharray="3 3" stroke="#202d3d" vertical={false}/><XAxis dataKey="machine" tick={{fill:'#91a0b4',fontSize:12}} axisLine={false} tickLine={false}/><YAxis tickFormatter={v=>fmt(v)} tick={{fill:'#91a0b4',fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#101b2a',border:'1px solid #29394d',borderRadius:10,color:'#edf4fb'}} formatter={v=>[`${fmt(v)} min`,'Downtime']}/><Bar dataKey="downtime" fill="#f5ad62" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div></ChartCard>
      <ChartCard title="Shift-wise production efficiency" subtitle="Efficiency comparison across operating shifts"><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={shiftEfficiency} margin={{top:12,right:12,left:0,bottom:4}}><CartesianGrid strokeDasharray="3 3" stroke="#202d3d" vertical={false}/><XAxis dataKey="shift" tick={{fill:'#91a0b4',fontSize:12}} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fill:'#91a0b4',fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#101b2a',border:'1px solid #29394d',borderRadius:10,color:'#edf4fb'}} formatter={v=>[fmtPct(v),'Efficiency']}/><Bar dataKey="efficiency" radius={[6,6,0,0]}>{shiftEfficiency.map((entry,i)=><Cell key={entry.shift} fill={COLORS[(i+1)%COLORS.length]}/>)}</Bar></BarChart></ResponsiveContainer></div></ChartCard>
      <ChartCard title="Daily production trend" subtitle="Actual units produced per day" className="wide-chart"><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dailyTrend} margin={{top:12,right:12,left:0,bottom:4}}><defs><linearGradient id="productionFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#45c6d9" stopOpacity={0.28}/><stop offset="100%" stopColor="#45c6d9" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#202d3d" vertical={false}/><XAxis dataKey="date" minTickGap={26} tick={{fill:'#91a0b4',fontSize:11}} axisLine={false} tickLine={false}/><YAxis tickFormatter={v=>fmt(v)} tick={{fill:'#91a0b4',fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#101b2a',border:'1px solid #29394d',borderRadius:10,color:'#edf4fb'}} formatter={v=>[`${fmt(v)} units`,'Production']}/><Area type="monotone" dataKey="production" stroke="#45c6d9" strokeWidth={2.5} fill="url(#productionFill)" activeDot={{r:5,fill:'#45c6d9',stroke:'#0a1320',strokeWidth:2}}/></AreaChart></ResponsiveContainer></div></ChartCard>
    </div></section>

    <section className="data-footer"><div><div className="section-label"><span>03</span> DATA & EXPORT</div><h2>Explore the filtered dataset</h2><p>Download the records currently matching your selected filters for further analysis.</p><div className="data-meta"><span><TrendingUp size={15}/> {fmt(filtered.length)} matching rows</span><span>CSV FORMAT</span></div></div><button className="export-button" onClick={exportCsv}>Export filtered CSV <span>↗</span></button></section>
    <footer className="footer"><span>OPS / INSIGHT <i>•</i> MANUFACTURING ANALYTICS</span><span>Built as an interactive portfolio project</span></footer>
    <div className="disclaimer">DATA NOTE: This dashboard uses a synthetic educational dataset created for demonstration and portfolio purposes. It does not represent actual factory operations.</div>
  </main>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
