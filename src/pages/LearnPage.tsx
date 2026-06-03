import { useState, useMemo, useCallback, useRef } from "react";
import { Sparkles, RotateCcw, Check, X, ChevronLeft, BookOpen, Camera, TrendingUp, Globe, Zap, ArrowUpDown, ChevronDown, Loader2, Flame, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LessonSessionView } from "@/components/learn/LessonSessionView";
import type { LessonWordBank, SavedWord } from "@/types";
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
  useUpdateWord,
  useCreateWord,
  useDeleteWord,
  transformSessionWord,
  type PracticeResult,
} from "@/hooks/useLearnApi";
import { useLessonSession } from "@/hooks/useLessonSession";
import { postsApi } from "@/services/api/posts";
import { useAuth } from "@/contexts/useAuth";
import { notifyFeedPostCreated } from "@/lib/feedRefresh";

type PracticeMode = 'idle' | 'practicing' | 'results' | 'learning';
type SortOption = 'newest' | 'mastery_high' | 'mastery_low';
type WordBank = LessonWordBank;

const SESSION_SIZE_OPTIONS = [5, 10, 15] as const;

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
  const { user } = useAuth();
  const [mode, setMode] = useState<PracticeMode>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [practiceWords, setPracticeWords] = useState<SavedWord[]>([]);
  const [results, setResults] = useState<PracticeResult[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionsDoneToday, setSessionsDoneToday] = useState(0);
  const [isSharingLesson, setIsSharingLesson] = useState(false);
  const [isLessonLocationAttached, setIsLessonLocationAttached] = useState(false);
  const [openBanks, setOpenBanks] = useState<Set<string>>(new Set());
  const startTimeRef = useRef<number>(0);

  const {
    lessonBank,
    lessonWords,
    currentLessonWord,
    currentWordIndex,
    lessonStep,
    chipPool,
    placedChips,
    writeInput,
    writeAnswer,
    isRecording,
    voicePrompt,
    isArrangeComplete,
    isArrangeCorrect,
    startLesson: startLessonSession,
    exitLesson: resetLessonSession,
    advanceStep,
    placeChip,
    removeChip,
    reorderPlacedChips,
    setWriteInput,
    submitWriteAnswer,
    revealWriteAnswer,
    playVoicePrompt,
    toggleRecording,
  } = useLessonSession();

  // Filtering & Sorting
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Add-word modal state
  const [showAddWord, setShowAddWord] = useState(false);
  const [addWord, setAddWord] = useState('');
  const [addTranslation, setAddTranslation] = useState('');
  const [addLangCode, setAddLangCode] = useState('en');
  const ADD_LANGUAGES = [
    { code: 'en', flag: '🇺🇸', name: 'English'  },
    { code: 'es', flag: '🇪🇸', name: 'Spanish'  },
    { code: 'fr', flag: '🇫🇷', name: 'French'   },
    { code: 'ja', flag: '🇯🇵', name: 'Japanese' },
    { code: 'zh', flag: '🇨🇳', name: 'Chinese'  },
    { code: 'it', flag: '🇮🇹', name: 'Italian'  },
  ];

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
  const updateWordMutation = useUpdateWord();
  const createWordMutation = useCreateWord();
  const deleteWordMutation = useDeleteWord();

  const [deletedWordIds, setDeletedWordIds] = useState<Set<string>>(new Set());
  const [confirmDeleteWordId, setConfirmDeleteWordId] = useState<string | null>(null);

  const handleAddWord = async () => {
    if (!addWord.trim() || !addTranslation.trim()) return;
    await createWordMutation.mutateAsync({
      word: addWord.trim(),
      translation: addTranslation.trim(),
      language_code: addLangCode,
      source: 'MANUAL',
    });
    setAddWord('');
    setAddTranslation('');
    setShowAddWord(false);
  };

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

  const lessonShareLocation = useMemo(() => {
    const latitude = user?.latitude;
    const longitude = user?.longitude;
    if (typeof latitude !== "number" || typeof longitude !== "number") return null;

    return {
      latitude,
      longitude,
      label: user?.location?.trim() || "Your profile location",
    };
  }, [user?.latitude, user?.location, user?.longitude]);

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
    if (startLessonSession(bank)) {
      setIsLessonLocationAttached(false);
      setMode('learning');
    }
  }, [startLessonSession]);

  const persistLessonProgress = useCallback(async () => {
    const progress = advanceStep();
    if (!progress || progress.nextMastery === progress.previousMastery) return;

    try {
      await updateWordMutation.mutateAsync({
        wordId: progress.wordId,
        data: { mastery_level: progress.nextMastery },
      });
      setSessionsDoneToday(n => n + 1);
    } catch {
      // Error handled by mutation toast.
    }
  }, [advanceStep, updateWordMutation]);

  const exitLesson = useCallback(() => {
    resetLessonSession();
    setIsSharingLesson(false);
    setIsLessonLocationAttached(false);
    setMode('idle');
  }, [resetLessonSession]);

  const handleShareLessonPost = useCallback(async (content: string) => {
    const body = content.trim();
    if (!currentLessonWord || !body) return;
    const attachedLocation = isLessonLocationAttached ? lessonShareLocation : null;

    try {
      setIsSharingLesson(true);
      const createdPost = await postsApi.createPost({
        content: body,
        originalLanguage: currentLessonWord.languageCode,
        latitude: attachedLocation?.latitude,
        longitude: attachedLocation?.longitude,
      });
      notifyFeedPostCreated(createdPost);
      toast.success("Posted to your feed");
      exitLesson();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to share post");
    } finally {
      setIsSharingLesson(false);
    }
  }, [currentLessonWord, exitLesson, isLessonLocationAttached, lessonShareLocation]);

  const toggleLessonLocation = useCallback(() => {
    if (!lessonShareLocation) return;
    setIsLessonLocationAttached((isAttached) => !isAttached);
  }, [lessonShareLocation]);

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
                className="h-full rounded-full transition-all"
                style={{ width: `${currentWord.masteryLevel}%`, background: '#CDDD01' }}
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
              className="flex-1 h-14 gap-2 rounded-xl"
              style={{ background: '#CDDD01', color: '#7a8700' }}
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
      <div className="h-full overflow-y-auto scrollbar-hide mx-auto max-w-md px-4 pt-5 pb-28 flex flex-col">
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-3">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Session Complete!</h2>
          <p className="text-base text-muted-foreground">
            You got <span className="font-semibold text-primary">{correctCount}</span> out of <span className="font-semibold">{results.length}</span> correct
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">{percentage}%</p>
        </div>

        <div className="space-y-2 pb-4">
          {results.map((result, index) => {
            const masteryChange = result.newMastery - result.oldMastery;

            return (
              <div
                key={index}
                className="flex items-center gap-3 rounded-xl border p-4 transition-all"
                style={result.correct
                  ? { borderColor: '#CDDD0150', background: '#CDDD0108' }
                  : { borderColor: 'hsl(var(--destructive) / 0.3)', background: 'hsl(var(--destructive) / 0.05)' }}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0"
                  style={result.correct
                    ? { background: '#CDDD0125' }
                    : { background: 'hsl(var(--destructive) / 0.2)' }}
                >
                  {result.correct ? (
                    <Check className="h-4 w-4" style={{ color: '#8a9600' }} />
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
                  <p
                    className="text-xs font-medium"
                    style={{ color: masteryChange > 0 ? '#8a9600' : 'hsl(var(--destructive))' }}
                  >
                    {masteryChange > 0 ? '+' : ''}{masteryChange}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 -mx-4 mt-auto flex gap-3 border-t border-border bg-background/95 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
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
  if (mode === 'learning' && lessonBank && currentLessonWord) {
    return (
      <LessonSessionView
        bank={lessonBank}
        words={lessonWords}
        word={currentLessonWord}
        currentWordIndex={currentWordIndex}
        step={lessonStep}
        chipPool={chipPool}
        placedChips={placedChips}
        writeInput={writeInput}
        writeAnswer={writeAnswer}
        isRecording={isRecording}
        voicePrompt={voicePrompt}
        isArrangeComplete={isArrangeComplete}
        isArrangeCorrect={isArrangeCorrect}
        onExit={exitLesson}
        onAdvance={persistLessonProgress}
        onPlayVoicePrompt={playVoicePrompt}
        onToggleRecording={toggleRecording}
        onPlaceChip={placeChip}
        onRemoveChip={removeChip}
        onReorderPlacedChips={reorderPlacedChips}
        onWriteInputChange={setWriteInput}
        onSubmitWriteAnswer={submitWriteAnswer}
        onRevealWriteAnswer={revealWriteAnswer}
        isPostingShare={isSharingLesson}
        onSharePost={handleShareLessonPost}
        shareLocationLabel={lessonShareLocation?.label}
        isShareLocationAttached={Boolean(lessonShareLocation && isLessonLocationAttached)}
        canAttachShareLocation={Boolean(lessonShareLocation)}
        onToggleShareLocation={toggleLessonLocation}
      />
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
        <div
          className="rounded-2xl border p-4 transition-colors duration-500"
          style={goalMet
            ? { background: '#CDDD0112', borderColor: '#CDDD0150' }
            : {}}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame
                className="h-4 w-4 transition-colors duration-300"
                style={{ color: goalMet ? '#CDDD01' : 'var(--muted-foreground)' }}
              />
              <span className="text-sm font-medium text-foreground">Today's Progress</span>
            </div>
            <span
              className="text-xs font-bold px-2.5 py-0.5 rounded-full transition-colors duration-300"
              style={goalMet
                ? { background: '#CDDD0120', color: '#7a8700' }
                : { background: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              {goalMet
                ? `${sessionsDoneToday}/${dailyGoal} session${dailyGoal !== 1 ? 's' : ''}`
                : `${sessionsDoneToday} / ${dailyGoal} session`}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: goalMet ? '#CDDD01' : 'var(--primary)',
              }}
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
            <div className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl mb-2" style={{ background: '#CDDD0120' }}>
              <TrendingUp className="h-5 w-5" style={{ color: '#7a8700' }} />
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
        <h2 className="text-lg font-semibold text-foreground mb-3">Word Banks</h2>
        <div className="flex items-center justify-between mb-4">
          {/* Add word pill */}
          <button
            onClick={() => setShowAddWord(true)}
            className="flex items-center gap-1 h-8 px-3 rounded-full border border-dashed border-primary/50 text-primary text-xs font-medium hover:bg-primary/5 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>

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
                  if (isOpen) {
                    next.delete(bank.id);
                  } else {
                    next.add(bank.id);
                  }
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
                        <div className="h-full rounded-full transition-all" style={{ width: `${avgMastery}%`, background: '#CDDD01' }} />
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
                      {bank.words.filter(w => !deletedWordIds.has(w.id)).map((word) => {
                        const pendingDelete = confirmDeleteWordId === word.id;
                        return (
                          <div key={word.id}>
                            <div className="flex items-center gap-3 px-4 py-2.5">
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
                                  <div className="h-full rounded-full transition-all" style={{ width: `${word.masteryLevel}%`, background: '#CDDD01' }} />
                                </div>
                                <span className="text-xs text-muted-foreground w-7 text-right">{word.masteryLevel}%</span>
                              </div>
                              <button
                                onClick={() => setConfirmDeleteWordId(pendingDelete ? null : word.id)}
                                className={cn(
                                  "h-6 w-6 rounded-full flex items-center justify-center transition-colors flex-shrink-0",
                                  pendingDelete
                                    ? "bg-destructive/15 text-destructive ring-1 ring-destructive/30"
                                    : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                )}
                                title="Remove from word bank"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {pendingDelete && (
                              <div className="mx-4 mb-2 flex items-center justify-between rounded-lg bg-destructive/10 px-3 py-2 animate-in fade-in duration-200">
                                <span className="text-destructive font-medium text-xs">Remove this word?</span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setConfirmDeleteWordId(null)}
                                    className="text-muted-foreground hover:text-foreground text-xs px-2 py-1 rounded"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeletedWordIds(prev => new Set([...prev, word.id]));
                                      setConfirmDeleteWordId(null);
                                      deleteWordMutation.mutate(word.id);
                                    }}
                                    className="bg-destructive text-destructive-foreground text-xs px-3 py-1 rounded-lg font-medium"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add Word Modal */}
      {showAddWord && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setShowAddWord(false)} />
          <div className="relative w-full max-w-md bg-card rounded-t-3xl shadow-soft p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">Add to Word Bank</h3>
              <button onClick={() => setShowAddWord(false)} className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              {/* Language picker */}
              <div className="flex gap-2 flex-wrap">
                {ADD_LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => setAddLangCode(l.code)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                      addLangCode !== l.code && "border-border text-muted-foreground hover:bg-muted"
                    )}
                    style={addLangCode === l.code
                      ? { background: '#CDDD0120', borderColor: '#CDDD0160', color: '#5a6300' }
                      : undefined}
                  >
                    <span>{l.flag}</span>
                    <span>{l.name}</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={addWord}
                onChange={e => setAddWord(e.target.value)}
                placeholder="Word or phrase..."
                className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="text"
                value={addTranslation}
                onChange={e => setAddTranslation(e.target.value)}
                placeholder="Translation..."
                className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                onKeyDown={e => { if (e.key === 'Enter') handleAddWord(); }}
              />

              <Button
                onClick={handleAddWord}
                disabled={!addWord.trim() || !addTranslation.trim() || createWordMutation.isPending}
                className="w-full h-12 rounded-xl gap-2"
              >
                {createWordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
