import { useEffect, useState } from 'react';
import {
  DBProduct, CATEGORY_OPTIONS, CSV_TEMPLATE,
  listProducts, addProduct, bulkAddProducts, deleteProduct, toggleStock,
} from './productApi';
import { DBShop, listShops, addShop, deleteShop } from './shopApi';
import { DEMO_MODE } from './supabase';
import { listLiveOrders, LiveOrder } from './orderApi';
import { Staff, listStaff, addStaff, resetPassword, setActive, deleteStaff } from './staffApi';

type Tab = 'orders' | 'products' | 'staff' | 'shops' | 'riders' | 'payouts';

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'orders', label: 'Live Orders', icon: '📦' },
  { id: 'products', label: 'Products', icon: '🧺' },
  { id: 'staff', label: 'Staff Logins', icon: '🔑' },
  { id: 'shops', label: 'Shops', icon: '🏪' },
  { id: 'riders', label: 'Riders', icon: '🛵' },
  { id: 'payouts', label: 'Payouts', icon: '💰' },
];

const CONTAI = { lat: 21.7781, lng: 87.7517 };

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    placed: 'b-placed', accepted: 'b-accepted', ready: 'b-ready',
    assigned: 'b-assigned', picked_up: 'b-assigned', delivered: 'b-delivered',
    cancelled: 'b-placed', pending_payment: 'b-placed',
  };
  return <span className={`badge ${map[status] ?? 'b-delivered'}`}>{status}</span>;
}

