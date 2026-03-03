'use client';

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import type { Exercise, Profile, Project } from '@/lib/types';

/* ─── Payload emitted to parent on generate ─── */
export interface AIWizardPayload {
    goals: string[];
    level: string;
    daysPerWeek: number;
    duration: number;
    startDate: string;
    endDate: string;
    location: string;
    muscleGroups: string[];
    style: string;
    evolvePrevious: boolean;
    birthDate?: string;
    weightKg?: number;
    heightCm?: number;
    limitations: string;
    extraNotes: string;
    prescribeEmail: string;
}

/* ─── Constants ─── */
const GOALS = [
    { value: 'Hipertrofia', icon: '💪' },
    { value: 'Emagrecimento', icon: '🔥' },
    { value: 'Força', icon: '🏋️' },
    { value: 'Resistência', icon: '⚡' },
    { value: 'Condicionamento', icon: '❤️' },
    { value: 'Saúde geral', icon: '🧘' },
];
const LEVELS = [
    { value: 'Iniciante', icon: '🌱', sub: '< 6 meses' },
    { value: 'Intermediário', icon: '🌿', sub: '6m–2 anos' },
    { value: 'Avançado', icon: '🌳', sub: '2+ anos' },
];
const DURATIONS = [
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '60 min' },
    { value: 90, label: '90 min' },
];
const LOCATIONS = [
    { value: 'Academia completa', icon: '🏢' },
    { value: 'Home gym', icon: '🏠' },
    { value: 'Ar livre', icon: '🌳' },
];
const MUSCLE_GROUPS = [
    { value: 'Peito', icon: '🫁' },
    { value: 'Costas', icon: '🔙' },
    { value: 'Ombros', icon: '🤷' },
    { value: 'Bíceps', icon: '💪' },
    { value: 'Tríceps', icon: '🦾' },
    { value: 'Pernas', icon: '🦵' },
    { value: 'Glúteos', icon: '🍑' },
    { value: 'Abdômen', icon: '🎯' },
    { value: 'Antebraço', icon: '✊' },
];
const STYLES = [
    { value: 'Tradicional', label: 'Tradicional (séries x reps)' },
    { value: 'Circuito', label: 'Circuito' },
    { value: 'Pirâmide', label: 'Pirâmide' },
    { value: 'IA decide', label: '🤖 Deixar a IA decidir' },
];

function calcAge(birth: string): number | null {
    if (!birth) return null;
    const b = new Date(birth);
    const today = new Date();
    let age = today.getFullYear() - b.getFullYear();
    const m = today.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
    return age;
}

/* ─── Props ─── */
interface Props {
    onClose: () => void;
    onGenerate: (data: AIWizardPayload) => Promise<void>;
    exercises: Exercise[];
    profiles: Profile[];
    uniqueStudents: string[];
    isPersonal: boolean;
    currentUser: Profile;
    existingProjects: Project[];
    generating: boolean;
    cooldown: number;
}

