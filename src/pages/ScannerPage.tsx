import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  ImagePlus,
  Languages,
  Loader2,
  RotateCcw,
  ScanLine,
  Sparkles,
  Star,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ScannerAnnotationPill from "@/components/scanner/ScannerAnnotationPill";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { saveDetectedObject as saveScannedDetection, scanImage, scanPostImage } from "@/services/api/scanner";
import { createSavedWord } from "@/services/api/learn";
import { learnKeys } from "@/hooks/useLearnApi";
import { getScannerConfidenceLabel } from "@/lib/scannerPrecision";
import { cn } from "@/lib/utils";
import type { DetectedObject, PostImageScannerRouteState, ScannerMode } from "@/types/scanner";

type ScannerStep = "select" | "preview" | "result";
type SaveState = "saved" | "duplicate" | "error";

const DEMO_SCAN_LIMIT = 3;
const DEMO_SCAN_COUNT_KEY = "locale_demo_scan_count";

const confidenceLabel = getScannerConfidenceLabel;
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

const isPostImageScannerRouteState = (state: unknown): state is PostImageScannerRouteState => {
  if (!state || typeof state !== "object") return false;

  const candidate = state as Partial<PostImageScannerRouteState>;
  return (
    candidate.source === "post-image" &&
    typeof candidate.postId === "string" &&
    typeof candidate.imageUrl === "string" &&
    typeof candidate.imageIndex === "number"
  );
};

