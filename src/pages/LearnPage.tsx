import { useState, useMemo, useCallback } from "react";
import { Sparkles, RotateCcw, Check, X, ChevronLeft, BookOpen, Camera, TrendingUp, Globe, Zap, ArrowUpDown, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SavedWord } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Mock saved words data - in real app, this comes from API
const initialSavedWords: SavedWord[] = [
  { 
    id: "1",
    word: "さくら", 
    translation: "cherry blossom", 
    language: "Japanese",
    languageFlag: "🇯🇵", 
    mastery: 80,
    source: 'post',
    sourceContext: "Spring festival post by @yuki"
  },
  { 
    id: "2",
    word: "mariposa", 
    translation: "butterfly", 
    language: "Spanish",
    languageFlag: "🇪🇸", 
    mastery: 60,
    source: 'scan',
    sourceContext: "Scanned at botanical garden"
  },
  { 
    id: "3",
    word: "bibliothèque", 
    translation: "library", 
    language: "French",
    languageFlag: "🇫🇷", 
    mastery: 40,
    source: 'post',
    sourceContext: "Study tips post by @marie"
  },
  { 
    id: "4",
    word: "Schmetterling", 
    translation: "butterfly", 
    language: "German",
    languageFlag: "🇩🇪", 
    mastery: 20,
    source: 'scan',
    sourceContext: "Scanned at museum"
  },
  { 
    id: "5",
    word: "こんにちは", 
    translation: "hello", 
    language: "Japanese",
    languageFlag: "🇯🇵", 
    mastery: 90,
    source: 'post',
    sourceContext: "Greeting customs by @tanaka"
  },
];

type PracticeMode = 'idle' | 'practicing' | 'results';
type SortOption = 'newest' | 'mastery-high' | 'mastery-low';

const SESSION_OPTIONS = [5, 10, 15] as const;
const MAX_SESSION_SIZE = 15;

interface PracticeResult {
  word: SavedWord;
  correct: boolean;
}

// Spaced repetition: prioritize words with lower mastery
const selectWordsForPractice = (words: SavedWord[], count: number): SavedWord[] => {
  // Weight words inversely by mastery (lower mastery = higher weight)
  const weightedWords = words.map(word => ({
    word,
    weight: Math.pow(100 - word.mastery, 2) + 10 // Quadratic weight, minimum 10
  }));
  
  const totalWeight = weightedWords.reduce((sum, w) => sum + w.weight, 0);
  const selected: SavedWord[] = [];
  const usedIds = new Set<string>();
  
  while (selected.length < Math.min(count, words.length)) {
    let random = Math.random() * totalWeight;
    
    for (const { word, weight } of weightedWords) {
      if (usedIds.has(word.id)) continue;
      random -= weight;
      if (random <= 0) {
        selected.push(word);
        usedIds.add(word.id);
        break;
      }
    }
    
    // Fallback: add first unused word if random selection fails
    if (selected.length < Math.min(count, words.length)) {
      const unused = words.find(w => !usedIds.has(w.id));
      if (unused && !usedIds.has(unused.id)) {
        selected.push(unused);
        usedIds.add(unused.id);
      }
    }
  }
  
  // Shuffle the selected words
  return selected.sort(() => Math.random() - 0.5);
};

// Calculate mastery change based on spaced repetition
const calculateMasteryChange = (currentMastery: number, correct: boolean): number => {
  if (correct) {
    // Correct: increase more when mastery is low, less when high
    const increase = Math.max(5, Math.floor((100 - currentMastery) / 5));
    return Math.min(100, currentMastery + increase);
  } else {
    // Incorrect: decrease more significantly to prioritize review
    const decrease = Math.max(10, Math.floor(currentMastery / 4));
    return Math.max(0, currentMastery - decrease);
  }
};

// Calculate stats from saved words
const getStats = (words: SavedWord[]) => {
  const totalWords = words.length;
  const avgMastery = totalWords > 0 
    ? Math.round(words.reduce((acc, w) => acc + w.mastery, 0) / totalWords) 
    : 0;
  const languages = [...new Set(words.map(w => w.languageFlag))];
  const masteredWords = words.filter(w => w.mastery >= 80).length;
  
  return { totalWords, avgMastery, languages, masteredWords };
};

