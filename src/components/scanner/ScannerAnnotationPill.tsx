import type { DetectedObject } from "@/types/scanner";
import { getScannerConfidenceLabel } from "@/lib/scannerPrecision";

interface ScannerAnnotationPillProps {
  object: DetectedObject;
  offsetIndex?: number;
}

const confidenceLabel = getScannerConfidenceLabel;

export function ScannerAnnotationPill({
  object,
  offsetIndex = 0,
}: ScannerAnnotationPillProps) {
  return (
    <div className="min-w-24 max-w-40 shrink-0 rounded-xl border border-white/50 bg-foreground/90 px-2 py-1 text-primary-foreground shadow-locale-md backdrop-blur-sm">
      <div className="flex items-start gap-1.5">
        <span className="mt-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-purple px-1 text-[10px] font-bold leading-none text-white">
          {offsetIndex + 1}
        </span>
        <div className="min-w-0">
          <p className="whitespace-normal break-words text-xs font-semibold leading-tight">
            {object.learningWord}
          </p>
          <p className="mt-0.5 whitespace-normal break-words text-[10px] leading-tight text-primary-foreground/75">
            {object.nativeWord} - {confidenceLabel(object.confidence)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ScannerAnnotationPill;
