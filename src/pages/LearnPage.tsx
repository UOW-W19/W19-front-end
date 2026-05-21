import { useState, useMemo, useCallback, useRef } from "react";
import { Sparkles, RotateCcw, Check, X, ChevronLeft, BookOpen, Camera, TrendingUp, Globe, Zap, ArrowUpDown, ChevronDown, Loader2, Flame, Mic, Volume2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SavedWord } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  useSavedWords,
  useLearningStats,
  useStartPracticeSession,
  useSubmitPracticeResult,
  useCompletePracticeSession,
  transformSessionWord,
  type PracticeResult,
} from "@/hooks/useLearnApi";

type PracticeMode = 'idle' | 'practicing' | 'results' | 'learning';
type SortOption = 'newest' | 'mastery_high' | 'mastery_low';
type WordBank = { id: string; label: string; words: SavedWord[] };

const SESSION_SIZE_OPTIONS = [5, 10, 15] as const;

const WAVEFORM_HEIGHTS = [8, 14, 10, 18, 12, 22, 10, 16, 20, 12, 18, 10, 22, 14, 10, 18, 12, 16, 8, 14];

// ── Concept categorisation ──────────────────────────────────────────────────

const CONCEPT_CATEGORIES: { id: string; label: string; keywords: string[] }[] = [
  {
    id: 'electronics',
    label: 'Electronics & Tech',
    keywords: ['keyboard', 'computer', 'phone', 'screen', 'battery', 'charger', 'laptop', 'tablet', 'mouse', 'cable', 'internet', 'wifi', 'app', 'device', 'camera', 'printer', 'monitor', 'software', 'hardware', 'network', 'bluetooth', 'headphone', 'speaker', 'remote', 'digital'],
  },
  {
    id: 'shopping',
    label: 'Shopping & Money',
    keywords: ['how much', 'price', 'cost', 'buy', 'shop', 'store', 'market', 'pay', 'discount', 'cheap', 'expensive', 'sale', 'receipt', 'money', 'cash', 'card', 'purchase', 'refund', 'wallet', 'coin', 'bank', 'currency', 'change', 'bill', 'budget'],
  },
  {
    id: 'food',
    label: 'Food & Drink',
    keywords: ['eat', 'food', 'drink', 'coffee', 'restaurant', 'menu', 'hungry', 'cook', 'meal', 'breakfast', 'lunch', 'dinner', 'bread', 'meat', 'vegetable', 'fruit', 'juice', 'beer', 'wine', 'tea', 'rice', 'soup', 'dessert', 'snack', 'delicious', 'taste', 'kitchen', 'recipe', 'milk', 'cheese', 'egg'],
  },
  {
    id: 'travel',
    label: 'Travel & Transport',
    keywords: ['train', 'bus', 'airport', 'hotel', 'map', 'ticket', 'passport', 'direction', 'car', 'taxi', 'flight', 'trip', 'journey', 'station', 'city', 'country', 'border', 'luggage', 'reservation', 'tourist', 'road', 'bridge', 'ferry', 'subway', 'platform'],
  },
  {
    id: 'greetings',
    label: 'Greetings & Phrases',
    keywords: ['hello', 'good morning', 'good night', 'goodbye', 'thank', 'please', 'sorry', 'excuse', 'welcome', 'understand', 'speak', 'repeat', 'help', 'know', 'what is', 'how are', 'nice to meet', 'see you', 'good luck', 'congratulations'],
  },
  {
    id: 'people',
    label: 'People & Family',
    keywords: ['mother', 'father', 'brother', 'sister', 'friend', 'family', 'child', 'baby', 'husband', 'wife', 'parent', 'son', 'daughter', 'uncle', 'aunt', 'grandmother', 'grandfather', 'person', 'man', 'woman', 'boy', 'girl', 'neighbour', 'colleague', 'boss'],
  },
  {
    id: 'body',
    label: 'Body & Health',
    keywords: ['head', 'hand', 'foot', 'eye', 'ear', 'nose', 'mouth', 'body', 'sick', 'doctor', 'hospital', 'medicine', 'pain', 'heart', 'back', 'arm', 'leg', 'tooth', 'health', 'exercise', 'sleep', 'tired', 'fever', 'allergy', 'pharmacy'],
  },
  {
    id: 'home',
    label: 'Home & Living',
    keywords: ['house', 'home', 'room', 'door', 'window', 'bed', 'chair', 'table', 'bathroom', 'garden', 'floor', 'wall', 'furniture', 'key', 'clean', 'wash', 'sofa', 'lamp', 'shelf', 'cupboard', 'neighbour', 'apartment', 'flat'],
  },
  {
    id: 'nature',
    label: 'Nature & Weather',
    keywords: ['sun', 'rain', 'tree', 'flower', 'weather', 'hot', 'cold', 'wind', 'snow', 'cloud', 'river', 'sea', 'mountain', 'forest', 'animal', 'dog', 'cat', 'bird', 'fish', 'sky', 'earth', 'storm', 'beach', 'lake', 'plant', 'season'],
  },
];

