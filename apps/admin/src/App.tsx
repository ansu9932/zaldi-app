import { useState } from 'react';
import { orders, shops, riders, payouts, AdminOrder } from './demoData';

type Tab = 'orders' | 'shops' | 'riders' | 'payouts';

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'orders', label: 'Live Orders', icon: '📦' },
  { id: 'shops', label: 'Shops', icon: '🏪' },
  { id: 'riders', label: 'Riders', icon: '🛵' },
  { id: 'payouts', label: 'Payouts', icon: '💰' },
];

function StatusBadge({ status }: { status: AdminOrder['status'] }) {
  const map: Record<AdminOrder['status'], string> = {
    placed: 'b-placed',
    accepted: 'b-accepted',
    ready: 'b-ready',
    assigned: 'b-assigned',
    delivered: 'b-delivered',
  };
  return <span className={`badge ${map[status]}`}>{status}</span>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('orders');

  const liveCount = orders.filter((o) => o.status !== 'delivered').length;
  const todayRevenue = orders.reduce((s, o) => s + o.total, 0);
  const onlineRiders = riders.filter((r) => r.online).length;
  const pendingPayouts = payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          next<span className="dot">.</span>
        </div>
        <div className="brand-sub">Admin · Contai</div>
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-item ${tab === n.id ? 'active' : ''}`}
            onClick={() => setTab(n.id)}
          >
            <span>{n.icon}</span> {n.label}
          </button>
        ))}
      </aside>

      <main className="main">
        <h1 className="page-title">
          {NAV.find((n) => n.id === tab)?.label}
          <span className="demo-pill">DEMO DATA</span>
        </h1>
        <p className="page-sub">Live data connects in Stage 8 (Supabase). This shows the full layout.</p>

        {/* Stats */}
        <div className="stats">
          <div className="stat-card">
            <div className="stat-label">Live orders</div>
            <div className="stat-value indigo">{liveCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Revenue today</div>
            <div className="stat-value green">₹{todayRevenue}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Riders online</div>
            <div className="stat-value">{onlineRiders}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending payouts</div>
            <div className="stat-value">₹{pendingPayouts}</div>
          </div>
        </div>

        {tab === 'orders' && (
          <div className="card">
            <h3>All orders</h3>
            <table>
              <thead>
                <tr>
                  <th>Order</th><th>Customer</th><th>Shop</th><th>Rider</th>
                  <th>Area</th><th>Total</th><th>Status</th><th>Age</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.code}>
                    <td><b>{o.code}</b></td>
                    <td>{o.customer}</td>
                    <td>{o.shop}</td>
                    <td>{o.rider}</td>
                    <td>{o.area}</td>
                    <td>₹{o.total}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="muted">{o.ago}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'shops' && (
          <div className="card">
            <h3>Partner shops</h3>
            <table>
              <thead>
                <tr><th>Shop</th><th>Category</th><th>Area</th><th>Orders</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {shops.map((s) => (
                  <tr key={s.name}>
                    <td><b>{s.name}</b></td>
                    <td>{s.category}</td>
                    <td>{s.area}</td>
                    <td>{s.orders}</td>
                    <td><span className={`badge ${s.online ? 'b-ready' : 'b-delivered'}`}>{s.online ? 'open' : 'closed'}</span></td>
                    <td><button className="btn ghost">Manage</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'riders' && (
          <div className="card">
            <h3>Delivery riders</h3>
            <table>
              <thead>
                <tr><th>Rider</th><th>Status</th><th>Deliveries today</th><th>Earnings today</th></tr>
              </thead>
              <tbody>
                {riders.map((r) => (
                  <tr key={r.name}>
                    <td><b>{r.name}</b></td>
                    <td><span className={`badge ${r.online ? 'b-ready' : 'b-delivered'}`}>{r.online ? 'online' : 'offline'}</span></td>
                    <td>{r.deliveries}</td>
                    <td>₹{r.earnings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'payouts' && (
          <div className="card">
            <h3>Payouts</h3>
            <table>
              <thead>
                <tr><th>Payee</th><th>Type</th><th>Amount</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.payee}>
                    <td><b>{p.payee}</b></td>
                    <td>{p.type}</td>
                    <td>₹{p.amount}</td>
                    <td><span className={`badge ${p.status === 'paid' ? 'b-ready' : 'b-placed'}`}>{p.status}</span></td>
                    <td>{p.status === 'pending' ? <button className="btn accent">Pay now</button> : <span className="muted">Done</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
