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
  speechText?: string | null;
}

export const FleshGolem: React.FC<FleshGolemProps> = ({
  modelPath,
  position,
  rotation = [0, 0, 0],
  currentAnimation,
  skinColor = '#d97706',
  isCompanion = false,
  speechText = null,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath);

  // CRITICAL: Clone armature with SkeletonUtils to retain bone weights
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

  const { actions } = useAnimations(animations, clonedScene);
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

  // Direct transform update
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2]);
      groupRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={1.8} dispose={null}>
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

      {/* In-world Speech Bubble Pill */}
      {speechText && isCompanion && (
        <group position={[0, 2.2, 0]}>
          <mesh>
            <planeGeometry args={[Math.min(speechText.length * 0.1 + 0.6, 4.0), 0.55]} />
            <meshBasicMaterial color="#0f172a" transparent opacity={0.88} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
};
