import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { Camera, ChevronLeft, ImageIcon, Loader2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

async function getCroppedImage(imageSrc: string, pixelCrop: Area): Promise<File> {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageSrc;

    await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not load image for cropping"));
    });

    const outputSize = 400;
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
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
        outputSize,
        outputSize,
    );

    return new Promise<File>((resolve, reject) => {
        canvas.toBlob(
            blob => {
                if (blob) resolve(new File([blob], "group-avatar.jpg", { type: "image/jpeg" }));
                else reject(new Error("Failed to generate image"));
            },
            "image/jpeg",
            0.92,
        );
    });
}

interface GroupImagePickerModalProps {
    open: boolean;
    onClose: () => void;
    groupName: string;
    currentImageUrl?: string;
    onSave: (file: File) => Promise<void> | void;
}

export function GroupImagePickerModal({
    open,
    onClose,
    groupName,
    currentImageUrl,
    onSave,
}: GroupImagePickerModalProps) {
    type Step = "view" | "crop";

    const [step, setStep] = useState<Step>("view");
    const [selectedSrc, setSelectedSrc] = useState<string | null>(null);
    const [selectedObjectUrl, setSelectedObjectUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (selectedObjectUrl) URL.revokeObjectURL(selectedObjectUrl);
        };
    }, [selectedObjectUrl]);

    const resetCropState = () => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
    };

    const handleClose = () => {
        setStep("view");
        setSelectedSrc(null);
        setSelectedObjectUrl(null);
        setSelectedFile(null);
        resetCropState();
        onClose();
    };

    const openCropStep = (file: File) => {
        if (selectedObjectUrl) URL.revokeObjectURL(selectedObjectUrl);
        const objectUrl = URL.createObjectURL(file);
        setSelectedObjectUrl(objectUrl);
        setSelectedSrc(objectUrl);
        setSelectedFile(file);
        resetCropState();
        setStep("crop");
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        openCropStep(file);
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
                file = await getCroppedImage(selectedSrc, croppedAreaPixels);
            } catch (error) {
                if (!selectedFile) throw error;
                file = selectedFile;
            }
            await onSave(file);
            handleClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={isOpen => !isOpen && handleClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <Dialog.Content
                    className={cn(
                        "fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-background shadow-xl",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                    )}
                >
                    {step === "view" && (
                        <>
                            <div className="flex items-center justify-between px-4 pb-3 pt-4">
                                <Dialog.Title className="text-base font-semibold text-foreground">
                                    Group Image
                                </Dialog.Title>
                                <Dialog.Close asChild>
                                    <button
                                        className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                                        aria-label="Close"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </Dialog.Close>
                            </div>

                            <div className="flex justify-center bg-muted/20 py-6">
                                {currentImageUrl ? (
                                    <img
                                        src={currentImageUrl}
                                        alt={groupName}
                                        className="h-32 w-32 rounded-full object-cover shadow-lg ring-4 ring-background"
                                    />
                                ) : (
                                    <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg ring-4 ring-background">
                                        <Users className="h-12 w-12" />
                                    </div>
                                )}
                            </div>

                            <div className="px-4 pb-5 pt-4">
                                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Choose a new image
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
                                    >
                                        <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
                                        Camera Roll
                                    </button>
                                    <button
                                        onClick={() => cameraInputRef.current?.click()}
                                        className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
                                    >
                                        <Camera className="h-4 w-4 shrink-0 text-primary" />
                                        Take Photo
                                    </button>
                                </div>

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
                                    capture="environment"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                            </div>
                        </>
                    )}

                    {step === "crop" && (
                        <>
                            <div className="flex items-center gap-2 px-4 pb-3 pt-4">
                                <button
                                    onClick={() => setStep("view")}
                                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                                    aria-label="Back"
                                    disabled={isSaving}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <Dialog.Title className="flex-1 text-base font-semibold text-foreground">
                                    Adjust Image
                                </Dialog.Title>
                                <Dialog.Close asChild>
                                    <button
                                        className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                                        aria-label="Close"
                                        disabled={isSaving}
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </Dialog.Close>
                            </div>

                            <div className="relative h-72 w-full select-none bg-black">
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
                                    />
                                )}
                            </div>

                            <div className="px-5 pb-3 pt-4">
                                <div className="flex items-center gap-3">
                                    <span className="w-8 shrink-0 text-xs text-muted-foreground">Zoom</span>
                                    <input
                                        type="range"
                                        min={1}
                                        max={3}
                                        step={0.01}
                                        value={zoom}
                                        onChange={e => setZoom(Number(e.target.value))}
                                        className="flex-1 accent-primary"
                                        disabled={isSaving}
                                    />
                                    <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">
                                        {zoom.toFixed(1)}x
                                    </span>
                                </div>
                            </div>

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