export default function LearnPage() {
  const [savedWords, setSavedWords] = useState<SavedWord[]>(initialSavedWords);
  const [mode, setMode] = useState<PracticeMode>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [practiceWords, setPracticeWords] = useState<SavedWord[]>([]);
  const [results, setResults] = useState<PracticeResult[]>([]);
  const [sessionSize, setSessionSize] = useState<(typeof SESSION_OPTIONS)[number]>(5);
  
  // Filtering & Sorting
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const stats = getStats(savedWords);
  
  // Get unique languages for filter
  const uniqueLanguages = useMemo(() => {
    const langs = savedWords.map(w => ({ flag: w.languageFlag, name: w.language }));
    return langs.filter((lang, index, self) => 
      index === self.findIndex(l => l.flag === lang.flag)
    );
  }, [savedWords]);

  // Filter and sort words
  const filteredWords = useMemo(() => {
    let words = [...savedWords];
    
    // Apply language filter
    if (languageFilter !== 'all') {
      words = words.filter(w => w.languageFlag === languageFilter);
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'mastery-high':
        words.sort((a, b) => b.mastery - a.mastery);
        break;
      case 'mastery-low':
        words.sort((a, b) => a.mastery - b.mastery);
        break;
      case 'newest':
      default:
        break;
    }
    
    return words;
  }, [savedWords, languageFilter, sortBy]);

  const startPractice = useCallback(() => {
    const targetCount = Math.min(sessionSize, MAX_SESSION_SIZE, savedWords.length);
    if (targetCount === 0) return;

    // Use spaced repetition to select words (prioritize low mastery)
    const selected = selectWordsForPractice(savedWords, targetCount);
    setPracticeWords(selected);
    setCurrentIndex(0);
    setShowAnswer(false);
    setResults([]);
    setMode('practicing');
  }, [savedWords, sessionSize]);

  const handleAnswer = useCallback((correct: boolean) => {
    const currentWord = practiceWords[currentIndex];
    const newResults = [...results, { word: currentWord, correct }];
    setResults(newResults);
    
    // Update mastery immediately using spaced repetition algorithm
    setSavedWords(prev => prev.map(word => {
      if (word.id === currentWord.id) {
        return {
          ...word,
          mastery: calculateMasteryChange(word.mastery, correct)
        };
      }
      return word;
    }));
    
    if (currentIndex < practiceWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      setMode('results');
    }
  }, [practiceWords, currentIndex, results]);

  const exitPractice = useCallback(() => {
    setMode('idle');
    setCurrentIndex(0);
    setShowAnswer(false);
    setResults([]);
  }, []);

  // Practice Session View
  if (mode === 'practicing') {
    const currentWord = practiceWords[currentIndex];
    const progress = ((currentIndex + 1) / practiceWords.length) * 100;

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
              {currentWord.language}
            </p>

            {showAnswer ? (
              <div className="mt-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-xl font-medium text-primary">
                  {currentWord.translation}
                </p>
                {currentWord.sourceContext && (
                  <p className="mt-2 text-xs text-muted-foreground flex items-center justify-center gap-1">
                    {currentWord.source === 'post' ? (
                      <BookOpen className="h-3 w-3" />
                    ) : (
                      <Camera className="h-3 w-3" />
                    )}
                    {currentWord.sourceContext}
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
                style={{ width: `${currentWord.mastery}%` }}
              />
            </div>
            <span>{currentWord.mastery}%</span>
          </div>
        </div>

        {/* Action buttons */}
        {showAnswer && (
          <div className="flex gap-4 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Button
              variant="outline"
              onClick={() => handleAnswer(false)}
              className="flex-1 h-14 gap-2 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-5 w-5" />
              Didn't know
            </Button>
            <Button
              onClick={() => handleAnswer(true)}
              className="flex-1 h-14 gap-2 rounded-xl bg-sage hover:bg-sage/90"
            >
              <Check className="h-5 w-5" />
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

    // Get updated mastery for each word
    const resultsWithUpdatedMastery = results.map(result => ({
      ...result,
      newMastery: savedWords.find(w => w.id === result.word.id)?.mastery ?? result.word.mastery
    }));

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
          {resultsWithUpdatedMastery.map((result, index) => {
            const masteryChange = result.newMastery - result.word.mastery;
            
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
            className="flex-1 h-12 gap-2 rounded-xl"
          >
            <RotateCcw className="h-4 w-4" />
            Practice Again
          </Button>
        </div>
      </div>
    );
  }

  // Idle View - Stats Dashboard Layout
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Stats Dashboard */}
      <section className="mb-6">
        <div className="grid grid-cols-3 gap-3">
          {/* Words Saved */}
          <div className="rounded-2xl bg-card border border-border p-4 text-center">
            <div className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl bg-primary/10 mb-2">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalWords}</p>
            <p className="text-xs text-muted-foreground">Words Saved</p>
          </div>

          {/* Avg Mastery */}
          <div className="rounded-2xl bg-card border border-border p-4 text-center">
            <div className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl bg-sage/10 mb-2">
              <TrendingUp className="h-5 w-5 text-sage" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.avgMastery}%</p>
            <p className="text-xs text-muted-foreground">Avg Mastery</p>
          </div>

          {/* Languages */}
          <div className="rounded-2xl bg-card border border-border p-4 text-center">
            <div className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl bg-coral/10 mb-2">
              <Globe className="h-5 w-5 text-coral" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.languages.length}</p>
            <p className="text-xs text-muted-foreground">Languages</p>
          </div>
        </div>

        {/* Language flags row */}
        {stats.languages.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            {stats.languages.map((flag, i) => (
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
                {stats.masteredWords} of {stats.totalWords} words mastered
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            Words you struggle with will appear more often
          </p>
          
          <Button 
            onClick={startPractice}
            disabled={savedWords.length === 0}
            className="w-full h-12 gap-2 rounded-xl"
          >
            <Sparkles className="h-5 w-5" />
            Start Practice
          </Button>
        </div>
      </section>

      {/* Saved Words List */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Your Words</h2>
          <span className="text-sm text-muted-foreground">
            {filteredWords.length}{languageFilter !== 'all' ? ` of ${savedWords.length}` : ''} saved
          </span>
        </div>
        
        {/* Filters */}
        {savedWords.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            {/* Language Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs">
                  {languageFilter === 'all' ? (
                    <>
                      <Globe className="h-3.5 w-3.5" />
                      All Languages
                    </>
                  ) : (
                    <>
                      <span>{languageFilter}</span>
                      {uniqueLanguages.find(l => l.flag === languageFilter)?.name}
                    </>
                  )}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[140px]">
                <DropdownMenuItem onClick={() => setLanguageFilter('all')}>
                  <Globe className="h-4 w-4 mr-2" />
                  All Languages
                </DropdownMenuItem>
                {uniqueLanguages.map((lang) => (
                  <DropdownMenuItem key={lang.flag} onClick={() => setLanguageFilter(lang.flag)}>
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {sortBy === 'newest' && 'Newest'}
                  {sortBy === 'mastery-high' && 'Highest'}
                  {sortBy === 'mastery-low' && 'Lowest'}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[140px]">
                <DropdownMenuItem onClick={() => setSortBy('newest')}>
                  Newest First
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('mastery-high')}>
                  Highest Mastery
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('mastery-low')}>
                  Lowest Mastery
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        
        {savedWords.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-border">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No saved words yet</p>
            <p className="text-sm text-muted-foreground/70">
              Save words from posts or use the scanner
            </p>
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="text-center py-8 rounded-xl border border-dashed border-border">
            <p className="text-muted-foreground">No words match this filter</p>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => setLanguageFilter('all')}
              className="mt-1"
            >
              Clear filter
            </Button>
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
                    {word.source === 'scan' && (
                      <Camera className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{word.translation}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sage transition-all"
                      style={{ width: `${word.mastery}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-7 text-right">{word.mastery}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}