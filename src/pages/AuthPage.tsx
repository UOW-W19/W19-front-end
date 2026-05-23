import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts';
import { LANGUAGES } from '@/services/api';

type AuthMode = 'login' | 'register';

function LocaleLogo({ className = 'h-20 w-20' }: { className?: string }) {
  return <img src="/locale-logo.svg" alt="Locale" className={className} />;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, isLoading: authLoading } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState('en');
  const [customNativeLanguage, setCustomNativeLanguage] = useState('');
  const [learningLanguages, setLearningLanguages] = useState<string[]>([]);

  const effectiveNativeLanguage = nativeLanguage !== 'other' ? nativeLanguage : null;

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        if (!displayName.trim()) {
          throw new Error('Display name is required');
        }
        if (learningLanguages.length === 0) {
          throw new Error('Please select at least one language to learn');
        }
        await register({
          email,
          password,
          displayName: displayName.trim(),
          nativeLanguage: effectiveNativeLanguage,
          learningLanguages,
        });
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLearningLanguage = (code: string) => {
    setLearningLanguages((prev) =>
      prev.includes(code) ? prev.filter((language) => language !== code) : [...prev, code]
    );
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
        <div className="mb-8 flex justify-center">
          <LocaleLogo className="h-24 w-24" />
        </div>

        <div className="mb-8">
          <h1 className="text-[40px] font-black leading-tight text-foreground">
            {mode === 'login' ? (
              <>
                Hello,<br />
                welcome to <span className="heading-highlight">Locale.</span>
              </>
            ) : (
              <>
                Join<br />
                <span className="heading-highlight">Locale.</span>
              </>
            )}
          </h1>
          <p className="mt-6 text-lg font-light text-foreground">
            {mode === 'login' ? (
              <>
                Learn from <span className="link-orange">your</span> world, with{' '}
                <span className="link-orange">your</span> people.
              </>
            ) : (
              'Create your account and choose the languages you want to practise.'
            )}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          <div className="space-y-6">
            <div>
              <label htmlFor="auth-email" className="mb-2 block text-base font-medium text-foreground">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-underline"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="mb-2 block text-base font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'login' ? 'Password' : 'Min. 6 characters'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="input-underline pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="touch-target absolute right-0 top-1/2 flex -translate-y-1/2 items-center justify-center p-2 text-purple transition-colors hover:text-primary"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {mode === 'login' && (
                <p className="mt-3 text-right text-sm text-foreground">
                  Forgot Password? <button type="button" className="link-orange">Reset</button>
                </p>
              )}
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="auth-display-name" className="mb-2 block text-base font-medium text-foreground">
                    Display Name
                  </label>
                  <input
                    id="auth-display-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="input-underline"
                  />
                </div>

                <div>
                  <label htmlFor="native-language" className="mb-2 block text-base font-medium text-foreground">
                    Your native language
                  </label>
                  <select
                    id="native-language"
                    value={nativeLanguage}
                    onChange={(e) => {
                      const code = e.target.value;
                      setNativeLanguage(code);
                      setLearningLanguages((prev) => prev.filter((language) => language !== code));
                    }}
                    className="w-full rounded-2xl border-2 border-purple bg-card px-4 py-4 text-base text-foreground outline-none transition-all focus:ring-2 focus:ring-purple/40"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                    <option value="other">Other...</option>
                  </select>
                </div>

                {nativeLanguage === 'other' && (
                  <div className="animate-fade-in">
                    <input
                      type="text"
                      placeholder="Type your native language..."
                      value={customNativeLanguage}
                      onChange={(e) => setCustomNativeLanguage(e.target.value)}
                      className="input-underline"
                      autoFocus
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Your native language will not be saved until it is supported. You can set it later from your profile.
                    </p>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-base font-medium text-foreground">
                    Languages you're learning
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.filter((language) => language.code !== nativeLanguage).map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => toggleLearningLanguage(lang.code)}
                        className={`rounded-full border-2 px-3 py-2 text-sm font-semibold transition-all ${
                          learningLanguages.includes(lang.code)
                            ? 'border-purple bg-purple text-white'
                            : 'border-purple/30 bg-card text-foreground hover:border-purple hover:bg-purple/10'
                        }`}
                      >
                        {lang.flag} {lang.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <Button type="submit" disabled={isLoading} className="mt-8 w-full text-base">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === 'login' ? 'Continue' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-foreground">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="link-orange"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>

        {mode === 'login' && (
          <div className="locale-card mt-8">
            <p className="text-center text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Demo account:</span>
              <br />
              demo@locale.app / demo123
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
