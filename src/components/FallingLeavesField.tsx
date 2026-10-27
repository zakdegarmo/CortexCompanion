import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { getAstraElevation } from '../utils/elevation';
import { SeasonType, BiomeType } from './CardboardPropField';

export interface GroundLeafResource {
  id: string;
  name: string;
  biome: BiomeType;
  pos: [number, number, number];
  textureKey: string;
  collected: boolean;
  scale: number;
}

interface FallingLeavesFieldProps {
  playerPos: [number, number, number];
  activeSeason: SeasonType;
  activeBiome: BiomeType;
  onGatherLeaf: (leaf: GroundLeafResource) => void;
  onNearLeafPrompt: (leaf: GroundLeafResource | null) => void;
}

const LEAF_NAMES: Record<BiomeType, string> = {
  temperate: 'Emerald Oak Leaf',
  tundra: 'Astral Pine Needle',
  autumn: 'Golden Amber Leaf',
  sakura: 'Myth Drannor Petal',
  underdark: 'Luminescent Spore Shard',
  arctic: 'Glacial Frost Crystal'
};

export const FallingLeavesField: React.FC<FallingLeavesFieldProps> = ({
  playerPos,
  activeSeason,
  activeBiome,
  onGatherLeaf,
  onNearLeafPrompt
}) => {
  const textures = useTexture({
    oak: '/props/resources/leaf_oak.png',
    pine: '/props/resources/leaf_pine.png',
    autumn: '/props/resources/leaf_autumn.png',
    cherry: '/props/resources/leaf_cherry.png',
    spore: '/props/resources/leaf_spore.png',
    winter: '/props/resources/leaf_winter.png'
  });

  // 1. Floating Wind Particles (Instanced Mesh Simulation)
  const PARTICLE_COUNT = 45;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const instancedRef = useRef<THREE.InstancedMesh>(null);

  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x: (Math.random() - 0.5) * 60,
      y: 4.0 + Math.random() * 8.0,
      z: (Math.random() - 0.5) * 60,
      speedX: 0.8 + Math.random() * 1.5,
      speedY: 0.6 + Math.random() * 0.8,
      speedZ: 0.4 + Math.random() * 1.2,
      rotX: Math.random() * Math.PI,
      rotY: Math.random() * Math.PI,
      rotSpeed: 1.5 + Math.random() * 2.5,
      scale: 0.35 + Math.random() * 0.25
    }));
  }, []);

  // 2. Gatherable Ground Leaves placed around the groves
  const [groundLeaves, setGroundLeaves] = useState<GroundLeafResource[]>(() => {
    const list: GroundLeafResource[] = [];
    const seedPositions = [
      { x: -12, z: 10, biome: 'temperate' as BiomeType, tex: 'oak' },
      { x: -6, z: 16, biome: 'temperate' as BiomeType, tex: 'oak' },
      { x: 18, z: 12, biome: 'temperate' as BiomeType, tex: 'oak' },
      { x: 24, z: 22, biome: 'tundra' as BiomeType, tex: 'pine' },
      { x: -4, z: -10, biome: 'sakura' as BiomeType, tex: 'cherry' },
      { x: 10, z: -26, biome: 'underdark' as BiomeType, tex: 'spore' },
      { x: 22, z: -14, biome: 'autumn' as BiomeType, tex: 'autumn' },
      { x: -8, z: 24, biome: 'arctic' as BiomeType, tex: 'winter' }
    ];

    seedPositions.forEach((s, idx) => {
      list.push({
        id: `leaf_${idx + 1}`,
        name: LEAF_NAMES[s.biome],
        biome: s.biome,
        pos: [s.x, getAstraElevation(s.x, s.z) + 0.25, s.z],
        textureKey: s.tex,
        collected: false,
        scale: 0.95
      });
    });

    return list;
  });

  const nearestLeafRef = useRef<GroundLeafResource | null>(null);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // 1. Animate Wind Drift Particles
    if (instancedRef.current) {
      particles.forEach((p, i) => {
        // Spiral wind drift
        p.x += Math.sin(time * 0.8 + p.rotX) * 0.05 + p.speedX * delta;
        p.z += Math.cos(time * 0.8 + p.rotY) * 0.05 + p.speedZ * delta;
        p.y -= p.speedY * delta;

        // Reset if below ground
        const groundY = getAstraElevation(playerPos[0] + p.x, playerPos[2] + p.z);
        if (p.y < groundY + 0.2) {
          p.x = (Math.random() - 0.5) * 50;
          p.z = (Math.random() - 0.5) * 50;
          p.y = 8.0 + Math.random() * 5.0;
        }

        dummy.position.set(playerPos[0] + p.x, p.y, playerPos[2] + p.z);
        dummy.rotation.set(time * p.rotSpeed + p.rotX, time * p.rotSpeed * 0.7, Math.sin(time) * 0.5);
        dummy.scale.set(p.scale, p.scale, p.scale);
        dummy.updateMatrix();

        instancedRef.current?.setMatrixAt(i, dummy.matrix);
      });
      instancedRef.current.instanceMatrix.needsUpdate = true;
    }

    // 2. Proximity Detection for Ground Leaves
    let nearest: GroundLeafResource | null = null;
    let minDist = 2.4;

    groundLeaves.forEach(leaf => {
      if (!leaf.collected) {
        const d = Math.hypot(playerPos[0] - leaf.pos[0], playerPos[2] - leaf.pos[2]);
        if (d < minDist) {
          nearest = leaf;
          minDist = d;
        }
      }
    });

    if (nearest !== nearestLeafRef.current) {
      nearestLeafRef.current = nearest;
      onNearLeafPrompt(nearest);
    }
  });

  // Pick active leaf texture based on current biome
  const activeTexture = (textures as Record<string, THREE.Texture>)[
    activeBiome === 'temperate' ? 'oak' :
    activeBiome === 'tundra' ? 'pine' :
    activeBiome === 'autumn' ? 'autumn' :
    activeBiome === 'sakura' ? 'cherry' :
    activeBiome === 'underdark' ? 'spore' : 'winter'
  ] || textures.oak;

  return (
    <group>
      {/* 1. Floating Wind Particles */}
      <instancedMesh ref={instancedRef} args={[undefined, undefined, PARTICLE_COUNT]}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial map={activeTexture} transparent alphaTest={0.2} side={THREE.DoubleSide} />
      </instancedMesh>

      {/* 2. Interactive Ground Leaves */}
      {groundLeaves.map(leaf => {
        if (leaf.collected) return null;
        const tex = (textures as Record<string, THREE.Texture>)[leaf.textureKey] || textures.oak;

        return (
          <group key={leaf.id} position={leaf.pos}>
            {/* Soft glowing beacon ring on ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
              <ringGeometry args={[0.35, 0.5, 24]} />
              <meshBasicMaterial color="#4ade80" transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>

            {/* Billboard leaf pickup sprite */}
            <mesh position={[0, 0.25, 0]} rotation={[0, 0, 0.2]}>
              <planeGeometry args={[leaf.scale * 0.8, leaf.scale * 0.8]} />
              <meshStandardMaterial map={tex} transparent alphaTest={0.2} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
