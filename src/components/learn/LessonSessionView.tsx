import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, ChevronLeft, Globe, GripVertical, Loader2, MapPin, Mic, Send, Volume2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LessonToken, LessonWord, LessonWordBank } from "@/types";
import type { LessonStepNumber, WriteAnswerState } from "@/hooks/useLessonSession";
import type { VoicePromptState } from "@/hooks/useVoicePrompt";

const WAVEFORM_HEIGHTS = [8, 14, 10, 18, 12, 22, 10, 16, 20, 12, 18, 10, 22, 14, 10, 18, 12, 16, 8, 14];
const STEPS = ["Listen", "Arrange", "Write", "Share"] as const;
const ANSWER_ZONE_ID = "lesson-arrange-answer-zone";
const CHIP_POOL_ZONE_ID = "lesson-arrange-chip-pool";

const lessonCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;

  const rectangleCollisions = rectIntersection(args);
  if (rectangleCollisions.length > 0) return rectangleCollisions;

  return closestCenter(args);
};

interface LessonSessionViewProps {
  bank: LessonWordBank;
  words: LessonWord[];
  word: LessonWord;
  currentWordIndex: number;
  step: LessonStepNumber;
  chipPool: LessonToken[];
  placedChips: LessonToken[];
  writeInput: string;
  writeAnswer: WriteAnswerState;
  isRecording: boolean;
  voicePrompt: VoicePromptState;
  isArrangeComplete: boolean;
  isArrangeCorrect: boolean;
  onExit: () => void;
  onAdvance: () => void;
  onPlayVoicePrompt: () => void;
  onToggleRecording: () => void;
  onPlaceChip: (tokenId: string, beforeTokenId?: string) => void;
  onRemoveChip: (tokenId: string) => void;
  onReorderPlacedChips: (activeId: string, overId: string) => void;
  onWriteInputChange: (value: string) => void;
  onSubmitWriteAnswer: () => void;
  onRevealWriteAnswer: () => void;
  isPostingShare: boolean;
  onSharePost: (content: string) => void | Promise<void>;
  shareLocationLabel?: string;
  isShareLocationAttached: boolean;
  canAttachShareLocation: boolean;
  onToggleShareLocation: () => void;
}

export function LessonSessionView({
  bank,
  words,
  word,
  currentWordIndex,
  step,
  chipPool,
  placedChips,
  writeInput,
  writeAnswer,
  isRecording,
  voicePrompt,
  isArrangeComplete,
  isArrangeCorrect,
  onExit,
  onAdvance,
  onPlayVoicePrompt,
  onToggleRecording,
  onPlaceChip,
  onRemoveChip,
  onReorderPlacedChips,
  onWriteInputChange,
  onSubmitWriteAnswer,
  onRevealWriteAnswer,
  isPostingShare,
  onSharePost,
  shareLocationLabel,
  isShareLocationAttached,
  canAttachShareLocation,
  onToggleShareLocation,
}: LessonSessionViewProps) {
  const totalWords = Math.max(words.length, 1);

  return (
    <div className="min-h-full overflow-y-auto pb-24 scrollbar-hide mx-auto max-w-md px-4 py-6 flex flex-col">
      <LessonHeader
        step={step}
        currentWordIndex={currentWordIndex}
        totalWords={totalWords}
        onExit={onExit}
      />
      <LessonProgress
        step={step}
        currentWordIndex={currentWordIndex}
        totalWords={totalWords}
      />

      {step < 4 && <LessonWordCard key={word.id} word={word} step={step} />}

      {step === 1 && (
        <VoicePromptStep
          word={word}
          isRecording={isRecording}
          voicePrompt={voicePrompt}
          onPlayPrompt={onPlayVoicePrompt}
          onToggleRecording={onToggleRecording}
          onContinue={onAdvance}
        />
      )}

      {step === 2 && (
        <ArrangeStep
          translation={word.translation}
          chipPool={chipPool}
          placedChips={placedChips}
          isComplete={isArrangeComplete}
          isCorrect={isArrangeCorrect}
          onPlaceChip={onPlaceChip}
          onRemoveChip={onRemoveChip}
          onReorderPlacedChips={onReorderPlacedChips}
          onContinue={onAdvance}
        />
      )}

      {step === 3 && (
        <WriteStep
          translation={word.translation}
          expectedAnswer={word.acceptedAnswer}
          value={writeInput}
          answer={writeAnswer}
          onChange={onWriteInputChange}
          onCheck={onSubmitWriteAnswer}
          onReveal={onRevealWriteAnswer}
          onContinue={onAdvance}
        />
      )}

      {step === 4 && (
        <ShareStep
          key={word.id}
          bank={bank}
          words={words}
          word={word}
          onDiscard={onExit}
          onPost={onSharePost}
          isPosting={isPostingShare}
          locationLabel={shareLocationLabel}
          isLocationAttached={isShareLocationAttached}
          canAttachLocation={canAttachShareLocation}
          onToggleLocation={onToggleShareLocation}
        />
      )}
    </div>
  );
}

