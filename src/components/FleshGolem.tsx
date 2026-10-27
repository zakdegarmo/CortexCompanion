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
  const visualPivotRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath);

  const targetQuat = useMemo(() => new THREE.Quaternion(), []);

  // Clone armature with SkeletonUtils to retain bone weights
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene) as THREE.Group;

    // Center the model's root bounds so pivoting happens at true center
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

  // Pivot orientation cleanly at exact center
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2]);
    }
    if (visualPivotRef.current) {
      targetQuat.setFromEuler(new THREE.Euler(0, rotation[1], 0, 'YXZ'));
      visualPivotRef.current.quaternion.slerp(targetQuat, Math.min(delta * 18, 1));
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
      {/* Visual pivot anchored at (0, 0, 0) */}
      <group ref={visualPivotRef}>
        <primitive object={clonedScene} />
      </group>

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
