import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { getAstraElevation } from '../utils/elevation';

export interface InteractiveProp {
  id: string;
  name: string;
  pos: [number, number, number];
  scale: number;
  textureUrl: string;
  isKnockedDown: boolean;
  knockDirection: [number, number]; // X, Z fall direction
  knockAngle: number; // Current fall rotation angle
  wobbleVelocity: number;
  health: number;
}

interface CardboardPropFieldProps {
  playerPos: [number, number, number];
  playerAction: string;
  onPropStruck?: (prop: InteractiveProp) => void;
  onPropInspected?: (prop: InteractiveProp) => void;
}

export const CardboardPropField: React.FC<CardboardPropFieldProps> = ({
  playerPos,
  playerAction,
  onPropStruck
}) => {
  const treeTex1 = useTexture('/props/tree1.png');
  const treeTex2 = useTexture('/props/tree2.png');
  const chestTex = useTexture('/props/chest.png');

  // Initial prop layout
  const [propsList, setPropsList] = useState<InteractiveProp[]>(() => {
    const rawSeeds = [
      { id: 'tree_1', name: 'Astral Green Pine', x: -14, z: 18, scale: 7.5, tex: '/props/tree1.png' },
      { id: 'tree_2', name: 'Blue Crystal Pine', x: 16, z: 14, scale: 8.0, tex: '/props/tree2.png' },
      { id: 'chest_1', name: 'Ancient Relic Cache', x: 6, z: 8, scale: 2.2, tex: '/props/chest.png' },
      { id: 'tree_3', name: 'Elder Astral Pine', x: -24, z: -18, scale: 9.0, tex: '/props/tree1.png' },
      { id: 'chest_2', name: 'Astral Inscription Box', x: -10, z: -12, scale: 2.2, tex: '/props/chest.png' },
      { id: 'tree_4', name: 'Cobalt Timber', x: 26, z: -22, scale: 8.2, tex: '/props/tree2.png' },
      { id: 'tree_5', name: 'Whispering Evergreen', x: -8, z: 28, scale: 7.8, tex: '/props/tree1.png' },
      { id: 'chest_3', name: 'Forgotten Grid Chest', x: 20, z: -6, scale: 2.2, tex: '/props/chest.png' }
    ];

    return rawSeeds.map(s => ({
      id: s.id,
      name: s.name,
      pos: [s.x, getAstraElevation(s.x, s.z), s.z],
      scale: s.scale,
      textureUrl: s.tex,
      isKnockedDown: false,
      knockDirection: [0, 1],
      knockAngle: 0,
      wobbleVelocity: 0,
      health: s.scale > 4 ? 2 : 1
    }));
  });

  // Reusable hit cooldown to prevent spam per attack animation
  const lastHitTimeRef = useRef<{ [id: string]: number }>({});

  useFrame((_, delta) => {
    // 1. COMBAT / STRIKE COLLISION CHECK
    const isAttacking = ['Punch_Cross', 'Punch_Jab', 'Melee_Weapon_Attack', 'Roll'].includes(playerAction);

    setPropsList(prevProps => {
      let changed = false;
      const updated = prevProps.map(prop => {
        let { isKnockedDown, knockAngle, wobbleVelocity, knockDirection, health } = prop;

        // Animate physics fall / wobble
        if (isKnockedDown) {
          if (knockAngle < Math.PI / 2.1) {
            knockAngle = Math.min(Math.PI / 2.1, knockAngle + delta * 5.5);
            changed = true;
          }
        } else if (Math.abs(wobbleVelocity) > 0.01 || Math.abs(knockAngle) > 0.01) {
          // Cardboard spring wobble oscillation
          const spring = -knockAngle * 28.0;
          wobbleVelocity += spring * delta;
          wobbleVelocity *= 0.88; // Damping
          knockAngle += wobbleVelocity * delta;
          changed = true;
        }

        // Collision detection against player
        const dx = playerPos[0] - prop.pos[0];
        const dz = playerPos[2] - prop.pos[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        const hitRadius = prop.scale > 4 ? 2.5 : 1.8;

        const now = Date.now();
        const lastHit = lastHitTimeRef.current[prop.id] || 0;

        if (dist < hitRadius && isAttacking && now - lastHit > 600) {
          lastHitTimeRef.current[prop.id] = now;
          changed = true;

          // Impact direction pointing away from player
          const dirX = -dx / (dist || 1);
          const dirZ = -dz / (dist || 1);
          knockDirection = [dirX, dirZ];

          health -= 1;
          if (health <= 0) {
            isKnockedDown = true;
          } else {
            // Strong spring wobble impulse
            wobbleVelocity = 12.0;
          }

          if (onPropStruck) {
            onPropStruck({ ...prop, isKnockedDown, health, knockDirection });
          }
        }

        return { ...prop, isKnockedDown, knockAngle, wobbleVelocity, knockDirection, health };
      });

      return changed ? updated : prevProps;
    });
  });

  return (
    <group>
      {propsList.map(prop => {
        const tex = prop.textureUrl.includes('chest') ? chestTex : (prop.textureUrl.includes('tree1') ? treeTex1 : treeTex2);
        const aspect = prop.textureUrl.includes('chest') ? 1.0 : 0.85;

        // Heading angle of the fall
        const fallYaw = Math.atan2(prop.knockDirection[0], prop.knockDirection[1]);

        return (
          <group key={prop.id} position={[prop.pos[0], prop.pos[1], prop.pos[2]]}>
            {/* Base shadow disc */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
              <circleGeometry args={[prop.scale * 0.35, 16]} />
              <meshBasicMaterial color="#000000" transparent opacity={0.35} />
            </mesh>

            {/* Cardboard Hinge Anchor */}
            <group rotation={[0, fallYaw, 0]}>
              <group rotation={[prop.knockAngle, 0, 0]}>
                {/* The Billboard Sprite Mesh */}
                <mesh position={[0, prop.scale * 0.5, 0]}>
                  <planeGeometry args={[prop.scale * aspect, prop.scale]} />
                  <meshStandardMaterial
                    map={tex}
                    transparent
                    alphaTest={0.2}
                    side={THREE.DoubleSide}
                    roughness={0.8}
                  />
                </mesh>
              </group>
            </group>
          </group>
        );
      })}
    </group>
  );
};
