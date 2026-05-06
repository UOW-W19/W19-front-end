import { useState, useRef, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Camera, ImageIcon, Loader2, X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/api";
import { usersApi } from "@/services/api/users";

// ---------------------------------------------------------------------------
// Canvas crop helper — draws the visible crop region onto a 400×400 canvas
// and returns it as a File ready for upload.
// ---------------------------------------------------------------------------
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<File> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = imageSrc;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not load image for cropping"));
  });

  const OUTPUT_SIZE = 400;
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
        else reject(new Error("Failed to generate image"));
      },
      "image/jpeg",
      0.92,
    );
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface AvatarPickerModalProps {
  open: boolean;
  onClose: () => void;
  user: UserProfile;
  /** Called with the final cropped File. Parent handles upload + profile update. */
  onSave: (file: File) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AvatarPickerModal({ open, onClose, user, onSave }: AvatarPickerModalProps) {
  type Step = "view" | "crop";
  const [step, setStep] = useState<Step>("view");

  // Image selected for cropping (object URL or remote URL)
  const [selectedSrc, setSelectedSrc] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Previous images: current avatar + images from user's posts
  const [prevImages, setPrevImages] = useState<string[]>([]);
  const [loadingPrev, setLoadingPrev] = useState(false);

  // Crop state
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Upload state (shown on Save button in crop step)
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ---- Load previous images when modal opens --------------------------------
  useEffect(() => {
    if (!open) return;

    const images: string[] = [];
    if (user.avatarUrl) images.push(user.avatarUrl);

    setLoadingPrev(true);
    usersApi
      .getUserPosts(user.id)
      .then(({ posts }) => {
        posts.forEach((p) => {
          if (p.imageUrl && !images.includes(p.imageUrl)) images.push(p.imageUrl);
        });
        setPrevImages(images);
      })
      .catch(() => setPrevImages(images))
      .finally(() => setLoadingPrev(false));
  }, [open, user.id, user.avatarUrl]);

  // ---- Helpers ---------------------------------------------------------------
  const resetCropState = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const openCropStep = (src: string, file?: File) => {
    setSelectedSrc(src);
    setSelectedFile(file ?? null);
    resetCropState();
    setStep("crop");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    openCropStep(URL.createObjectURL(file), file);
    e.target.value = "";
  };

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleSave = async () => {
    if (!selectedSrc || !croppedAreaPixels) return;
    setIsSaving(true);
    try {
      let file: File;
      try {
        file = await getCroppedImg(selectedSrc, croppedAreaPixels);
      } catch (error) {
        if (!selectedFile) {
          throw error;
        }
        file = selectedFile;
      }
      await onSave(file);
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setStep("view");
    setSelectedSrc(null);
    setSelectedFile(null);
    resetCropState();
    onClose();
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  // ---- Render ----------------------------------------------------------------
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Panel */}
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-background shadow-xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "overflow-hidden",
          )}
        >
          {/* ===== STEP: VIEW ===== */}
          {step === "view" && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <Dialog.Title className="text-base font-semibold text-foreground">
                  Profile Picture
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>

              {/* Large avatar */}
              <div className="flex justify-center bg-muted/20 py-6">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="h-32 w-32 rounded-full object-cover ring-4 ring-background shadow-lg"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-4xl font-bold text-primary-foreground ring-4 ring-background shadow-lg">
                    {getInitials(user.displayName)}
                  </div>
                )}
              </div>

              {/* Source options */}
              <div className="px-4 pt-4 pb-3">
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Choose a new photo
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                    Camera Roll
                  </button>
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <Camera className="h-4 w-4 text-primary shrink-0" />
                    Take Photo
                  </button>
                </div>

                {/* Hidden file inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Previous images */}
              {(loadingPrev || prevImages.length > 0) && (
                <div className="px-4 pb-5">
                  <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Previous photos
                  </p>
                  {loadingPrev ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5">
                      {prevImages.map((url) => (
                        <button
                          key={url}
                          onClick={() => openCropStep(url)}
                          className="aspect-square overflow-hidden rounded-lg border-2 border-transparent hover:border-primary focus-visible:border-primary transition-colors outline-none"
                        >
                          <img
                            src={url}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ===== STEP: CROP ===== */}
          {step === "crop" && (
            <>
              {/* Header */}
              <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                <button
                  onClick={() => setStep("view")}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                  aria-label="Back"
                  disabled={isSaving}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <Dialog.Title className="flex-1 text-base font-semibold text-foreground">
                  Adjust Photo
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                    aria-label="Close"
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>

              {/* Cropper */}
              <div className="relative h-72 w-full bg-black select-none">
                {selectedSrc && (
                  <Cropper
                    image={selectedSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                    style={{
                      containerStyle: { borderRadius: 0 },
                    }}
                  />
                )}
              </div>

              {/* Zoom slider */}
              <div className="px-5 pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-8 shrink-0">Zoom</span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 accent-primary"
                    disabled={isSaving}
                  />
                  <span className="text-xs text-muted-foreground w-8 text-right shrink-0">
                    {zoom.toFixed(1)}×
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 px-4 pb-5">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("view")}
                  disabled={isSaving}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  disabled={isSaving || !croppedAreaPixels}
                >
                  {isSaving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
