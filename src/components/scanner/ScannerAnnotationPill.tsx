import type { DetectedObject } from "@/types/scanner";

interface ScannerAnnotationPillProps {
  object: DetectedObject;
  offsetIndex?: number;
}

const confidenceLabel = (confidence: number) => `${Math.round(confidence * 100)}%`;

export function ScannerAnnotationPill({
  object,
  offsetIndex = 0,
}: ScannerAnnotationPillProps) {
  const verticalOffset = 4 + (offsetIndex % 3) * 30;

  return (
    <div
      className="absolute left-1 z-10 max-w-[calc(100%-0.5rem)] rounded-md border border-white/40 bg-foreground/90 px-2 py-1 text-primary-foreground shadow-md backdrop-blur-sm"
      style={{ top: verticalOffset }}
    >
      <p className="truncate text-xs font-semibold leading-tight">
        {object.learningWord}
      </p>
      <p className="mt-0.5 truncate text-[10px] leading-tight text-primary-foreground/75">
        {object.nativeWord} - {confidenceLabel(object.confidence)}
      </p>
    </div>
  );
}

export default ScannerAnnotationPill;