function LessonHeader({
  step,
  currentWordIndex,
  totalWords,
  onExit,
}: {
  step: LessonStepNumber;
  currentWordIndex: number;
  totalWords: number;
  onExit: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <button
        onClick={onExit}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-5 w-5" />
        <span className="text-sm">Exit</span>
      </button>
      <h1 className="text-base font-bold text-foreground">
        {step === 4 ? "Share your lesson" : `Word ${currentWordIndex + 1} of ${totalWords}`}
      </h1>
      <div className="w-12" />
    </div>
  );
}

function LessonProgress({
  step: currentStep,
  currentWordIndex,
  totalWords,
}: {
  step: LessonStepNumber;
  currentWordIndex: number;
  totalWords: number;
}) {
  const wordProgress = totalWords <= 1
    ? 100
    : Math.round((currentWordIndex / totalWords) * 100);

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center justify-center">
        {STEPS.map((label, index) => {
          const step = (index + 1) as LessonStepNumber;
          const done = currentStep > step;
          const active = currentStep === step;

          return (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  done ? "bg-lime text-navy" : active ? "bg-primary text-primary-foreground ring-2 ring-primary/25" : "bg-muted text-muted-foreground"
                )}>
                  {done ? <Check className="h-3.5 w-3.5" /> : step}
                </div>
                <span className={cn("text-[10px]", active ? "text-primary font-medium" : "text-muted-foreground")}>{label}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={cn("h-0.5 w-10 mb-4 transition-all duration-300", done ? "bg-lime" : "bg-muted")} />
              )}
            </div>
          );
        })}
      </div>
      {totalWords > 1 && (
        <div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-lime transition-all duration-300"
              style={{ width: `${currentStep === 4 ? 100 : wordProgress}%` }}
            />
          </div>
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            {currentStep === 4 ? "Lesson complete" : `${currentWordIndex} of ${totalWords} phrases completed`}
          </p>
        </div>
      )}
    </div>
  );
}

function LessonWordCard({ word, step }: { word: LessonWord; step: LessonStepNumber }) {
  const [revealHint, setRevealHint] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-5">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1 pr-3">
          <p className="text-sm text-foreground">
            <span className="text-muted-foreground">{word.languageName}:</span>{" "}
            {step === 3 ? (
              <button
                onClick={() => setRevealHint(true)}
                className="font-semibold break-words transition-all duration-300 rounded"
                style={{
                  filter: revealHint ? 'none' : 'blur(6px)',
                  userSelect: revealHint ? 'auto' : 'none',
                  cursor: revealHint ? 'default' : 'pointer',
                }}
                title={revealHint ? undefined : 'Tap to reveal'}
              >
                {word.word}
              </button>
            ) : (
              <span className="font-semibold break-words">{word.word}</span>
            )}
          </p>
          <p className="text-sm text-foreground">
            <span className="text-muted-foreground">English:</span>{" "}
            <span className="font-medium break-words">{word.translation}</span>
          </p>
        </div>
        <Volume2 className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
      </div>
      <div className="rounded-xl bg-gradient-to-br from-muted to-muted/40 h-36 flex items-center justify-center relative overflow-hidden">
        <span className="text-6xl opacity-10">{word.languageFlag}</span>
      </div>
    </div>
  );
}

