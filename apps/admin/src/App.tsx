import { useEffect, useState } from 'react';
import { orders, shops, riders, payouts, AdminOrder } from './demoData';
import {
  DBProduct, CATEGORY_OPTIONS, SHOP_OPTIONS,
  listProducts, addProduct, deleteProduct, toggleStock, loadStarterCatalog,
} from './productApi';
import { DEMO_MODE } from './supabase';

type Tab = 'orders' | 'products' | 'shops' | 'riders' | 'payouts';

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'orders', label: 'Live Orders', icon: '📦' },
  { id: 'products', label: 'Products', icon: '🧺' },
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

        {tab === 'products' && <ProductsManager />}

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


function ProductsManager() {
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('');
  const [image, setImage] = useState('');
  const [shop, setShop] = useState(SHOP_OPTIONS[0].id);

  async function load() {
    setLoading(true);
    setProducts(await listProducts());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function onAdd() {
    if (!name || !price) { setMsg('Name and price are required.'); return; }
    const res = await addProduct({
      shop_id: shop, name, category, price: Number(price), unit,
      image_url: image || null, in_stock: true,
    });
    if (res.ok) {
      setMsg('Added ✅'); setName(''); setPrice(''); setUnit(''); setImage('');
      load();
    } else setMsg('Error: ' + res.error);
  }

  async function onSeed() {
    const res = await loadStarterCatalog();
    setMsg(res.ok ? `Loaded ${res.count} starter products ✅` : 'Error: ' + res.error);
    load();
  }

  if (DEMO_MODE) {
    return (
      <div className="card">
        <h3>Products</h3>
        <p className="muted">
          Not connected to the database yet. Create a file <b>apps/admin/.env</b> with your
          <b> VITE_SUPABASE_URL</b> and <b>VITE_SUPABASE_ANON_KEY</b>, then restart <code>npm run dev</code>.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h3>Add a product</h3>
        <div className="form-grid">
          <input className="inp" placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="inp" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="inp" placeholder="Price ₹" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          <input className="inp" placeholder="Unit (e.g. 1 kg)" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <input className="inp" placeholder="Image URL (optional)" value={image} onChange={(e) => setImage(e.target.value)} />
          <select className="inp" value={shop} onChange={(e) => setShop(e.target.value)}>
            {SHOP_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="row-flex" style={{ marginTop: 12 }}>
          <button className="btn" onClick={onAdd}>Add product</button>
          <button className="btn ghost" onClick={onSeed}>Load starter catalog</button>
          {msg && <span className="muted" style={{ alignSelf: 'center' }}>{msg}</span>}
        </div>
      </div>

      <div className="card">
        <h3>All products ({products.length})</h3>
        {loading ? <p className="muted">Loading…</p> : (
          <table>
            <thead><tr><th>Photo</th><th>Name</th><th>Category</th><th>Price</th><th>Unit</th><th>Stock</th><th></th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.image_url ? <img src={p.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} /> : '—'}</td>
                  <td><b>{p.name}</b></td>
                  <td>{p.category}</td>
                  <td>₹{p.price}</td>
                  <td>{p.unit}</td>
                  <td>
                    <button className="btn ghost" onClick={() => { toggleStock(p.id, !p.in_stock).then(load); }}>
                      {p.in_stock ? 'In stock' : 'Out'}
                    </button>
                  </td>
                  <td><button className="btn" style={{ background: 'var(--error)' }} onClick={() => { deleteProduct(p.id).then(load); }}>Delete</button></td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={7} className="muted">No products yet. Click "Load starter catalog" to begin.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
