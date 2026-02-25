'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, Eye, EyeOff } from 'lucide-react';
import { getSession } from '@/lib/store';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { uid } from '@/lib/utils';
import { useStore } from '@/lib/store';
import Toast from '@/components/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { login, ready } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const { store, refresh } = useStore();

  // Onboarding State
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

          const role = isPersonal ? 'personal' : (hasPending ? 'user' : 'user');
          const onboarding_done = isPersonal || hasPending;

          const newProfile = {
            id: user.id,
            name: user.user_metadata.full_name || user.email?.split('@')[0],
            email: user.email,
            role,
            onboarding_done
          };

          const { error } = await supabase.from('profiles').insert(newProfile);
          if (error) {
            setToast({ msg: 'Erro ao criar perfil.', type: 'error' });
            setLoading(false);
            return;
          }

          profile = newProfile;

          // Resolve pending prescriptions if any
          if (hasPending) {
            for (const p of pending) {
              // Update project
              await supabase.from('projects').update({ prescribed_to: user.id }).eq('id', p.project_id);

              // Ensure personal_students link exists
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

              // Delete pending
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
  }, [login, router]);

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

  async function finishOnboarding(role: 'personal' | 'user') {
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ role, onboarding_done: true }).eq('id', oboUser.id);
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
      <div className="auth-card animate-fade">
        <div className="auth-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <Dumbbell size={28} color="var(--accent)" />
          </div>
          <h1>FitSync</h1>
          <p>Registre. Evolua. Compare.</p>
        </div>

        {needsOnboarding ? (
          <div className="auth-form" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', fontWeight: 700, fontFamily: 'var(--font-inter)' }}>Como você quer usar o app?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn btn-primary" onClick={() => finishOnboarding('user')} disabled={loading}>
                Sou Aluno
              </button>
              <button className="btn" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }} onClick={() => finishOnboarding('personal')} disabled={loading}>
                Sou Personal
              </button>
            </div>
          </div>
        ) : (
          <div className="auth-form" style={{ marginTop: '20px' }}>
            <button type="button" className="btn" style={{ background: '#fff', color: '#333', border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} onClick={handleGoogleLogin} disabled={loading}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" style={{ width: 18 }} />
              {loading ? 'Conectando...' : 'Entrar com Google'}
            </button>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Seus dados ficam salvos na nuvem — acesse de qualquer dispositivo.
        </p>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
