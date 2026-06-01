import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  isLessonAnswerCorrect,
  normalizeLessonAnswer,
  scoreLessonAnswer,
} from "@/lib/lesson";
import type { LessonWord } from "@/types";

export type VoicePromptStatus =
  | "idle"
  | "playing"
  | "listening"
  | "correct"
  | "incorrect"
  | "unsupported"
  | "error";

export interface VoicePromptState {
  status: VoicePromptStatus;
  transcript: string;
  normalizedTranscript: string;
  accuracy: number | null;
  error: string | null;
  supportsSpeechRecognition: boolean;
  supportsSpeechSynthesis: boolean;
  isListening: boolean;
  isCorrect: boolean;
  canContinue: boolean;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence?: number;
}

interface SpeechRecognitionResultLike {
  [index: number]: SpeechRecognitionAlternativeLike | undefined;
}

interface SpeechRecognitionResultListLike {
  [index: number]: SpeechRecognitionResultLike | undefined;
  length: number;
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onnomatch: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onstart: (() => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionWindow {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;

  const speechWindow = window as Window & SpeechRecognitionWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function canUseSpeechSynthesis(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

function getSpeechLang(word: LessonWord | null): string {
  return word?.languageCode || (typeof navigator !== "undefined" ? navigator.language : "en-US");
}

function getSpeechErrorMessage(error: string): string {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "Microphone permission is blocked. You can still listen and continue.";
  }

  if (error === "no-speech") {
    return "I did not catch anything. Try speaking again.";
  }

  if (error === "audio-capture") {
    return "No microphone was found. You can still listen and continue.";
  }

  return "Speech check is unavailable right now. You can still listen and continue.";
}

export function useVoicePrompt(word: LessonWord | null) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const supportsSpeechRecognition = useMemo(
    () => Boolean(getSpeechRecognitionConstructor()),
    []
  );
  const supportsSpeechSynthesis = useMemo(() => canUseSpeechSynthesis(), []);
  const [status, setStatus] = useState<VoicePromptStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopSpeechServices = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (canUseSpeechSynthesis()) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const reset = useCallback(() => {
    stopSpeechServices();
    setStatus("idle");
    setTranscript("");
    setAccuracy(null);
    setError(null);
  }, [stopSpeechServices]);

  useEffect(() => stopSpeechServices, [stopSpeechServices]);

  const playPrompt = useCallback(() => {
    if (!word) return;

    if (!canUseSpeechSynthesis()) {
      setError("Audio playback is unavailable in this browser.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = getSpeechLang(word);
    utterance.rate = 0.9;

    utterance.onstart = () => {
      setError(null);
      setStatus("playing");
    };

    utterance.onend = () => {
      setStatus((currentStatus) => currentStatus === "playing" ? "idle" : currentStatus);
    };

    utterance.onerror = () => {
      setError("Audio playback failed. Try again or continue with the prompt.");
      setStatus("error");
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [word]);

  const startListening = useCallback(() => {
    if (!word) return;

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setStatus("unsupported");
      setError("Speech check is not available in this browser.");
      return;
    }

    recognitionRef.current?.abort();

    const recognition = new Recognition();
    recognition.lang = getSpeechLang(word);
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setTranscript("");
      setAccuracy(null);
      setError(null);
      setStatus("listening");
    };

    recognition.onresult = (event) => {
      const spokenText = event.results[0]?.[0]?.transcript.trim() ?? "";
      const nextAccuracy = scoreLessonAnswer(spokenText, word.word);

      setTranscript(spokenText);
      setAccuracy(nextAccuracy);
      setStatus(isLessonAnswerCorrect(spokenText, word.word) ? "correct" : "incorrect");
    };

    recognition.onnomatch = () => {
      setTranscript("");
      setAccuracy(0);
      setStatus("incorrect");
    };

    recognition.onerror = (event) => {
      setError(event.message || getSpeechErrorMessage(event.error));
      setStatus("error");
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setStatus((currentStatus) => currentStatus === "listening" ? "idle" : currentStatus);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setError("Speech check could not start. You can still listen and continue.");
      setStatus("error");
    }
  }, [word]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setStatus((currentStatus) => currentStatus === "listening" ? "idle" : currentStatus);
  }, []);

  const toggleListening = useCallback(() => {
    if (status === "listening") {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, status, stopListening]);

  const normalizedTranscript = useMemo(
    () => normalizeLessonAnswer(transcript),
    [transcript]
  );

  const canContinue =
    status === "correct" ||
    status === "unsupported" ||
    !supportsSpeechRecognition ||
    (status === "error" && Boolean(error));

  const voicePrompt = useMemo<VoicePromptState>(() => ({
    status,
    transcript,
    normalizedTranscript,
    accuracy,
    error,
    supportsSpeechRecognition,
    supportsSpeechSynthesis,
    isListening: status === "listening",
    isCorrect: status === "correct",
    canContinue,
  }), [
    accuracy,
    canContinue,
    error,
    normalizedTranscript,
    status,
    supportsSpeechRecognition,
    supportsSpeechSynthesis,
    transcript,
  ]);

  return {
    voicePrompt,
    playPrompt,
    startListening,
    stopListening,
    toggleListening,
    resetVoicePrompt: reset,
  };
}
