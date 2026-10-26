import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CompanionEyeRigProps {
  companionPos: [number, number, number];
  companionRot: [number, number, number];
  onCanvasCapture?: (dataUrl: string) => void;
}

export const CompanionEyeRig: React.FC<CompanionEyeRigProps> = ({
  companionPos,
  companionRot,
}) => {
  const eyeCamera = useMemo(() => {
    // 85° field of view, near plane starts at 0.05m to completely exclude head surface
    const cam = new THREE.PerspectiveCamera(85, 512 / 384, 0.05, 600);
    return cam;
  }, []);

  const offscreenRendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 288;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    offscreenRendererRef.current = renderer;

    return () => {
      renderer.dispose();
    };
  }, []);

  useFrame(({ scene }) => {
    // True line of sight angle: in our system, heading angle is companionRot[1]
    const heading = companionRot[1];

    // Companion scale is 1.8x, so head height is at ~1.95m.
    // Move 0.65m forward along the true facing vector so the ocular lens is
    // strictly in FRONT of the blue companion's head and body.
    const forwardDistance = 0.65;
    const eyeX = companionPos[0] + Math.sin(heading) * forwardDistance;
    const eyeY = companionPos[1] + 1.95;
    const eyeZ = companionPos[2] + Math.cos(heading) * forwardDistance;

    eyeCamera.position.set(eyeX, eyeY, eyeZ);

    // Look straight forward into the horizon
    const lookDist = 30.0;
    const targetX = eyeX + Math.sin(heading) * lookDist;
    const targetZ = eyeZ + Math.cos(heading) * lookDist;
    const targetY = eyeY - 0.1;

    eyeCamera.lookAt(targetX, targetY, targetZ);

    if (offscreenRendererRef.current) {
      offscreenRendererRef.current.render(scene, eyeCamera);
    }
  });

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
