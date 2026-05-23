import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Camera,
  Check,
  ImagePlus,
  Languages,
  Loader2,
  RotateCcw,
  ScanLine,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ScannerAnnotationPill from "@/components/scanner/ScannerAnnotationPill";
import { scanImage } from "@/services/api/scanner";
import { createSavedWord } from "@/services/api/learn";
import { learnKeys } from "@/hooks/useLearnApi";
import type { DetectedObject } from "@/types/scanner";

type ScannerStep = "select" | "preview" | "result";
type SaveState = "saved" | "duplicate" | "error";

const DEMO_SCAN_LIMIT = 3;
const DEMO_SCAN_COUNT_KEY = "locale_demo_scan_count";

const confidenceLabel = (confidence: number) => `${Math.round(confidence * 100)}%`;
const objectKey = (object: DetectedObject) =>
  object.id ?? `${object.label}:${object.languageCode}`;

const translationSourceLabel = (object: DetectedObject) => {
  switch (object.translationSource) {
    case "DICTIONARY":
      return "Dictionary";
    case "TRANSLATION_CACHE":
      return "Cached";
    case "TRANSLATION_API":
      return "Translated";
    case "TAXONOMY":
      return "Taxonomy";
    case "FALLBACK":
      return "Needs review";
    default:
      return null;
  }
};

