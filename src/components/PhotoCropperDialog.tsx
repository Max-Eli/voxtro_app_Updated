import { useRef, useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Upload } from "lucide-react";
import { toast } from "sonner";

const DISPLAY = 240; // on-screen crop frame (px)
const OUTPUT = 512; // exported square image (px)
const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

/**
 * Circular photo cropper (pan + zoom), no third-party library. The visible crop
 * is a circle; onCropped receives a square JPEG Blob (shown as a circle via CSS
 * wherever it's displayed). Every upload/replace goes through this, so it also
 * serves as the "re-crop" flow.
 */
export function PhotoCropperDialog({
  open,
  onOpenChange,
  onCropped,
  busy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCropped: (blob: Blob) => void;
  busy?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const baseScaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [hasImage, setHasImage] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const eff = baseScaleRef.current * zoom;
    ctx.clearRect(0, 0, DISPLAY, DISPLAY);
    ctx.drawImage(img, offsetRef.current.x, offsetRef.current.y, img.width * eff, img.height * eff);
  }, [zoom]);

  const clamp = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const eff = baseScaleRef.current * zoom;
    const w = img.width * eff;
    const h = img.height * eff;
    offsetRef.current.x = Math.min(0, Math.max(DISPLAY - w, offsetRef.current.x));
    offsetRef.current.y = Math.min(0, Math.max(DISPLAY - h, offsetRef.current.y));
  }, [zoom]);

  // Redraw whenever zoom changes or the image first mounts the canvas.
  useEffect(() => {
    if (hasImage) {
      clamp();
      draw();
    }
  }, [zoom, hasImage, clamp, draw]);

  function reset() {
    imgRef.current = null;
    offsetRef.current = { x: 0, y: 0 };
    setZoom(1);
    setHasImage(false);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPT.includes(file.type)) {
      toast.error("Choose a JPEG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        baseScaleRef.current = Math.max(DISPLAY / img.width, DISPLAY / img.height);
        const w = img.width * baseScaleRef.current;
        const h = img.height * baseScaleRef.current;
        offsetRef.current = { x: (DISPLAY - w) / 2, y: (DISPLAY - h) / 2 };
        setZoom(1);
        setHasImage(true); // effect draws once the canvas mounts
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function onZoomChange(v: number) {
    const img = imgRef.current;
    if (img) {
      // Keep the frame centre fixed while zooming.
      const c = DISPLAY / 2;
      const prev = baseScaleRef.current * zoom;
      const ix = (c - offsetRef.current.x) / prev;
      const iy = (c - offsetRef.current.y) / prev;
      const eff = baseScaleRef.current * v;
      offsetRef.current.x = c - ix * eff;
      offsetRef.current.y = c - iy * eff;
    }
    setZoom(v);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!imgRef.current) return;
    dragRef.current = { active: true, x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current.active) return;
    offsetRef.current.x += e.clientX - dragRef.current.x;
    offsetRef.current.y += e.clientY - dragRef.current.y;
    dragRef.current.x = e.clientX;
    dragRef.current.y = e.clientY;
    clamp();
    draw();
  }
  function onPointerUp() {
    dragRef.current.active = false;
  }

  function save() {
    const img = imgRef.current;
    if (!img) return;
    clamp();
    const out = document.createElement("canvas");
    out.width = out.height = OUTPUT;
    const octx = out.getContext("2d");
    if (!octx) return;
    const r = OUTPUT / DISPLAY;
    const eff = baseScaleRef.current * zoom;
    octx.drawImage(
      img,
      offsetRef.current.x * r,
      offsetRef.current.y * r,
      img.width * eff * r,
      img.height * eff * r
    );
    out.toBlob((b) => { if (b) onCropped(b); }, "image/jpeg", 0.9);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Profile Photo</DialogTitle>
          <DialogDescription>
            Drag to reposition and use the slider to zoom. The photo is cropped to a circle.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={onPick}
        />

        {!hasImage ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Button type="button" variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Choose Image
            </Button>
            <p className="text-xs text-muted-foreground">JPEG, PNG, or WEBP · max 5 MB</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2">
            <div
              style={{
                width: DISPLAY,
                height: DISPLAY,
                borderRadius: "50%",
                overflow: "hidden",
                touchAction: "none",
                boxShadow: "0 0 0 3px hsl(var(--primary) / 0.3), inset 0 0 0 1px rgba(0,0,0,.15)",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              <canvas
                ref={canvasRef}
                width={DISPLAY}
                height={DISPLAY}
                style={{ display: "block", cursor: "grab" }}
              />
            </div>
            <div className="flex items-center gap-3 w-full px-2">
              <span className="text-muted-foreground text-sm">−</span>
              <Slider
                min={1}
                max={3}
                step={0.01}
                value={[zoom]}
                onValueChange={(vals) => onZoomChange(vals[0])}
                className="flex-1"
              />
              <span className="text-muted-foreground text-sm">+</span>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
              Choose a different image
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button type="button" disabled={!hasImage || busy} onClick={save}>
            {busy ? "Saving…" : "Save Photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