function VoicePromptStep({
  word,
  isRecording,
  voicePrompt,
  onPlayPrompt,
  onToggleRecording,
  onContinue,
}: {
  word: LessonWord;
  isRecording: boolean;
  voicePrompt: VoicePromptState;
  onPlayPrompt: () => void;
  onToggleRecording: () => void;
  onContinue: () => void;
}) {
  const scorePercent = voicePrompt.accuracy === null
    ? null
    : Math.round(voicePrompt.accuracy * 100);
  const canUseMic = voicePrompt.supportsSpeechRecognition;
  const recordingLabel = isRecording ? "Listening..." : "Speak";
  const canContinueAfterMismatch = voicePrompt.status === "incorrect";

  return (
    <div className="flex-1 flex flex-col">
      <h3 className="font-semibold text-foreground mb-3">Voice Prompt</h3>
      <div className="rounded-xl bg-muted/40 border border-border p-4 mb-4">
        <p className="text-xs text-muted-foreground mb-1">Say this phrase:</p>
        <p className="font-medium text-foreground break-words">{word.word}</p>
        <p className="text-xs text-muted-foreground mt-0.5 break-words">{word.translation}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onPlayPrompt}
        disabled={!voicePrompt.supportsSpeechSynthesis || voicePrompt.status === "playing"}
        className="w-full h-11 rounded-xl gap-2 mb-3"
      >
        <Volume2 className="h-4 w-4" />
        {voicePrompt.status === "playing" ? "Playing..." : "Play phrase"}
      </Button>
      <button
        type="button"
        onClick={onToggleRecording}
        disabled={!canUseMic}
        className={cn(
          "w-full rounded-xl p-3.5 flex items-center gap-3 transition-all mb-4",
          isRecording ? "bg-primary" : "bg-primary/90 hover:bg-primary",
          !canUseMic && "cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted"
        )}
      >
        <div className="flex items-end gap-0.5 flex-1 h-8">
          {WAVEFORM_HEIGHTS.map((height, index) => (
            <div
              key={index}
              className={cn(
                "flex-1 rounded-full transition-all",
                canUseMic ? "bg-white/60" : "bg-muted-foreground/30",
                isRecording && "animate-pulse"
              )}
              style={{ height: `${height}px` }}
            />
          ))}
        </div>
        <div className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
          isRecording ? "bg-white text-primary" : canUseMic ? "bg-white/20 text-white" : "bg-background text-muted-foreground"
        )}>
          <Mic className="h-4 w-4" />
        </div>
      </button>

      <div className="min-h-[72px] space-y-2 mb-6">
        {!canUseMic && (
          <p className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Speech check is not available here. Listen, say it out loud, then continue.
          </p>
        )}
        {voicePrompt.transcript && (
          <div className={cn(
            "rounded-xl border px-3 py-2 text-sm",
            voicePrompt.isCorrect ? "border-lime/40 bg-lime/10" : "border-destructive/30 bg-destructive/5"
          )}>
            <p className="text-xs text-muted-foreground">I heard:</p>
            <p className="font-medium text-foreground break-words">{voicePrompt.transcript}</p>
            {scorePercent !== null && (
              <p className={cn("text-xs mt-1", voicePrompt.isCorrect ? "text-lime" : "text-destructive")}>
                {voicePrompt.isCorrect ? "Matched" : `${scorePercent}% match`}
              </p>
            )}
          </div>
        )}
        {voicePrompt.status === "incorrect" && (
          <p className="text-xs font-medium text-destructive">Not quite. Try the phrase again.</p>
        )}
        {voicePrompt.error && (
          <p className="text-xs text-muted-foreground">{voicePrompt.error}</p>
        )}
      </div>

      {canContinueAfterMismatch ? (
        <div className="mt-auto flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onToggleRecording}
            className="h-12 flex-1 rounded-xl"
          >
            Try again
          </Button>
          <Button
            type="button"
            onClick={onContinue}
            className="h-12 flex-1 rounded-xl"
          >
            Continue
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          onClick={onContinue}
          disabled={!voicePrompt.canContinue}
          className="w-full h-12 rounded-xl mt-auto"
        >
          {voicePrompt.canContinue ? "Continue" : recordingLabel}
        </Button>
      )}
    </div>
  );
}

