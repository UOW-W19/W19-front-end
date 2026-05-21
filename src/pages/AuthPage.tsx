import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LANGUAGES } from '@/services/api';

function LocaleLogo({ className = "w-20 h-20" }: { className?: string }) {
  return <img src="/locale-logo.svg" alt="Locale logo" className={className} aria-hidden="true" />;
}

function StepIndicator({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center w-full mb-8" role="progressbar"
      aria-valuenow={current} aria-valuemin={1} aria-valuemax={total}
      aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const complete = step < current;
        const active   = step === current;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className={`step-dot ${complete ? 'step-dot-complete' : active ? 'step-dot-current' : 'step-dot-inactive'}`}>
              {complete
                ? <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true"><path d="M1 5l3 3 7-7" stroke="#18112C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : step}
            </div>
            {i < total - 1 && (
              <div className="flex-1 h-[2px] mx-0.5" style={{ background: complete ? '#CDDD01' : '#9973CE55' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

type Screen = 'welcome' | 'login' | 'register' | 'verify' | 'success' | 'prefs-language' | 'prefs-level' | 'prefs-communities';
type Level  = 'Beginner' | 'Intermediate' | 'Advanced';

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, isLoading: authLoading } = useAuth();

  const [screen, setScreen]       = useState<Screen>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [showPass, setShowPass]   = useState(false);
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [displayName, setDisplay] = useState('');
  const [learningLang, setLearning] = useState('');
  const [level, setLevel]         = useState<Level>('Beginner');
  const [communities, setCommunities] = useState<string[]>([]);
  const [communityInput, setCommunityInput] = useState('');
  const [otp, setOtp]             = useState(['', '', '', '']);

  useEffect(() => {
    if (isAuthenticated && !authLoading) navigate('/', { replace: true });
  }, [isAuthenticated, authLoading, navigate]);

  const handleLogin = async () => {
    setError(null); setIsLoading(true);
    try { await login({ email, password }); navigate('/'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Login failed'); }
    finally { setIsLoading(false); }
  };

  const handleRegister = async () => {
    setError(null);
    if (!displayName.trim()) { setError('Display name is required'); return; }
    setIsLoading(true);
    try { await register({ email, password, displayName: displayName.trim() }); setScreen('verify'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Registration failed'); }
    finally { setIsLoading(false); }
  };

  const handleOtp = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[idx] = val; setOtp(next);
    if (val && idx < 3) (document.getElementById(`otp-${idx+1}`) as HTMLInputElement)?.focus();
  };

  const removeCommunity = (c: string) => setCommunities(p => p.filter(x => x !== c));

  const Page = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex flex-col" style={{ background: '#EDEBE8' }}>
      <main className="flex-1 flex flex-col px-6 pt-10 pb-8 max-w-md mx-auto w-full">
        {children}
      </main>
    </div>
  );

  const ErrorBanner = () => error ? (
    <div role="alert" className="mb-4 p-3 rounded-xl text-sm text-white" style={{ background: '#F4483F' }}>
      {error}
    </div>
  ) : null;

  // ── Welcome ──────────────────────────────────────────────────────────────
  if (screen === 'welcome') return (
    <Page>
      <div className="flex justify-center mt-8 mb-10"><LocaleLogo className="w-28 h-28" /></div>
      <div className="flex-1">
        <h1 className="text-[40px] leading-tight" style={{ color: '#18112C', fontWeight: 900 }}>
          Hello,<br />welcome to <span className="heading-highlight">Locale.</span>
        </h1>
        <p className="mt-8 text-xl font-light" style={{ color: '#18112C' }}>
          Learn from <span style={{ color: '#C46200', fontWeight: 600 }}>your</span> world,{' '}
          with <span style={{ color: '#C46200', fontWeight: 600 }}>your</span> people.
        </p>
      </div>
      <div className="flex flex-col gap-3 mt-8">
        <button className="btn-locale w-full" onClick={() => setScreen('login')}>Sign In</button>
        <button className="btn-locale-outline w-full" onClick={() => setScreen('register')}>Create Account</button>
      </div>
    </Page>
  );

  // ── Login ─────────────────────────────────────────────────────────────────
  if (screen === 'login') return (
    <Page>
      <div className="flex justify-center mb-8"><LocaleLogo className="w-20 h-20" /></div>
      <h1 className="text-[32px]" style={{ color: '#18112C', fontWeight: 900 }}>Login</h1>
      <div className="h-[5px] w-24 rounded-full mb-8" style={{ background: '#9973CE' }} />
      <ErrorBanner />
      <div className="space-y-6 flex-1">
        <div>
          <label htmlFor="login-email" className="block text-base font-medium mb-2" style={{ color: '#18112C' }}>Email</label>
          <input id="login-email" type="email" autoComplete="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
            className="input-underline" required />
        </div>
        <div>
          <label htmlFor="login-pw" className="block text-base font-medium mb-2" style={{ color: '#18112C' }}>Password</label>
          <div className="relative">
            <input id="login-pw" type={showPass ? 'text' : 'password'} autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••" className="input-underline pr-10" required />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 touch-target flex items-center"
              aria-label={showPass ? 'Hide password' : 'Show password'}>
              {showPass ? <EyeOff className="h-5 w-5" style={{ color: '#9973CE' }} />
                        : <Eye    className="h-5 w-5" style={{ color: '#9973CE' }} />}
            </button>
          </div>
          <p className="mt-3 text-sm text-right" style={{ color: '#18112C' }}>
            Forgot Password?{' '}
            <button type="button" className="link-orange">Reset</button>
          </p>
        </div>
        <div className="locale-card">
          <p className="text-sm text-center" style={{ color: '#6B6480' }}>
            <span className="font-semibold" style={{ color: '#18112C' }}>Demo:</span><br />
            demo@locale.app / demo123
          </p>
        </div>
      </div>
      <p className="mt-6 text-center text-sm" style={{ color: '#18112C' }}>
        Don't have an account?{' '}
        <button type="button" className="link-orange" onClick={() => { setScreen('register'); setError(null); }}>Sign Up</button>
      </p>
      <button className="btn-locale w-full mt-4" onClick={handleLogin} disabled={isLoading || !email || !password}>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continue'}
      </button>
    </Page>
  );

  // ── Register ──────────────────────────────────────────────────────────────
  if (screen === 'register') return (
    <Page>
      <div className="flex justify-center mb-8"><LocaleLogo className="w-20 h-20" /></div>
      <h1 className="text-[32px]" style={{ color: '#18112C', fontWeight: 900 }}>Sign Up</h1>
      <div className="h-[5px] w-24 rounded-full mb-8" style={{ background: '#9973CE' }} />
      <ErrorBanner />
      <div className="space-y-6 flex-1">
        {[
          { id: 'reg-name',  label: 'Display Name', type: 'text',     val: displayName, set: setDisplay,  ac: 'name',         ph: 'Your name' },
          { id: 'reg-email', label: 'Email',         type: 'email',    val: email,       set: setEmail,    ac: 'email',        ph: 'your@email.com' },
          { id: 'reg-pw',    label: 'Password',      type: 'password', val: password,    set: setPassword, ac: 'new-password', ph: 'Min. 6 characters' },
        ].map(({ id, label, type, val, set, ac, ph }) => (
          <div key={id}>
            <label htmlFor={id} className="block text-base font-medium mb-2" style={{ color: '#18112C' }}>{label}</label>
            <input id={id} type={type} autoComplete={ac} value={val}
              onChange={e => set(e.target.value)} placeholder={ph}
              className="input-underline" required minLength={type === 'password' ? 6 : undefined} />
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-sm" style={{ color: '#18112C' }}>
        Already have an account?{' '}
        <button type="button" className="link-orange" onClick={() => { setScreen('login'); setError(null); }}>Sign In</button>
      </p>
      <button className="btn-locale w-full mt-4" onClick={handleRegister}
        disabled={isLoading || !email || !password || !displayName}>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continue'}
      </button>
    </Page>
  );

  // ── Verify OTP ────────────────────────────────────────────────────────────
  if (screen === 'verify') return (
    <Page>
      <h1 className="text-[28px] text-center mt-4 mb-4" style={{ color: '#18112C', fontWeight: 700 }}>
        Enter verification code
      </h1>
      <p className="text-center text-base mb-8 font-light" style={{ color: '#18112C' }}>
        We've sent a code to verify your<br />email to <strong>{email}</strong>
      </p>
      <div className="flex justify-center gap-4 mb-6" role="group" aria-label="Verification code">
        {otp.map((digit, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <input id={`otp-${idx}`} type="text" inputMode="numeric"
              autoComplete={idx === 0 ? 'one-time-code' : 'off'}
              maxLength={1} value={digit} onChange={e => handleOtp(idx, e.target.value)}
              aria-label={`Digit ${idx + 1}`}
              className="w-14 h-12 text-center text-2xl font-semibold bg-transparent outline-none"
              style={{ color: '#18112C', caretColor: '#FA8100' }} />
            <div className="h-[2px] w-14 mt-1" style={{ background: '#9973CE' }} />
          </div>
        ))}
      </div>
      <p className="text-center text-sm mb-8" style={{ color: '#18112C' }}>
        Didn't receive the code?{' '}
        <button type="button" className="link-orange">Resend</button>
      </p>
      <button className="btn-locale w-full mt-auto" onClick={() => setScreen('success')} disabled={otp.some(d => !d)}>
        Continue
      </button>
    </Page>
  );

  // ── Success ───────────────────────────────────────────────────────────────
  if (screen === 'success') return (
    <Page>
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-[40px] mb-6" style={{ color: '#18112C', fontWeight: 900 }}>
          <span className="heading-highlight">Success!</span>
        </h1>
        <div className="locale-card">
          <p className="text-base mb-4" style={{ color: '#18112C' }}>
            Congratulations, <strong>{email}</strong> has been successfully registered!
          </p>
          <p className="text-base mb-6" style={{ color: '#18112C' }}>
            Let's continue to your preferences.
          </p>
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#CDDD01' }}>
              <svg width="24" height="20" viewBox="0 0 24 20" fill="none" aria-hidden="true">
                <path d="M2 10l7 7L22 2" stroke="#18112C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
      <button className="btn-locale w-full mt-6" onClick={() => setScreen('prefs-language')}>Continue</button>
    </Page>
  );

  // ── Prefs: Language ───────────────────────────────────────────────────────
  if (screen === 'prefs-language') return (
    <Page>
      <StepIndicator total={3} current={1} />
      <h1 className="text-[32px] leading-tight mb-2" style={{ color: '#18112C', fontWeight: 900 }}>
        What are your<br /><span className="heading-highlight">Goals and Interests?</span>
      </h1>
      <p className="text-sm mb-8 font-light" style={{ color: '#18112C' }}>First, let's choose your preferred language.</p>
      <div className="flex-1">
        <label htmlFor="pref-lang" className="block text-xl font-light mb-3" style={{ color: '#18112C' }}>Language</label>
        <div className="relative">
          <select id="pref-lang" value={learningLang} onChange={e => setLearning(e.target.value)}
            className="w-full rounded-2xl border-2 px-4 py-4 text-base appearance-none focus:outline-none focus:ring-2 focus:ring-[#9973CE]"
            style={{ borderColor: '#9973CE', background: '#FAF8F8', color: '#18112C' }}>
            <option value="">Select a language...</option>
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" aria-hidden="true">
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="#18112C" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
        </div>
      </div>
      <button className="btn-locale w-full mt-6" onClick={() => setScreen('prefs-level')} disabled={!learningLang}>Continue</button>
    </Page>
  );

  // ── Prefs: Level ──────────────────────────────────────────────────────────
  if (screen === 'prefs-level') return (
    <Page>
      <StepIndicator total={3} current={2} />
      <h1 className="text-[32px] leading-tight mb-2" style={{ color: '#18112C', fontWeight: 900 }}>
        What are your<br /><span className="heading-highlight">Goals and Interests?</span>
      </h1>
      <p className="text-sm mb-8 font-light" style={{ color: '#18112C' }}>Next, let's choose your current ability.</p>
      <div className="flex-1">
        <p className="text-xl font-light mb-1" style={{ color: '#18112C' }}>Level</p>
        <p className="text-xs mb-4 font-light" style={{ color: '#18112C' }}>Choose your level...</p>
        <div className="flex rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#9973CE' }}
          role="radiogroup" aria-label="Language level">
          {(['Beginner', 'Intermediate', 'Advanced'] as Level[]).map((lvl, i) => (
            <button key={lvl} role="radio" aria-checked={level === lvl}
              onClick={() => setLevel(lvl)}
              className="flex-1 py-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9973CE]"
              style={{
                background: level === lvl ? '#9973CE' : '#FAF8F8',
                color:      level === lvl ? '#ffffff'  : '#18112C',
                borderRight: i < 2 ? '1px solid #9973CE44' : 'none',
              }}>
              {lvl}
            </button>
          ))}
        </div>
      </div>
      <button className="btn-locale w-full mt-6" onClick={() => setScreen('prefs-communities')}>Continue</button>
    </Page>
  );

  // ── Prefs: Communities ────────────────────────────────────────────────────
  if (screen === 'prefs-communities') return (
    <Page>
      <StepIndicator total={3} current={3} />
      <h1 className="text-[32px] leading-tight mb-2" style={{ color: '#18112C', fontWeight: 900 }}>
        What are your<br /><span className="heading-highlight">Goals and Interests?</span>
      </h1>
      <p className="text-sm mb-6 font-light" style={{ color: '#18112C' }}>Lastly, let's join some communities of interest.</p>
      <div className="flex-1">
        <p className="text-xl font-light mb-3" style={{ color: '#18112C' }}>Communities</p>
        {communities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3" role="list" aria-label="Selected communities">
            {communities.map(c => (
              <span key={c} role="listitem"
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border-2"
                style={{ borderColor: '#9973CE', color: '#18112C', background: '#FAF8F8' }}>
                {c}
                <button onClick={() => removeCommunity(c)} aria-label={`Remove ${c}`}
                  className="ml-1 w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9973CE]">
                  <span aria-hidden="true">×</span>
                </button>
              </span>
            ))}
          </div>
        )}
        <input type="text" value={communityInput} onChange={e => setCommunityInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && communityInput.trim()) {
              setCommunities(p => [...new Set([...p, communityInput.trim()])]);
              setCommunityInput('');
            }
          }}
          placeholder="Select a topic..." aria-label="Add community"
          className="w-full rounded-2xl border-2 px-4 py-4 text-base mb-2 focus:outline-none focus:ring-2 focus:ring-[#9973CE]"
          style={{ borderColor: '#9973CE', background: '#FAF8F8', color: '#18112C' }} />
        {['Movies', 'Music', 'Museums', 'Yoga', 'Hiking']
          .filter(s => !communities.includes(s) && s.toLowerCase().includes(communityInput.toLowerCase()))
          .slice(0, 3)
          .map((s, idx, arr) => (
            <button key={s}
              onClick={() => { setCommunities(p => [...new Set([...p, s])]); setCommunityInput(''); }}
              className="w-full text-left px-4 py-4 text-base font-medium border-x border-b first:border-t focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9973CE]"
              style={{
                background: '#FAF8F8', color: '#18112C', borderColor: '#9973CE44',
                borderRadius: idx === 0 ? '16px 16px 0 0' : idx === arr.length - 1 ? '0 0 16px 16px' : '0',
              }}>
              {s}
            </button>
          ))}
      </div>
      <button className="btn-locale w-full mt-6" onClick={() => navigate('/')}>Continue</button>
    </Page>
  );

  return null;
}
