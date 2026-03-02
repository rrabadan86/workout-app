import Link from 'next/link';
import Image from 'next/image';

/* ─── Icons (inline SVGs to avoid extra deps) ─── */
function IconBolt() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2L4.09 12.96A1 1 0 0 0 5 14.5h5.5L11 22l8.91-10.96A1 1 0 0 0 19 9.5H13.5L13 2z" />
        </svg>
    );
}
function IconClipboard() {
    return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
        </svg>
    );
}
function IconUsers() {
    return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}
function IconChart() {
    return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
    );
}
function IconTrophy() {
    return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
        </svg>
    );
}
function IconBrain() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
            <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
            <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
            <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
            <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
            <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
            <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
            <path d="M6 18a4 4 0 0 1-1.967-.516" />
            <path d="M19.967 17.484A4 4 0 0 1 18 18" />
        </svg>
    );
}
function IconDumbbell() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.4 14.4 9.6 9.6" />
            <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z" />
            <path d="m21.5 21.5-1.4-1.4" />
            <path d="M3.9 3.9 2.5 2.5" />
            <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" />
        </svg>
    );
}
function IconStar() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    );
}

/* ─── Data ─── */
const features = [
    {
        icon: <IconClipboard />,
        title: 'Monte Seus Treinos',
        desc: 'Crie treinos personalizados com exercícios, séries, repetições e cargas. Tudo organizado do seu jeito.',
    },
    {
        icon: <IconUsers />,
        title: 'Compare com Amigos',
        desc: 'Compartilhe seu treino, veja a evolução dos seus parceiros e compita de forma saudável e motivadora.',
    },
    {
        icon: <IconChart />,
        title: 'Acompanhe sua Evolução',
        desc: 'Histórico completo de pesos e repetições por exercício. Veja claramente o quanto você evoluiu.',
    },
];

const steps = [
    { n: '01', title: 'Cadastre-se', desc: 'Crie sua conta gratuitamente em segundos.' },
    { n: '02', title: 'Crie seu Treino', desc: 'Monte treinos com os exercícios que você já faz.' },
    { n: '03', title: 'Treine & Evolua', desc: 'Registre pesos, compare com amigos e supere seus limites.' },
];

const personalFeatures = [
    { icon: <IconUsers />, text: 'Gerencie seus Alunos' },
    { icon: <IconClipboard />, text: 'Prescreva Treinos' },
    { icon: <IconBrain />, text: 'IA que te auxilia' },
    { icon: <IconChart />, text: 'Monitore Evoluções' },
];

const testimonials = [
    {
        initial: 'J',
        name: 'Joana S.',
        role: 'Praticante de musculação',
        quote: 'Finalmente consigo ver minha evolução de verdade. Cada treino registrado, cada PR celebrado!',
    },
    {
        initial: 'R',
        name: 'Rafael M.',
        role: 'Treina com os amigos',
        quote: 'Compito com meus colegas e isso me motiva muito mais do que treinar sozinho. Incrível!',
    },
    {
        initial: 'C',
        name: 'Carol T.',
        role: 'Iniciante na academia',
        quote: 'Simples, bonito e funcional. Uso todo dia e nunca mais esqueci o que fiz na última sessão.',
    },
];

