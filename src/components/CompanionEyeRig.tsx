import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CompanionEyeRigProps {
  companionPos: [number, number, number];
  companionRot: [number, number, number];
}

export const CompanionEyeRig: React.FC<CompanionEyeRigProps> = ({
  companionPos,
  companionRot,
}) => {
  // Embodied 1st-person camera with 80° natural field of view
  const eyeCamera = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(80, 512 / 384, 0.1, 600);
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
    // Exact look heading
    const heading = companionRot[1];

    // Eye coordinates: companion head is at Y = companionPos[1] + 1.85m.
    // We place the camera exactly at the eye center:
    const eyeX = companionPos[0] + Math.sin(heading) * 0.25;
    const eyeY = companionPos[1] + 1.85;
    const eyeZ = companionPos[2] + Math.cos(heading) * 0.25;

    eyeCamera.position.set(eyeX, eyeY, eyeZ);

    // Gaze forward into world
    const targetX = eyeX + Math.sin(heading) * 20.0;
    const targetZ = eyeZ + Math.cos(heading) * 20.0;
    const targetY = eyeY - 0.1;

    eyeCamera.lookAt(targetX, targetY, targetZ);

    if (offscreenRendererRef.current) {
      // CRITICAL: Hide the companion's own mesh from its own first-person render pass!
      const compMesh = scene.getObjectByName('COMPANION_ACTOR_GROUP');
      const wasVisible = compMesh ? compMesh.visible : true;
      if (compMesh) {
        compMesh.visible = false;
      }

      // Render the true first-person pass
      offscreenRendererRef.current.render(scene, eyeCamera);

      // Restore visibility for the main player camera pass
      if (compMesh) {
        compMesh.visible = wasVisible;
      }
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
