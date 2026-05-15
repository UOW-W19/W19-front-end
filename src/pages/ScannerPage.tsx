import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  ImagePlus,
  Languages,
  Loader2,
  RotateCcw,
  Save,
  ScanLine,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { scanImage } from "@/services/api/scanner";
import { useCreateWord } from "@/hooks/useLearnApi";
import type { DetectedObject } from "@/types/scanner";

type ScannerStep = "select" | "preview" | "result";

const confidenceLabel = (confidence: number) => `${Math.round(confidence * 100)}%`;

export default function ScannerPage() {
  const [step, setStep] = useState<ScannerStep>("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [savedLabels, setSavedLabels] = useState<Set<string>>(new Set());
  const [savingLabels, setSavingLabels] = useState<Set<string>>(new Set());
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
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
    if (!selectedFile) return;

    setIsScanning(true);
    try {
      const objects = await scanImage(selectedFile);
      setDetectedObjects(objects);
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
                      <Button
                        variant={isSaved ? "secondary" : "outline"}
                        size="sm"
                        disabled={isSaved || isSaving}
                        onClick={() => saveDetectedObject(object)}
                        className="flex-shrink-0"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isSaved ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {isSaved ? "Saved" : "Save"}
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
    </div>
  );
}