/* ─── Component ─── */
export default function LandingPage() {
    return (
        <div style={{ fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@700;800;900&family=Roboto:wght@400;700&display=swap');

                * { box-sizing: border-box; margin: 0; padding: 0; }

                :root {
                    --primary: #00AAFF;
                    --primary-light: #00E5FF;
                    --dark: #0f172a;
                    --dark-2: #1e293b;
                    --bg: #F4F7FB;
                    --white: #ffffff;
                    --text: #0f172a;
                    --text-muted: #64748b;
                    --border: #e2e8f0;
                }

                .montserrat { font-family: 'Montserrat', sans-serif; }
                .inter { font-family: 'Inter', sans-serif; }

                /* Navbar */
                .nav {
                    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 0 clamp(1rem, 5vw, 4rem);
                    height: 68px;
                    background: rgba(15,23,42,0.92);
                    backdrop-filter: blur(12px);
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                }
                .nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
                .nav-logo-icon {
                    width: 36px; height: 36px; border-radius: 10px;
                    background: var(--primary);
                    display: flex; align-items: center; justify-content: center;
                    color: white;
                }
                .nav-logo-text {
                    font-family: 'Montserrat', sans-serif;
                    font-weight: 900; font-size: 1.2rem; color: white; letter-spacing: -0.5px;
                }
                .nav-actions { display: flex; align-items: center; gap: 12px; }
                .btn-ghost {
                    padding: 9px 20px; border-radius: 999px; font-weight: 700;
                    font-size: 0.85rem; font-family: 'Montserrat', sans-serif;
                    color: rgba(255,255,255,0.85); background: transparent;
                    border: 1.5px solid rgba(255,255,255,0.18);
                    cursor: pointer; text-decoration: none; transition: all 0.2s;
                }
                .btn-ghost:hover { border-color: var(--primary); color: var(--primary); }
                .btn-primary {
                    padding: 9px 22px; border-radius: 999px; font-weight: 800;
                    font-size: 0.85rem; font-family: 'Montserrat', sans-serif;
                    color: white; background: var(--primary); border: none;
                    cursor: pointer; text-decoration: none; transition: all 0.2s;
                    box-shadow: 0 4px 20px rgba(0,170,255,0.35);
                }
                .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 28px rgba(0,170,255,0.5); }

                /* Hero */
                .hero {
                    background: var(--dark);
                    min-height: 100vh;
                    display: flex; align-items: center;
                    padding: 100px clamp(1.5rem, 8vw, 6rem) 80px;
                    position: relative; overflow: hidden;
                }
                .hero-glow-1 {
                    position: absolute; top: -120px; right: -120px;
                    width: 500px; height: 500px;
                    background: radial-gradient(circle, rgba(0,170,255,0.18) 0%, transparent 70%);
                    border-radius: 50%;
                }
                .hero-glow-2 {
                    position: absolute; bottom: -100px; left: -80px;
                    width: 400px; height: 400px;
                    background: radial-gradient(circle, rgba(0,229,255,0.10) 0%, transparent 70%);
                    border-radius: 50%;
                }
                .hero-inner {
                    max-width: 1200px; margin: 0 auto; width: 100%;
                    display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center;
                    position: relative; z-index: 1;
                }
                @media (max-width: 900px) {
                    .hero-inner { grid-template-columns: 1fr; gap: 40px; text-align: center; }
                    .hero-actions { justify-content: center; }
                    .hero-visual { display: none; }
                }
                .hero-badge {
                    display: inline-flex; align-items: center; gap: 8px;
                    padding: 6px 14px; border-radius: 999px;
                    background: rgba(0,170,255,0.12); border: 1px solid rgba(0,170,255,0.25);
                    color: var(--primary); font-size: 0.78rem; font-weight: 700;
                    font-family: 'Montserrat', sans-serif; letter-spacing: 0.5px;
                    margin-bottom: 24px;
                }
                .hero-badge-dot {
                    width: 7px; height: 7px; border-radius: 50%; background: var(--primary);
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.8); }
                }
                .hero-title {
                    font-family: 'Montserrat', sans-serif;
                    font-weight: 900; font-size: clamp(2.4rem, 5vw, 3.8rem);
                    color: white; line-height: 1.1; letter-spacing: -1px;
                    margin-bottom: 24px;
                }
                .hero-title-accent {
                    background: linear-gradient(135deg, var(--primary), var(--primary-light));
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .hero-sub {
                    font-size: 1.05rem; color: rgba(255,255,255,0.6); line-height: 1.7;
                    margin-bottom: 36px; max-width: 480px;
                }
                .hero-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
                .btn-hero-primary {
                    padding: 14px 32px; border-radius: 999px; font-weight: 800;
                    font-size: 0.95rem; font-family: 'Montserrat', sans-serif;
                    color: white; background: var(--primary); border: none;
                    cursor: pointer; text-decoration: none; transition: all 0.2s;
                    box-shadow: 0 6px 32px rgba(0,170,255,0.45);
                }
                .btn-hero-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(0,170,255,0.6); }
                .btn-hero-ghost {
                    padding: 13px 28px; border-radius: 999px; font-weight: 700;
                    font-size: 0.95rem; font-family: 'Montserrat', sans-serif;
                    color: rgba(255,255,255,0.8); background: transparent;
                    border: 1.5px solid rgba(255,255,255,0.2);
                    cursor: pointer; text-decoration: none; transition: all 0.2s;
                }
                .btn-hero-ghost:hover { border-color: var(--primary); color: var(--primary); }
                .hero-stats {
                    display: flex; gap: 32px; margin-top: 48px; padding-top: 40px;
                    border-top: 1px solid rgba(255,255,255,0.08);
                }
                @media (max-width: 900px) { .hero-stats { justify-content: center; } }
                .hero-stat-num {
                    font-family: 'Montserrat', sans-serif; font-weight: 900;
                    font-size: 1.8rem; color: var(--primary); line-height: 1;
                }
                .hero-stat-label {
                    font-size: 0.78rem; color: rgba(255,255,255,0.4);
                    font-weight: 600; margin-top: 4px; text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                /* Hero Visual */
                .hero-visual { position: relative; }
                .hero-phone {
                    background: var(--dark-2);
                    border-radius: 28px;
                    border: 1px solid rgba(255,255,255,0.1);
                    padding: 24px;
                    box-shadow: 0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,170,255,0.1);
                    overflow: hidden;
                }
                .phone-header {
                    display: flex; align-items: center; justify-content: space-between;
                    margin-bottom: 20px;
                }
                .phone-greeting { font-size: 0.8rem; color: rgba(255,255,255,0.4); }
                .phone-name { font-family: 'Montserrat', sans-serif; font-weight: 800; color: white; font-size: 1.1rem; }
                .phone-avatar {
                    width: 36px; height: 36px; border-radius: 50%;
                    background: var(--primary); display: flex; align-items: center;
                    justify-content: center; font-weight: 800; color: white; font-size: 0.9rem;
                }
                .phone-card-dark {
                    background: linear-gradient(135deg, #1e3a5f, var(--dark));
                    border-radius: 16px; padding: 18px; margin-bottom: 12px;
                    border: 1px solid rgba(0,170,255,0.2);
                    position: relative; overflow: hidden;
                }
                .phone-card-dark::before {
                    content: ''; position: absolute; top: -30px; right: -30px;
                    width: 100px; height: 100px;
                    background: radial-gradient(circle, rgba(0,170,255,0.2) 0%, transparent 70%);
                }
                .phone-card-label {
                    font-size: 0.65rem; color: rgba(255,255,255,0.4);
                    text-transform: uppercase; letter-spacing: 1px; font-weight: 700;
                    margin-bottom: 6px;
                }
                .phone-card-title {
                    font-family: 'Montserrat', sans-serif; font-weight: 800;
                    color: white; font-size: 1rem;
                }
                .phone-card-sub { font-size: 0.72rem; color: rgba(255,255,255,0.5); margin-top: 4px; }
                .phone-btn {
                    display: block; width: 100%; padding: 10px;
                    background: rgba(0,170,255,0.15); border-radius: 10px;
                    text-align: center; color: var(--primary);
                    font-weight: 700; font-size: 0.78rem; margin-top: 14px;
                    font-family: 'Montserrat', sans-serif;
                }
                .phone-friends {
                    display: flex; gap: 10px; margin-bottom: 12px;
                }
                .phone-friend {
                    flex: 1; background: rgba(255,255,255,0.04);
                    border-radius: 12px; padding: 12px 10px; text-align: center;
                    border: 1px solid rgba(255,255,255,0.06);
                }
                .phone-friend-avatar {
                    width: 32px; height: 32px; border-radius: 50%;
                    margin: 0 auto 6px;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 800; font-size: 0.85rem; color: white;
                }
                .phone-friend-name { font-size: 0.65rem; color: rgba(255,255,255,0.5); }
                .phone-friend-count { font-size: 0.7rem; color: var(--primary); font-weight: 700; }
                .hero-float-badge {
                    position: absolute; bottom: -16px; right: -24px;
                    background: white; border-radius: 14px; padding: 12px 16px;
                    box-shadow: 0 12px 40px rgba(0,0,0,0.3);
                    display: flex; align-items: center; gap: 10px;
                    animation: float 3s ease-in-out infinite;
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                .float-badge-icon {
                    width: 36px; height: 36px; border-radius: 10px;
                    background: linear-gradient(135deg, var(--primary), var(--primary-light));
                    display: flex; align-items: center; justify-content: center;
                    color: white;
                }
                .float-badge-text { font-size: 0.8rem; font-weight: 700; color: var(--text); }
                .float-badge-sub { font-size: 0.68rem; color: var(--text-muted); }

                /* Section commons */
                .section { padding: 96px clamp(1.5rem, 8vw, 6rem); }
                .section-light { background: var(--bg); }
                .section-white { background: var(--white); }
                .section-dark { background: var(--dark); }
                .section-inner { max-width: 1200px; margin: 0 auto; }
                .section-tag {
                    display: inline-block;
                    font-family: 'Montserrat', sans-serif; font-weight: 800;
                    font-size: 0.72rem; letter-spacing: 2px; text-transform: uppercase;
                    color: var(--primary); margin-bottom: 14px;
                }
                .section-title {
                    font-family: 'Montserrat', sans-serif; font-weight: 900;
                    font-size: clamp(1.8rem, 3.5vw, 2.6rem);
                    letter-spacing: -0.5px; line-height: 1.2; margin-bottom: 16px;
                }
                .section-title-dark { color: white; }
                .section-title-light { color: var(--text); }
                .section-sub {
                    font-size: 1rem; line-height: 1.7; max-width: 560px;
                }
                .section-sub-dark { color: rgba(255,255,255,0.55); }
                .section-sub-light { color: var(--text-muted); }

                /* Features */
                .features-grid {
                    display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
                    margin-top: 56px;
                }
                @media (max-width: 768px) { .features-grid { grid-template-columns: 1fr; } }
                .feature-card {
                    background: white; border-radius: 20px; padding: 32px;
                    border: 1px solid var(--border);
                    transition: all 0.3s ease;
                    position: relative; overflow: hidden;
                }
                .feature-card::before {
                    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
                    background: linear-gradient(90deg, var(--primary), var(--primary-light));
                    opacity: 0; transition: opacity 0.3s;
                }
                .feature-card:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,170,255,0.12); border-color: rgba(0,170,255,0.3); }
                .feature-card:hover::before { opacity: 1; }
                .feature-icon {
                    width: 56px; height: 56px; border-radius: 16px;
                    background: rgba(0,170,255,0.1); color: var(--primary);
                    display: flex; align-items: center; justify-content: center;
                    margin-bottom: 20px;
                }
                .feature-title {
                    font-family: 'Montserrat', sans-serif; font-weight: 800;
                    font-size: 1.1rem; color: var(--text); margin-bottom: 10px;
                }
                .feature-desc { font-size: 0.9rem; color: var(--text-muted); line-height: 1.6; }

                /* Steps */
                .steps-grid {
                    display: grid; grid-template-columns: repeat(3, 1fr); gap: 0;
                    margin-top: 56px; position: relative;
                }
                @media (max-width: 768px) {
                    .steps-grid { grid-template-columns: 1fr; gap: 32px; }
                    .step-connector { display: none; }
                }
                .step { text-align: center; padding: 0 24px; position: relative; }
                .step-connector {
                    position: absolute; top: 36px; left: 50%; right: -50%;
                    height: 2px;
                    background: linear-gradient(90deg, var(--primary), rgba(0,170,255,0.2));
                }
                .step:last-child .step-connector { display: none; }
                .step-num-wrap {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 72px; height: 72px; border-radius: 50%;
                    background: white; border: 2px solid var(--primary);
                    margin-bottom: 20px; position: relative; z-index: 1;
                    box-shadow: 0 0 0 6px rgba(0,170,255,0.08);
                }
                .step-num {
                    font-family: 'Montserrat', sans-serif; font-weight: 900;
                    font-size: 1.3rem; color: var(--primary);
                }
                .step-title {
                    font-family: 'Montserrat', sans-serif; font-weight: 800;
                    font-size: 1.05rem; color: var(--text); margin-bottom: 8px;
                }
                .step-desc { font-size: 0.88rem; color: var(--text-muted); line-height: 1.6; }

                /* Challenges */
                .challenges-inner {
                    display: grid; grid-template-columns: 1fr 1fr; gap: 64px;
                    align-items: center;
                }
                @media (max-width: 900px) { .challenges-inner { grid-template-columns: 1fr; } }
                .challenges-card {
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 24px; padding: 32px;
                }
                .challenge-item {
                    display: flex; align-items: center; gap: 16px;
                    padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.06);
                }
                .challenge-item:last-child { border-bottom: none; }
                .challenge-rank {
                    font-family: 'Montserrat', sans-serif; font-weight: 900;
                    font-size: 1.2rem; color: rgba(255,255,255,0.15); width: 32px;
                }
                .challenge-rank.gold { color: #f59e0b; }
                .challenge-rank.silver { color: #94a3b8; }
                .challenge-rank.bronze { color: #d97706; }
                .challenge-avatar {
                    width: 40px; height: 40px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 800; font-size: 0.9rem; color: white; flex-shrink: 0;
                }
                .challenge-name {
                    font-weight: 700; color: white; font-size: 0.9rem;
                }
                .challenge-score {
                    margin-left: auto;
                    font-family: 'Roboto', sans-serif; font-weight: 700;
                    color: var(--primary); font-size: 0.9rem;
                }
                .challenge-badge {
                    display: inline-flex; align-items: center; gap: 6px;
                    background: rgba(0,170,255,0.1); border: 1px solid rgba(0,170,255,0.2);
                    color: var(--primary); border-radius: 999px;
                    padding: 4px 12px; font-size: 0.75rem; font-weight: 700;
                    margin-bottom: 20px;
                }

                /* Personal Trainer */
                .personal-section {
                    background: linear-gradient(135deg, #0a1628, #0f2540, #0a1628);
                    border-top: 1px solid rgba(0,170,255,0.15);
                    border-bottom: 1px solid rgba(0,170,255,0.15);
                }
                .personal-inner {
                    display: grid; grid-template-columns: 1fr 1fr; gap: 64px;
                    align-items: center; max-width: 1200px; margin: 0 auto;
                }
                @media (max-width: 900px) { .personal-inner { grid-template-columns: 1fr; gap: 40px; } }
                .personal-features-grid {
                    display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
                    margin-top: 32px;
                }
                .personal-feature {
                    display: flex; align-items: center; gap: 12px;
                    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 14px; padding: 16px;
                }
                .personal-feature-icon {
                    width: 40px; height: 40px; border-radius: 12px;
                    background: rgba(0,170,255,0.12); color: var(--primary);
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                }
                .personal-feature-text {
                    font-size: 0.85rem; font-weight: 700; color: white;
                }
                .personal-visual {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(0,170,255,0.15);
                    border-radius: 24px; padding: 28px;
                }
                .personal-student {
                    display: flex; align-items: center; gap: 12px;
                    padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .personal-student:last-child { border-bottom: none; }
                .student-avatar {
                    width: 36px; height: 36px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 800; font-size: 0.8rem; color: white; flex-shrink: 0;
                }
                .student-name { font-size: 0.85rem; font-weight: 700; color: white; }
                .student-info { font-size: 0.72rem; color: rgba(255,255,255,0.4); }
                .student-progress {
                    margin-left: auto;
                    font-size: 0.8rem; font-weight: 700; color: #22c55e;
                    display: flex; align-items: center; gap: 4px;
                }

                /* Testimonials */
                .testimonials-grid {
                    display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
                    margin-top: 56px;
                }
                @media (max-width: 768px) { .testimonials-grid { grid-template-columns: 1fr; } }
                .testimonial-card {
                    background: white; border-radius: 20px; padding: 28px;
                    border: 1px solid var(--border);
                    transition: all 0.3s; position: relative;
                }
                .testimonial-card:hover { transform: translateY(-3px); box-shadow: 0 16px 48px rgba(0,0,0,0.08); }
                .stars { display: flex; gap: 3px; color: #f59e0b; margin-bottom: 16px; }
                .testimonial-quote {
                    font-size: 0.92rem; color: var(--text-muted); line-height: 1.65;
                    margin-bottom: 20px; font-style: italic;
                }
                .testimonial-author { display: flex; align-items: center; gap: 12px; }
                .testimonial-avatar {
                    width: 40px; height: 40px; border-radius: 50%;
                    background: var(--primary); color: white;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 800;
                }
                .testimonial-name { font-weight: 700; font-size: 0.88rem; color: var(--text); }
                .testimonial-role { font-size: 0.75rem; color: var(--text-muted); }

                /* CTA Final */
                .cta-inner {
                    max-width: 700px; margin: 0 auto; text-align: center;
                    position: relative; z-index: 1;
                }
                .cta-glow {
                    position: absolute; top: 50%; left: 50%;
                    width: 600px; height: 300px;
                    transform: translate(-50%, -50%);
                    background: radial-gradient(ellipse, rgba(0,170,255,0.15) 0%, transparent 70%);
                }
                .btn-cta {
                    display: inline-flex; align-items: center; gap: 10px;
                    padding: 18px 44px; border-radius: 999px; font-weight: 800;
                    font-size: 1.05rem; font-family: 'Montserrat', sans-serif;
                    color: white; background: var(--primary); border: none;
                    cursor: pointer; text-decoration: none; transition: all 0.2s;
                    box-shadow: 0 8px 40px rgba(0,170,255,0.5);
                    margin-top: 36px;
                }
                .btn-cta:hover { transform: translateY(-3px); box-shadow: 0 16px 60px rgba(0,170,255,0.65); }
                .cta-sub {
                    margin-top: 16px; font-size: 0.82rem;
                    color: rgba(255,255,255,0.35); font-weight: 600;
                }

                /* Footer */
                .footer {
                    background: #080f1e;
                    padding: 28px clamp(1.5rem, 8vw, 6rem);
                    display: flex; align-items: center; justify-content: space-between;
                    flex-wrap: wrap; gap: 12px;
                    border-top: 1px solid rgba(255,255,255,0.05);
                }
                .footer-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
                .footer-logo-icon {
                    width: 30px; height: 30px; border-radius: 8px;
                    background: var(--primary); display: flex; align-items: center;
                    justify-content: center; color: white;
                }
                .footer-logo-text {
                    font-family: 'Montserrat', sans-serif; font-weight: 900;
                    font-size: 1rem; color: white;
                }
                .footer-copy {
                    font-size: 0.78rem; color: rgba(255,255,255,0.3);
                    font-weight: 500;
                }
                .footer-links { display: flex; gap: 20px; }
                .footer-link {
                    font-size: 0.78rem; color: rgba(255,255,255,0.35);
                    text-decoration: none; font-weight: 600; transition: color 0.2s;
                }
                .footer-link:hover { color: var(--primary); }
            `}</style>

            {/* ── NAVBAR ── */}
            <nav className="nav">
                <Link href="/landing" className="nav-logo">
                    <div className="nav-logo-icon"><IconBolt /></div>
                    <span className="nav-logo-text">VIMU</span>
                </Link>
                <div className="nav-actions">
                    <Link href="/" className="btn-ghost">Entrar</Link>
                    <Link href="/signup" className="btn-primary">Comece Grátis</Link>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section className="hero">
                <div className="hero-glow-1" />
                <div className="hero-glow-2" />
                <div className="hero-inner">
                    <div>
                        <div className="hero-badge">
                            <span className="hero-badge-dot" />
                            Novo · Treine com seus amigos
                        </div>
                        <h1 className="hero-title">
                            Treine.{' '}
                            <span className="hero-title-accent">Evolua.</span>
                            <br />
                            Supere seus Limites.
                        </h1>
                        <p className="hero-sub">
                            Registre seus treinos, compare resultados com amigos
                            e acompanhe sua evolução em cada sessão.
                            Simples, motivador e gratuito.
                        </p>
                        <div className="hero-actions">
                            <Link href="/signup" className="btn-hero-primary">Comece Grátis →</Link>
                            <Link href="#como-funciona" className="btn-hero-ghost">Ver Como Funciona</Link>
                        </div>
                        <div className="hero-stats">
                            <div>
                                <div className="hero-stat-num">100%</div>
                                <div className="hero-stat-label">Gratuito</div>
                            </div>
                            <div>
                                <div className="hero-stat-num">IA</div>
                                <div className="hero-stat-label">Assistente</div>
                            </div>
                            <div>
                                <div className="hero-stat-num">∞</div>
                                <div className="hero-stat-label">Treinos & Amigos</div>
                            </div>
                        </div>
                    </div>

                    {/* Phone mockup */}
                    <div className="hero-visual" style={{ position: 'relative' }}>
                        <div className="hero-phone">
                            <div className="phone-header">
                                <div>
                                    <div className="phone-greeting">Bom dia 👋</div>
                                    <div className="phone-name">Rafael M.</div>
                                </div>
                                <div className="phone-avatar">R</div>
                            </div>
                            <div className="phone-card-dark">
                                <div className="phone-card-label">Treino Atual</div>
                                <div className="phone-card-title">✨ Hipertrofia ABC</div>
                                <div className="phone-card-sub">Início 01 Mar · Fim 31 Mar</div>
                                <div className="phone-btn">Ver Detalhes do Treino</div>
                            </div>
                            <div className="phone-friends">
                                {[
                                    { i: 'J', name: 'Joana', c: '8', bg: '#8b5cf6' },
                                    { i: 'C', name: 'Carol', c: '6', bg: '#f59e0b' },
                                    { i: 'M', name: 'Marcos', c: '5', bg: '#22c55e' },
                                ].map((f) => (
                                    <div className="phone-friend" key={f.i}>
                                        <div className="phone-friend-avatar" style={{ background: f.bg }}>{f.i}</div>
                                        <div className="phone-friend-name">{f.name}</div>
                                        <div className="phone-friend-count">{f.c} check-ins</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="hero-float-badge">
                            <div className="float-badge-icon"><IconTrophy /></div>
                            <div>
                                <div className="float-badge-text">Novo PR! 🎉</div>
                                <div className="float-badge-sub">Supermão: 80kg × 8 reps</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FEATURES ── */}
            <section className="section section-light">
                <div className="section-inner">
                    <div style={{ textAlign: 'center' }}>
                        <span className="section-tag">Funcionalidades</span>
                        <h2 className="section-title section-title-light">Tudo que você precisa para evoluir</h2>
                        <p className="section-sub section-sub-light" style={{ margin: '0 auto' }}>
                            Ferramentas pensadas para quem leva a sério os resultados — sem complicação.
                        </p>
                    </div>
                    <div className="features-grid">
                        {features.map((f) => (
                            <div className="feature-card" key={f.title}>
                                <div className="feature-icon">{f.icon}</div>
                                <div className="feature-title">{f.title}</div>
                                <div className="feature-desc">{f.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── COMO FUNCIONA ── */}
            <section className="section section-white" id="como-funciona">
                <div className="section-inner">
                    <div style={{ textAlign: 'center' }}>
                        <span className="section-tag">Como Funciona</span>
                        <h2 className="section-title section-title-light">Em 3 passos simples</h2>
                        <p className="section-sub section-sub-light" style={{ margin: '0 auto' }}>
                            Comece a usar em minutos. Sem configuração complicada.
                        </p>
                    </div>
                    <div className="steps-grid">
                        {steps.map((s, i) => (
                            <div className="step" key={s.n}>
                                <div className="step-num-wrap">
                                    <span className="step-num">{i + 1}</span>
                                </div>
                                {i < steps.length - 1 && <div className="step-connector" />}
                                <div className="step-title">{s.title}</div>
                                <div className="step-desc">{s.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── DESAFIOS & COMUNIDADE ── */}
            <section className="section section-dark">
                <div className="section-inner">
                    <div className="challenges-inner">
                        <div>
                            <span className="section-tag">Comunidade</span>
                            <h2 className="section-title section-title-dark">
                                Desafie seus amigos. Chegue mais longe.
                            </h2>
                            <p className="section-sub section-sub-dark" style={{ marginBottom: '32px' }}>
                                Crie desafios, acompanhe o ranking em tempo real e celebre cada conquista com quem treina junto.
                            </p>
                            <div className="challenge-badge">
                                <IconTrophy /> Desafio Ativo: Peito de Aço — Março 2026
                            </div>
                            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', marginTop: '10px' }}>
                                4 participantes · 12 check-ins essa semana
                            </p>
                        </div>
                        <div className="challenges-card">
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '8px' }}>
                                🏆 Ranking do Desafio
                            </div>
                            {[
                                { rank: '1°', name: 'Rafael M.', score: '18 pts', bg: '#00AAFF', cls: 'gold' },
                                { rank: '2°', name: 'Joana S.', score: '15 pts', bg: '#8b5cf6', cls: 'silver' },
                                { rank: '3°', name: 'Carol T.', score: '12 pts', bg: '#f59e0b', cls: 'bronze' },
                                { rank: '4°', name: 'Marcos R.', score: '9 pts', bg: '#22c55e', cls: '' },
                            ].map((p) => (
                                <div className="challenge-item" key={p.name}>
                                    <span className={`challenge-rank ${p.cls}`}>{p.rank}</span>
                                    <div className="challenge-avatar" style={{ background: p.bg }}>{p.name[0]}</div>
                                    <span className="challenge-name">{p.name}</span>
                                    <span className="challenge-score">{p.score}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── É PERSONAL TRAINER? ── */}
            <section className="section personal-section">
                <div className="personal-inner">
                    <div>
                        <span className="section-tag">Para Profissionais</span>
                        <h2 className="section-title section-title-dark">
                            É Personal Trainer?<br />
                            <span style={{ color: 'var(--primary)' }}>O app também é para você!</span>
                        </h2>
                        <p className="section-sub section-sub-dark">
                            Gerencie seus alunos, prescreva treinos personalizados e utilize nossa IA para montar planos de treino com mais agilidade e precisão.
                        </p>
                        <div className="personal-features-grid">
                            {personalFeatures.map((f) => (
                                <div className="personal-feature" key={f.text}>
                                    <div className="personal-feature-icon">{f.icon}</div>
                                    <span className="personal-feature-text">{f.text}</span>
                                </div>
                            ))}
                        </div>
                        <Link href="/signup" className="btn-hero-primary" style={{ display: 'inline-block', marginTop: '32px' }}>
                            Comece como Personal →
                        </Link>
                    </div>
                    <div className="personal-visual">
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '16px' }}>
                            👩‍🏫 Meus Alunos
                        </div>
                        {[
                            { i: 'J', name: 'Joana S.', info: 'Hipertrofia · 3× semana', prog: '+12%', bg: '#8b5cf6' },
                            { i: 'R', name: 'Rafael M.', info: 'Emagrecimento · 5× semana', prog: '+8%', bg: '#00AAFF' },
                            { i: 'C', name: 'Carol T.', info: 'Condicionamento · 4× semana', prog: '+15%', bg: '#f59e0b' },
                        ].map((s) => (
                            <div className="personal-student" key={s.name}>
                                <div className="student-avatar" style={{ background: s.bg }}>{s.i}</div>
                                <div>
                                    <div className="student-name">{s.name}</div>
                                    <div className="student-info">{s.info}</div>
                                </div>
                                <div className="student-progress">↑ {s.prog}</div>
                            </div>
                        ))}
                        <div style={{
                            marginTop: '20px', padding: '14px', borderRadius: '12px',
                            background: 'rgba(0,170,255,0.08)', border: '1px solid rgba(0,170,255,0.2)',
                            display: 'flex', alignItems: 'center', gap: '12px'
                        }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,170,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                                <IconBrain />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white' }}>IA Assistente</div>
                                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Gere treinos com inteligência artificial</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── DEPOIMENTOS ── */}
            <section className="section section-light">
                <div className="section-inner">
                    <div style={{ textAlign: 'center' }}>
                        <span className="section-tag">Depoimentos</span>
                        <h2 className="section-title section-title-light">Quem usa, não para</h2>
                        <p className="section-sub section-sub-light" style={{ margin: '0 auto' }}>
                            Veja o que nossos usuários dizem sobre o VIMU.
                        </p>
                    </div>
                    <div className="testimonials-grid">
                        {testimonials.map((t) => (
                            <div className="testimonial-card" key={t.name}>
                                <div className="stars">
                                    {[...Array(5)].map((_, i) => <IconStar key={i} />)}
                                </div>
                                <p className="testimonial-quote">"{t.quote}"</p>
                                <div className="testimonial-author">
                                    <div className="testimonial-avatar">{t.initial}</div>
                                    <div>
                                        <div className="testimonial-name">{t.name}</div>
                                        <div className="testimonial-role">{t.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA FINAL ── */}
            <section className="section section-dark" style={{ position: 'relative', overflow: 'hidden' }}>
                <div className="cta-glow" />
                <div className="cta-inner">
                    <span className="section-tag">Comece hoje</span>
                    <h2 className="section-title section-title-dark">
                        Pronto para <span style={{ color: 'var(--primary)' }}>Evoluir?</span>
                    </h2>
                    <p className="section-sub section-sub-dark" style={{ margin: '0 auto' }}>
                        Junte-se a quem já treina mais inteligente. Cadastre-se agora e comece gratuitamente.
                    </p>
                    <Link href="/signup" className="btn-cta">
                        <IconDumbbell />
                        Começar Agora — É Grátis!
                    </Link>
                    <div className="cta-sub">Sem cartão de crédito. Sem compromisso.</div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="footer">
                <Link href="/landing" className="footer-logo">
                    <div className="footer-logo-icon" style={{ width: 28, height: 28 }}><IconBolt /></div>
                    <span className="footer-logo-text">VIMU</span>
                </Link>
                <div className="footer-links">
                    <Link href="/landing" className="footer-link">Início</Link>
                    <Link href="#como-funciona" className="footer-link">Como Funciona</Link>
                    <Link href="/signup" className="footer-link">Cadastrar</Link>
                </div>
                <span className="footer-copy">© 2026 VIMU. Todos os direitos reservados.</span>
            </footer>
        </div>
    );
}
