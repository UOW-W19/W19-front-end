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
  const verticalOffset = 4 + (offsetIndex % 2) * 28;
  const box = object.box;
  const anchorRight = box ? box.x + box.width > 0.72 : false;
  const anchorBottom = box ? box.y + box.height > 0.72 : false;

  return (
    <div
      className="absolute z-10 min-w-24 max-w-40 rounded-md border border-white/40 bg-foreground/90 px-2 py-1 text-primary-foreground shadow-md backdrop-blur-sm"
      style={{
        left: anchorRight ? undefined : 4,
        right: anchorRight ? 4 : undefined,
        top: anchorBottom ? undefined : verticalOffset,
        bottom: anchorBottom ? verticalOffset : undefined,
      }}
    >
      <p className="whitespace-normal break-words text-xs font-semibold leading-tight">
        {object.learningWord}
      </p>
      <p className="mt-0.5 whitespace-normal break-words text-[10px] leading-tight text-primary-foreground/75">
        {object.nativeWord} - {confidenceLabel(object.confidence)}
      </p>
    </div>
  );
}

export default ScannerAnnotationPill;
