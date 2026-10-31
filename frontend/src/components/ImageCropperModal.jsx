import { useState, useRef, useEffect } from "react";

/**
 * ImageCropperModal
 * Interactive Drag & Zoom Cropper (Instagram / Twitter style)
 * Supports both:
 *  - 1:1 circular crop for Profile Picture (Avatar)
 *  - 3:1 (1200x400) widescreen crop for Compound Banner (Cover)
 */
const ImageCropperModal = ({
  imageSrc,
  aspectType = "avatar", // "avatar" | "cover"
  onCropComplete,
  onCancel,
}) => {
  const isAvatar = aspectType === "avatar";

  // Dimensions of interactive viewport in CSS pixels
  const viewportWidth = isAvatar ? 280 : 360;
  const viewportHeight = isAvatar ? 280 : 120; // 3:1 aspect ratio

  // Output image dimensions
  const outputWidth = isAvatar ? 400 : 1200;
  const outputHeight = isAvatar ? 400 : 400;

  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialOffset, setInitialOffset] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);

  const imgRef = useRef(null);

  // When image loads, compute base scale and initial center offset
  const handleImageLoad = (e) => {
    const nw = e.target.naturalWidth;
    const nh = e.target.naturalHeight;
    setNaturalSize({ width: nw, height: nh });

    const scaleX = viewportWidth / nw;
    const scaleY = viewportHeight / nh;
    const baseScale = Math.max(scaleX, scaleY);

    const initW = nw * baseScale;
    const initH = nh * baseScale;
    const initX = (viewportWidth - initW) / 2;
    const initY = (viewportHeight - initH) / 2;

    setZoom(1);
    setOffset({ x: initX, y: initY });
    setImageLoaded(true);
  };

  // Helper: compute current rendered scale & dimensions
  const getRenderedSize = (currentZoom) => {
    if (!naturalSize.width || !naturalSize.height) return { w: 0, h: 0, scale: 1 };
    const scaleX = viewportWidth / naturalSize.width;
    const scaleY = viewportHeight / naturalSize.height;
    const baseScale = Math.max(scaleX, scaleY);
    const scale = baseScale * currentZoom;
    return {
      w: naturalSize.width * scale,
      h: naturalSize.height * scale,
      scale,
    };
  };

  // Clamp offset so image always covers the viewport (no black/empty borders)
  const clampOffset = (x, y, currentZoom) => {
    const { w, h } = getRenderedSize(currentZoom);
    const minX = viewportWidth - w;
    const maxX = 0;
    const minY = viewportHeight - h;
    const maxY = 0;

    const clampedX = Math.min(maxX, Math.max(minX, x));
    const clampedY = Math.min(maxY, Math.max(minY, y));
    return { x: clampedX, y: clampedY };
  };

  // Handle Zoom change smoothly around center of viewport
  const handleZoomChange = (newZoom) => {
    const clampedZoom = Math.min(3, Math.max(1, newZoom));
    const oldSize = getRenderedSize(zoom);
    const newSize = getRenderedSize(clampedZoom);

    // Zoom from center of viewport
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;

    const ratioX = (centerX - offset.x) / oldSize.w;
    const ratioY = (centerY - offset.y) / oldSize.h;

    const newX = centerX - ratioX * newSize.w;
    const newY = centerY - ratioY * newSize.h;

    const clamped = clampOffset(newX, newY, clampedZoom);
    setZoom(clampedZoom);
    setOffset(clamped);
  };

  // Drag interaction with Pointer Capture
  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialOffset({ x: offset.x, y: offset.y });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const rawX = initialOffset.x + dx;
    const rawY = initialOffset.y + dy;
    setOffset(clampOffset(rawX, rawY, zoom));
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Perform client-side canvas crop
  const handleApplyCrop = () => {
    if (!imgRef.current || !naturalSize.width) return;
    setProcessing(true);

    try {
      const { scale } = getRenderedSize(zoom);

      // Crop box in natural image coordinates
      const cropX = -offset.x / scale;
      const cropY = -offset.y / scale;
      const cropW = viewportWidth / scale;
      const cropH = viewportHeight / scale;

      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d");

      // High quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        imgRef.current,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        outputWidth,
        outputHeight
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setProcessing(false);
            return;
          }
          const fileName = isAvatar ? "avatar-cropped.jpg" : "banner-cropped.jpg";
          const croppedFile = new File([blob], fileName, { type: "image/jpeg" });
          const previewUrl = URL.createObjectURL(blob);

          onCropComplete({
            file: croppedFile,
            previewUrl,
          });
        },
        "image/jpeg",
        0.92
      );
    } catch (err) {
      console.error("Crop error:", err);
      setProcessing(false);
    }
  };

  const currentSize = getRenderedSize(zoom);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-md bg-white dark:bg-[#0c0f17] border border-slate-200 dark:border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {isAvatar ? "Frame Profile Avatar" : "Frame Compound Banner"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Viewport & Interactive Stage */}
        <div className="p-6 flex flex-col items-center bg-slate-50 dark:bg-black/50">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-medium flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="text-emerald-500">
              <path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z" />
            </svg>
            Drag to reposition • Use slider to zoom
          </p>

          {/* Cropper Container Box */}
          <div
            className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/60 shadow-xl bg-black cursor-grab active:cursor-grabbing touch-none"
            style={{ width: `${viewportWidth}px`, height: `${viewportHeight}px` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* The Draggable Image */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={handleImageLoad}
              draggable={false}
              className="absolute pointer-events-none select-none max-w-none transition-transform duration-75"
              style={{
                width: `${currentSize.w}px`,
                height: `${currentSize.h}px`,
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
              }}
            />

            {/* Circular Vignette Mask for Avatar (Instagram Style) */}
            {isAvatar && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65)",
                  borderRadius: "50%",
                }}
              />
            )}

            {/* Subtle Crosshair Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none border border-white/30 rounded-2xl grid grid-cols-3 grid-rows-3 opacity-40">
              <div className="border-r border-b border-white/25" />
              <div className="border-r border-b border-white/25" />
              <div className="border-b border-white/25" />
              <div className="border-r border-b border-white/25" />
              <div className="border-r border-b border-white/25" />
              <div className="border-b border-white/25" />
              <div className="border-r border-white/25" />
              <div className="border-r border-white/25" />
              <div />
            </div>
          </div>

          {/* Zoom Slider Controls */}
          <div className="w-full max-w-[320px] mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.2)}
              className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
              title="Zoom out"
            >
              −
            </button>

            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-slate-300 dark:bg-white/20 rounded-lg"
            />

            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.2)}
              className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
              title="Zoom in"
            >
              +
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0f17]">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-all border border-slate-300 dark:border-white/10"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={processing || !imageLoaded}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:from-emerald-500 hover:to-amber-400 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {processing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Framing...</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span>Apply & Fit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;

