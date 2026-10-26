import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface CyclotropeProps {
  anchorPos: [number, number, number];
}

export const AstraCyclotrope: React.FC<CyclotropeProps> = ({ anchorPos }) => {
  const skyRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const creaturesRef = useRef<THREE.Mesh>(null);

  const [skyTex, cloudsTex, creaturesTex] = useTexture([
    '/textures/parallax_sky_layer1.png',
    '/textures/parallax_clouds_layer2.png',
    '/textures/parallax_creatures_layer3.png'
  ]);

  useMemo(() => {
    skyTex.wrapS = skyTex.wrapT = THREE.RepeatWrapping;
    skyTex.repeat.set(4, 1);
    skyTex.colorSpace = THREE.SRGBColorSpace;

    cloudsTex.wrapS = cloudsTex.wrapT = THREE.RepeatWrapping;
    cloudsTex.repeat.set(3, 1);

    creaturesTex.wrapS = creaturesTex.wrapT = THREE.RepeatWrapping;
    creaturesTex.repeat.set(3, 1);
  }, [skyTex, cloudsTex, creaturesTex]);

  useFrame((_, delta) => {
    // Parallax cyclotropic rotation
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.008;
    }
    if (creaturesRef.current) {
      creaturesRef.current.rotation.y += delta * 0.016;
    }
  });

  return (
    <group position={[anchorPos[0], 0, anchorPos[2]]}>
      {/* Outer Ring: Deep Astral Sky Layer (Radius: 400) */}
      <mesh ref={skyRef} position={[0, 45, 0]}>
        <cylinderGeometry args={[400, 400, 240, 64, 1, true]} />
        <meshBasicMaterial
          map={skyTex}
          side={THREE.BackSide}
          transparent
          opacity={0.95}
          depthWrite={false}
        />
      </mesh>

      {/* Middle Ring: Drifting Concentric Clouds (Radius: 320) */}
      <mesh ref={cloudsRef} position={[0, 35, 0]}>
        <cylinderGeometry args={[320, 320, 180, 64, 1, true]} />
        <meshBasicMaterial
          map={cloudsTex}
          side={THREE.BackSide}
          transparent
          opacity={0.88}
          alphaTest={0.08}
          depthWrite={false}
        />
      </mesh>

      {/* Inner Ring: Floating Mythic Astral Creatures (Radius: 260) */}
      <mesh ref={creaturesRef} position={[0, 28, 0]}>
        <cylinderGeometry args={[260, 260, 140, 64, 1, true]} />
        <meshBasicMaterial
          map={creaturesTex}
          side={THREE.BackSide}
          transparent
          opacity={0.92}
          alphaTest={0.12}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
