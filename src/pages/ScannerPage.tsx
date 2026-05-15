import { useState, useRef, useEffect } from "react";
import { Camera, Upload, X, ArrowLeft, Languages, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScannerApi } from "@/hooks/useScannerApi";
import { toast } from "sonner";

type ScannerStep = "select" | "camera" | "preview" | "result";

export default function ScannerPage() {
  const [step, setStep] = useState<ScannerStep>("select");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>("en");
  const [apiResult, setApiResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { analyzeMutation, saveWordMutation } = useScannerApi();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      setStep("camera");
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Failed to access camera", err);
      toast.error("Failed to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => stopCamera(); // Cleanup on unmount
  }, []);

  const processAndSetImage = (imageSource: HTMLImageElement | HTMLVideoElement, width: number, height: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Target size 640x640 with letterboxing
    const targetSize = 640;
    canvas.width = targetSize;
    canvas.height = targetSize;

    // Fill with black padding
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, targetSize, targetSize);

    // Calculate aspect ratio and scaling
    const scale = Math.min(targetSize / width, targetSize / height);
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;

    const x = (targetSize - scaledWidth) / 2;
    const y = (targetSize - scaledHeight) / 2;

    ctx.drawImage(imageSource, x, y, scaledWidth, scaledHeight);

    // Get base64, removing the data URL prefix for the backend
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    const base64Data = dataUrl.split(",")[1];

    setCapturedImage(`data:image/jpeg;base64,${base64Data}`);
    setStep("preview");
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    processAndSetImage(video, video.videoWidth, video.videoHeight);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        processAndSetImage(img, img.width, img.height);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!capturedImage) return;
    setErrorMsg(null);
    try {
      const base64Data = capturedImage.split(",")[1];
      console.log("Sending image of size:", base64Data.length);
      console.log("Target language:", targetLanguage);

      const result = await analyzeMutation.mutateAsync({
        image: base64Data,
        target_language: targetLanguage,
      });

      console.log("API RESPONSE:", result);
      setApiResult(result);
      setStep("result");
    } catch (error: any) {
      console.error("API Error during analysis:", error);
      const msg = error.message || "Failed to analyze image. Please try again.";
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setApiResult(null);
    setErrorMsg(null);
    stopCamera();
    setStep("select");
  };

  const handleSaveToVocab = async (word: string, translation: string) => {
    try {
      await saveWordMutation.mutateAsync({
        word,
        translation,
        languageCode: targetLanguage,
      });
      toast.success("Saved to vocabulary!");
    } catch (error) {
      toast.error("Failed to save to vocabulary.");
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-24 scrollbar-hide mx-auto max-w-md px-4 py-6 flex flex-col">
      {/* Hidden Canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileUpload}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {step !== "select" && (
          <Button variant="ghost" size="icon" onClick={handleReset}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="text-xl font-bold">AI Object Scanner</h1>
          <p className="text-sm text-muted-foreground">
            {step === "select" && "Scan any object to learn its name"}
            {step === "camera" && "Point at an object"}
            {step === "preview" && "Review your image"}
            {step === "result" && "Translation results"}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-destructive/15 text-destructive border border-destructive/20">
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Target Language Selector */}
      {step !== "camera" && step !== "result" && (
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">Target Language</label>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
          >
            <option value="en">English (en)</option>
            <option value="es">Spanish (es)</option>
            <option value="fr">French (fr)</option>
            <option value="ja">Japanese (ja)</option>
          </select>
        </div>
      )}

      {/* Step 1: Select method */}
      {step === "select" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-full aspect-square rounded-3xl bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
            <div className="text-center p-6">
              <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                Point your camera at any object
              </p>
            </div>
          </div>

          <div className="w-full space-y-3">
            <Button className="w-full h-14 text-lg gap-3" onClick={startCamera}>
              <Camera className="h-5 w-5" />
              Open Camera
            </Button>
            <Button variant="outline" className="w-full h-14 text-lg gap-3" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-5 w-5" />
              Upload from Gallery
            </Button>
          </div>
        </div>
      )}

      {/* Step 1.5: Camera active */}
      {step === "camera" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="relative w-full aspect-square rounded-3xl bg-black overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          <Button className="w-full h-14 text-lg gap-3" onClick={captureFrame}>
            <Camera className="h-5 w-5" />
            Capture Photo
          </Button>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && (
        <div className="flex-1 flex flex-col gap-6">
          <div className="relative w-full aspect-square rounded-3xl bg-black flex items-center justify-center overflow-hidden border">
            <img
              src={capturedImage || ""}
              alt="Captured object"
              className="w-full h-full object-contain"
            />
            <Button variant="secondary" size="icon" className="absolute top-3 right-3" onClick={handleReset}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-auto space-y-3">
            <Button className="w-full h-14 text-lg gap-3" onClick={handleAnalyze} disabled={analyzeMutation.isPending}>
              {analyzeMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Languages className="h-5 w-5" />
              )}
              {analyzeMutation.isPending ? "Analyzing..." : "Identify & Translate"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleReset} disabled={analyzeMutation.isPending}>
              Take another photo
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === "result" && apiResult && (
        <div className="flex-1 flex flex-col gap-6">
          {apiResult.detections && apiResult.detections.length > 0 ? (
            <>
              <div className="rounded-2xl bg-primary/10 p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Detected Object</p>
                <h2 className="text-3xl font-bold text-primary capitalize">
                  {apiResult.detections[0].translated_label}
                </h2>
                <p className="text-sm text-muted-foreground mt-1 capitalize">
                  ({apiResult.detections[0].canonical_label})
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Translations</h3>
                {apiResult.detections.map((detection: { canonical_label: string; translated_label: string }, i: number) => (
                  <div key={i} className="rounded-xl border bg-card p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground uppercase">{targetLanguage}</p>
                        <p className="text-xl font-semibold capitalize">{detection.translated_label}</p>
                        <p className="text-sm text-muted-foreground capitalize">({detection.canonical_label})</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => handleSaveToVocab(detection.canonical_label, detection.translated_label)}
                      disabled={saveWordMutation.isPending}
                    >
                      <Save className="h-4 w-4" />
                      Save to Vocabulary
                    </Button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-muted p-6 text-center">
              <h2 className="text-xl font-semibold mb-2">No Objects Detected</h2>
              <p className="text-muted-foreground">Try taking a clearer photo or focusing on a specific object.</p>
            </div>
          )}

          <div className="mt-auto pt-6 space-y-3">
            <Button className="w-full" onClick={handleReset}>
              Scan Another Object
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
