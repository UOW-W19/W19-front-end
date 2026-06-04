import { useState, useMemo, useCallback, useEffect, useRef, type ComponentType } from "react";
import { Sparkles, RotateCcw, Check, X, ChevronLeft, BookOpen, Camera, ArrowUpDown, ChevronDown, Loader2, Plus, Target, Trophy, BookMarked, Gauge, Languages as LanguagesIcon, Brain, Tag } from "lucide-react";
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
import { getUserLanguagePreferences } from "@/lib/userLanguages";
import { ALL_WORD_CATEGORIES, categoriseWord, categoryLabel, categoryEmoji } from "@/lib/wordCategories";
import { loadDailyProgress, recordDailyProgressCompletion } from "@/lib/dailyProgress";

type PracticeMode = 'idle' | 'practicing' | 'results' | 'learning';
type SortOption = 'newest' | 'mastery_high' | 'mastery_low';
type WordBank = LessonWordBank;

const SESSION_SIZE_OPTIONS = [5, 10, 15] as const;

type StatTileTone = 'purple' | 'lime' | 'coral';

const statTileToneClasses: Record<StatTileTone, string> = {
  purple: 'bg-purple/10 text-purple',
  lime: 'bg-lime/15 text-lime',
  coral: 'bg-coral/10 text-coral',
};

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
  isLoading,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tone: StatTileTone;
  isLoading?: boolean;
}) {
  return (
    <div className="min-h-[8rem] rounded-2xl border border-purple/15 bg-card p-3 text-center shadow-locale-sm sm:p-4">
      <div className={cn("mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl", statTileToneClasses[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex min-h-8 items-center justify-center">
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <p className="text-xl font-bold leading-none text-foreground sm:text-2xl">{value}</p>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-tight text-muted-foreground sm:text-xs">{label}</p>
    </div>
  );
}


export default function LearnPage() {
  const { user } = useAuth();
  const dailyProgressUserId = user?.id ? String(user.id) : 'anonymous';
  const languagePreferences = useMemo(() => getUserLanguagePreferences(user?.languages), [user?.languages]);
  const { learningLanguages, primaryLearningLanguage } = languagePreferences;
  const learningLanguageCodeSet = useMemo(
    () => new Set(learningLanguages.map(language => language.code)),
    [learningLanguages]
  );
  const [mode, setMode] = useState<PracticeMode>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [practiceWords, setPracticeWords] = useState<SavedWord[]>([]);
  const [results, setResults] = useState<PracticeResult[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionsDoneToday, setSessionsDoneToday] = useState(() => loadDailyProgress(dailyProgressUserId).count);
  const [isSharingLesson, setIsSharingLesson] = useState(false);
  const [isLessonLocationAttached, setIsLessonLocationAttached] = useState(false);
  const [openBanks, setOpenBanks] = useState<Set<string>>(new Set());
  const startTimeRef = useRef<number>(0);
  const lessonCompletionIdRef = useRef<string | null>(null);
  const repairedTopicWordIdsRef = useRef<Set<string>>(new Set());

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
    skipVoicePrompt,
  } = useLessonSession();

  // Filtering & Sorting
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Add-word modal state
  const [showAddWord, setShowAddWord] = useState(false);
  const [addWord, setAddWord] = useState('');
  const [addTranslation, setAddTranslation] = useState('');
  const [addTopic, setAddTopic] = useState<string>('other');
  const defaultAddLangCode = primaryLearningLanguage?.code ?? 'en';
  const [addLangCode, setAddLangCode] = useState(defaultAddLangCode);

  // Word topic override state (local until backend supports topic persistence)
  const [topicOverrides, setTopicOverrides] = useState<Record<string, string>>({});
  const [editTopicWordId, setEditTopicWordId] = useState<string | null>(null);
  const ADD_LANGUAGES = [
    { code: 'en', flag: '🇺🇸', name: 'English'  },
    { code: 'es', flag: '🇪🇸', name: 'Spanish'  },
    { code: 'fr', flag: '🇫🇷', name: 'French'   },
    { code: 'ja', flag: '🇯🇵', name: 'Japanese' },
    { code: 'zh', flag: '🇨🇳', name: 'Chinese'  },
    { code: 'it', flag: '🇮🇹', name: 'Italian'  },
  ];

  const addLanguages =
    primaryLearningLanguage && !ADD_LANGUAGES.some((language) => language.code === primaryLearningLanguage.code)
      ? [
          {
            code: primaryLearningLanguage.code,
            flag: primaryLearningLanguage.flagEmoji,
            name: primaryLearningLanguage.name,
          },
          ...ADD_LANGUAGES,
        ]
      : ADD_LANGUAGES;

  useEffect(() => {
    if (showAddWord) {
      setAddLangCode(defaultAddLangCode);
      setAddTopic('other');
    }
  }, [defaultAddLangCode, showAddWord]);

  useEffect(() => {
    setAddTopic(categoriseWord(addWord, addTranslation));
  }, [addWord, addTranslation]);

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

  const startSessionMutation = useStartPracticeSession();
  const submitResultMutation = useSubmitPracticeResult();
  const completeSessionMutation = useCompletePracticeSession();
  const updateWordMutation = useUpdateWord();
  const createWordMutation = useCreateWord();
  const deleteWordMutation = useDeleteWord();

  const [deletedWordIds, setDeletedWordIds] = useState<Set<string>>(new Set());
  const [confirmDeleteWordId, setConfirmDeleteWordId] = useState<string | null>(null);

  const scopedSavedWords = useMemo(() => {
    if (learningLanguageCodeSet.size === 0) return savedWords;
    return savedWords.filter(word => learningLanguageCodeSet.has(word.languageCode));
  }, [learningLanguageCodeSet, savedWords]);

  const languageOptions = useMemo(() => {
    if (learningLanguages.length > 0) {
      return learningLanguages.map(language => ({
        code: language.code,
        flag: language.flagEmoji,
        name: language.name,
      }));
    }

    const byCode = new Map<string, { code: string; flag: string; name: string }>();
    for (const word of scopedSavedWords) {
      if (!byCode.has(word.languageCode)) {
        byCode.set(word.languageCode, {
          code: word.languageCode,
          flag: word.languageFlag,
          name: word.languageName,
        });
      }
    }
    return Array.from(byCode.values());
  }, [learningLanguages, scopedSavedWords]);

  useEffect(() => {
    if (languageFilter === 'all') return;
    if (!languageOptions.some(language => language.code === languageFilter)) {
      setLanguageFilter('all');
    }
  }, [languageFilter, languageOptions]);

  useEffect(() => {
    setSessionsDoneToday(loadDailyProgress(dailyProgressUserId).count);
  }, [dailyProgressUserId]);

  const recordDailyCompletion = useCallback((completionId: string) => {
    const { record } = recordDailyProgressCompletion(dailyProgressUserId, completionId);
    setSessionsDoneToday(record.count);
  }, [dailyProgressUserId]);

  useEffect(() => {
    for (const word of scopedSavedWords) {
      if (word.topic !== 'electronics' || repairedTopicWordIdsRef.current.has(word.id)) continue;

      const suggestedTopic = categoriseWord(word.word, word.translation);
      if (suggestedTopic === 'electronics' || suggestedTopic === 'other') continue;

      repairedTopicWordIdsRef.current.add(word.id);
      setTopicOverrides(prev => ({ ...prev, [word.id]: suggestedTopic }));
      updateWordMutation.mutate(
        { wordId: word.id, data: { topic: suggestedTopic } },
        {
          onError: () => {
            repairedTopicWordIdsRef.current.delete(word.id);
            setTopicOverrides(prev => {
              const next = { ...prev };
              delete next[word.id];
              return next;
            });
          },
        }
      );
    }
  }, [scopedSavedWords, updateWordMutation]);

  const handleAddWord = async () => {
    if (!addWord.trim() || !addTranslation.trim()) return;
    await createWordMutation.mutateAsync({
      word: addWord.trim(),
      translation: addTranslation.trim(),
      language_code: addLangCode,
      source: 'MANUAL',
      topic: addTopic,
    });
    setAddWord('');
    setAddTranslation('');
    setAddTopic('other');
    setShowAddWord(false);
  };

  // Filter words (sorting handled by API)
  const filteredWords = useMemo(() => {
    if (languageFilter === 'all') return scopedSavedWords;
    return scopedSavedWords.filter(w => w.languageCode === languageFilter);
  }, [scopedSavedWords, languageFilter]);

  // Group filtered words by concept for Word Bank cards
  const wordBanks = useMemo(() => {
    const map = new Map<string, { id: string; label: string; words: typeof filteredWords }>();
    for (const w of filteredWords) {
      const id = topicOverrides[w.id] ?? w.topic ?? 'other';
      const label = ALL_WORD_CATEGORIES.find(c => c.id === id)?.label ?? 'Other';
      if (!map.has(id)) map.set(id, { id, label, words: [] });
      map.get(id)!.words.push(w);
    }
    // Keep "other" bucket last
    const banks = Array.from(map.values());
    const otherIdx = banks.findIndex(b => b.id === 'other');
    if (otherIdx > 0) banks.push(banks.splice(otherIdx, 1)[0]);
    return banks;
  }, [filteredWords, topicOverrides]);

  // Computed stats from words scoped to the learner's active learning languages
  const displayStats = useMemo(() => {
    const totalWords = scopedSavedWords.length;
    const avgMastery = totalWords > 0
      ? Math.round(scopedSavedWords.reduce((acc, w) => acc + w.masteryLevel, 0) / totalWords)
      : 0;
    const languages = [...new Set(scopedSavedWords.map(w => w.languageFlag))];
    const masteredWords = scopedSavedWords.filter(w => w.masteryLevel >= 76).length;
    return { totalWords, avgMastery, languages, masteredWords };
  }, [scopedSavedWords]);

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
      const practiceLanguageCode = languageFilter !== 'all'
        ? languageFilter
        : languageOptions.length === 1
          ? languageOptions[0].code
          : null;

      const session = await startSessionMutation.mutateAsync({
        session_size: sessionSize,
        language_code: practiceLanguageCode,
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
  }, [startSessionMutation, sessionSize, languageFilter, languageOptions]);

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
        recordDailyCompletion(`practice:${sessionId}`);
        setMode('results');
      }
    } catch {
      // Error handled by mutation
    }
  }, [sessionId, practiceWords, currentIndex, submitResultMutation, completeSessionMutation, recordDailyCompletion]);

  const exitPractice = useCallback(() => {
    setMode('idle');
    setCurrentIndex(0);
    setShowAnswer(false);
    setResults([]);
    setSessionId(null);
  }, []);

  const startLesson = useCallback((bank: WordBank) => {
    if (startLessonSession(bank)) {
      lessonCompletionIdRef.current = `lesson:${bank.id}:${Date.now()}`;
      setIsLessonLocationAttached(false);
      setMode('learning');
    }
  }, [startLessonSession]);

  const persistLessonProgress = useCallback(async () => {
    const isCompletingLesson = lessonStep === 3 && currentWordIndex === lessonWords.length - 1;
    const progress = advanceStep();

    if (progress && progress.nextMastery !== progress.previousMastery) {
      try {
        await updateWordMutation.mutateAsync({
          wordId: progress.wordId,
          data: { mastery_level: progress.nextMastery },
        });
      } catch {
        // Error handled by mutation toast.
      }
    }

    if (isCompletingLesson && lessonCompletionIdRef.current) {
      recordDailyCompletion(lessonCompletionIdRef.current);
    }
  }, [advanceStep, currentWordIndex, lessonStep, lessonWords.length, recordDailyCompletion, updateWordMutation]);

  const exitLesson = useCallback(() => {
    resetLessonSession();
    setIsSharingLesson(false);
    setIsLessonLocationAttached(false);
    lessonCompletionIdRef.current = null;
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
                className="h-full rounded-full bg-lime transition-all"
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
              className="flex-1 h-14 gap-2 rounded-xl border border-lime/30 bg-lime/15 text-lime hover:bg-lime/20"
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
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-4 transition-all",
                  result.correct
                    ? "border-lime/30 bg-lime/10"
                    : "border-destructive/30 bg-destructive/5"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0",
                    result.correct ? "bg-lime/15" : "bg-destructive/20"
                  )}
                >
                  {result.correct ? (
                    <Check className="h-4 w-4 text-lime" />
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
                    className={cn(
                      "text-xs font-medium",
                      masteryChange > 0 ? "text-lime" : "text-destructive"
                    )}
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
        onSkipVoicePrompt={skipVoicePrompt}
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
  const DailyProgressIcon = goalMet ? Trophy : Target;

  return (
    <div className="h-full overflow-y-auto pb-24 scrollbar-hide mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Learn</h1>
      </div>
      {/* Today's Progress */}
      <section className="mb-5">
        <div
          className={cn(
            "rounded-2xl border bg-card p-4 shadow-locale-sm transition-colors duration-500",
            goalMet ? "border-lime/30" : "border-purple/15"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
                  goalMet ? "bg-lime/15 text-lime" : "bg-coral/10 text-coral"
                )}
              >
                <DailyProgressIcon className="h-5 w-5" />
              </div>
              <span className="truncate text-sm font-semibold text-foreground">Today's Progress</span>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors duration-300",
                goalMet
                  ? "border-lime/30 bg-lime/15 text-lime"
                  : "border-purple/15 bg-purple/10 text-purple"
              )}
            >
              {goalMet
                ? `${sessionsDoneToday}/${dailyGoal} session${dailyGoal !== 1 ? 's' : ''}`
                : `${sessionsDoneToday} / ${dailyGoal} session`}
            </span>
          </div>
          <div
            className="h-2 rounded-full bg-muted/80 overflow-hidden mb-3"
            role="progressbar"
            aria-label="Daily practice progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPct)}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                goalMet ? "bg-lime" : "bg-primary"
              )}
              style={{
                width: `${progressPct}%`,
              }}
            />
          </div>
          {sessionsDoneToday > 0 ? (
            <p className="text-xs text-muted-foreground">
              {sessionsDoneToday} session{sessionsDoneToday !== 1 ? "s" : ""} completed today - keep it up!
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Complete a practice session to hit your daily goal</p>
          )}
        </div>
      </section>

      {/* Stats Dashboard */}
      <section className="mb-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatTile
            icon={BookMarked}
            label="Words Saved"
            value={displayStats.totalWords}
            tone="purple"
            isLoading={isLoadingWords}
          />
          <StatTile
            icon={Gauge}
            label="Avg Mastery"
            value={`${displayStats.avgMastery}%`}
            tone="lime"
            isLoading={isLoadingWords}
          />
          <StatTile
            icon={LanguagesIcon}
            label="Languages"
            value={displayStats.languages.length}
            tone="coral"
            isLoading={isLoadingWords}
          />
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
        <div className="rounded-2xl border border-coral/20 bg-card p-5 shadow-locale-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center h-12 w-12 shrink-0 rounded-xl bg-coral/10 text-coral">
              <Brain className="h-6 w-6" />
            </div>
            <div className="min-w-0">
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
          <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-xl bg-card/80 border border-purple/15">
            <span className="text-sm text-muted-foreground">Words per session</span>
            <div className="flex shrink-0 gap-2">
              {SESSION_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  onClick={() => setSessionSize(size)}
                  disabled={scopedSavedWords.length < size}
                  className={cn(
                    "h-9 w-12 rounded-lg text-sm font-medium transition-all",
                    sessionSize === size
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80",
                    scopedSavedWords.length < size && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={startPractice}
            disabled={scopedSavedWords.length < sessionSize || startSessionMutation.isPending}
            className="w-full h-12 gap-2 rounded-xl"
          >
            {startSessionMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            Quick Practice ({sessionSize} words)
          </Button>

          {scopedSavedWords.length < sessionSize && (
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
            className="flex items-center gap-1 h-8 px-3 rounded-full border border-coral/20 bg-card text-coral text-xs font-medium shadow-locale-sm hover:bg-coral/10 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>

          <div className="flex items-center gap-2">
            {/* Language Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 border border-purple/15 bg-card shadow-locale-sm hover:bg-purple/10">
                  <LanguagesIcon className="h-3.5 w-3.5" />
                  {languageFilter === 'all'
                    ? 'All'
                    : languageOptions.find(language => language.code === languageFilter)?.flag ?? languageFilter.toUpperCase()}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguageFilter('all')}>
                  All Languages
                </DropdownMenuItem>
                {languageOptions.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguageFilter(lang.code)}
                  >
                    {lang.flag} {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 border border-purple/15 bg-card shadow-locale-sm hover:bg-purple/10">
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
          <div className="rounded-2xl border border-dashed border-purple/20 bg-card/80 px-6 py-12 text-center shadow-locale-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple/10 text-purple">
              <BookMarked className="h-7 w-7" />
            </div>
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
                <div key={bank.id} className="overflow-hidden rounded-2xl border border-purple/15 bg-card shadow-locale-sm">
                  {/* Card header */}
                  <button
                    onClick={toggleOpen}
                    className="w-full flex items-center gap-3 p-4 hover:bg-purple/5 transition-colors text-left"
                  >
                    <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-purple/10 text-purple flex-shrink-0">
                      <BookMarked className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{bank.label}</p>
                      <p className="text-xs text-muted-foreground">{bank.words.length} word{bank.words.length !== 1 ? 's' : ''}</p>
                    </div>
                    {/* Avg mastery pill */}
                    <div className="flex items-center gap-1.5 mr-2">
                      <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${avgMastery}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-7 text-right">{avgMastery}%</span>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
                  </button>

                  {/* Learn button row — always visible */}
                  <div className="px-4 pb-3 flex justify-end border-t border-purple/10 pt-3">
                    <Button size="sm" onClick={() => startLesson(bank)} className="h-8 px-4 rounded-lg gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Learn
                    </Button>
                  </div>

                  {/* Collapsible word list */}
                  {isOpen && (
                    <div className="border-t border-purple/10 divide-y divide-border/50">
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
                                <button
                                  type="button"
                                  onClick={() => setEditTopicWordId(editTopicWordId === word.id ? null : word.id)}
                                  className="flex items-center gap-0.5 mt-0.5 text-[10px] text-muted-foreground/70 hover:text-primary transition-colors"
                                >
                                  <Tag className="h-2.5 w-2.5 flex-shrink-0" />
                                  <span>{categoryEmoji(topicOverrides[word.id] ?? word.topic ?? 'other')} {categoryLabel(topicOverrides[word.id] ?? word.topic ?? 'other')}</span>
                                </button>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="h-1.5 w-10 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${word.masteryLevel}%` }} />
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

                            {editTopicWordId === word.id && (
                              <div className="px-4 pb-2.5 flex flex-wrap gap-1.5 animate-in fade-in duration-150">
                                {ALL_WORD_CATEGORIES.map(cat => (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => {
                                      setTopicOverrides(prev => ({ ...prev, [word.id]: cat.id }));
                                      updateWordMutation.mutate({ wordId: word.id, data: { topic: cat.id } });
                                      setEditTopicWordId(null);
                                    }}
                                    className={cn(
                                      "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors",
                                      (topicOverrides[word.id] ?? word.topic ?? 'other') === cat.id
                                        ? "border-primary/30 bg-primary/10 text-primary font-medium"
                                        : "border-border text-muted-foreground hover:bg-muted"
                                    )}
                                  >
                                    <span>{cat.emoji}</span>
                                    <span>{cat.label}</span>
                                  </button>
                                ))}
                              </div>
                            )}

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
                {addLanguages.map(l => (
                  <button
                    key={l.code}
                    onClick={() => setAddLangCode(l.code)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                      addLangCode === l.code
                        ? "border-lime/30 bg-lime/15 text-lime"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
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
                placeholder="Native translation..."
                className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                onKeyDown={e => { if (e.key === 'Enter') handleAddWord(); }}
              />

              {/* Topic picker */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  Topic
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_WORD_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setAddTopic(cat.id)}
                      className={cn(
                        "flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors",
                        addTopic === cat.id
                          ? "border-primary/30 bg-primary/10 text-primary font-medium"
                          : "border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

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
