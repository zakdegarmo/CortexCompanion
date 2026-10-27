import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { getAstraElevation } from '../utils/elevation';
import { CANONICAL_FAERUN_LOCATIONS, FaerunLocation } from '../services/ForgottenRealmsLore';

export type BiomeType = 'temperate' | 'tundra' | 'autumn' | 'sakura' | 'underdark' | 'arctic';
export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';

export const OAK_PROFILE_NAMES: string[] = [
  'Ancient Primeval',
  'Broad Umbrella',
  'Slender Spire',
  'Breeze East',
  'Breeze West',
  'Twin-Crest Crown',
  'Low-Bough Droop',
  'Gnarled Stoop',
  'High Reach',
  'Asymmetric Elder'
];

export interface InteractiveProp {
  id: string;
  name: string;
  type: 'x-tree' | 'monster' | 'poi' | 'chest';
  pos: [number, number, number];
  scale: number;
  nsTextureUrl: string;
  ewTextureUrl?: string;
  nsVariantIndex?: number;
  ewVariantIndex?: number;
  comboLabel?: string;
  biome: BiomeType;
  season?: SeasonType;
  tintColor?: string;
  isKnockedDown: boolean;
  knockDirection: [number, number]; // X, Z fall direction
  knockAngle: number; // Current fall rotation angle
  wobbleVelocity: number;
  health: number;
  poiData?: FaerunLocation;
}

interface CardboardPropFieldProps {
  playerPos: [number, number, number];
  playerAction: string;
  activeSeason: SeasonType;
  activeBiome: BiomeType;
  onPropStruck?: (prop: InteractiveProp) => void;
  onNearPOI?: (poi: FaerunLocation | null) => void;
}

// Seasonal tint filters
const SEASON_TINTS: Record<SeasonType, string> = {
  spring: '#eaffea',
  summer: '#ffffff',
  autumn: '#ffe0b2',
  winter: '#dbeafe'
};