function ArrangeStep({
  translation,
  chipPool,
  placedChips,
  isComplete,
  isCorrect,
  onPlaceChip,
  onRemoveChip,
  onReorderPlacedChips,
  onContinue,
}: {
  translation: string;
  chipPool: LessonToken[];
  placedChips: LessonToken[];
  isComplete: boolean;
  isCorrect: boolean;
  onPlaceChip: (tokenId: string, beforeTokenId?: string) => void;
  onRemoveChip: (tokenId: string) => void;
  onReorderPlacedChips: (activeId: string, overId: string) => void;
  onContinue: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const placedChipIds = placedChips.map((chip) => chip.id);
  const chipPoolIds = chipPool.map((chip) => chip.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeInPool = chipPool.some((chip) => chip.id === activeId);
    const activeInPlaced = placedChips.some((chip) => chip.id === activeId);
    const overInPool = chipPool.some((chip) => chip.id === overId);
    const overInPlaced = placedChips.some((chip) => chip.id === overId);

    if (activeInPool && (overId === ANSWER_ZONE_ID || overInPlaced)) {
      onPlaceChip(activeId, overInPlaced ? overId : undefined);
      return;
    }

    if (activeInPlaced && overInPlaced) {
      onReorderPlacedChips(activeId, overId);
      return;
    }

    if (activeInPlaced && (overId === CHIP_POOL_ZONE_ID || overInPool)) {
      onRemoveChip(activeId);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <h3 className="font-semibold text-foreground mb-1">Drag and Drop</h3>
      <p className="text-sm text-muted-foreground mb-3 break-words">"{translation}"</p>

      <DndContext
        sensors={sensors}
        collisionDetection={lessonCollisionDetection}
        onDragEnd={handleDragEnd}
      >
        <TokenDropZone
          id={ANSWER_ZONE_ID}
          className={cn(
            "flex flex-wrap gap-2 p-3 rounded-xl border min-h-[56px] mb-3 transition-colors",
            isCorrect ? "bg-lime/10 border-lime/40" : "bg-muted/30 border-border"
          )}
        >
          <SortableContext items={placedChipIds} strategy={rectSortingStrategy}>
            {placedChips.length > 0 ? placedChips.map((chip) => (
              <SortableTokenChip
                key={chip.id}
                token={chip}
                variant="placed"
                isCorrect={isCorrect}
                onClick={() => onRemoveChip(chip.id)}
              />
            )) : (
              <span className="text-xs text-muted-foreground self-center">Drag or tap chips to build the phrase</span>
            )}
          </SortableContext>
        </TokenDropZone>

        {isComplete && (
          <p className={cn(
            "text-xs font-medium mb-3 text-center",
            isCorrect ? "text-lime" : "text-destructive"
          )}>
            {isCorrect ? "Correct! Great job." : "Not quite - drag chips to reorder."}
          </p>
        )}

        <TokenDropZone
          id={CHIP_POOL_ZONE_ID}
          className="flex flex-wrap gap-2 p-3 rounded-xl bg-muted/20 border border-border/50 mb-6 min-h-[56px] transition-colors"
        >
          <SortableContext items={chipPoolIds} strategy={rectSortingStrategy}>
            {chipPool.map((chip) => (
              <SortableTokenChip
                key={chip.id}
                token={chip}
                variant="pool"
                onClick={() => onPlaceChip(chip.id)}
              />
            ))}
          </SortableContext>
          {chipPool.length === 0 && !isCorrect && (
            <span className="text-xs text-muted-foreground self-center">Drag or tap a placed chip to return it</span>
          )}
          {isCorrect && (
            <span className="text-xs text-lime self-center">All chips in order</span>
          )}
        </TokenDropZone>
      </DndContext>

      <Button onClick={onContinue} disabled={!isCorrect} className="w-full h-12 rounded-xl mt-auto">
        Continue
      </Button>
    </div>
  );
}

function TokenDropZone({
  id,
  className,
  children,
}: {
  id: string;
  className: string;
  children: ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && "ring-2 ring-primary/25 border-primary/50")}
    >
      {children}
    </div>
  );
}

