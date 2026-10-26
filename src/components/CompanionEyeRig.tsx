import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CompanionEyeRigProps {
  companionPos: [number, number, number];
  companionRot: [number, number, number];
  onFrameUpdate?: (gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => void;
  onCanvasCapture?: (dataUrl: string) => void;
}

export const CompanionEyeRig: React.FC<CompanionEyeRigProps> = ({
  companionPos,
  companionRot,
  onCanvasCapture
}) => {
  const eyeCamera = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(65, 512 / 384, 0.1, 500);
    return cam;
  }, []);

  // Offscreen auxiliary canvas for zero-overhead snapshot captures
  const offscreenRendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 288;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    offscreenRendererRef.current = renderer;

    return () => {
      renderer.dispose();
    };
  }, []);

  useFrame(({ scene }) => {
    // Companion eye coordinate (~1.65m height above terrain)
    const eyeX = companionPos[0];
    const eyeY = companionPos[1] + 1.65;
    const eyeZ = companionPos[2];

    eyeCamera.position.set(eyeX, eyeY, eyeZ);

    // Look vector
    const lookAngle = companionRot[1];
    const lookDist = 12.0;
    const targetX = eyeX + Math.sin(lookAngle) * lookDist;
    const targetZ = eyeZ + Math.cos(lookAngle) * lookDist;
    const targetY = eyeY - 0.2;

    eyeCamera.lookAt(targetX, targetY, targetZ);

    if (offscreenRendererRef.current) {
      offscreenRendererRef.current.render(scene, eyeCamera);
    }
  });

  // Expose global capture hook for instant Base64 extraction
  useEffect(() => {
    (window as any).__captureCompanionVision = () => {
      if (offscreenRendererRef.current) {
        return offscreenRendererRef.current.domElement.toDataURL('image/jpeg', 0.85);
      }
      return null;
    };

    (window as any).__getCompanionOffscreenCanvas = () => {
      return offscreenRendererRef.current?.domElement || null;
    };
  }, []);

  return null;
};
