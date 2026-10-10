'use client';

import { useEffect, useRef } from 'react';
import './TechText.css';

export default function TechText({ text = 'MYTH', accentColor = '#f59e0b', color = 'currentColor', className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return undefined;
    let frame, pointer = { x: -9999, y: -9999 }, size = 1;
    const draw = () => { const box = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = box.width * dpr; canvas.height = box.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); size = Math.min(box.width / Math.max(text.length, 1) * 1.06, box.height * .68); ctx.font = `700 ${size}px ui-sans-serif, system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.clearRect(0, 0, box.width, box.height); const x = box.width / 2, y = box.height / 2; ctx.lineWidth = 1.4; ctx.setLineDash([4, 3]); ctx.strokeStyle = color === 'currentColor' ? getComputedStyle(canvas).color : color; ctx.strokeText(text, x, y); ctx.setLineDash([]); const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 180); glow.addColorStop(0, accentColor); glow.addColorStop(1, 'transparent'); ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = glow; ctx.fillRect(0, 0, box.width, box.height); ctx.globalCompositeOperation = 'source-over'; };
    const move = e => { const r = canvas.getBoundingClientRect(); pointer = { x: e.clientX - r.left, y: e.clientY - r.top }; cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); };
    const observer = new ResizeObserver(draw); observer.observe(canvas); canvas.addEventListener('pointermove', move); draw(); return () => { observer.disconnect(); canvas.removeEventListener('pointermove', move); cancelAnimationFrame(frame); };
  }, [text, accentColor, color]);
  return <div className={`tech-text ${className}`} role="img" aria-label={text}><canvas ref={ref} /></div>;
}
