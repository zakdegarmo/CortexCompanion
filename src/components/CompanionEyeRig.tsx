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
  // Embodied 1st-person camera with 80° natural human field-of-view
  const eyeCamera = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(80, 512 / 384, 0.05, 500);
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
    const lookAngle = companionRot[1];

    // The mannequin eye socket height is at ~1.78m.
    // We nudge the camera 0.35m forward along its facing heading so the lens sits
    // directly in front of the skull/face surface, completely eliminating any back-of-head clipping!
    const forwardOffset = 0.35;
    const eyeX = companionPos[0] + Math.sin(lookAngle) * forwardOffset;
    const eyeY = companionPos[1] + 1.78;
    const eyeZ = companionPos[2] + Math.cos(lookAngle) * forwardOffset;

    eyeCamera.position.set(eyeX, eyeY, eyeZ);

    // Look target directly forward along the companion's line of sight
    const lookDist = 20.0;
    const targetX = eyeX + Math.sin(lookAngle) * lookDist;
    const targetZ = eyeZ + Math.cos(lookAngle) * lookDist;
    const targetY = eyeY - 0.1; // slight natural level gaze

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
