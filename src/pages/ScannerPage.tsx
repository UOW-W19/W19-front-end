import { useState } from "react";
import { Camera, Upload, X, ArrowLeft, Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScannerStep = "select" | "preview" | "result";

export default function ScannerPage() {
  const [step, setStep] = useState<ScannerStep>("select");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Mock data for wireframe
  const mockResult = {
    detectedObject: "Apple",
    translations: [
      { language: "Spanish", word: "Manzana", pronunciation: "man-SA-na" },
      { language: "French", word: "Pomme", pronunciation: "pom" },
      { language: "Japanese", word: "りんご", pronunciation: "ringo" },
    ],
  };

  const handleCapture = () => {
    // Mock: In real implementation, this opens camera
    setCapturedImage("/placeholder.svg");
    setStep("preview");
  };

  const handleUpload = () => {
    // Mock: In real implementation, this opens file picker
    setCapturedImage("/placeholder.svg");
    setStep("preview");
  };

  const handleAnalyze = () => {
    // Mock: In real implementation, this calls AI
    setStep("result");
  };

  const handleReset = () => {
    setCapturedImage(null);
    setStep("select");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-6 min-h-[80vh] flex flex-col">
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
            {step === "preview" && "Review your image"}
            {step === "result" && "Translation results"}
          </p>
        </div>
      </div>

      {/* Step 1: Select method */}
      {step === "select" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* Camera preview area */}
          <div className="w-full aspect-square rounded-3xl bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
            <div className="text-center p-6">
              <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                Point your camera at any object
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="w-full space-y-3">
            <Button 
              className="w-full h-14 text-lg gap-3" 
              onClick={handleCapture}
            >
              <Camera className="h-5 w-5" />
              Open Camera
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-14 text-lg gap-3"
              onClick={handleUpload}
            >
              <Upload className="h-5 w-5" />
              Upload from Gallery
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && (
        <div className="flex-1 flex flex-col gap-6">
          {/* Image preview */}
          <div className="relative w-full aspect-square rounded-3xl bg-muted overflow-hidden">
            <img 
              src={capturedImage || ""} 
              alt="Captured object"
              className="w-full h-full object-cover"
            />
            <Button 
              variant="secondary" 
              size="icon" 
              className="absolute top-3 right-3"
              onClick={handleReset}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Analyze button */}
          <div className="mt-auto space-y-3">
            <Button 
              className="w-full h-14 text-lg gap-3" 
              onClick={handleAnalyze}
            >
              <Languages className="h-5 w-5" />
              Identify & Translate
            </Button>
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={handleReset}
            >
              Take another photo
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === "result" && (
        <div className="flex-1 flex flex-col gap-6">
          {/* Detected object card */}
          <div className="rounded-2xl bg-primary/10 p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Detected Object</p>
            <h2 className="text-3xl font-bold text-primary">{mockResult.detectedObject}</h2>
          </div>

          {/* Translations */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Translations</h3>
            {mockResult.translations.map((t, i) => (
              <div 
                key={i}
                className="rounded-xl border bg-card p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-muted-foreground">{t.language}</p>
                  <p className="text-xl font-semibold">{t.word}</p>
                  <p className="text-sm text-muted-foreground italic">/{t.pronunciation}/</p>
                </div>
                <Button variant="ghost" size="icon">
                  🔊
                </Button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-auto space-y-3">
            <Button variant="outline" className="w-full">
              Save to Vocabulary
            </Button>
            <Button 
              className="w-full" 
              onClick={handleReset}
            >
              Scan Another Object
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