export default function AIWorkoutWizard({
    onClose, onGenerate, profiles, uniqueStudents,
    isPersonal, currentUser, existingProjects, generating, cooldown,
}: Props) {
    const [step, setStep] = useState(0);
    const TOTAL_STEPS = 4;

    /* ── Step 1 state ── */
    const [goals, setGoals] = useState<string[]>([]);
    const [level, setLevel] = useState('');
    const [goalShake, setGoalShake] = useState(false);

    /* ── Step 2 state ── */
    const today = new Date().toISOString().slice(0, 10);
    const future30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const [days, setDays] = useState(4);
    const [duration, setDuration] = useState(60);
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(future30);
    const [location, setLocation] = useState('Academia completa');

    /* ── Step 3 state ── */
    const [muscles, setMuscles] = useState<string[]>([]);
    const [style, setStyle] = useState('');
    const [evolvePrev, setEvolvePrev] = useState(false);

    /* ── Step 4 state ── */
    const [birthDate, setBirthDate] = useState(currentUser.birth_date || '');
    const [weightKg, setWeightKg] = useState<string>(currentUser.weight_kg?.toString() || '');
    const [heightCm, setHeightCm] = useState<string>(currentUser.height_cm?.toString() || '');
    const [limitations, setLimitations] = useState('');
    const [extraNotes, setExtraNotes] = useState('');
    const [prescribeEmail, setPrescribeEmail] = useState('');
    const [showStudentDropdown, setShowStudentDropdown] = useState(false);

    const computedAge = useMemo(() => calcAge(birthDate), [birthDate]);

    /* ── Navigation ── */
    function goStep(n: number) {
        if (n < 0 || n >= TOTAL_STEPS) return;
        setStep(n);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* ── Chip helpers ── */
    function toggleGoal(v: string) {
        if (goals.includes(v)) {
            setGoals(goals.filter(g => g !== v));
        } else {
            if (goals.length >= 2) {
                setGoalShake(true);
                setTimeout(() => setGoalShake(false), 400);
                return;
            }
            setGoals([...goals, v]);
        }
    }
    function toggleMuscle(v: string) {
        setMuscles(prev => prev.includes(v) ? prev.filter(m => m !== v) : [...prev, v]);
    }

    /* ── Generate ── */
    async function handleGenerate() {
        await onGenerate({
            goals,
            level,
            daysPerWeek: days,
            duration,
            startDate,
            endDate,
            location,
            muscleGroups: muscles,
            style,
            evolvePrevious: evolvePrev,
            birthDate: birthDate || undefined,
            weightKg: weightKg ? parseFloat(weightKg) : undefined,
            heightCm: heightCm ? parseFloat(heightCm) : undefined,
            limitations,
            extraNotes,
            prescribeEmail,
        });
    }

    /* ── Student search for prescription ── */
    const filteredStudents = useMemo(() => {
        if (!prescribeEmail) return [];
        const search = prescribeEmail.toLowerCase();
        return uniqueStudents
            .map(id => profiles.find(u => u.id === id))
            .filter(u => u && (u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search))) as Profile[];
    }, [prescribeEmail, uniqueStudents, profiles]);

    /* ─────────────────────────────────── RENDER ─────────────────────────────── */
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: '#F6F5F1',
            overflowY: 'auto',
            fontFamily: "'DM Sans', sans-serif",
            WebkitFontSmoothing: 'antialiased',
        }}>
            <div style={{ width: '100%', maxWidth: 640, margin: '0 auto', padding: '24px 16px', paddingBottom: 100 }}>
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 16, right: 16,
                        background: 'white', border: '1px solid #E2DFD7', borderRadius: 10,
                        width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', zIndex: 10,
                    }}
                >
                    <X size={18} color="#6B6860" />
                </button>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 48, height: 48, background: '#FFF0E8', borderRadius: 14,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, marginBottom: 14,
                    }}>🪄</div>
                    <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 6, color: '#1A1917' }}>
                        Criar Treino com IA
                    </h1>
                    <p style={{ color: '#6B6860', fontSize: 14, lineHeight: 1.5 }}>
                        Responda em 4 etapas rápidas. Quanto mais detalhes, melhor será seu treino personalizado.
                    </p>
                </div>

                {/* Progress Bar */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 28, padding: '0 4px' }}>
                    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                        <div key={i} style={{
                            flex: 1, height: 4, borderRadius: 4,
                            background: i < step ? '#2B9A4F' : i === step ? '#E8590C' : '#E2DFD7',
                            transition: 'background 0.4s ease',
                        }} />
                    ))}
                </div>

                {/* Card */}
                <div style={{
                    background: 'white', borderRadius: 16,
                    border: '1px solid #E2DFD7',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    overflow: 'hidden',
                }}>

                    {/* ═══════════ STEP 0: OBJETIVO ═══════════ */}
                    {step === 0 && (
                        <div>
                            <div style={{ padding: '28px 24px' }}>
                                <StepHeader emoji="🎯" title="Seu Objetivo" desc="O que você quer alcançar com esse treino? Escolha o principal." />

                                <FieldLabel>
                                    Objetivo principal <Req />
                                    {goals.length > 0 && <Counter>{goals.length}/2</Counter>}
                                </FieldLabel>
                                <FieldHint style={{ marginBottom: 10 }}>Escolha até <strong>2 objetivos</strong>.</FieldHint>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, animation: goalShake ? 'shake 0.4s ease' : undefined }} className="ai-wiz-chips">
                                    {GOALS.map(g => (
                                        <Chip key={g.value} selected={goals.includes(g.value)} disabled={!goals.includes(g.value) && goals.length >= 2} onClick={() => toggleGoal(g.value)}>
                                            <span style={{ fontSize: 15 }}>{g.icon}</span> {g.value}
                                        </Chip>
                                    ))}
                                </div>

                                <div style={{ marginTop: 24 }}>
                                    <FieldLabel>Nível de experiência <Req /></FieldLabel>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {LEVELS.map(l => (
                                            <Chip key={l.value} selected={level === l.value} onClick={() => setLevel(l.value)}>
                                                <span style={{ fontSize: 15 }}>{l.icon}</span> {l.value} <span style={{ fontSize: 11, color: '#9C9890' }}>{l.sub}</span>
                                            </Chip>
                                        ))}
                                    </div>
                                </div>

                                <InfoBox>Selecionar o nível correto ajuda a IA a calibrar volume, intensidade e progressão adequados ao seu corpo.</InfoBox>
                            </div>
                            <CardFooter>
                                <span />
                                <BtnPrimary onClick={() => goStep(1)}>Continuar →</BtnPrimary>
                            </CardFooter>
                        </div>
                    )}

                    {/* ═══════════ STEP 1: ROTINA ═══════════ */}
                    {step === 1 && (
                        <div>
                            <div style={{ padding: '28px 24px' }}>
                                <StepHeader emoji="📅" title="Sua Rotina" desc="Defina a logística do seu treino — dias, duração e período." />

                                <div style={{ marginBottom: 20 }}>
                                    <FieldLabel>Dias por semana <Req /></FieldLabel>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <input
                                            type="range" min={2} max={6} value={days}
                                            onChange={e => setDays(parseInt(e.target.value))}
                                            style={{
                                                flex: 1, WebkitAppearance: 'none', appearance: 'none' as any,
                                                height: 6, borderRadius: 6, background: '#E2DFD7',
                                                outline: 'none', border: 'none', padding: 0,
                                                accentColor: '#E8590C',
                                            }}
                                        />
                                        <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 18, color: '#E8590C', minWidth: 50, textAlign: 'right' }}>
                                            {days}x
                                        </span>
                                    </div>
                                    <FieldHint>Recomendado: 3-4x para iniciantes, 4-5x para intermediários.</FieldHint>
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <FieldLabel>Duração do treino (aprox.) <Req /></FieldLabel>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {DURATIONS.map(d => (
                                            <Chip key={d.value} selected={duration === d.value} onClick={() => setDuration(d.value)}>
                                                {d.label}
                                            </Chip>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                                    <div>
                                        <FieldLabel>Data de início <Req /></FieldLabel>
                                        <WizInput type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                    </div>
                                    <div>
                                        <FieldLabel>Data de término <Req /></FieldLabel>
                                        <WizInput type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
                                    </div>
                                </div>

                                <div>
                                    <FieldLabel>Onde você treina? <Badge>novo</Badge></FieldLabel>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {LOCATIONS.map(l => (
                                            <Chip key={l.value} selected={location === l.value} onClick={() => setLocation(l.value)}>
                                                <span style={{ fontSize: 15 }}>{l.icon}</span> {l.value}
                                            </Chip>
                                        ))}
                                    </div>
                                    <FieldHint>Isso define quais equipamentos a IA pode usar no treino.</FieldHint>
                                </div>
                            </div>
                            <CardFooter>
                                <BtnGhost onClick={() => goStep(0)}>← Voltar</BtnGhost>
                                <BtnPrimary onClick={() => goStep(2)}>Continuar →</BtnPrimary>
                            </CardFooter>
                        </div>
                    )}

                    {/* ═══════════ STEP 2: PERSONALIZAÇÃO ═══════════ */}
                    {step === 2 && (
                        <div>
                            <div style={{ padding: '28px 24px' }}>
                                <StepHeader emoji="⚙️" title="Personalização" desc="Detalhes que fazem a IA criar um treino realmente seu." />

                                <div style={{ marginBottom: 20 }}>
                                    <FieldLabel>
                                        Grupos musculares <Badge>novo</Badge>
                                        {muscles.length > 0 && <Counter>{muscles.length} selecionado(s)</Counter>}
                                    </FieldLabel>
                                    <FieldHint style={{ marginBottom: 10 }}>
                                        {muscles.length > 0 ? (
                                            <>O treino será <strong>focado apenas</strong> em: <strong>{muscles.join(', ')}</strong>. Para incluir todos, desmarque tudo.</>
                                        ) : (
                                            <>Se <strong>nenhum</strong> for selecionado, todos os grupos serão incluídos. Caso contrário, o treino será <strong>focado apenas</strong> nos selecionados.</>
                                        )}
                                    </FieldHint>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                        {MUSCLE_GROUPS.map(m => (
                                            <div
                                                key={m.value}
                                                onClick={() => toggleMuscle(m.value)}
                                                style={{
                                                    padding: '10px 8px', textAlign: 'center',
                                                    border: `1.5px solid ${muscles.includes(m.value) ? '#E8590C' : '#E2DFD7'}`,
                                                    borderRadius: 8, fontSize: 13, cursor: 'pointer',
                                                    transition: 'all 0.2s', userSelect: 'none',
                                                    background: muscles.includes(m.value) ? '#FFF0E8' : 'white',
                                                    color: muscles.includes(m.value) ? '#E8590C' : '#1A1917',
                                                    fontWeight: muscles.includes(m.value) ? 600 : 400,
                                                }}
                                            >
                                                <span style={{ display: 'block', fontSize: 20, marginBottom: 4 }}>{m.icon}</span>
                                                {m.value}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <FieldLabel>Estilo de treino preferido <Badge>novo</Badge></FieldLabel>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {STYLES.map(s => (
                                            <Chip key={s.value} selected={style === s.value} onClick={() => setStyle(s.value)}>
                                                {s.label}
                                            </Chip>
                                        ))}
                                    </div>
                                </div>

                                {existingProjects.length > 0 && (
                                    <div style={{ marginTop: 20 }}>
                                        <div
                                            onClick={() => setEvolvePrev(!evolvePrev)}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '14px 16px',
                                                border: `1.5px solid ${evolvePrev ? '#E8590C' : '#E2DFD7'}`,
                                                borderRadius: 12, cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                background: evolvePrev ? '#FFF0E8' : 'white',
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 500 }}>Evoluir a partir do meu treino atual</div>
                                                <div style={{ fontSize: 12, color: '#6B6860', marginTop: 2 }}>A IA usará seu programa atual como base de progressão</div>
                                            </div>
                                            <div style={{
                                                width: 44, height: 24, borderRadius: 24,
                                                background: evolvePrev ? '#E8590C' : '#E2DFD7',
                                                position: 'relative', flexShrink: 0,
                                                transition: 'background 0.2s',
                                            }}>
                                                <div style={{
                                                    width: 18, height: 18, borderRadius: '50%', background: 'white',
                                                    position: 'absolute', top: 3, left: evolvePrev ? 23 : 3,
                                                    transition: 'left 0.2s',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <CardFooter>
                                <BtnGhost onClick={() => goStep(1)}>← Voltar</BtnGhost>
                                <BtnPrimary onClick={() => goStep(3)}>Continuar →</BtnPrimary>
                            </CardFooter>
                        </div>
                    )}

                    {/* ═══════════ STEP 3: SAÚDE & REVISÃO ═══════════ */}
                    {step === 3 && (
                        <div>
                            <div style={{ padding: '28px 24px' }}>
                                <StepHeader emoji="🩺" title="Saúde & Revisão" desc="Últimos ajustes. Quanto mais contexto, mais seguro e efetivo o treino." />

                                {/* Birth date + Weight + Height */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                                    <div>
                                        <FieldLabel>Nascimento <BadgeOpt>Opcional</BadgeOpt></FieldLabel>
                                        <WizInput type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
                                        {computedAge !== null && <FieldHint>{computedAge} anos</FieldHint>}
                                    </div>
                                    <div>
                                        <FieldLabel>Peso (kg)</FieldLabel>
                                        <WizInput type="number" placeholder="75" min="30" max="300" value={weightKg} onChange={e => setWeightKg(e.target.value)} />
                                    </div>
                                    <div>
                                        <FieldLabel>Altura (cm)</FieldLabel>
                                        <WizInput type="number" placeholder="175" min="100" max="250" value={heightCm} onChange={e => setHeightCm(e.target.value)} />
                                    </div>
                                </div>

                                {/* Limitations */}
                                <div style={{ marginBottom: 20 }}>
                                    <FieldLabel>Limitações ou lesões <BadgeOpt>Opcional</BadgeOpt></FieldLabel>
                                    <textarea
                                        placeholder="Ex: Dor no joelho esquerdo, hérnia de disco lombar, operação no ombro..."
                                        value={limitations} onChange={e => setLimitations(e.target.value)}
                                        style={textareaStyle}
                                    />
                                    <FieldHint>A IA vai evitar exercícios que possam agravar essas condições.</FieldHint>
                                </div>

                                {/* Extra notes */}
                                <div style={{ marginBottom: 20 }}>
                                    <FieldLabel>Algo mais que a IA deveria saber? <Badge>novo</Badge></FieldLabel>
                                    <textarea
                                        placeholder="Ex: Não gosto de leg press, quero incluir cardio ao final, prefiro exercícios com barra livre..."
                                        value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
                                        style={{ ...textareaStyle, minHeight: 64 }}
                                    />
                                    <FieldHint>Preferências, restrições ou pedidos específicos para seu treino.</FieldHint>
                                </div>

                                {/* Prescribe (personal only) */}
                                {isPersonal && (
                                    <div style={{ marginBottom: 20, position: 'relative' }}>
                                        <FieldLabel>Para quem é este treino? <BadgeOpt>Opcional</BadgeOpt></FieldLabel>
                                        <WizInput
                                            type="text" placeholder="Nome ou e-mail do aluno"
                                            value={prescribeEmail}
                                            onChange={e => { setPrescribeEmail(e.target.value); setShowStudentDropdown(true); }}
                                            onFocus={() => setShowStudentDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
                                        />
                                        {showStudentDropdown && filteredStudents.length > 0 && (
                                            <div style={{
                                                position: 'absolute', zIndex: 10, width: '100%', marginTop: 4,
                                                background: 'white', border: '1px solid #E2DFD7', borderRadius: 12,
                                                boxShadow: '0 4px 16px rgba(0,0,0,0.06)', maxHeight: 192, overflowY: 'auto',
                                            }}>
                                                {filteredStudents.map(u => (
                                                    <div key={u.id}
                                                        className="ai-wiz-student-opt"
                                                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #F0EDE6' }}
                                                        onMouseDown={e => { e.preventDefault(); setPrescribeEmail(u.email); setShowStudentDropdown(false); }}
                                                    >
                                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1917' }}>{u.name}</div>
                                                        <div style={{ fontSize: 12, color: '#6B6860' }}>{u.email}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Review Summary */}
                                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #E2DFD7' }}>
                                    <FieldLabel style={{ marginBottom: 12 }}>📋 Resumo do seu treino</FieldLabel>
                                    <ReviewRow label="Objetivo" value={goals.length > 0 ? goals.join(' + ') : '—'} />
                                    <ReviewRow label="Nível" value={level || '—'} />
                                    <ReviewRow label="Frequência" value={`${days}x / semana`} />
                                    <ReviewRow label="Duração" value={`${duration} min`} />
                                    <ReviewRow label="Local" value={location || '—'} />
                                    <ReviewRow label="Músculos" value={muscles.length > 0 ? muscles.join(', ') : 'Todos os grupos'} />
                                    <ReviewRow label="Período" value={`${fmtDate(startDate)} → ${fmtDate(endDate)}`} isLast />
                                </div>

                                {/* Generate Button */}
                                <div style={{ marginTop: 24 }}>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={generating || cooldown > 0}
                                        style={{
                                            width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
                                            padding: '16px 28px', fontSize: 16, fontWeight: 600,
                                            fontFamily: "'Sora', sans-serif",
                                            background: generating || cooldown > 0 ? '#ccc' : 'linear-gradient(135deg, #E8590C 0%, #C2410C 100%)',
                                            color: 'white', border: 'none', borderRadius: 100,
                                            cursor: generating || cooldown > 0 ? 'not-allowed' : 'pointer',
                                            boxShadow: generating || cooldown > 0 ? 'none' : '0 4px 20px rgba(232,89,12,0.3)',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {generating ? (
                                            <><span className="ai-wiz-spinner" /> Criando a mágica...</>
                                        ) : cooldown > 0 ? `Aguarde ${cooldown}s...` : '🪄 Gerar Meu Treino Personalizado'}
                                    </button>
                                    {generating && (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                                            <span className="ai-wiz-spinner-sm" />
                                            <p style={{ fontSize: 12, color: '#9C9890' }}>
                                                Isso pode levar até 3 minutos...
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <CardFooter>
                                <BtnGhost onClick={() => goStep(2)}>← Voltar</BtnGhost>
                                <span style={{ fontSize: 12, color: '#9C9890' }}>Etapa 4 de 4</span>
                            </CardFooter>
                        </div>
                    )}
                </div>
            </div>

            {/* Keyframe animations */}
            <style>{`
                @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-4px)} 40%,80%{transform:translateX(4px)} }
                @keyframes ai-wiz-spin { to { transform: rotate(360deg); } }
                .ai-wiz-spinner {
                    display: inline-block; width: 20px; height: 20px;
                    border: 2.5px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: ai-wiz-spin 0.8s linear infinite;
                }
                .ai-wiz-spinner-sm {
                    display: inline-block; width: 14px; height: 14px;
                    border: 2px solid #E2DFD7;
                    border-top-color: #E8590C;
                    border-radius: 50%;
                    animation: ai-wiz-spin 0.8s linear infinite;
                    flex-shrink: 0;
                }
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Sora:wght@400;500;600;700&display=swap');
                .ai-wiz-student-opt:hover { background: #F6F5F1 !important; }
                @media (max-width: 480px) {
                    .ai-wiz-row3 { grid-template-columns: 1fr 1fr !important; }
                    .ai-wiz-muscle-grid { grid-template-columns: repeat(2, 1fr) !important; }
                }
            `}</style>
        </div>
    );
}

/* ═══════════ SUB-COMPONENTS ═══════════ */

const inputBaseStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    border: '1.5px solid #E2DFD7', borderRadius: 8,
    fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#1A1917',
    background: 'white', outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
};
const textareaStyle: React.CSSProperties = {
    ...inputBaseStyle, resize: 'vertical', minHeight: 80, lineHeight: 1.5,
};

function WizInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} style={{ ...inputBaseStyle, ...props.style }} onFocus={e => { e.target.style.borderColor = '#E8590C'; e.target.style.boxShadow = '0 0 0 3px #FFF0E8'; if (props.onFocus) props.onFocus(e); }} onBlur={e => { e.target.style.borderColor = '#E2DFD7'; e.target.style.boxShadow = 'none'; if (props.onBlur) props.onBlur(e); }} />;
}

function StepHeader({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
    return (
        <>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{emoji}</span> {title}
            </div>
            <p style={{ fontSize: 13, color: '#6B6860', marginBottom: 24, lineHeight: 1.5 }}>{desc}</p>
        </>
    );
}

function FieldLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6B6860', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, ...style }}>{children}</div>;
}

function FieldHint({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return <div style={{ fontSize: 12, color: '#9C9890', marginTop: 4, lineHeight: 1.4, ...style }}>{children}</div>;
}

function Req() { return <span style={{ color: '#E8590C' }}>*</span>; }

function Badge({ children }: { children: React.ReactNode }) {
    return <span style={{ display: 'inline-flex', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 8px', borderRadius: 6, background: '#F3EEFF', color: '#7C3AED' }}>{children}</span>;
}

function BadgeOpt({ children }: { children: React.ReactNode }) {
    return <span style={{ display: 'inline-flex', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 8px', borderRadius: 6, background: '#F0EDE6', color: '#9C9890' }}>{children}</span>;
}

function Counter({ children }: { children: React.ReactNode }) {
    return <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 600, color: '#E8590C', background: '#FFF0E8', padding: '4px 10px', borderRadius: 100, marginLeft: 8 }}>{children}</span>;
}

function InfoBox({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ background: '#EBF2FF', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 16 }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>💡</span>
            <p style={{ fontSize: 12, color: '#2563EB', lineHeight: 1.5 }}>{children}</p>
        </div>
    );
}

function Chip({ children, selected, disabled, onClick }: { children: React.ReactNode; selected?: boolean; disabled?: boolean; onClick: () => void }) {
    return (
        <div
            onClick={disabled ? undefined : onClick}
            style={{
                padding: '10px 16px', borderRadius: 100,
                border: `1.5px solid ${selected ? '#E8590C' : '#E2DFD7'}`,
                background: selected ? '#FFF0E8' : 'white',
                fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                color: selected ? '#E8590C' : disabled ? '#ccc' : '#1A1917',
                fontWeight: selected ? 500 : 400,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', userSelect: 'none',
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: disabled ? 0.4 : 1,
            }}
        >
            {children}
        </div>
    );
}

function CardFooter({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2DFD7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F0EDE6' }}>
            {children}
        </div>
    );
}

function BtnPrimary({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
    return (
        <button onClick={onClick} style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
            padding: '12px 24px', borderRadius: 100, border: 'none',
            background: '#E8590C', color: 'white', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(232,89,12,0.25)',
            transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
            {children}
        </button>
    );
}

function BtnGhost({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
    return (
        <button onClick={onClick} style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
            padding: '12px 24px', borderRadius: 100, border: 'none',
            background: 'transparent', color: '#6B6860', cursor: 'pointer',
            transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
            {children}
        </button>
    );
}

function ReviewRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: isLast ? 'none' : '1px solid #E2DFD7' }}>
            <span style={{ fontSize: 13, color: '#6B6860' }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
        </div>
    );
}

function fmtDate(d: string) {
    if (!d) return '—';
    const [, m, day] = d.split('-');
    return `${day}/${m}`;
}
