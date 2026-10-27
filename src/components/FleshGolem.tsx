import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { AnimationName } from '../types';

interface FleshGolemProps {
  modelPath: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  currentAnimation: AnimationName;
  skinColor?: string;
  isCompanion?: boolean;
}

export const FleshGolem: React.FC<FleshGolemProps> = ({
  modelPath,
  position,
  rotation = [0, 0, 0],
  currentAnimation,
  skinColor = '#d97706',
  isCompanion = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath);

  // Deep clone with SkeletonUtils
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene) as THREE.Group;

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh || (child as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;

        const name = child.name.toLowerCase();

        if (name.includes('face')) {
          mesh.visible = false;
        } else {
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(skinColor),
            roughness: 0.5,
            metalness: 0.08,
            emissive: new THREE.Color(skinColor),
            emissiveIntensity: isCompanion ? 0.25 : 0.06,
            side: THREE.DoubleSide
          });
        }
      }
    });

    return clone;
  }, [scene, skinColor, isCompanion]);

  // Strip root Z-offset from translation tracks on the animation clips so animations pivot in place
  const cleanedAnimations = useMemo(() => {
    return animations.map(clip => {
      const clonedClip = clip.clone();
      clonedClip.tracks.forEach(track => {
        // Find Hips translation track
        if (track.name.toLowerCase().includes('hips.position')) {
          const values = track.values;
          // values array is [x0, y0, z0, x1, y1, z1, ...]
          for (let i = 2; i < values.length; i += 3) {
            // Subtract the ~1.18m baked offset from Z values
            values[i] -= 1.18;
          }
        }
      });
      return clonedClip;
    });
  }, [animations]);

  const { actions } = useAnimations(cleanedAnimations, clonedScene);
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    if (!actions) return;
    const nextAction = actions[currentAnimation];
    if (!nextAction) {
      console.warn(`Action "${currentAnimation}" not found in model.`);
      return;
    }

    const prevAction = activeActionRef.current;
    if (prevAction === nextAction) return;

    nextAction.reset();

    const isOneShot = [
      'Jump_Start', 'Jump_Land', 'Roll', 'Roll_RM', 
      'Punch_Cross', 'Punch_Jab', 'Melee_Weapon_Attack',
      'Pistol_Shoot', 'Spell_Simple_Shoot', 'Death01', 'Hit_Chest', 'Hit_Head', 'Interact'
    ].includes(currentAnimation);

    if (isOneShot) {
      nextAction.setLoop(THREE.LoopOnce, 1);
      nextAction.clampWhenFinished = true;
    } else {
      nextAction.setLoop(THREE.LoopRepeat, Infinity);
    }

    if (prevAction) {
      prevAction.fadeOut(0.2);
    }
    nextAction.fadeIn(0.2).play();
    activeActionRef.current = nextAction;

  }, [currentAnimation, actions]);

  // Direct transform updates:
  // Root position at world coordinates, clean Y-axis rotation
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2]);
      groupRef.current.rotation.set(0, rotation[1], 0);
    }
  });

  return (
    <group 
      ref={groupRef} 
      name={isCompanion ? "COMPANION_ACTOR_GROUP" : "PLAYER_ACTOR_GROUP"}
      position={position} 
      scale={1.8} 
      dispose={null}
    >
      <primitive object={clonedScene} />

      {/* Floating Name Beacon */}
      {isCompanion && (
        <group position={[0, 1.8, 0]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
          <pointLight color="#38bdf8" intensity={0.8} distance={4} />
        </group>
      )}
    </group>
  );
};
