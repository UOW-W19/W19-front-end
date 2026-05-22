import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  Crown,
  ImagePlus,
  Languages,
  Loader2,
  RotateCcw,
  ScanLine,
  Star,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { scanImage } from "@/services/api/scanner";
import { useCreateWord } from "@/hooks/useLearnApi";
import type { DetectedObject } from "@/types/scanner";

type ScannerStep = "select" | "preview" | "result" | "subscribe";

const confidenceLabel = (confidence: number) => `${Math.round(confidence * 100)}%`;

export default function ScannerPage() {
  const [step, setStep] = useState<ScannerStep>("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [savedLabels, setSavedLabels] = useState<Set<string>>(new Set());
  const [savingLabels, setSavingLabels] = useState<Set<string>>(new Set());
  const [scansRemaining, setScansRemaining] = useState<number>(() => {
    const stored = localStorage.getItem('scansRemaining');
    return stored !== null ? parseInt(stored, 10) : 3;
  });
  const [showScanPopup, setShowScanPopup] = useState(true);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const prevStepRef = useRef<ScannerStep>("select");
  const saveWord = useCreateWord();

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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
    setDetectedObjects([]);
    setSavedLabels(new Set());
    setStep("preview");
  };

  const resetScanner = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setStep("select");
    setSelectedFile(null);
    setPreviewUrl(null);
    setDetectedObjects([]);
    setSavedLabels(new Set());
    setSavingLabels(new Set());
    setIsScanning(false);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const analyzeImage = async () => {
    if (!selectedFile || scansRemaining <= 0) return;

    setIsScanning(true);
    try {
      const objects = await scanImage(selectedFile);
      setDetectedObjects(objects);
      const newCount = scansRemaining - 1;
      setScansRemaining(newCount);
      localStorage.setItem('scansRemaining', String(newCount));
      setShowScanPopup(true);
      setStep("result");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to scan image");
    } finally {
      setIsScanning(false);
    }
  };

  const saveDetectedObject = async (object: DetectedObject) => {
    const key = `${object.label}:${object.languageCode}`;
    setSavingLabels((current) => new Set(current).add(key));

    try {
      await saveWord.mutateAsync({
        word: object.nativeWord,
        translation: object.learningWord,
        language_code: object.languageCode,
        source: "SCANNER",
        context: `Detected in photo with ${confidenceLabel(object.confidence)} confidence`,
      });
      setSavedLabels((current) => new Set(current).add(key));
    } finally {
      setSavingLabels((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-24 scrollbar-hide mx-auto max-w-md px-4 py-6 flex flex-col">
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

      <div className="flex items-center gap-3 mb-6">
        {step !== "select" && (
          <Button variant="ghost" size="icon" onClick={resetScanner} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold">AI Object Scanner</h1>
          <p className="text-sm text-muted-foreground">
            {step === "select" && "Capture an object"}
            {step === "preview" && "Ready to scan"}
            {step === "result" && "Detected vocabulary"}
          </p>
        </div>
      </div>

      {/* Scan limit popup */}
      {showScanPopup && (
        <div className={cn(
          "flex items-center justify-between rounded-2xl px-4 py-3 mb-5 text-sm font-medium",
          scansRemaining === 0
            ? "bg-destructive/10 text-destructive"
            : scansRemaining === 1
              ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
              : "bg-primary/8 text-primary"
        )}>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 flex-shrink-0" />
            {scansRemaining === 0
              ? "Out of scans! Subscribe now."
              : `${scansRemaining} scan${scansRemaining !== 1 ? 's' : ''} remaining`}
          </div>
          <div className="flex items-center gap-2">
            {scansRemaining === 0 && (
              <button
                onClick={() => { prevStepRef.current = step; setStep("subscribe"); }}
                className="text-xs font-semibold underline underline-offset-2"
              >
                Subscribe
              </button>
            )}
            <button onClick={() => setShowScanPopup(false)} className="opacity-60 hover:opacity-100 transition-opacity">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === "select" && (
        <div className="flex-1 flex flex-col gap-6">
          <div className="w-full aspect-square rounded-2xl bg-muted/50 border border-dashed border-muted-foreground/30 flex items-center justify-center">
            <div className="text-center p-6">
              <ScanLine className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">Scan a real-world object</p>
            </div>
          </div>

          <div className="w-full space-y-3 mt-auto">
            <Button
              className="w-full h-14 text-base gap-3"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-5 w-5" />
              Open Camera
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 text-base gap-3"
              onClick={() => galleryInputRef.current?.click()}
            >
              <ImagePlus className="h-5 w-5" />
              Upload Image
            </Button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="flex-1 flex flex-col gap-6">
          <div className="relative w-full aspect-square rounded-2xl bg-muted overflow-hidden">
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
              className="absolute top-3 right-3"
              onClick={resetScanner}
              aria-label="Clear image"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-auto space-y-3">
            <Button
              className="w-full h-14 text-base gap-3"
              onClick={analyzeImage}
              disabled={isScanning || scansRemaining <= 0}
            >
              {isScanning ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Languages className="h-5 w-5" />
              )}
              {isScanning ? "Scanning" : scansRemaining <= 0 ? "No scans remaining" : "Identify & Translate"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={resetScanner}>
              <RotateCcw className="h-4 w-4" />
              Choose another image
            </Button>
          </div>
        </div>
      )}

      {step === "result" && (
        <div className="flex-1 flex flex-col gap-5">
          {previewUrl && (
            <div className="relative w-full aspect-[4/3] rounded-2xl bg-muted overflow-hidden">
              <img
                src={previewUrl}
                alt="Scanned object"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {detectedObjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <ScanLine className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">No objects detected</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Try a clearer photo with one object in frame.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {detectedObjects.map((object) => {
                const key = `${object.label}:${object.languageCode}`;
                const isSaved = savedLabels.has(key);
                const isSaving = savingLabels.has(key);

                return (
                  <div
                    key={key}
                    className="rounded-xl border border-border bg-card p-4"
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
                        <p className="text-xl font-bold text-primary mt-1 break-words">
                          {object.learningWord}
                        </p>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mt-1">
                          {object.languageCode}
                        </p>
                      </div>
                      <button
                        disabled={isSaved || isSaving}
                        onClick={() => saveDetectedObject(object)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all flex-shrink-0",
                          isSaved
                            ? "bg-amber-100 dark:bg-amber-900/20 text-amber-500 cursor-default"
                            : "bg-muted hover:bg-amber-50 dark:hover:bg-amber-900/10 text-muted-foreground hover:text-amber-500 transition-colors"
                        )}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Star className={cn("h-4 w-4 transition-all", isSaved && "fill-amber-400 text-amber-500")} />
                        )}
                        {isSaved ? "Added" : "Add to word bank"}
                      </button>
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

      {step === "subscribe" && (
        <div className="flex-1 flex flex-col">
          {/* Back arrow */}
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setStep(prevStepRef.current)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>

          {/* Crown icon */}
          <div className="mb-6">
            <div className="h-16 w-16 rounded-full bg-amber-500 flex items-center justify-center mb-6">
              <Crown className="h-8 w-8 text-white fill-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Upgrade to Pro!</h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Unlock the full potential of Locale with our premium subscription.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-0 mb-8">
            {[
              { title: "Unlimited Scans", desc: "Have unrestricted learning potential from your surroundings" },
              { title: "Word Set Expansions", desc: "Have unrestricted learning potential from your surroundings" },
            ].map((feature, i) => (
              <div key={i}>
                <div className="py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-foreground mb-1">{feature.title}</p>
                      <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                    </div>
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  </div>
                </div>
                {i < 1 && <div className="h-px bg-primary/30" />}
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="mb-8">
            <p className="text-lg font-bold text-foreground mb-3">Pro Plan</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium">Billed Monthly</span>
                <span className="text-foreground font-medium">$18/mo.</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium">Tax</span>
                <span className="text-foreground font-medium">$4</span>
              </div>
              <div className="flex items-center justify-between text-sm pt-1">
                <span className="text-amber-500 font-semibold">Total for today</span>
                <span className="text-amber-500 font-semibold">$22.00</span>
              </div>
            </div>
          </div>

          {/* Apple Pay button */}
          <div className="mt-auto">
            <button className="w-full h-14 bg-black text-white rounded-2xl flex items-center justify-center gap-2 text-base font-semibold hover:bg-black/90 transition-colors">
              <span>Checkout with</span>
              <svg className="h-5 w-auto" viewBox="0 0 814 1000" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 376.8 7.1 312.8 7.1 252c0-169.3 111.3-259.3 221.2-259.3 58.6 0 107.5 38.7 143.8 38.7 34.2 0 87.6-41.1 154.1-41.1 24.7 0 108.2 2.6 168.6 80.8zm-107.3-92.7C639.7 191.2 625 133.7 625 82.7c0-5.2.5-10.4 1.5-15.5 48.4 1.9 106.9 32.3 140.5 81.8 30.7 44.9 48.4 99.5 48.4 150.5 0 4.5-.5 9.1-1 13.6-3.5.2-7 .3-10.5.3-44.6 0-97.7-29.2-123.6-104.5z"/>
              </svg>
              <span>Pay</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
