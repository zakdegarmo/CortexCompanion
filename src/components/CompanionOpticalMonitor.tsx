import React, { useRef, useEffect, useState } from 'react';
import { Eye, Camera, Maximize2, Minimize2, Loader2, Sparkles } from 'lucide-react';

interface CompanionOpticalMonitorProps {
  onScanWithLlava: (base64Img: string) => Promise<void>;
  isScanning: boolean;
  visionDescription: string | null;
}

export const CompanionOpticalMonitor: React.FC<CompanionOpticalMonitorProps> = ({
  onScanWithLlava,
  isScanning,
  visionDescription
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);

  // Blit the companion offscreen WebGL canvas directly to our UI preview
  useEffect(() => {
    let animId: number;

    const streamFeed = () => {
      const getCanvas = (window as any).__getCompanionOffscreenCanvas;
      if (getCanvas && canvasRef.current) {
        const offscreenCanvas: HTMLCanvasElement | null = getCanvas();
        if (offscreenCanvas) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.drawImage(offscreenCanvas, 0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
      }
      animId = requestAnimationFrame(streamFeed);
    };

    animId = requestAnimationFrame(streamFeed);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleTriggerScan = async () => {
    if (isScanning) return;
    const capture = (window as any).__captureCompanionVision;
    if (capture) {
      const fullDataUrl: string | null = capture();
      if (fullDataUrl) {
        const base64Data = fullDataUrl.replace(/^data:image\/jpeg;base64,/, '');
        setLastScanTime(new Date().toLocaleTimeString());
        await onScanWithLlava(base64Data);
      }
    }
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      left: '24px',
      width: isExpanded ? '460px' : '260px',
      background: 'rgba(11, 15, 29, 0.94)',
      border: '1px solid rgba(56, 189, 248, 0.45)',
      borderRadius: '10px',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 20,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 16px rgba(56, 189, 248, 0.25)',
      transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Header Bar */}
      <div style={{
        padding: '8px 12px',
        background: 'rgba(0, 0, 0, 0.5)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
        color: '#38bdf8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Eye size={14} />
          <span>COMPANION OPTICS (FPV)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsExpanded(prev => !prev)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}>
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Optical Canvas Viewport */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#05070f' }}>
        <canvas
          ref={canvasRef}
          width={384}
          height={288}
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
        />

        {/* Reticle / Crosshair */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '26px',
          height: '26px',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        {/* Scan Status Badge */}
        {isScanning && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.82)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: '#38bdf8',
            fontSize: '0.8rem',
            fontWeight: 600
          }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span>LLAVA ANALYZING VISION...</span>
          </div>
        )}
      </div>

      {/* Real-time Vision Description */}
      {visionDescription && (
        <div style={{
          padding: '8px 12px',
          background: 'rgba(2, 132, 199, 0.1)',
          borderTop: '1px solid rgba(56, 189, 248, 0.2)',
          fontSize: '0.72rem',
          color: '#e0f2fe',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '6px'
        }}>
          <Sparkles size={13} style={{ color: '#38bdf8', flexShrink: 0, marginTop: '2px' }} />
          <span>{visionDescription}</span>
        </div>
      )}

      {/* Footer Controls */}
      <div style={{
        padding: '6px 10px',
        background: 'rgba(0, 0, 0, 0.4)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.7rem'
      }}>
        <div style={{ color: '#64748b' }}>
          {lastScanTime ? `Last scan: ${lastScanTime}` : 'FPV Live (30fps)'}
        </div>
        <button
          onClick={handleTriggerScan}
          disabled={isScanning}
          style={{
            padding: '5px 12px',
            background: isScanning ? '#334155' : '#0284c7',
            border: 'none',
            borderRadius: '5px',
            color: '#fff',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: isScanning ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
          <Camera size={12} />
          <span>SCAN VISION (LLAVA)</span>
        </button>
      </div>
    </div>
  );
};
