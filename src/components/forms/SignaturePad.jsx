import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

/**
 * לוח חתימה (canvas). מחזיר PNG כ-data URL בשמירה.
 */
function layoutCanvas(canvas) {
  const parent = canvas.parentElement;
  const w = Math.max(parent?.clientWidth || 320, 200);
  const h = 160;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#1e3a8a";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  return { ctx, w, h };
}

const SignaturePad = forwardRef(function SignaturePad({ className = "" }, ref) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const dimsRef = useRef({ w: 320, h: 160 });
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const hasInk = useRef(false);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { ctx, w, h } = layoutCanvas(canvas);
    ctxRef.current = ctx;
    dimsRef.current = { w, h };
  }, []);

  useEffect(() => {
    paint();
  }, [paint]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  useImperativeHandle(ref, () => ({
    clear() {
      hasInk.current = false;
      paint();
    },
    isEmpty() {
      return !hasInk.current;
    },
    getDataURL() {
      return canvasRef.current?.toDataURL("image/png") ?? "";
    },
  }));

  const onPointerDown = (e) => {
    if (!ctxRef.current) paint();
    const ctx = ctxRef.current;
    if (!ctx) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = getPos(e);
  };

  const onPointerMove = (e) => {
    if (!drawing.current || !ctxRef.current) return;
    e.preventDefault();
    const ctx = ctxRef.current;
    const p = getPos(e);
    const { x: x0, y: y0 } = last.current;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    hasInk.current = true;
  };

  const endStroke = (e) => {
    if (drawing.current) {
      drawing.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className={`touch-none cursor-crosshair rounded border border-gray-300 bg-white ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      onPointerLeave={(e) => {
        if (drawing.current) endStroke(e);
      }}
      aria-label="Signature"
    />
  );
});

export default SignaturePad;