export const CardboardPropField: React.FC<CardboardPropFieldProps> = ({
  playerPos,
  playerAction,
  activeSeason,
  activeBiome,
  onPropStruck,
  onNearPOI
}) => {
  // Pre-load all 10 NS and 10 EW Oak Variants + Biome Trees, Monsters & POIs
  const textures = useTexture({
    // Oak 10 NS Variants (0-9)
    oak_ns_0: '/props/trees/oak/oak_ns_0.png',
    oak_ns_1: '/props/trees/oak/oak_ns_1.png',
    oak_ns_2: '/props/trees/oak/oak_ns_2.png',
    oak_ns_3: '/props/trees/oak/oak_ns_3.png',
    oak_ns_4: '/props/trees/oak/oak_ns_4.png',
    oak_ns_5: '/props/trees/oak/oak_ns_5.png',
    oak_ns_6: '/props/trees/oak/oak_ns_6.png',
    oak_ns_7: '/props/trees/oak/oak_ns_7.png',
    oak_ns_8: '/props/trees/oak/oak_ns_8.png',
    oak_ns_9: '/props/trees/oak/oak_ns_9.png',

    // Oak 10 EW Variants (0-9)
    oak_ew_0: '/props/trees/oak/oak_ew_0.png',
    oak_ew_1: '/props/trees/oak/oak_ew_1.png',
    oak_ew_2: '/props/trees/oak/oak_ew_2.png',
    oak_ew_3: '/props/trees/oak/oak_ew_3.png',
    oak_ew_4: '/props/trees/oak/oak_ew_4.png',
    oak_ew_5: '/props/trees/oak/oak_ew_5.png',
    oak_ew_6: '/props/trees/oak/oak_ew_6.png',
    oak_ew_7: '/props/trees/oak/oak_ew_7.png',
    oak_ew_8: '/props/trees/oak/oak_ew_8.png',
    oak_ew_9: '/props/trees/oak/oak_ew_9.png',

    // Other Biomes
    tree_pine_ns: '/props/trees/tree_astral_pine_ns.png',
    tree_pine_ew: '/props/trees/tree_astral_pine_ew.png',
    tree_crystal_ns: '/props/trees/tree_crystal_pine_ns.png',
    tree_crystal_ew: '/props/trees/tree_crystal_pine_ew.png',
    tree_cherry_ns: '/props/trees/tree_cherry_bloom_ns.png',
    tree_cherry_ew: '/props/trees/tree_cherry_bloom_ew.png',
    tree_spore_ns: '/props/trees/tree_underdark_spore_ns.png',
    tree_spore_ew: '/props/trees/tree_underdark_spore_ew.png',

    // Monsters & POIs
    monster_golem: '/props/monsters/monster_golem_sentry.png',
    monster_spider: '/props/monsters/monster_astral_spider.png',
    monster_skeleton: '/props/monsters/monster_skeleton_guard.png',
    poi_coffer: '/props/poi/poi_ancient_coffer.png'
  });

  // Generate an intentional grove of Primal Oaks demonstrating the 10x10=100 matrix
  const [propsList, setPropsList] = useState<InteractiveProp[]>(() => {
    const list: InteractiveProp[] = [];

    // 1. Procedural 10 NS x 10 EW Primal Oak Forest Grove (100 Combinations)
    // We place 16 distinct oak trees in the immediate landscape, each picking an exact (NS_i x EW_j) combination
    const oakCoords = [
      { x: -14, z: 12 }, { x: -8, z: 18 }, { x: -22, z: 16 }, { x: -18, z: 24 },
      { x: 14, z: 10 }, { x: 22, z: 14 }, { x: 18, z: 22 }, { x: 26, z: 8 },
      { x: -16, z: -14 }, { x: -24, z: -8 }, { x: -12, z: -22 }, { x: -28, z: -20 },
      { x: 16, z: -12 }, { x: 24, z: -16 }, { x: 10, z: -20 }, { x: 20, z: -26 }
    ];

    oakCoords.forEach((coord, idx) => {
      // Deterministically pick NS variant (0-9) and EW variant (0-9)
      const nsIdx = (idx * 3 + 1) % 10;
      const ewIdx = (idx * 7 + 2) % 10;
      const comboNum = nsIdx * 10 + ewIdx + 1; // 1 to 100
      const nsName = OAK_PROFILE_NAMES[nsIdx];
      const ewName = OAK_PROFILE_NAMES[ewIdx];

      list.push({
        id: `oak_tree_${idx + 1}`,
        name: `Primal Oak #${comboNum} [${nsName} × ${ewName}]`,
        type: 'x-tree',
        pos: [coord.x, getAstraElevation(coord.x, coord.z), coord.z],
        scale: 7.6 + (idx % 4) * 0.45,
        nsTextureUrl: `oak_ns_${nsIdx}`,
        ewTextureUrl: `oak_ew_${ewIdx}`,
        nsVariantIndex: nsIdx,
        ewVariantIndex: ewIdx,
        comboLabel: `NS_${nsIdx} × EW_${ewIdx} (${nsName} × ${ewName})`,
        biome: 'temperate',
        isKnockedDown: false,
        knockDirection: [0, 1],
        knockAngle: 0,
        wobbleVelocity: 0,
        health: 2
      });
    });

    // 2. Additional Biome Landmark Trees
    list.push({
      id: 'pine_tree_1',
      name: 'Azure Astral Pine',
      type: 'x-tree',
      pos: [28, getAstraElevation(28, 24), 24],
      scale: 8.5,
      nsTextureUrl: 'tree_crystal_ns',
      ewTextureUrl: 'tree_pine_ew',
      biome: 'tundra',
      isKnockedDown: false,
      knockDirection: [0, 1],
      knockAngle: 0,
      wobbleVelocity: 0,
      health: 2
    });
    list.push({
      id: 'cherry_tree_1',
      name: 'Myth Drannor Sakura',
      type: 'x-tree',
      pos: [-6, getAstraElevation(-6, -12), -12],
      scale: 7.2,
      nsTextureUrl: 'tree_cherry_ns',
      ewTextureUrl: 'tree_cherry_ew',
      biome: 'sakura',
      isKnockedDown: false,
      knockDirection: [0, 1],
      knockAngle: 0,
      wobbleVelocity: 0,
      health: 2
    });
    list.push({
      id: 'spore_tree_1',
      name: 'Underdark Spore Mushroom',
      type: 'x-tree',
      pos: [12, getAstraElevation(12, -28), -28],
      scale: 6.5,
      nsTextureUrl: 'tree_spore_ns',
      ewTextureUrl: 'tree_spore_ew',
      biome: 'underdark',
      isKnockedDown: false,
      knockDirection: [0, 1],
      knockAngle: 0,
      wobbleVelocity: 0,
      health: 2
    });

    // 3. Monsters & Guardians
    list.push({
      id: 'mob_golem_1',
      name: 'Runic Golem Sentry',
      type: 'monster',
      pos: [-10, getAstraElevation(-10, 4), 4],
      scale: 3.4,
      nsTextureUrl: 'monster_golem',
      biome: 'temperate',
      isKnockedDown: false,
      knockDirection: [0, 1],
      knockAngle: 0,
      wobbleVelocity: 0,
      health: 3
    });
    list.push({
      id: 'mob_spider_1',
      name: 'Astral Phase Spider',
      type: 'monster',
      pos: [8, getAstraElevation(8, 22), 22],
      scale: 2.4,
      nsTextureUrl: 'monster_spider',
      biome: 'tundra',
      isKnockedDown: false,
      knockDirection: [0, 1],
      knockAngle: 0,
      wobbleVelocity: 0,
      health: 1
    });
    list.push({
      id: 'mob_skel_1',
      name: 'Netherese Skeleton Guard',
      type: 'monster',
      pos: [-4, getAstraElevation(-4, -20), -20],
      scale: 2.8,
      nsTextureUrl: 'monster_skeleton',
      biome: 'underdark',
      isKnockedDown: false,
      knockDirection: [0, 1],
      knockAngle: 0,
      wobbleVelocity: 0,
      health: 2
    });

    // 4. Canonical Forgotten Realms POI Waystones
    CANONICAL_FAERUN_LOCATIONS.forEach(loc => {
      list.push({
        id: loc.id,
        name: loc.name,
        type: 'poi',
        pos: [loc.worldCoords[0], getAstraElevation(loc.worldCoords[0], loc.worldCoords[1]), loc.worldCoords[1]],
        scale: 2.6,
        nsTextureUrl: 'poi_coffer',
        biome: loc.biome,
        poiData: loc,
        isKnockedDown: false,
        knockDirection: [0, 1],
        knockAngle: 0,
        wobbleVelocity: 0,
        health: 999
      });
    });

    return list;
  });

  const lastHitTimeRef = useRef<{ [id: string]: number }>({});
  const closestPoiRef = useRef<FaerunLocation | null>(null);

  useFrame((_, delta) => {
    const isAttacking = ['Punch_Cross', 'Punch_Jab', 'Melee_Weapon_Attack', 'Roll'].includes(playerAction);

    // Check proximity to Forgotten Realms POI Waystones
    let nearestPOI: FaerunLocation | null = null;
    let minPoiDist = 4.5;

    CANONICAL_FAERUN_LOCATIONS.forEach(loc => {
      const d = Math.hypot(playerPos[0] - loc.worldCoords[0], playerPos[2] - loc.worldCoords[1]);
      if (d < minPoiDist) {
        nearestPOI = loc;
        minPoiDist = d;
      }
    });

    if (nearestPOI !== closestPoiRef.current) {
      closestPoiRef.current = nearestPOI;
      if (onNearPOI) onNearPOI(nearestPOI);
    }

    // Cardboard Cutout Physics Simulation
    setPropsList(prevProps => {
      let changed = false;
      const updated = prevProps.map(prop => {
        let { isKnockedDown, knockAngle, wobbleVelocity, knockDirection, health } = prop;

        if (isKnockedDown) {
          if (knockAngle < Math.PI / 2.1) {
            knockAngle = Math.min(Math.PI / 2.1, knockAngle + delta * 5.5);
            changed = true;
          }
        } else if (Math.abs(wobbleVelocity) > 0.01 || Math.abs(knockAngle) > 0.01) {
          const spring = -knockAngle * 28.0;
          wobbleVelocity += spring * delta;
          wobbleVelocity *= 0.88;
          knockAngle += wobbleVelocity * delta;
          changed = true;
        }

        // Collision detection against player attacks
        if (prop.health < 900) {
          const dx = playerPos[0] - prop.pos[0];
          const dz = playerPos[2] - prop.pos[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          const hitRadius = prop.scale > 4 ? 2.6 : 1.8;

          const now = Date.now();
          const lastHit = lastHitTimeRef.current[prop.id] || 0;

          if (dist < hitRadius && isAttacking && now - lastHit > 600) {
            lastHitTimeRef.current[prop.id] = now;
            changed = true;

            const dirX = -dx / (dist || 1);
            const dirZ = -dz / (dist || 1);
            knockDirection = [dirX, dirZ];

            health -= 1;
            if (health <= 0) {
              isKnockedDown = true;
            } else {
              wobbleVelocity = 13.0;
            }

            if (onPropStruck) {
              onPropStruck({ ...prop, isKnockedDown, health, knockDirection });
            }
          }
        }

        return { ...prop, isKnockedDown, knockAngle, wobbleVelocity, knockDirection, health };
      });

      return changed ? updated : prevProps;
    });
  });

  const seasonalTint = SEASON_TINTS[activeSeason] || '#ffffff';

  return (
    <group>
      {propsList.map(prop => {
        const fallYaw = Math.atan2(prop.knockDirection[0], prop.knockDirection[1]);
        const isXTree = prop.type === 'x-tree';
        const isPOI = prop.type === 'poi';

        const nsTex = (textures as Record<string, THREE.Texture>)[prop.nsTextureUrl] || textures.oak_ns_0;
        const ewTex = prop.ewTextureUrl ? ((textures as Record<string, THREE.Texture>)[prop.ewTextureUrl] || textures.oak_ew_0) : nsTex;

        return (
          <group key={prop.id} position={[prop.pos[0], prop.pos[1], prop.pos[2]]}>
            {/* Base Contact Shadow Disc */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
              <circleGeometry args={[prop.scale * (isXTree ? 0.38 : 0.28), 16]} />
              <meshBasicMaterial color="#000000" transparent opacity={0.35} />
            </mesh>

            {/* Glowing Runic Aura for Forgotten Realms Waystones */}
            {isPOI && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
                <ringGeometry args={[prop.scale * 0.4, prop.scale * 0.55, 32]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} side={THREE.DoubleSide} />
              </mesh>
            )}

            {/* Cardboard Hinge Anchor */}
            <group rotation={[0, fallYaw, 0]}>
              <group rotation={[prop.knockAngle, 0, 0]}>
                {isXTree ? (
                  // DOUBLE-BILLBOARD ("X-TREE"): Two perpendicular planes at 45 deg sharing root center
                  <group>
                    {/* Plane 1: NS Alignment (+45 deg / PI/4) */}
                    <mesh position={[0, prop.scale * 0.5, 0]} rotation={[0, Math.PI / 4, 0]}>
                      <planeGeometry args={[prop.scale * 0.88, prop.scale]} />
                      <meshStandardMaterial
                        map={nsTex}
                        transparent
                        alphaTest={0.25}
                        side={THREE.DoubleSide}
                        color={seasonalTint}
                        roughness={0.7}
                      />
                    </mesh>

                    {/* Plane 2: EW Alignment (-45 deg / -PI/4) - Forms 90 deg volumetric cross */}
                    <mesh position={[0, prop.scale * 0.5, 0]} rotation={[0, -Math.PI / 4, 0]}>
                      <planeGeometry args={[prop.scale * 0.88, prop.scale]} />
                      <meshStandardMaterial
                        map={ewTex}
                        transparent
                        alphaTest={0.25}
                        side={THREE.DoubleSide}
                        color={seasonalTint}
                        roughness={0.7}
                      />
                    </mesh>
                  </group>
                ) : (
                  // Single Billboard for Monsters & POI Waystones
                  <mesh position={[0, prop.scale * 0.5, 0]}>
                    <planeGeometry args={[prop.scale * (isPOI ? 1.0 : 0.9), prop.scale]} />
                    <meshStandardMaterial
                      map={nsTex}
                      transparent
                      alphaTest={0.25}
                      side={THREE.DoubleSide}
                      color={isPOI ? '#ffffff' : seasonalTint}
                      roughness={0.65}
                    />
                  </mesh>
                )}
              </group>
            </group>
          </group>
        );
      })}
    </group>
  );
};
