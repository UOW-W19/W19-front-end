import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchSavedWords,
  fetchLearningStats,
  createSavedWord,
  updateSavedWord,
  deleteSavedWord,
  startPracticeSession,
  submitPracticeResult,
  completePracticeSession,
} from '@/services/api/learn';
import type {
  SavedWordResponse,
  LearningStatsResponse,
  CreateWordRequest,
  UpdateWordRequest,
  StartSessionRequest,
  SubmitResultRequest,
  PracticeSessionResponse,
  CompleteSessionResponse,
  SubmitResultResponse,
  SessionWord,
} from '@/services/api/learn';
import type { SavedWord } from '@/types';

// ============================================
// Transform API responses to frontend types
// ============================================

export const transformSavedWord = (word: SavedWordResponse): SavedWord => ({
  id: word.id,
  word: word.word,
  translation: word.translation,
  language: word.language_name,
  languageFlag: word.language_flag,
  mastery: word.mastery_level,
  source: word.source === 'POST' ? 'post' : 'scan',
  sourceContext: word.source_context,
});

export const transformSessionWord = (word: SessionWord): SavedWord => ({
  id: word.id,
  word: word.word,
  translation: word.translation,
  language: word.language_name,
  languageFlag: word.language_flag,
  mastery: word.mastery_level,
  source: 'post', // Default, not tracked in sessions
});

// ============================================
// Query Keys
// ============================================

export const learnKeys = {
  all: ['learn'] as const,
  words: () => [...learnKeys.all, 'words'] as const,
  wordsList: (params?: { language_code?: string; sort?: string }) => 
    [...learnKeys.words(), params] as const,
  stats: () => [...learnKeys.all, 'stats'] as const,
};

// ============================================
// Saved Words Hooks
// ============================================

export const useSavedWords = (params?: {
  language_code?: string;
  sort?: 'newest' | 'mastery_high' | 'mastery_low';
}) => {
  return useQuery({
    queryKey: learnKeys.wordsList(params),
    queryFn: () => fetchSavedWords(params),
    select: (data) => data.map(transformSavedWord),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useLearningStats = () => {
  return useQuery({
    queryKey: learnKeys.stats(),
    queryFn: fetchLearningStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useCreateWord = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateWordRequest) => createSavedWord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learnKeys.words() });
      queryClient.invalidateQueries({ queryKey: learnKeys.stats() });
      toast.success('Word saved!');
    },
    onError: (error: Error) => {
      if (error.message === 'Word already saved') {
        toast.info('Word already in your collection');
      } else {
        toast.error('Failed to save word');
      }
    },
  });
};

export const useUpdateWord = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ wordId, data }: { wordId: string; data: UpdateWordRequest }) => 
      updateSavedWord(wordId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learnKeys.words() });
      queryClient.invalidateQueries({ queryKey: learnKeys.stats() });
    },
    onError: () => {
      toast.error('Failed to update word');
    },
  });
};

export const useDeleteWord = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (wordId: string) => deleteSavedWord(wordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learnKeys.words() });
      queryClient.invalidateQueries({ queryKey: learnKeys.stats() });
      toast.success('Word deleted');
    },
    onError: () => {
      toast.error('Failed to delete word');
    },
  });
};

// ============================================
// Practice Session Hooks
// ============================================

export interface PracticeSession {
  sessionId: string;
  words: SavedWord[];
  startedAt: string;
}

export const useStartPracticeSession = () => {
  return useMutation({
    mutationFn: (data: StartSessionRequest) => startPracticeSession(data),
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start practice session');
    },
  });
};

export const useSubmitPracticeResult = () => {
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: SubmitResultRequest }) =>
      submitPracticeResult(sessionId, data),
    onError: (error: Error) => {
      if (error.message !== 'Result already submitted for this word') {
        toast.error('Failed to submit result');
      }
    },
  });
};

export const useCompletePracticeSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (sessionId: string) => completePracticeSession(sessionId),
    onSuccess: () => {
      // Refresh words to get updated mastery levels
      queryClient.invalidateQueries({ queryKey: learnKeys.words() });
      queryClient.invalidateQueries({ queryKey: learnKeys.stats() });
    },
    onError: (error: Error) => {
      if (error.message !== 'Session already completed') {
        toast.error('Failed to complete session');
      }
    },
  });
};

// ============================================
// Helper Types for Practice Flow
// ============================================

export interface PracticeResult {
  word: SavedWord;
  correct: boolean;
  oldMastery: number;
  newMastery: number;
}

export type { 
  LearningStatsResponse, 
  CreateWordRequest,
  PracticeSessionResponse,
  CompleteSessionResponse,
  SubmitResultResponse,
};