function SortableTokenChip({
  token,
  variant,
  isCorrect = false,
  onClick,
}: {
  token: LessonToken;
  variant: "pool" | "placed";
  isCorrect?: boolean;
  onClick: () => void;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: token.id });

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onClick={onClick}
      className={cn(
        "inline-flex max-w-full touch-none select-none items-center gap-1.5 rounded-lg border px-3 py-1.5 text-left text-sm font-medium shadow-sm transition-colors",
        variant === "pool" && "bg-card border-border hover:bg-primary/5 hover:border-primary/30",
        variant === "placed" && !isCorrect && "bg-primary/15 text-primary border-primary/30 hover:bg-primary/25",
        variant === "placed" && isCorrect && "bg-lime/20 text-lime border-lime/40",
        isDragging && "opacity-60 shadow-md"
      )}
      aria-label={`${variant === "pool" ? "Move" : "Reorder"} ${token.text}`}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
      <span className="min-w-0 break-words">{token.text}</span>
    </button>
  );
}

function WriteStep({
  translation,
  expectedAnswer,
  value,
  answer,
  onChange,
  onCheck,
  onReveal,
  onContinue,
}: {
  translation: string;
  expectedAnswer: string;
  value: string;
  answer: WriteAnswerState;
  onChange: (value: string) => void;
  onCheck: () => void;
  onReveal: () => void;
  onContinue: () => void;
}) {
  const scorePercent = answer.accuracy === null ? null : Math.round(answer.accuracy * 100);
  const hint = expectedAnswer
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0] ?? ""}${part.length > 1 ? "..." : ""}`)
    .join(" ");
  const feedbackTone =
    answer.status === "correct" || answer.status === "revealed"
      ? "text-lime"
      : answer.status === "close"
        ? "text-primary"
        : "text-destructive";

  return (
    <div className="flex-1 flex flex-col">
      <h3 className="font-semibold text-foreground mb-1">Write yourself</h3>
      <p className="text-sm text-muted-foreground mb-4 break-words">"{translation}"</p>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && value.trim()) {
            event.preventDefault();
            if (answer.canContinue) {
              onContinue();
            } else {
              onCheck();
            }
          }
        }}
        placeholder="Type the phrase..."
        autoFocus
        className={cn(
          "w-full min-w-0 rounded-xl border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mb-3",
          answer.status === "correct" && "border-lime/40",
          (answer.status === "incorrect" || answer.status === "close") && "border-destructive/40"
        )}
      />

      <div className="min-h-[92px] space-y-2 mb-5">
        {answer.feedback && (
          <div className={cn(
            "rounded-xl border px-3 py-2",
            answer.status === "correct" || answer.status === "revealed"
              ? "border-lime/40 bg-lime/10"
              : answer.status === "close"
                ? "border-primary/30 bg-primary/5"
                : "border-destructive/30 bg-destructive/5"
          )}>
            <p className={cn("text-sm font-medium", feedbackTone)}>{answer.feedback}</p>
            {scorePercent !== null && !answer.canContinue && (
              <p className="mt-1 text-xs text-muted-foreground">{scorePercent}% match</p>
            )}
          </div>
        )}
        {answer.showHint && (
          <p className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            Hint: {hint}
          </p>
        )}
        {answer.status === "revealed" && (
          <p className="break-words rounded-xl border border-lime/30 bg-lime/10 px-3 py-2 text-sm font-medium text-lime">
            {expectedAnswer}
          </p>
        )}
      </div>

      <div className="flex gap-3 mt-auto">
        {answer.canReveal && !answer.canContinue && (
          <Button
            type="button"
            variant="outline"
            onClick={onReveal}
            className="flex-1 h-12 rounded-xl"
          >
            Reveal
          </Button>
        )}
        <Button
          type="button"
          variant={answer.canContinue ? "default" : "outline"}
          onClick={answer.canContinue ? onContinue : onCheck}
          disabled={!value.trim()}
          className="flex-1 h-12 rounded-xl"
        >
          {answer.canContinue ? "Continue" : "Check"}
        </Button>
      </div>
    </div>
  );
}

function formatShareWordList(words: LessonWord[]): string {
  const quotedWords = words.map((lessonWord) => `"${lessonWord.word}"`);
  if (quotedWords.length <= 1) return quotedWords[0] ?? "a new phrase";
  if (quotedWords.length === 2) return `${quotedWords[0]} and ${quotedWords[1]}`;

  const previewWords = quotedWords.slice(0, 3).join(", ");
  const remainingCount = quotedWords.length - 3;
  return remainingCount > 0
    ? `${previewWords}, and ${remainingCount} more`
    : `${quotedWords.slice(0, -1).join(", ")}, and ${quotedWords[quotedWords.length - 1]}`;
}

function ShareStep({
  bank,
  words,
  word,
  onDiscard,
  onPost,
  isPosting,
  locationLabel,
  isLocationAttached,
  canAttachLocation,
  onToggleLocation,
}: {
  bank: LessonWordBank;
  words: LessonWord[];
  word: LessonWord;
  onDiscard: () => void;
  onPost: (content: string) => void | Promise<void>;
  isPosting: boolean;
  locationLabel?: string;
  isLocationAttached: boolean;
  canAttachLocation: boolean;
  onToggleLocation: () => void;
}) {
  const fallbackWords = useMemo(() => [word], [word]);
  const lessonWords = words.length ? words : fallbackWords;
  const languageFlags = [...new Set(lessonWords.map((lessonWord) => lessonWord.languageFlag))].slice(0, 4);
  const defaultContent = useMemo(
    () => `I finished a ${bank.label.toLowerCase()} lesson and practiced ${formatShareWordList(lessonWords)}.`,
    [bank.label, lessonWords]
  );
  const [content, setContent] = useState(defaultContent);
  const trimmedContent = content.trim();

  return (
    <div className="flex-1 flex flex-col">
      <div className="rounded-2xl border border-border bg-card p-4 mb-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">Lesson complete</p>
            <p className="text-xs text-muted-foreground">
              {lessonWords.length} phrase{lessonWords.length !== 1 ? "s" : ""} practiced in {bank.label.toLowerCase()}
            </p>
          </div>
          <div className="flex flex-shrink-0 -space-x-1">
            {languageFlags.map((flag) => (
              <span
                key={flag}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-background bg-muted text-sm shadow-sm"
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-muted to-muted/40 h-28 flex items-center justify-center relative overflow-hidden">
          <span className="text-5xl opacity-10">{word.languageFlag}</span>
          <div className="absolute inset-x-2 bottom-2 rounded-xl bg-background/90 px-2.5 py-2 shadow-sm backdrop-blur-sm">
            <div className="flex flex-wrap gap-1.5">
              {lessonWords.slice(0, 3).map((lessonWord) => (
                <span key={lessonWord.id} className="max-w-full break-words rounded-full bg-muted px-2 py-1 text-xs font-medium text-foreground">
                  {lessonWord.word}
                </span>
              ))}
              {lessonWords.length > 3 && (
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  +{lessonWords.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 flex-1">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-foreground">Share your progress</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={isPosting}
            rows={5}
            maxLength={280}
            className="w-full resize-none rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <Globe className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">Feed post</p>
              <p className="truncate text-xs text-muted-foreground">
                {languageFlags.join(" ")} {lessonWords.length} phrase{lessonWords.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{trimmedContent.length}/280</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">Attach location</p>
              <p className="truncate text-xs text-muted-foreground">
                {canAttachLocation ? locationLabel : "No profile coordinates saved"}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-pressed={isLocationAttached}
            disabled={!canAttachLocation || isPosting}
            onClick={onToggleLocation}
            className={cn(
              "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              isLocationAttached ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-transform",
                isLocationAttached ? "translate-x-[21px]" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button
          variant="outline"
          onClick={onDiscard}
          disabled={isPosting}
          className="flex-1 h-12 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
        >
          Done
        </Button>
        <Button
          onClick={() => onPost(trimmedContent)}
          disabled={!trimmedContent || isPosting}
          className="flex-1 h-12 gap-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        >
          {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Post
        </Button>
      </div>
    </div>
  );
}