function categoriseWord(word: string, translation: string): string {
  const text = `${word} ${translation}`.toLowerCase();
  for (const cat of CONCEPT_CATEGORIES) {
    if (cat.keywords.some(kw => text.includes(kw))) return cat.id;
  }
  return 'other';
}

export default function LearnPage() {
  const [mode, setMode] = useState<PracticeMode>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [practiceWords, setPracticeWords] = useState<SavedWord[]>([]);
  const [results, setResults] = useState<PracticeResult[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionsDoneToday, setSessionsDoneToday] = useState(0);
  const [openBanks, setOpenBanks] = useState<Set<string>>(new Set());
  const startTimeRef = useRef<number>(0);

  // Lesson state
  const [lessonBank, setLessonBank] = useState<WordBank | null>(null);
  const [lessonStep, setLessonStep] = useState(1);
  const [chipPool, setChipPool] = useState<string[]>([]);
  const [placedChips, setPlacedChips] = useState<string[]>([]);
  const [writeInput, setWriteInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // Filtering & Sorting
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Session size options
  const [sessionSize, setSessionSize] = useState<5 | 10 | 15>(10);

  // API Hooks
  const {
    data: savedWords = [],
    isLoading: isLoadingWords,
    error: wordsError,
  } = useSavedWords({
    sort: sortBy,
  });

  const {
    data: stats,
    isLoading: isLoadingStats,
  } = useLearningStats();

  const startSessionMutation = useStartPracticeSession();
  const submitResultMutation = useSubmitPracticeResult();
  const completeSessionMutation = useCompletePracticeSession();

  // Get unique languages for filter
  const uniqueLanguages = useMemo(() => {
    const langs = savedWords.map(w => ({ flag: w.languageFlag, name: w.languageName }));
    return langs.filter((lang, index, self) =>
      index === self.findIndex(l => l.flag === lang.flag)
    );
  }, [savedWords]);

  // Filter words (sorting handled by API)
  const filteredWords = useMemo(() => {
    if (languageFilter === 'all') return savedWords;
    return savedWords.filter(w => w.languageFlag === languageFilter);
  }, [savedWords, languageFilter]);

  // Group filtered words by concept for Word Bank cards
  const wordBanks = useMemo(() => {
    const map = new Map<string, { id: string; label: string; words: typeof filteredWords }>();
    for (const w of filteredWords) {
      const id = categoriseWord(w.word, w.translation);
      const label = CONCEPT_CATEGORIES.find(c => c.id === id)?.label ?? 'Other';
      if (!map.has(id)) map.set(id, { id, label, words: [] });
      map.get(id)!.words.push(w);
    }
    // Keep "other" bucket last
    const banks = Array.from(map.values());
    const otherIdx = banks.findIndex(b => b.id === 'other');
    if (otherIdx > 0) banks.push(banks.splice(otherIdx, 1)[0]);
    return banks;
  }, [filteredWords]);

  // Computed stats from API or fallback
  const displayStats = useMemo(() => {
    if (stats) {
      return {
        totalWords: stats.total_words,
        avgMastery: stats.average_mastery,
        languages: stats.languages.map(l => l.flag),
        masteredWords: stats.mastery_distribution.mastered,
      };
    }
    // Fallback to local computation
    const totalWords = savedWords.length;
    const avgMastery = totalWords > 0
      ? Math.round(savedWords.reduce((acc, w) => acc + w.masteryLevel, 0) / totalWords)
      : 0;
    const languages = [...new Set(savedWords.map(w => w.languageFlag))];
    const masteredWords = savedWords.filter(w => w.masteryLevel >= 76).length;
    return { totalWords, avgMastery, languages, masteredWords };
  }, [stats, savedWords]);

  const startPractice = useCallback(async () => {
    try {
      const session = await startSessionMutation.mutateAsync({
        session_size: sessionSize,
        language_code: languageFilter !== 'all'
          ? savedWords.find(w => w.languageFlag === languageFilter)?.languageCode
          : null,
      });

      setSessionId(session.session_id);
      setPracticeWords(session.words.map(transformSessionWord));
      setCurrentIndex(0);
      setShowAnswer(false);
      setResults([]);
      startTimeRef.current = Date.now();
      setMode('practicing');
    } catch {
      // Error handled by mutation
    }
  }, [startSessionMutation, sessionSize, languageFilter, savedWords]);

  const handleAnswer = useCallback(async (correct: boolean) => {
    if (!sessionId) return;

    const currentWord = practiceWords[currentIndex];
    const responseTimeMs = Date.now() - startTimeRef.current;

    try {
      const result = await submitResultMutation.mutateAsync({
        sessionId,
        data: {
          word_id: currentWord.id,
          is_correct: correct,
          response_time_ms: responseTimeMs,
        },
      });

      const newResult: PracticeResult = {
        word: currentWord,
        correct,
        oldMastery: result.old_mastery,
        newMastery: result.new_mastery,
      };

      setResults(prev => [...prev, newResult]);

      if (currentIndex < practiceWords.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
        startTimeRef.current = Date.now();
      } else {
        // Complete session
        await completeSessionMutation.mutateAsync(sessionId);
        setSessionsDoneToday(n => n + 1);
        setMode('results');
      }
    } catch {
      // Error handled by mutation
    }
  }, [sessionId, practiceWords, currentIndex, submitResultMutation, completeSessionMutation]);

  const exitPractice = useCallback(() => {
    setMode('idle');
    setCurrentIndex(0);
    setShowAnswer(false);
    setResults([]);
    setSessionId(null);
  }, []);

  const startLesson = useCallback((bank: WordBank) => {
    const tokens = bank.words[0]?.word.split(/\s+/).filter(Boolean) ?? [];
    const shuffled = [...tokens].sort(() => Math.random() - 0.5);
    setLessonBank(bank);
    setLessonStep(1);
    setChipPool(shuffled);
    setPlacedChips([]);
    setWriteInput('');
    setIsRecording(false);
    setMode('learning');
  }, []);

  // Loading State
  if (isLoadingWords && mode === 'idle') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error State
  if (wordsError && mode === 'idle') {
    return (
      <div className="mx-auto max-w-md px-4 py-6 text-center">
        <p className="text-destructive mb-4">Failed to load your words</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  // Practice Session View
  if (mode === 'practicing') {
    const currentWord = practiceWords[currentIndex];
    const progress = ((currentIndex + 1) / practiceWords.length) * 100;
    const isSubmitting = submitResultMutation.isPending;

    return (
      <div className="min-h-full overflow-y-auto pb-24 scrollbar-hide mx-auto max-w-md px-4 py-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={exitPractice}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">Exit</span>
          </button>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {practiceWords.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-muted mb-8 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Flashcard */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div
            onClick={() => !showAnswer && setShowAnswer(true)}
            className={cn(
              "w-full aspect-[4/3] rounded-2xl border-2 border-border bg-card p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
              "hover:shadow-soft hover:border-primary/30",
              showAnswer && "border-primary/50"
            )}
          >
            <span className="text-3xl mb-4">{currentWord.languageFlag}</span>
            <p className="text-3xl font-bold text-foreground mb-2 text-center">
              {currentWord.word}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {currentWord.languageName}
            </p>

            {showAnswer ? (
              <div className="mt-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-xl font-medium text-primary">
                  {currentWord.translation}
                </p>
                {currentWord.context && (
                  <p className="mt-2 text-xs text-muted-foreground flex items-center justify-center gap-1">
                    {currentWord.source === 'POST' ? (
                      <BookOpen className="h-3 w-3" />
                    ) : (
                      <Camera className="h-3 w-3" />
                    )}
                    {currentWord.context}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-4">
                Tap to reveal answer
              </p>
            )}
          </div>

          {/* Current mastery indicator */}
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Current mastery:</span>
            <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-sage transition-all"
                style={{ width: `${currentWord.masteryLevel}%` }}
              />
            </div>
            <span>{currentWord.masteryLevel}%</span>
          </div>
        </div>

        {/* Action buttons */}
        {showAnswer && (
          <div className="flex gap-4 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Button
              variant="outline"
              onClick={() => handleAnswer(false)}
              disabled={isSubmitting}
              className="flex-1 h-14 gap-2 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />}
              Didn't know
            </Button>
            <Button
              onClick={() => handleAnswer(true)}
              disabled={isSubmitting}
              className="flex-1 h-14 gap-2 rounded-xl bg-sage hover:bg-sage/90"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              Got it!
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Results View
  if (mode === 'results') {
    const correctCount = results.filter(r => r.correct).length;
    const percentage = Math.round((correctCount / results.length) * 100);

    return (
      <div className="min-h-full overflow-y-auto pb-24 scrollbar-hide mx-auto max-w-md px-4 py-6 flex flex-col">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Session Complete!</h2>
          <p className="text-lg text-muted-foreground">
            You got <span className="font-semibold text-primary">{correctCount}</span> out of <span className="font-semibold">{results.length}</span> correct
          </p>
          <p className="text-3xl font-bold text-foreground mt-2">{percentage}%</p>
        </div>

        <div className="flex-1 space-y-2 mb-6">
          {results.map((result, index) => {
            const masteryChange = result.newMastery - result.oldMastery;

            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-4 transition-all",
                  result.correct
                    ? "border-sage/30 bg-sage/5"
                    : "border-destructive/30 bg-destructive/5"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  result.correct ? "bg-sage/20" : "bg-destructive/20"
                )}>
                  {result.correct ? (
                    <Check className="h-4 w-4 text-sage" />
                  ) : (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{result.word.word}</p>
                  <p className="text-sm text-muted-foreground truncate">{result.word.translation}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-lg">{result.word.languageFlag}</span>
                  <p className={cn(
                    "text-xs font-medium",
                    masteryChange > 0 ? "text-sage" : "text-destructive"
                  )}>
                    {masteryChange > 0 ? '+' : ''}{masteryChange}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={exitPractice}
            className="flex-1 h-12 rounded-xl"
          >
            Done
          </Button>
          <Button
            onClick={startPractice}
            disabled={startSessionMutation.isPending}
            className="flex-1 h-12 gap-2 rounded-xl"
          >
            {startSessionMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Practice Again
          </Button>
        </div>
      </div>
    );
  }

  // Learning Mode
  if (mode === 'learning' && lessonBank) {
    const word = lessonBank.words[0];

    const advanceStep = () => setLessonStep(s => Math.min(s + 1, 4));
    const exitLesson = () => {
      setMode('idle');
      setLessonBank(null);
      setLessonStep(1);
      setChipPool([]);
      setPlacedChips([]);
      setWriteInput('');
      setIsRecording(false);
    };
    const placeChip = (chip: string, idx: number) => {
      setChipPool(prev => prev.filter((_, i) => i !== idx));
      setPlacedChips(prev => [...prev, chip]);
    };
    const removeChip = (chip: string, idx: number) => {
      setPlacedChips(prev => prev.filter((_, i) => i !== idx));
      setChipPool(prev => [...prev, chip]);
    };

    const STEPS = ['Listen', 'Arrange', 'Write', 'Share'];

    return (
      <div className="min-h-full overflow-y-auto pb-24 scrollbar-hide mx-auto max-w-md px-4 py-6 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={exitLesson}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">Exit</span>
          </button>
          <h1 className="text-base font-bold text-foreground">
            {lessonStep === 4 ? 'Share with Community!' : 'Lesson time!'}
          </h1>
          <div className="w-12" />
        </div>

        {/* Step progress indicator */}
        <div className="flex items-center justify-center mb-6">
          {STEPS.map((label, i) => {
            const step = i + 1;
            const done = lessonStep > step;
            const active = lessonStep === step;
            return (
              <div key={step} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                    done ? "bg-sage text-white" : active ? "bg-primary text-primary-foreground ring-2 ring-primary/25" : "bg-muted text-muted-foreground"
                  )}>
                    {done ? <Check className="h-3.5 w-3.5" /> : step}
                  </div>
                  <span className={cn("text-[10px]", active ? "text-primary font-medium" : "text-muted-foreground")}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn("h-0.5 w-10 mb-4 transition-all duration-300", done ? "bg-sage" : "bg-muted")} />
                )}
              </div>
            );
          })}
        </div>

        {/* Word card — steps 1–3 */}
        {lessonStep < 4 && (
          <div className="rounded-2xl border border-border bg-card p-4 mb-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-foreground">
                  <span className="text-muted-foreground">{word.languageName}:</span>{' '}
                  <span className="font-semibold">{word.word}</span>
                </p>
                <p className="text-sm text-foreground">
                  <span className="text-muted-foreground">English:</span>{' '}
                  <span className="font-medium">{word.translation}</span>
                </p>
              </div>
                <Volume2 className="h-3 w-3 text-muted-foreground" />
              {/* <button className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
              </button> */}
            </div>
            <div className="rounded-xl bg-gradient-to-br from-muted to-muted/40 h-36 flex items-center justify-center relative overflow-hidden">
              <span className="text-6xl opacity-10">{word.languageFlag}</span>
              {/* <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1.5 text-xs font-medium shadow-sm">
                {word.word}
                <Volume2 className="h-3 w-3 text-muted-foreground" />
              </div> */}
            </div>
          </div>
        )}

        {/* Step 1 — Voice Prompt */}
        {lessonStep === 1 && (
          <div className="flex-1 flex flex-col">
            <h3 className="font-semibold text-foreground mb-3">Voice Prompt</h3>
            <div className="rounded-xl bg-muted/40 border border-border p-4 mb-4">
              <p className="text-xs text-muted-foreground mb-1">Say this phrase:</p>
              <p className="font-medium text-foreground">{word.word}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{word.translation}</p>
            </div>
            <button
              onClick={() => setIsRecording(r => !r)}
              className={cn(
                "w-full rounded-xl p-3.5 flex items-center gap-3 transition-all mb-6",
                isRecording ? "bg-primary" : "bg-primary/90 hover:bg-primary"
              )}
            >
              <div className="flex items-end gap-0.5 flex-1 h-8">
                {WAVEFORM_HEIGHTS.map((h, i) => (
                  <div
                    key={i}
                    className={cn("flex-1 rounded-full bg-white/60 transition-all", isRecording && "animate-pulse")}
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
              <div className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                isRecording ? "bg-white text-primary" : "bg-white/20 text-white"
              )}>
                <Mic className="h-4 w-4" />
              </div>
            </button>
            <Button onClick={advanceStep} className="w-full h-12 rounded-xl mt-auto">
              Continue
            </Button>
          </div>
        )}

        {/* Step 2 — Drag and Drop */}
        {lessonStep === 2 && (
          <div className="flex-1 flex flex-col">
            <h3 className="font-semibold text-foreground mb-1">Drag and Drop</h3>
            <p className="text-sm text-muted-foreground mb-3">"{word.translation}"</p>

            {/* Target drop zone */}
            <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-muted/30 border border-border min-h-[52px] mb-3">
              {placedChips.length > 0 ? placedChips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => removeChip(chip, i)}
                  className="px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/30 text-sm font-medium hover:bg-primary/25 transition-colors"
                >
                  {chip}
                </button>
              )) : (
                <span className="text-xs text-muted-foreground self-center">Tap chips to build the phrase</span>
              )}
            </div>

            {/* Available chips */}
            <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-muted/20 border border-border/50 mb-6">
              {chipPool.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => placeChip(chip, i)}
                  className="px-3 py-1.5 rounded-lg bg-card border border-border text-sm font-medium hover:bg-primary/5 hover:border-primary/30 transition-colors"
                >
                  {chip}
                </button>
              ))}
              {chipPool.length === 0 && (
                <span className="text-xs text-muted-foreground self-center">All chips placed</span>
              )}
            </div>

            <Button onClick={advanceStep} className="w-full h-12 rounded-xl mt-auto">
              Continue
            </Button>
          </div>
        )}

        {/* Step 3 — Write yourself */}
        {lessonStep === 3 && (
          <div className="flex-1 flex flex-col">
            <h3 className="font-semibold text-foreground mb-1">Write yourself</h3>
            <p className="text-sm text-muted-foreground mb-4">"{word.translation}"</p>
            <input
              type="text"
              value={writeInput}
              onChange={e => setWriteInput(e.target.value)}
              placeholder="Type the phrase..."
              autoFocus
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mb-6"
            />
            <Button
              onClick={advanceStep}
              disabled={writeInput.trim() === ''}
              className="w-full h-12 rounded-xl mt-auto"
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 4 — Share with Community */}
        {lessonStep === 4 && (
          <div className="flex-1 flex flex-col">
            <div className="rounded-2xl border border-border bg-card p-4 mb-5">
              <p className="font-semibold text-foreground mb-3">{lessonBank.label}</p>
              <div className="rounded-xl bg-gradient-to-br from-muted to-muted/40 h-28 flex items-center justify-center relative overflow-hidden">
                <span className="text-5xl opacity-10">{word.languageFlag}</span>
                <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1.5 text-xs font-medium shadow-sm">
                  {word.word}
                  <Volume2 className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-2.5 flex-1">
              <button className="w-full flex items-center justify-between p-3.5 rounded-xl bg-card border border-border hover:bg-muted/30 transition-colors">
                <span className="text-sm text-muted-foreground">Post to which community...</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
              <button className="w-full flex items-center justify-between p-3.5 rounded-xl bg-card border border-border hover:bg-muted/30 transition-colors">
                <span className="text-sm text-muted-foreground">Add a location...</span>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border">
                <span className="text-sm text-muted-foreground">Post publicly...</span>
                <div className="h-6 w-11 rounded-full bg-primary relative cursor-pointer flex-shrink-0">
                  <div className="h-5 w-5 rounded-full bg-white absolute right-0.5 top-0.5 shadow-sm" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={exitLesson}
                className="flex-1 h-12 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
              >
                Discard
              </Button>
              <Button
                onClick={exitLesson}
                className="flex-1 h-12 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Post!
              </Button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // Idle View - Stats Dashboard Layout
  const dailyGoal = 1;
  const goalMet = sessionsDoneToday >= dailyGoal;
  const progressPct = Math.min((sessionsDoneToday / dailyGoal) * 100, 100);

  return (
    <div className="h-full overflow-y-auto pb-24 scrollbar-hide mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Learn</h1>
      </div>
      {/* Today's Progress */}
      <section className="mb-5">
        <div className={cn(
          "rounded-2xl border p-4",
          goalMet ? "bg-sage/5 border-sage/30" : "bg-card border-border"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className={cn("h-4 w-4", goalMet ? "text-sage" : "text-muted-foreground")} />
              <span className="text-sm font-medium text-foreground">Today's Progress</span>
            </div>
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              goalMet ? "bg-sage/20 text-sage" : "bg-muted text-muted-foreground"
            )}>
              {goalMet ? "Goal met!" : `${sessionsDoneToday} / ${dailyGoal} session`}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                goalMet ? "bg-sage" : "bg-primary"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {sessionsDoneToday > 0 ? (
            <p className="text-xs text-muted-foreground">
              {sessionsDoneToday} session{sessionsDoneToday !== 1 ? "s" : ""} completed today — keep it up!
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Complete a practice session to hit your daily goal</p>
          )}
        </div>
      </section>

      {/* Stats Dashboard */}
      <section className="mb-6">
        <div className="grid grid-cols-3 gap-3">
          {/* Words Saved */}
          <div className="rounded-2xl bg-card border border-border p-4 text-center">
            <div className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl bg-primary/10 mb-2">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            {isLoadingStats ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{displayStats.totalWords}</p>
            )}
            <p className="text-xs text-muted-foreground">Words Saved</p>
          </div>

          {/* Avg Mastery */}
          <div className="rounded-2xl bg-card border border-border p-4 text-center">
            <div className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl bg-sage/10 mb-2">
              <TrendingUp className="h-5 w-5 text-sage" />
            </div>
            {isLoadingStats ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{displayStats.avgMastery}%</p>
            )}
            <p className="text-xs text-muted-foreground">Avg Mastery</p>
          </div>

          {/* Languages */}
          <div className="rounded-2xl bg-card border border-border p-4 text-center">
            <div className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl bg-coral/10 mb-2">
              <Globe className="h-5 w-5 text-coral" />
            </div>
            {isLoadingStats ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{displayStats.languages.length}</p>
            )}
            <p className="text-xs text-muted-foreground">Languages</p>
          </div>
        </div>

        {/* Language flags row */}
        {/* {displayStats.languages.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            {displayStats.languages.map((flag, i) => (
              <span key={i} className="text-xl">{flag}</span>
            ))}
          </div>
        )} */}
      </section>

      {/* Practice Card */}
      <section className="mb-6">
        <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-coral/5 border border-primary/20 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Ready to practice?</h2>
              <p className="text-sm text-muted-foreground">
                {/* {displayStats.masteredWords} of {displayStats.totalWords}  */}
                Quickly practice your problem words 
              </p>
            </div>
          </div>

          {/* <p className="text-xs text-muted-foreground mb-4">
            Quickly practice words you struggle with 
          </p> */}

          {/* Session Size Selector */}
          <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-background/50 border border-border">
            <span className="text-sm text-muted-foreground">Words per session</span>
            <div className="flex gap-2">
              {SESSION_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  onClick={() => setSessionSize(size)}
                  disabled={savedWords.length < size}
                  className={cn(
                    "h-9 w-12 rounded-lg text-sm font-medium transition-all",
                    sessionSize === size
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80",
                    savedWords.length < size && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={startPractice}
            disabled={savedWords.length < sessionSize || startSessionMutation.isPending}
            className="w-full h-12 gap-2 rounded-xl"
          >
            {startSessionMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            Quick Practice ({sessionSize} words)
          </Button>

          {savedWords.length < sessionSize && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Save at least {sessionSize} words to start practicing
            </p>
          )}
        </div>
      </section>

      {/* Word Bank Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Word Banks</h2>
          
          <div className="flex items-center gap-2">
            {/* Language Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  {languageFilter === 'all' ? 'All' : languageFilter}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguageFilter('all')}>
                  All Languages
                </DropdownMenuItem>
                {uniqueLanguages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.flag}
                    onClick={() => setLanguageFilter(lang.flag)}
                  >
                    {lang.flag} {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  Sort
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy('newest')}>
                  Newest First
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('mastery_high')}>
                  Highest Mastery
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('mastery_low')}>
                  Lowest Mastery
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {wordBanks.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-1">No words saved yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Save words from posts or use the scanner to build your vocabulary
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {wordBanks.map((bank) => {
              const isOpen = openBanks.has(bank.id);
              const avgMastery = Math.round(
                bank.words.reduce((sum, w) => sum + w.masteryLevel, 0) / bank.words.length
              );
              const toggleOpen = () =>
                setOpenBanks(prev => {
                  const next = new Set(prev);
                  isOpen ? next.delete(bank.id) : next.add(bank.id);
                  return next;
                });

              return (
                <div key={bank.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                  {/* Card header */}
                  <button
                    onClick={toggleOpen}
                    className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary/10 flex-shrink-0">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{bank.label}</p>
                      <p className="text-xs text-muted-foreground">{bank.words.length} word{bank.words.length !== 1 ? 's' : ''}</p>
                    </div>
                    {/* Avg mastery pill */}
                    <div className="flex items-center gap-1.5 mr-2">
                      <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-sage transition-all" style={{ width: `${avgMastery}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-7 text-right">{avgMastery}%</span>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
                  </button>

                  {/* Learn button row — always visible */}
                  <div className="px-4 pb-3 flex justify-end border-t border-border/50 pt-3">
                    <Button size="sm" onClick={() => startLesson(bank)} className="h-8 px-4 rounded-lg gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Learn
                    </Button>
                  </div>

                  {/* Collapsible word list */}
                  {isOpen && (
                    <div className="border-t border-border divide-y divide-border/50">
                      {bank.words.map((word) => (
                        <div key={word.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="text-base flex-shrink-0">{word.languageFlag}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-foreground text-sm truncate">{word.word}</p>
                              {word.source === 'MANUAL' && (
                                <Camera className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{word.translation}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="h-1.5 w-10 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-sage transition-all" style={{ width: `${word.masteryLevel}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-7 text-right">{word.masteryLevel}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
