'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { getSession } from '@/lib/store';
import { UFitLogo } from '@/components/UFitLogo';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import Toast from '@/components/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { login, ready } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const { refresh } = useStore();

  // Custom Auth State
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'user' | 'personal'>('user');
  const [showPassword, setShowPassword] = useState(false);

  // Novos campos
  const [stateUF, setStateUF] = useState('');
  const [city, setCity] = useState('');
  const [cref, setCref] = useState('');

  // Estados IBGE
  const [ufs, setUfs] = useState<{ id: number, sigla: string, nome: string }[]>([]);
  const [cities, setCities] = useState<{ id: number, nome: string }[]>([]);

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then(res => res.json())
      .then(data => setUfs(data))
      .catch(err => console.error('Erro IBGE UF', err));
  }, []);

  useEffect(() => {
    if (!stateUF) {
      setCities([]);
      setCity('');
      return;
    }
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateUF}/municipios?orderBy=nome`)
      .then(res => res.json())
      .then(data => {
        setCities(data);
        if (!data.find((c: any) => c.nome === city)) setCity('');
      })
      .catch(err => console.error('Erro IBGE Cidades', err));
  }, [stateUF]);

  // Onboarding State (For Google OAuth Flow only)
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [oboUser, setOboUser] = useState<any>(null);

  useEffect(() => {
    if (ready && getSession()) {
      router.replace('/dashboard');
    }
  }, [router, ready]);

  // Handle Google OAuth response when returning to this page
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setLoading(true);
        const user = session.user;

        // Check if profile exists
        let { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

        if (!profile) {
          // First time login via Google
          const isPersonal = user.email === 'rodrigorabadan@gmail.com';

          // Check if they have a pending prescription
          const { data: pending } = await supabase.from('pending_prescriptions').select('*').eq('student_email', user.email);
          const hasPending = pending && pending.length > 0;

          const newRole = isPersonal ? 'personal' : (hasPending ? 'user' : 'user');
          const onboarding_done = isPersonal || hasPending;

          const newProfile = {
            id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
            email: user.email,
            role: newRole,
            onboarding_done
          };

          const { error } = await supabase.from('profiles').insert(newProfile);
          if (error) {
            setToast({ msg: 'Erro ao criar perfil Google.', type: 'error' });
            setLoading(false);
            return;
          }

          profile = newProfile;

          // Resolve pending prescriptions if any
          if (hasPending) {
            for (const p of pending) {
              await supabase.from('projects').update({ prescribed_to: user.id }).eq('id', p.project_id);
              const { data: linkExists } = await supabase.from('personal_students')
                .select('*')
                .eq('personal_id', p.personal_id)
                .eq('student_id', user.id)
                .maybeSingle();

              if (!linkExists) {
                await supabase.from('personal_students').insert({
                  personal_id: p.personal_id,
                  student_id: user.id,
                  status: 'active'
                });
              }
              await supabase.from('pending_prescriptions').delete().eq('id', p.id);
            }
          }
        }

        if (profile && !profile.onboarding_done) {
          setOboUser(profile);
          setNeedsOnboarding(true);
          setLoading(false);
        } else if (profile) {
          await refresh(); // Load the newly created profile data before navigating
          login(user.id);
          router.push('/dashboard');
        }
      }
    });
  }, [login, router, refresh]);

  async function handleGoogleLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`
      }
    });
    if (error) {
      setToast({ msg: 'Erro ao conectar com Google.', type: 'error' });
      setLoading(false);
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setToast({ msg: 'Preencha email e senha.', type: 'error' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim()
    });

    if (error) {
      setToast({ msg: 'E-mail ou senha incorretos.', type: 'error' });
      setLoading(false);
      return;
    }
    // Sucesso aciona o onAuthStateChange automaticamente
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !name.trim()) {
      setToast({ msg: 'Preencha todos os campos.', type: 'error' });
      return;
    }
    if (password.length < 6) {
      setToast({ msg: 'A senha deve ter pelo menos 6 caracteres.', type: 'error' });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        data: {
          full_name: name.trim(),
          role: role,
          state: stateUF,
          city,
          cref: role === 'personal' ? cref.trim() : null
        }
      }
    });

    if (error) {
      setToast({ msg: error.message || 'Erro ao criar conta.', type: 'error' });
      setLoading(false);
      return;
    }

    if (data?.user) {
      const user = data.user;

      // Criamos/Atualizamos nós mesmos o Profile imediatamente para não depender exclusivamente do trigger
      const newProfile = {
        id: user.id,
        name: name.trim(),
        email: email.trim(),
        role: role,
        onboarding_done: true,
        state: stateUF,
        city: city,
        cref: role === 'personal' ? cref.trim() : null
      };

      const { error: pErr } = await supabase.from('profiles').upsert(newProfile);

      if (pErr) {
        console.error('Erro ao salvar profile manual:', pErr);
      }

      // Resolve pending prescriptions if any
      const { data: pending } = await supabase.from('pending_prescriptions').select('*').eq('student_email', email.trim());
      if (pending && pending.length > 0) {
        for (const p of pending) {
          await supabase.from('projects').update({ prescribed_to: user.id }).eq('id', p.project_id);
          const { data: linkExists } = await supabase.from('personal_students')
            .select('*').eq('personal_id', p.personal_id).eq('student_id', user.id).maybeSingle();
          if (!linkExists) {
            await supabase.from('personal_students').insert({ personal_id: p.personal_id, student_id: user.id, status: 'active' });
          }
          await supabase.from('pending_prescriptions').delete().eq('id', p.id);
        }
      }

      setToast({ msg: 'Conta criada com sucesso!', type: 'success' });
      // Se não tem confirmação de email ativa, o supabase.auth faz login automático e dispara o onAuthStateChange
    } else {
      setLoading(false);
    }
  }

  async function finishOnboarding(role_choice: 'personal' | 'user') {
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ role: role_choice, onboarding_done: true }).eq('id', oboUser.id);
    if (error) {
      setToast({ msg: 'Erro ao salvar perfil.', type: 'error' });
      setLoading(false);
      return;
    }
    await refresh();
    login(oboUser.id);
    router.push('/dashboard');
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card animate-in fade-in zoom-in-95 duration-500">
        <div className="auth-logo flex flex-col items-center">
          <UFitLogo width={120} height={144} className="mb-2 hover:scale-105 transition-transform duration-500" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-montserrat mt-2">Registre. Evolua. Compare.</p>
        </div>

        {needsOnboarding ? (
          <div className="auth-form" style={{ textAlign: 'center' }}>
            <h2 className="text-lg mb-6 font-bold font-inter text-slate-800">Como você quer usar o app?</h2>
            <div className="flex flex-col gap-3">
              <button className="btn bg-primary text-white hover:opacity-90 py-3 shadow-md border-0" onClick={() => finishOnboarding('user')} disabled={loading}>
                Sou Aluno
              </button>
              <button className="btn bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 py-3" onClick={() => finishOnboarding('personal')} disabled={loading}>
                Sou Personal
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="tabs flex gap-2 bg-slate-50 p-1 rounded-xl mb-6">
              <button
                className={`tab-btn flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${!isRegistering ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { setIsRegistering(false); setEmail(''); setPassword(''); }}
              >
                Entrar
              </button>
              <button
                className={`tab-btn flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${isRegistering ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { setIsRegistering(true); setEmail(''); setPassword(''); setName(''); setStateUF(''); setCity(''); setCref(''); }}
              >
                Criar Conta
              </button>
            </div>

            {isRegistering ? (
              <form className="auth-form flex flex-col gap-4" onSubmit={handleEmailSignUp}>
                <div className="field">
                  <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all"
                    placeholder="João Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all"
                    placeholder="voce@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="field relative">
                  <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Senha</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 pr-10 text-sm font-roboto text-slate-900 w-full outline-none transition-all"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-8 p-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="field">
                  <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Você é...</label>
                  <select
                    className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all cursor-pointer"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'user' | 'personal')}
                  >
                    <option value="user">💪 Aluno (Padrão)</option>
                    <option value="personal">📋 Personal Trainer / Coach</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="field">
                    <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Estado</label>
                    <select
                      required
                      className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all cursor-pointer"
                      value={stateUF}
                      onChange={(e) => setStateUF(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {ufs.map(uf => <option key={uf.sigla} value={uf.sigla}>{uf.sigla}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Cidade</label>
                    <select
                      required
                      disabled={!stateUF}
                      className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all cursor-pointer disabled:opacity-50"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {cities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                    </select>
                  </div>
                </div>

                {role === 'personal' && (
                  <div className="field animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">CREF (Registro Profissional)</label>
                    <input
                      type="text"
                      required
                      className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all"
                      placeholder="Ex: 000000-G/SP"
                      value={cref}
                      onChange={(e) => setCref(e.target.value)}
                    />
                  </div>
                )}

                <button type="submit" className="btn bg-primary text-white hover:opacity-90 py-3 mt-2 shadow-md border-0" disabled={loading}>
                  {loading ? 'Criando Conta...' : 'Criar Conta'}
                </button>
              </form>
            ) : (
              <form className="auth-form flex flex-col gap-4" onSubmit={handleEmailLogin}>
                <div className="field">
                  <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all"
                    placeholder="voce@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="field relative">
                  <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Senha</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 pr-10 text-sm font-roboto text-slate-900 w-full outline-none transition-all"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-8 p-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button type="submit" className="btn bg-slate-900 text-white hover:opacity-90 py-3 mt-2 border-0" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            )}

            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative bg-white px-4 text-xs font-bold font-montserrat text-slate-400 uppercase tracking-widest">
                ou continue com
              </div>
            </div>

            <button
              type="button"
              className="btn bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 py-3 w-full flex items-center justify-center gap-3"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" className="w-5 h-5" />
              <span className="font-bold font-inter text-sm">Google</span>
            </button>
          </>
        )}

        <p className="text-center mt-8 text-xs font-roboto text-slate-400">
          Seus dados ficam salvos na nuvem — acesse de qualquer dispositivo.
        </p>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
