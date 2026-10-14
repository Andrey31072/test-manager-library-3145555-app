import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, Library, LogOut, RefreshCw, Search, Users } from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

function useApi(token) {
  return useMemo(() => async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw data || { message: 'Request failed' };
    return data;
  }, [token]);
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ username: 'admin', password: 'admin12345' });
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw data;
      onLogin(data);
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesion.');
    }
  }
  return <main className="login">
    <section className="loginPanel">
      <Library size={36} />
      <h1>Manager Library</h1>
      <form onSubmit={submit}>
        <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Username" />
        <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Password" />
        <button>Sign in</button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  </main>;
}

function Catalog({ api }) {
  const [q, setQ] = useState('');
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ title: '', author: '', isbn: '', category_id: '', total_copies: 1 });
  async function load() {
    const [bookPage, cats] = await Promise.all([api(`/books?q=${encodeURIComponent(q)}`), api('/categories')]);
    setBooks(bookPage.items || []);
    setCategories(cats);
    if (!form.category_id && cats[0]) setForm(f => ({ ...f, category_id: cats[0].id }));
  }
  useEffect(() => { load().catch(console.error); }, []);
  async function createBook(event) {
    event.preventDefault();
    await api('/books', { method: 'POST', body: JSON.stringify({ ...form, total_copies: Number(form.total_copies) }) });
    setForm({ ...form, title: '', author: '', isbn: '', total_copies: 1 });
    await load();
  }
  return <section>
    <Toolbar title="Catalog" value={q} onChange={setQ} onSearch={load} />
    <form className="inlineForm" onSubmit={createBook}>
      <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      <input placeholder="Author" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} />
      <input placeholder="ISBN 13 digits" value={form.isbn} onChange={e => setForm({ ...form, isbn: e.target.value })} />
      <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <input type="number" min="1" value={form.total_copies} onChange={e => setForm({ ...form, total_copies: e.target.value })} />
      <button>Add</button>
    </form>
    <div className="grid">{books.map(book => <article className="item" key={book.id}><strong>{book.title}</strong><span>{book.author}</span><small>{book.category?.name} · {book.available_copies}/{book.total_copies}</small></article>)}</div>
  </section>;
}

function Members({ api }) {
  const [members, setMembers] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ full_name: '', document_number: '' });
  async function load() { setMembers((await api(`/members?q=${encodeURIComponent(q)}`)).items || []); }
  useEffect(() => { load().catch(console.error); }, []);
  async function create(event) {
    event.preventDefault();
    await api('/members', { method: 'POST', body: JSON.stringify(form) });
    setForm({ full_name: '', document_number: '' });
    await load();
  }
  return <section>
    <Toolbar title="Members" value={q} onChange={setQ} onSearch={load} />
    <form className="inlineForm" onSubmit={create}>
      <input placeholder="Full name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
      <input placeholder="Document" value={form.document_number} onChange={e => setForm({ ...form, document_number: e.target.value })} />
      <button>Add</button>
    </form>
    <div className="grid">{members.map(member => <article className="item" key={member.id}><strong>{member.full_name}</strong><span>{member.document_number}</span></article>)}</div>
  </section>;
}

function Loans({ api }) {
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [report, setReport] = useState([]);
  const [selection, setSelection] = useState({ member_id: '', book_id: '' });
  async function load() {
    const [m, b, o, r] = await Promise.all([
      api('/members'), api('/books'), api('/loans/overdue'), api('/reports/most-borrowed?from=2026-10-01&to=2026-10-31')
    ]);
    setMembers(m.items || []);
    setBooks(b.items || []);
    setOverdue(o.items || []);
    setReport(r.rows || []);
    setSelection(s => ({ member_id: s.member_id || m.items?.[0]?.id || '', book_id: s.book_id || b.items?.[0]?.id || '' }));
  }
  useEffect(() => { load().catch(console.error); }, []);
  async function lend(event) {
    event.preventDefault();
    await api('/loans', { method: 'POST', body: JSON.stringify({ member_id: selection.member_id, items: [{ book_id: selection.book_id }] }) });
    await load();
  }
  return <section>
    <div className="sectionHead"><h2>Loans and reports</h2><button className="iconButton" onClick={load}><RefreshCw size={18} /></button></div>
    <form className="inlineForm" onSubmit={lend}>
      <select value={selection.member_id} onChange={e => setSelection({ ...selection, member_id: e.target.value })}>{members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select>
      <select value={selection.book_id} onChange={e => setSelection({ ...selection, book_id: e.target.value })}>{books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select>
      <button>Lend</button>
    </form>
    <h3>Overdue</h3>
    <div className="grid">{overdue.map(item => <article className="item" key={item.item_id}><strong>{item.book_title}</strong><span>{item.member_name}</span><small>{item.days_late} days late</small></article>)}</div>
    <h3>Most borrowed</h3>
    <div className="grid">{report.map(row => <article className="item" key={`${row.book_id}-${row.category_name}`}><strong>{row.book_title}</strong><span>{row.category_name}</span><small>{row.times_borrowed} loans</small></article>)}</div>
  </section>;
}

function Toolbar({ title, value, onChange, onSearch }) {
  return <div className="sectionHead"><h2>{title}</h2><div className="search"><Search size={16} /><input value={value} onChange={e => onChange(e.target.value)} placeholder="Search" /><button onClick={onSearch}>Go</button></div></div>;
}

function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('session') || 'null'));
  const [tab, setTab] = useState('catalog');
  const api = useApi(session?.access_token);
  function login(data) { localStorage.setItem('session', JSON.stringify(data)); setSession(data); }
  function logout() { localStorage.removeItem('session'); setSession(null); }
  if (!session) return <Login onLogin={login} />;
  return <main className="app">
    <aside>
      <div className="brand"><BookOpen /> <span>Manager Library</span></div>
      <button className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}>Catalog</button>
      <button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}>Members</button>
      <button className={tab === 'loans' ? 'active' : ''} onClick={() => setTab('loans')}>Loans</button>
      <button className="logout" onClick={logout}><LogOut size={16} /> Sign out</button>
    </aside>
    <div className="content">{tab === 'catalog' && <Catalog api={api} />}{tab === 'members' && <Members api={api} />}{tab === 'loans' && <Loans api={api} />}</div>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