function useShops(): DBShop[] {
  const [shops, setShops] = useState<DBShop[]>([]);
  useEffect(() => { listShops().then(setShops); }, []);
  return shops;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('orders');
  const [live, setLive] = useState<LiveOrder[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);

  useEffect(() => {
    if (DEMO_MODE) return;
    const load = () => { listLiveOrders().then(setLive); listStaff().then(setStaff); };
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  const orderRows = live;
  const liveCount = orderRows.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length;
  const delivered = orderRows.filter((o) => o.status === 'delivered');
  // Revenue excludes cancelled and unpaid (pending_payment) orders.
  const todayRevenue = orderRows
    .filter((o) => o.status !== 'cancelled' && o.status !== 'pending_payment')
    .reduce((s, o) => s + o.total, 0);
  const riders = staff.filter((s) => s.role === 'rider');
  const commission = Math.round(delivered.reduce((s, o) => s + o.total * 0.1, 0));

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">next<span className="dot">.</span></div>
        <div className="brand-sub">Admin · Contai</div>
        {NAV.map((n) => (
          <button key={n.id} className={`nav-item ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>
            <span>{n.icon}</span> {n.label}
          </button>
        ))}
      </aside>

      <main className="main">
        <h1 className="page-title">
          {NAV.find((n) => n.id === tab)?.label}
          <span className="demo-pill" style={{ background: DEMO_MODE ? 'var(--warning)' : 'var(--primary)' }}>
            {DEMO_MODE ? 'NOT CONNECTED' : 'LIVE'}
          </span>
        </h1>
        <p className="page-sub">
          {DEMO_MODE ? 'Add apps/admin/.env to connect your database.' : 'Connected to your live database.'}
        </p>

        <div className="stats">
          <div className="stat-card"><div className="stat-label">Live orders</div><div className="stat-value indigo">{liveCount}</div></div>
          <div className="stat-card"><div className="stat-label">Revenue</div><div className="stat-value green">₹{todayRevenue}</div></div>
          <div className="stat-card"><div className="stat-label">Riders</div><div className="stat-value">{riders.length}</div></div>
          <div className="stat-card"><div className="stat-label">Commission (10%)</div><div className="stat-value">₹{commission}</div></div>
        </div>

        {tab === 'orders' && (
          <div className="card">
            <h3>All orders</h3>
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Area</th><th>Total</th><th>Pay</th><th>Status</th><th>Age</th></tr></thead>
              <tbody>
                {orderRows.map((o) => (
                  <tr key={o.id}>
                    <td><b>{o.code}</b></td>
                    <td>{o.customer}</td>
                    <td>{o.area}</td>
                    <td>₹{o.total}</td>
                    <td>{o.payment}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="muted">{o.ago}</td>
                  </tr>
                ))}
                {orderRows.length === 0 && <tr><td colSpan={7} className="muted">No orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'products' && <ProductsManager />}
        {tab === 'staff' && <StaffManager />}
        {tab === 'shops' && <ShopsManager />}

        {tab === 'riders' && (
          <div className="card">
            <h3>Delivery riders ({riders.length})</h3>
            <table>
              <thead><tr><th>Name</th><th>Username</th><th>Status</th></tr></thead>
              <tbody>
                {riders.map((r) => (
                  <tr key={r.id}>
                    <td><b>{r.name}</b></td>
                    <td>{r.username}</td>
                    <td><span className={`badge ${r.active ? 'b-ready' : 'b-delivered'}`}>{r.active ? 'active' : 'disabled'}</span></td>
                  </tr>
                ))}
                {riders.length === 0 && <tr><td colSpan={3} className="muted">No riders yet. Create rider logins in Staff Logins.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'payouts' && (
          <div className="card">
            <h3>Earnings summary</h3>
            <table>
              <tbody>
                <tr><td>Delivered orders</td><td><b>{delivered.length}</b></td></tr>
                <tr><td>Delivered revenue</td><td><b>₹{delivered.reduce((s, o) => s + o.total, 0)}</b></td></tr>
                <tr><td>Your commission (10%)</td><td><b>₹{commission}</b></td></tr>
              </tbody>
            </table>
            <p className="muted" style={{ marginTop: 12 }}>Detailed per-shop & per-rider payouts come with the payments hardening step.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function ProductsManager() {
  const shops = useShops();
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('');
  const [image, setImage] = useState('');
  const [shop, setShop] = useState('');

  useEffect(() => { if (shops.length && !shop) setShop(shops[0].id); }, [shops]);

  async function load() { setLoading(true); setProducts(await listProducts()); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function onAdd() {
    if (!name || !price || !shop) { setMsg('Name, price and shop are required.'); return; }
    const res = await addProduct({ shop_id: shop, name, category, price: Number(price), unit, image_url: image || null, in_stock: true });
    if (res.ok) { setMsg('Added ✅'); setName(''); setPrice(''); setUnit(''); setImage(''); load(); }
    else setMsg('Error: ' + res.error + (/row-level security/i.test(res.error ?? '') ? ' — run admin_products.sql in Supabase SQL Editor to allow the dashboard to add products.' : ''));
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'next-products-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function onUpload(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (shops.length === 0) {
      setMsg('Add a shop first in the Shops tab — the CSV "shop" column must match a shop name.');
      e.target.value = '';
      return;
    }
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const rows: Omit<DBProduct, 'id'>[] = [];
    const skips: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].split(',');
      const [pname, cat, price, unit, image_url, shopName] = c.map((x) => (x ?? '').trim());
      if (!pname) { skips.push(`Row ${i + 1}: missing name`); continue; }
      if (!price) { skips.push(`Row ${i + 1}: missing price`); continue; }
      const shopMatch = shops.find((s) => s.name.toLowerCase() === (shopName ?? '').toLowerCase());
      if (!shopMatch) { skips.push(`Row ${i + 1}: shop "${shopName || '(empty)'}" not found`); continue; }
      rows.push({ shop_id: shopMatch.id, name: pname, category: cat || 'grocery', price: Number(price) || 0, unit: unit || '', image_url: image_url || null, in_stock: true });
    }
    if (rows.length === 0) {
      setMsg(`No products added. ${skips.slice(0, 3).join(' · ') || 'Check your CSV format.'}`);
      e.target.value = '';
      return;
    }
    const res = await bulkAddProducts(rows);
    if (res.ok) {
      setMsg(`Uploaded ${rows.length} products ✅${skips.length ? ` · ${skips.length} skipped (${skips.slice(0, 2).join(' · ')})` : ''}`);
    } else {
      setMsg('Error: ' + res.error + (/row-level security/i.test(res.error ?? '') ? ' — run admin_products.sql in Supabase.' : ''));
    }
    e.target.value = '';
    load();
  }

  if (DEMO_MODE) {
    return <div className="card"><h3>Products</h3><p className="muted">Create <b>apps/admin/.env</b> with your keys, then restart <code>npm run dev</code>.</p></div>;
  }

  return (
    <>
      <div className="card">
        <h3>Bulk upload (Excel / CSV)</h3>
        <p className="muted">1) Download the template → 2) fill it in Excel & save as CSV → 3) upload it. The <b>shop</b> column must match a shop name you created in the Shops tab.</p>
        <div className="row-flex" style={{ marginTop: 12 }}>
          <button className="btn ghost" onClick={downloadTemplate}>⬇ Download CSV template</button>
          <label className="btn" style={{ cursor: 'pointer' }}>
            ⬆ Upload CSV
            <input type="file" accept=".csv" onChange={onUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      <div className="card">
        <h3>Add a single product</h3>
        <div className="form-grid">
          <input className="inp" placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="inp" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="inp" placeholder="Price ₹" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          <input className="inp" placeholder="Unit (e.g. 1 kg)" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <input className="inp" placeholder="Photo link (image URL)" value={image} onChange={(e) => setImage(e.target.value)} />
          <select className="inp" value={shop} onChange={(e) => setShop(e.target.value)}>
            {shops.length === 0 && <option value="">— add a shop first —</option>}
            {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="row-flex" style={{ marginTop: 12 }}>
          <button className="btn" onClick={onAdd}>Add product</button>
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
                  <td><button className="btn ghost" onClick={() => { toggleStock(p.id, !p.in_stock).then(load); }}>{p.in_stock ? 'In stock' : 'Out'}</button></td>
                  <td><button className="btn" style={{ background: 'var(--error)' }} onClick={() => { deleteProduct(p.id).then(load); }}>Delete</button></td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={7} className="muted">No products yet. Use bulk upload or add one above.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function ShopsManager() {
  const [shops, setShops] = useState<DBShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(String(CONTAI.lat));
  const [lng, setLng] = useState(String(CONTAI.lng));

  async function load() { setLoading(true); setShops(await listShops()); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function onAdd() {
    if (!name || !lat || !lng) { setMsg('Name and location (lat/lng) are required.'); return; }
    const res = await addShop({ name, category, address, lat: Number(lat), lng: Number(lng) });
    if (res.ok) { setMsg('Shop added ✅'); setName(''); setAddress(''); load(); }
    else setMsg('Error: ' + res.error);
  }

  if (DEMO_MODE) {
    return <div className="card"><h3>Shops</h3><p className="muted">Create <b>apps/admin/.env</b> with your keys, then restart.</p></div>;
  }

  return (
    <>
      <div className="card">
        <h3>Add a shop (merchant pickup location)</h3>
        <p className="muted">The lat/lng is the pickup point the rider navigates to. Get it from Google Maps: right-click the shop → click the coordinates to copy.</p>
        <div className="form-grid">
          <input className="inp" placeholder="Shop name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="inp" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="inp" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <input className="inp" placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
          <input className="inp" placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} />
        </div>
        <div className="row-flex" style={{ marginTop: 12 }}>
          <button className="btn" onClick={onAdd}>Add shop</button>
          {msg && <span className="muted" style={{ alignSelf: 'center' }}>{msg}</span>}
        </div>
      </div>

      <div className="card">
        <h3>Shops ({shops.length})</h3>
        {loading ? <p className="muted">Loading…</p> : (
          <table>
            <thead><tr><th>Name</th><th>Category</th><th>Address</th><th>Location</th><th></th></tr></thead>
            <tbody>
              {shops.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.name}</b></td>
                  <td>{s.category}</td>
                  <td>{s.address}</td>
                  <td className="muted">{s.lat?.toFixed(4)}, {s.lng?.toFixed(4)}</td>
                  <td><button className="btn" style={{ background: 'var(--error)' }} onClick={() => { deleteShop(s.id).then(load); }}>Delete</button></td>
                </tr>
              ))}
              {shops.length === 0 && <tr><td colSpan={5} className="muted">No shops yet. Add your first shop above.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function StaffManager() {
  const shops = useShops();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [role, setRole] = useState<'merchant' | 'rider'>('merchant');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [shop, setShop] = useState('');

  useEffect(() => { if (shops.length && !shop) setShop(shops[0].id); }, [shops]);

  async function load() { setLoading(true); setStaff(await listStaff()); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function onAdd() {
    if (!name || !username || !password) { setMsg('Name, username and password are required.'); return; }
    if (role === 'merchant' && !shop) { setMsg('Assign a shop to the merchant (add one in Shops first).'); return; }
    const res = await addStaff({ role, name, username, password, phone: phone || null, shop_id: role === 'merchant' ? shop : null, active: true });
    if (res.ok) { setMsg('Login created ✅'); setName(''); setUsername(''); setPassword(''); setPhone(''); load(); }
    else setMsg('Error: ' + res.error);
  }

  async function onReset(id: string) {
    const np = window.prompt('Enter a new password for this user:');
    if (np) { await resetPassword(id, np); setMsg('Password reset ✅'); load(); }
  }

  if (DEMO_MODE) {
    return <div className="card"><h3>Staff Logins</h3><p className="muted">Connect the dashboard first (create <b>apps/admin/.env</b>), then reload.</p></div>;
  }

  return (
    <>
      <div className="card">
        <h3>Create a login (merchant or rider)</h3>
        <div className="form-grid">
          <select className="inp" value={role} onChange={(e) => setRole(e.target.value as any)}>
            <option value="merchant">Merchant</option>
            <option value="rider">Rider</option>
          </select>
          <input className="inp" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="inp" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="inp" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className="inp" placeholder="Phone (for customer to call rider)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {role === 'merchant' && (
            <select className="inp" value={shop} onChange={(e) => setShop(e.target.value)}>
              {shops.length === 0 && <option value="">— add a shop first —</option>}
              {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
        <div className="row-flex" style={{ marginTop: 12 }}>
          <button className="btn" onClick={onAdd}>Create login</button>
          {msg && <span className="muted" style={{ alignSelf: 'center' }}>{msg}</span>}
        </div>
      </div>

      <div className="card">
        <h3>All logins ({staff.length})</h3>
        {loading ? <p className="muted">Loading…</p> : (
          <table>
            <thead><tr><th>Role</th><th>Name</th><th>Username</th><th>Shop</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {staff.map((u) => (
                <tr key={u.id}>
                  <td><span className={`badge ${u.role === 'merchant' ? 'b-accepted' : 'b-assigned'}`}>{u.role}</span></td>
                  <td><b>{u.name}</b></td>
                  <td>{u.username}</td>
                  <td>{shops.find((s) => s.id === u.shop_id)?.name ?? '—'}</td>
                  <td><button className="btn ghost" onClick={() => { setActive(u.id, !u.active).then(load); }}>{u.active ? 'Active' : 'Disabled'}</button></td>
                  <td className="row-flex">
                    <button className="btn ghost" onClick={() => onReset(u.id)}>Reset password</button>
                    <button className="btn" style={{ background: 'var(--error)' }} onClick={() => { deleteStaff(u.id).then(load); }}>Delete</button>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && <tr><td colSpan={6} className="muted">No logins yet. Create one above.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
