import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  isLessonAnswerCorrect,
  normalizeLessonAnswer,
  scoreLessonAnswer,
} from "@/lib/lesson";
import {
  canSpeakTextInLocale,
  getSpeechLocale,
  getUnsupportedSpeechTextMessage,
  selectSpeechVoice,
} from "@/lib/speech";
import type { LessonWord } from "@/types";

export type VoicePromptStatus =
  | "idle"
  | "playing"
  | "listening"
  | "correct"
  | "incorrect"
  | "skipped"
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
  const fallbackLocale = typeof navigator !== "undefined" ? navigator.language : "en-US";
  return getSpeechLocale(word?.languageCode, fallbackLocale);
}

function getSpeechErrorMessage(error: string): string {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "Microphone permission is blocked. You can still listen and continue.";
  }

  if (error === "no-speech") {
    return "I did not catch anything. You can continue or try again.";
  }

  if (error === "audio-capture") {
    return "No microphone was found. You can still listen and continue.";
  }

  return "Speech check is unavailable right now. You can still listen and continue.";
}

export function useVoicePrompt(word: LessonWord | null) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recognitionSettledRef = useRef(true);
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
    recognitionSettledRef.current = true;
    recognitionRef.current = null;
    if (canUseSpeechSynthesis()) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const reset = useCallback(() => {
    stopSpeechServices();
    recognitionSettledRef.current = true;
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

    const speechLang = getSpeechLang(word);
    if (!canSpeakTextInLocale(word.word, speechLang)) {
      setError(getUnsupportedSpeechTextMessage(speechLang));
      setStatus("error");
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    const voice = selectSpeechVoice(voices, speechLang);
    if (voices.length > 0 && !voice) {
      setError(`No ${word.languageName || speechLang} audio voice is available in this browser.`);
      setStatus("error");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = speechLang;
    if (voice) {
      utterance.voice = voice;
    }
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
      recognitionSettledRef.current = false;
      setTranscript("");
      setAccuracy(null);
      setError(null);
      setStatus("listening");
    };

    recognition.onresult = (event) => {
      const spokenText = event.results[0]?.[0]?.transcript.trim() ?? "";
      recognitionSettledRef.current = true;

      if (!spokenText) {
        setTranscript("");
        setAccuracy(0);
        setError("I did not catch anything. You can continue or try again.");
        setStatus("skipped");
        return;
      }

      const nextAccuracy = scoreLessonAnswer(spokenText, word.word);

      setTranscript(spokenText);
      setAccuracy(nextAccuracy);
      setStatus(isLessonAnswerCorrect(spokenText, word.word) ? "correct" : "incorrect");
    };

    recognition.onnomatch = () => {
      recognitionSettledRef.current = true;
      setTranscript("");
      setAccuracy(0);
      setStatus("incorrect");
    };

    recognition.onerror = (event) => {
      recognitionSettledRef.current = true;
      setError(event.message || getSpeechErrorMessage(event.error));
      setStatus("error");
    };

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;

      recognitionRef.current = null;
      setStatus((currentStatus) => {
        if (currentStatus !== "listening" || recognitionSettledRef.current) {
          return currentStatus;
        }

        recognitionSettledRef.current = true;
        setTranscript("");
        setAccuracy(0);
        setError("I did not catch anything. You can continue or try again.");
        return "skipped";
      });
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      recognitionSettledRef.current = true;
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

  const skipPrompt = useCallback(() => {
    recognitionSettledRef.current = true;
    stopSpeechServices();
    setTranscript("");
    setAccuracy(null);
    setError(null);
    setStatus("skipped");
  }, [stopSpeechServices]);

  const normalizedTranscript = useMemo(
    () => normalizeLessonAnswer(transcript),
    [transcript]
  );

  const canContinue =
    status === "correct" ||
    status === "incorrect" ||
    status === "skipped" ||
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
    skipVoicePrompt: skipPrompt,
    resetVoicePrompt: reset,
  };
}
