'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, Eye, EyeOff } from 'lucide-react';
import { useStore, getSession } from '@/lib/store';
import { useAuth } from '@/lib/AuthContext';
import { uid } from '@/lib/utils';
import Toast from '@/components/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { store, addUser } = useStore();
  const { login } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (getSession()) router.replace('/dashboard');
  }, [router]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const user = store.users.find((u) => u.email === email && u.password === password);
    if (!user) { setToast({ msg: 'E-mail ou senha incorretos.', type: 'error' }); return; }
    login(user.id);
    router.push('/dashboard');
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (store.users.find((u) => u.email === email)) {
      setToast({ msg: 'Já existe uma conta com esse e-mail.', type: 'error' }); return;
    }
    const newUser = { id: uid(), name, email, password, friendIds: [] };
    addUser(newUser);
    login(newUser.id);
    router.push('/dashboard');
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card animate-fade">
        <div className="auth-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <Dumbbell size={28} color="var(--accent)" />
          </div>
          <h1>FitSync</h1>
          <p>Registre. Evolua. Compare.</p>
        </div>

        <div className="tabs">
          <button className={`tab-btn ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Entrar</button>
          <button className={`tab-btn ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Cadastrar</button>
        </div>

        {tab === 'login' ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="field">
              <label>E-mail</label>
              <input className="input" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Senha</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ paddingRight: 42 }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 4 }}>Entrar</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="field">
              <label>Nome</label>
              <input className="input" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input className="input" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Senha</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ paddingRight: 42 }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 4 }}>Criar conta</button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Seus dados ficam salvos localmente no seu dispositivo.
        </p>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