export default function ScannerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState<ScannerStep>("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewUrlIsObjectUrl, setPreviewUrlIsObjectUrl] = useState(false);
  const [postImageSource, setPostImageSource] = useState<PostImageScannerRouteState | null>(null);
  const [scanSessionId, setScanSessionId] = useState<string | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [scanMode, setScanMode] = useState<ScannerMode>("precision");
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
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
  const routeScanKeyRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrlIsObjectUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, previewUrlIsObjectUrl]);

  const recordDemoScan = () => {
    const nextCount = demoScanCount + 1;
    setDemoScanCount(nextCount);
    localStorage.setItem(DEMO_SCAN_COUNT_KEY, String(nextCount));

    if (nextCount >= DEMO_SCAN_LIMIT) {
      setShowUpgradeModal(true);
    }
  };

  const runPostImageScan = async (
    source: PostImageScannerRouteState,
    mode: ScannerMode = scanMode
  ) => {
    setIsScanning(true);
    setScanError("");

    try {
      const result = await scanPostImage(source.postId, {
        imageIndex: source.imageIndex,
        imageUrl: source.imageUrl,
        scanMode: mode,
      });
      setScanSessionId(result.scanSessionId ?? null);
      setDetectedObjects(result.detectedObjects);
      setStep("result");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to scan post image";
      setScanError(message);
      setStep("preview");
      toast.error(message);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (!isPostImageScannerRouteState(location.state)) return;

    const source = location.state;
    const scanKey = `${source.postId}:${source.imageIndex}:${source.imageUrl}`;
    if (routeScanKeyRef.current === scanKey) return;
    routeScanKeyRef.current = scanKey;

    if (previewUrl && previewUrlIsObjectUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(source.imageUrl);
    setPreviewUrlIsObjectUrl(false);
    setPostImageSource(source);
    setScanSessionId(null);
    setDetectedObjects([]);
    setSaveStates({});
    setSavingKeys(new Set());
    setScanError("");
    setScanMode("precision");
    setStep("preview");
  }, [location.state, previewUrl, previewUrlIsObjectUrl]);

  const selectImage = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    if (previewUrl && previewUrlIsObjectUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPreviewUrlIsObjectUrl(true);
    setPostImageSource(null);
    setScanSessionId(null);
    setDetectedObjects([]);
    setSaveStates({});
    setSavingKeys(new Set());
    setScanError("");
    setScanMode("precision");
    setStep("preview");
  };

  const resetScanner = () => {
    if (previewUrl && previewUrlIsObjectUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setStep("select");
    setSelectedFile(null);
    setPreviewUrl(null);
    setPreviewUrlIsObjectUrl(false);
    setPostImageSource(null);
    setScanSessionId(null);
    setDetectedObjects([]);
    setSaveStates({});
    setSavingKeys(new Set());
    setIsScanning(false);
    setScanError("");
    setScanMode("precision");
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleBack = () => {
    if (postImageSource) {
      navigate(-1);
      return;
    }

    resetScanner();
  };

  const analyzeImage = async () => {
    if (postImageSource) {
      await runPostImageScan(postImageSource, scanMode);
      return;
    }

    if (!selectedFile) return;

    setIsScanning(true);
    setScanError("");
    try {
      const result = await scanImage(selectedFile, scanMode);
      recordDemoScan();
      setScanSessionId(result.scanSessionId ?? null);
      setDetectedObjects(result.detectedObjects);
      setStep("result");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to scan image";
      setScanError(message);
      toast.error(message);
    } finally {
      setIsScanning(false);
    }
  };

  const saveDetectedObject = async (object: DetectedObject) => {
    const key = objectKey(object);

    setSavingKeys((current) => new Set(current).add(key));

    try {
      if (postImageSource && object.id) {
        await saveScannedDetection(object.id);
      } else {
        await createSavedWord({
          word: object.learningWord,
          translation: object.nativeWord,
          language_code: object.languageCode,
          source: "SCANNER",
          source_id: object.id,
          context: postImageSource?.postContext ?? `Detected in photo with ${confidenceLabel(object.confidence)}`,
        });
      }
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
          <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-black leading-tight text-foreground">AI Object Scanner</h1>
          <p className="text-sm text-muted-foreground">
            {step === "select" && "Capture an object"}
            {step === "preview" && (postImageSource ? `${postImageSource.authorName ?? "Post"} photo ready` : "Ready to scan")}
            {step === "result" && "Detected vocabulary"}
          </p>
        </div>
      </div>

      {showScannerHint && demoScanCount < DEMO_SCAN_LIMIT && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-coral/20 bg-card px-4 py-3 shadow-locale-sm">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles className="h-4 w-4 shrink-0 text-coral" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Scan objects into vocabulary</p>
              <p className="text-xs text-muted-foreground">Identify objects and save translations to your word bank to learn.</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                {Math.min(demoScanCount, DEMO_SCAN_LIMIT)} / {DEMO_SCAN_LIMIT} free scans used
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowScannerHint(false)}
            className="rounded-full p-1 text-muted-foreground transition hover:bg-coral/10 hover:text-foreground shrink-0"
            aria-label="Dismiss scanner hint"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {demoScanCount >= DEMO_SCAN_LIMIT && (
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-destructive/20 px-4 py-3 text-sm font-medium bg-destructive/10 text-destructive">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-bold">Out of scans! Subscribe now.</p>
              <p className="text-xs font-normal opacity-80">Upgrade to Pro for unlimited daily scanning.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowUpgradeModal(true)}
            className="shrink-0 rounded-full bg-coral px-3 py-1 text-xs font-semibold text-white transition hover:bg-coral/90"
          >
            Subscribe
          </button>
        </div>
      )}

      {step === "select" && (
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex aspect-square w-full items-center justify-center rounded-[28px] border-2 border-dashed border-coral/30 bg-card shadow-locale-sm">
            <div className="text-center p-6">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-coral/10 text-coral">
                <ScanLine className="h-10 w-10" />
              </div>
              <p className="font-semibold text-foreground">Scan a real-world object</p>
              <p className="mt-1 text-sm text-muted-foreground">Use camera or upload a clear photo.</p>
            </div>
          </div>

          <div className="w-full space-y-3 mt-auto">
            <Button
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
                alt={postImageSource ? "Post image selected for scanning" : "Selected object"}
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
          <div
            className="grid grid-cols-2 gap-1 rounded-2xl border border-coral/15 bg-card p-1 shadow-locale-sm"
            role="group"
            aria-label="Scan mode"
          >
            {(["precision", "scene"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setScanMode(mode)}
                aria-pressed={scanMode === mode}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition",
                  scanMode === mode
                    ? "bg-coral text-white shadow-sm"
                    : "text-muted-foreground hover:bg-coral/10 hover:text-foreground"
                )}
              >
                {mode === "precision" ? <ScanLine className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {mode === "precision" ? "Precision" : "Scene"}
              </button>
            ))}
          </div>
          {scanError && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {scanError}
            </div>
          )}

          <div className="mt-auto space-y-3">
            <Button
              className="h-14 w-full gap-3 text-base"
              onClick={analyzeImage}
              disabled={isScanning || (!postImageSource && !selectedFile)}
            >
              {isScanning ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Languages className="h-5 w-5" />
              )}
              {isScanning ? "Scanning" : scanError ? "Retry Scan" : "Identify & Translate"}
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
                alt={postImageSource ? "Scanned post image" : "Scanned object"}
                className="block w-full h-auto"
              />
              {detectedObjects.map((object, index) => {
                if (!object.box) return null;

                return (
                  <div
                    key={`box-${objectKey(object)}`}
                    className="absolute border-2 border-purple bg-coral/10"
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
            <div className="rounded-2xl border border-dashed border-coral/30 bg-card p-8 text-center">
              <ScanLine className="mx-auto mb-3 h-10 w-10 text-coral" />
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
                    className="rounded-2xl border border-coral/15 bg-card p-4 shadow-locale-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold text-foreground">
                          {object.nativeWord}
                        </p>
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
                        className={`w-full flex-shrink-0 transition-colors sm:w-auto ${
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

      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  );
}