export default function ScannerPage() {
  const [step, setStep] = useState<ScannerStep>("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanSessionId, setScanSessionId] = useState<string | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showScannerHint, setShowScannerHint] = useState(true);
  const [demoScanCount, setDemoScanCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    const storedCount = Number.parseInt(localStorage.getItem(DEMO_SCAN_COUNT_KEY) ?? "0", 10);
    return Number.isFinite(storedCount) ? storedCount : 0;
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const recordDemoScan = () => {
    const nextCount = demoScanCount + 1;
    setDemoScanCount(nextCount);
    localStorage.setItem(DEMO_SCAN_COUNT_KEY, String(nextCount));

    if (nextCount >= DEMO_SCAN_LIMIT) {
      setShowUpgradeModal(true);
    }
  };

  const selectImage = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setScanSessionId(null);
    setDetectedObjects([]);
    setSaveStates({});
    setSavingKeys(new Set());
    setStep("preview");
  };

  const resetScanner = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setStep("select");
    setSelectedFile(null);
    setPreviewUrl(null);
    setScanSessionId(null);
    setDetectedObjects([]);
    setSaveStates({});
    setSavingKeys(new Set());
    setIsScanning(false);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    try {
      const result = await scanImage(selectedFile);
      recordDemoScan();
      setScanSessionId(result.scanSessionId ?? null);
      setDetectedObjects(result.detectedObjects);
      setStep("result");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to scan image";
      toast.error(message);
    } finally {
      setIsScanning(false);
    }
  };

  const saveDetectedObject = async (object: DetectedObject) => {
    const key = objectKey(object);

    setSavingKeys((current) => new Set(current).add(key));

    try {
      await createSavedWord({
        word: object.learningWord,
        translation: object.nativeWord,
        language_code: object.languageCode,
        source: "SCANNER",
        source_id: object.id,
        context: `Detected in photo with ${confidenceLabel(object.confidence)} confidence`,
      });
      setSaveStates((current) => ({ ...current, [key]: "saved" }));
      queryClient.invalidateQueries({ queryKey: learnKeys.words() });
      queryClient.invalidateQueries({ queryKey: learnKeys.stats() });
      toast.success("Word saved!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save word";
      if (message === "Word already saved") {
        setSaveStates((current) => ({ ...current, [key]: "duplicate" }));
        toast.info("Word already in your collection");
      } else {
        setSaveStates((current) => ({ ...current, [key]: "error" }));
        toast.error(message);
      }
    } finally {
      setSavingKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <div className="scrollbar-hide mx-auto flex h-full max-w-md flex-col overflow-y-auto px-4 py-6 pb-24">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => selectImage(event.target.files?.[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => selectImage(event.target.files?.[0])}
      />

      <div className="mb-5 flex items-center gap-3">
        {step !== "select" && (
          <Button variant="ghost" size="icon" onClick={resetScanner} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-black leading-tight text-foreground">AI Object Scanner</h1>
          <p className="text-sm text-muted-foreground">
            {step === "select" && "Capture an object"}
            {step === "preview" && "Ready to scan"}
            {step === "result" && "Detected vocabulary"}
          </p>
        </div>
      </div>

      {showScannerHint && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-purple/20 bg-card px-4 py-3 shadow-locale-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple/10 text-purple">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Scan real objects into vocabulary</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Identify objects, review translations, then save exact detections to Learn.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowScannerHint(false)}
            className="rounded-full p-1 text-muted-foreground transition hover:bg-purple/10 hover:text-foreground"
            aria-label="Dismiss scanner hint"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">
              {demoScanCount >= DEMO_SCAN_LIMIT ? "Out of scans! Subscribe now." : "Demo scans"}
            </p>
            {demoScanCount >= DEMO_SCAN_LIMIT && (
              <p className="mt-0.5 text-xs text-amber-700">Upgrade to Pro for unlimited scanning.</p>
            )}
          </div>
          {demoScanCount >= DEMO_SCAN_LIMIT ? (
            <Button
              type="button"
              size="sm"
              variant="orange"
              onClick={() => setShowUpgradeModal(true)}
              className="shrink-0"
            >
              Subscribe
            </Button>
          ) : (
            <span className="shrink-0 font-medium">{Math.min(demoScanCount, DEMO_SCAN_LIMIT)} / {DEMO_SCAN_LIMIT}</span>
          )}
        </div>
      </div>

      {step === "select" && (
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex aspect-square w-full items-center justify-center rounded-[28px] border-2 border-dashed border-purple/30 bg-card shadow-locale-sm">
            <div className="text-center p-6">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-purple/10 text-purple">
                <ScanLine className="h-10 w-10" />
              </div>
              <p className="font-semibold text-foreground">Scan a real-world object</p>
              <p className="mt-1 text-sm text-muted-foreground">Use camera or upload a clear photo.</p>
            </div>
          </div>

          <div className="w-full space-y-3 mt-auto">
            <Button
              variant="orange"
              className="h-14 w-full gap-3 text-base"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-5 w-5" />
              Open Camera
            </Button>
            <Button
              variant="outline"
              className="h-14 w-full gap-3 text-base"
              onClick={() => galleryInputRef.current?.click()}
            >
              <ImagePlus className="h-5 w-5" />
              Upload Image
            </Button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="flex flex-1 flex-col gap-6">
          <div className="relative aspect-square w-full overflow-hidden rounded-[28px] bg-muted shadow-locale-md">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Selected object"
                className="w-full h-full object-cover"
              />
            )}
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-3 top-3"
              onClick={resetScanner}
              aria-label="Clear image"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-auto space-y-3">
            <Button
              className="h-14 w-full gap-3 text-base"
              onClick={analyzeImage}
              disabled={isScanning}
            >
              {isScanning ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Languages className="h-5 w-5" />
              )}
              {isScanning ? "Scanning" : "Identify & Translate"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={resetScanner}>
              <RotateCcw className="h-4 w-4" />
              Choose another image
            </Button>
          </div>
        </div>
      )}

      {step === "result" && (
        <div className="flex flex-1 flex-col gap-5">
          {previewUrl && (
            <div className="relative w-full overflow-hidden rounded-[28px] bg-muted shadow-locale-md">
              <img
                src={previewUrl}
                alt="Scanned object"
                className="block w-full h-auto"
              />
              {detectedObjects.map((object, index) => {
                if (!object.box) return null;

                return (
                  <div
                    key={`box-${objectKey(object)}`}
                    className="absolute border-2 border-purple bg-purple/10"
                    style={{
                      left: `${object.box.x * 100}%`,
                      top: `${object.box.y * 100}%`,
                      width: `${object.box.width * 100}%`,
                      height: `${object.box.height * 100}%`,
                    }}
                  >
                    <span className="absolute left-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-purple px-1 text-[11px] font-bold leading-none text-white shadow">
                      {index + 1}
                    </span>
                  </div>
                );
              })}
              {detectedObjects.length > 0 && (
                <div className="scrollbar-hide absolute inset-x-2 top-2 z-20 flex max-h-[45%] flex-wrap items-start gap-1.5 overflow-y-auto rounded-lg p-1">
                  {detectedObjects.map((object, index) => (
                    <ScannerAnnotationPill
                      key={`pill-${objectKey(object)}`}
                      object={object}
                      offsetIndex={index}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {scanSessionId && (
            <p className="text-xs text-muted-foreground">
              Scan session {scanSessionId.slice(0, 8)}
            </p>
          )}

          {detectedObjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-purple/30 bg-card p-8 text-center">
              <ScanLine className="mx-auto mb-3 h-10 w-10 text-purple" />
              <h2 className="font-semibold text-foreground">No objects detected</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Try a clearer photo with one object in frame.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {detectedObjects.map((object) => {
                const key = objectKey(object);
                const saveState = saveStates[key];
                const isSaved = saveState === "saved";
                const isDuplicate = saveState === "duplicate";
                const isSaving = savingKeys.has(key);
                const sourceLabel = translationSourceLabel(object);

                return (
                  <div
                    key={key}
                    className="rounded-2xl border border-purple/15 bg-card p-4 shadow-locale-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground truncate">
                            {object.nativeWord}
                          </p>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {confidenceLabel(object.confidence)}
                          </span>
                        </div>
                        <p className="mt-1 break-words text-xl font-black text-primary">
                          {object.learningWord}
                        </p>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mt-1">
                          {object.languageCode}
                          {sourceLabel ? ` · ${sourceLabel}` : ""}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSaved || isDuplicate || isSaving}
                        onClick={() => saveDetectedObject(object)}
                        className={`flex-shrink-0 transition-colors ${
                          isSaved || isDuplicate
                            ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-50"
                            : ""
                        }`}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isSaved ? (
                          <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                        ) : (
                          <Star className={`h-4 w-4 transition-all ${isDuplicate ? "fill-amber-400 text-amber-500" : ""}`} />
                        )}
                        {isDuplicate ? "Added" : isSaved ? "Added" : "Add to word bank"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-auto space-y-3">
            <Button className="w-full" onClick={resetScanner}>
              <Camera className="h-4 w-4" />
              Scan Another Object
            </Button>
          </div>
        </div>
      )}

      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="fixed inset-0 bg-black/45" onClick={() => setShowUpgradeModal(false)} />
          <div className="relative z-10 w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowUpgradeModal(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close upgrade modal"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-amber-700">Out of scans! Subscribe now.</p>
            <h2 className="mt-1 text-2xl font-black text-foreground">Upgrade to Pro!</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Unlock the full potential of Locale with our premium subscription.
            </p>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage/15 text-sage">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Unlimited Scans</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      Have unrestricted learning potential from your surroundings
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Word Set Expansions</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      Have unrestricted learning potential from your surroundings
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-background px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-foreground">Pro Plan</p>
                  <p className="text-xs text-muted-foreground">Billed Monthly</p>
                </div>
                <p className="text-xl font-black text-foreground">$18/mo.</p>
              </div>
              <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>$4</span>
                </div>
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span>Total for today</span>
                  <span>$22.00</span>
                </div>
              </div>
            </div>

            <Button className="mt-5 h-12 w-full gap-2 rounded-xl" onClick={() => setShowUpgradeModal(false)}>
              Checkout with Pay
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
