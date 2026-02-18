import { useState, useMemo, useCallback, useRef } from "react";
import { Sparkles, RotateCcw, Check, X, ChevronLeft, BookOpen, Camera, TrendingUp, Globe, Zap, ArrowUpDown, ChevronDown, Loader2 } from "lucide-react";
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

type PracticeMode = 'idle' | 'practicing' | 'results';
type SortOption = 'newest' | 'mastery_high' | 'mastery_low';

const SESSION_SIZE_OPTIONS = [5, 10, 15] as const;

export default function LearnPage() {
  const [mode, setMode] = useState<PracticeMode>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [practiceWords, setPracticeWords] = useState<SavedWord[]>([]);
  const [results, setResults] = useState<PracticeResult[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const startTimeRef = useRef<number>(0);

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
      <div className="mx-auto max-w-md px-4 py-6 min-h-[calc(100vh-8rem)] flex flex-col">
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
      <div className="mx-auto max-w-md px-4 py-6 min-h-[calc(100vh-8rem)] flex flex-col">
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

  // Idle View - Stats Dashboard Layout
  return (
    <div className="h-full overflow-y-auto pb-24 scrollbar-hide mx-auto max-w-2xl px-4 py-6">
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
        {displayStats.languages.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            {displayStats.languages.map((flag, i) => (
              <span key={i} className="text-xl">{flag}</span>
            ))}
          </div>
        )}
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
                {displayStats.masteredWords} of {displayStats.totalWords} words mastered
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-4">
            Words you struggle with will appear more often
          </p>

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
            Start Practice ({sessionSize} words)
          </Button>

          {savedWords.length < sessionSize && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Save at least {sessionSize} words to start practicing
            </p>
          )}
        </div>
      </section>

      {/* My Words Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">My Words</h2>

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

        {filteredWords.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-1">No words saved yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Save words from posts or use the scanner to build your vocabulary
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredWords.map((word) => (
              <div
                key={word.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:shadow-soft"
              >
                <span className="text-lg flex-shrink-0">{word.languageFlag}</span>
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
                  <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sage transition-all"
                      style={{ width: `${word.masteryLevel}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-7 text-right">{word.masteryLevel}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
