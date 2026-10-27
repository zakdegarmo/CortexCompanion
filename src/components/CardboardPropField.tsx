import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { getAstraElevation } from '../utils/elevation';
import { CANONICAL_FAERUN_LOCATIONS, FaerunLocation } from '../services/ForgottenRealmsLore';

export type BiomeType = 'temperate' | 'tundra' | 'autumn' | 'sakura' | 'underdark' | 'arctic';
export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';

export interface InteractiveProp {
  id: string;
  name: string;
  type: 'x-tree' | 'monster' | 'poi' | 'chest';
  pos: [number, number, number];
  scale: number;
  nsTextureUrl: string;
  ewTextureUrl?: string; // Present for x-trees
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
  // Pre-load all extracted tree, monster, and POI textures
  const textures = useTexture({
    // Trees NS
    tree_temperate_ns: '/props/trees/tree_temperate_oak_ns.png',
    tree_apple_ns: '/props/trees/tree_apple_green_ns.png',
    tree_autumn_ns: '/props/trees/tree_autumn_gold_ns.png',
    tree_cherry_ns: '/props/trees/tree_cherry_bloom_ns.png',
    tree_pine_ns: '/props/trees/tree_astral_pine_ns.png',
    tree_crystal_ns: '/props/trees/tree_crystal_pine_ns.png',
    tree_elm_ns: '/props/trees/tree_golden_elm_ns.png',
    tree_spore_ns: '/props/trees/tree_underdark_spore_ns.png',
    tree_winter_ns: '/props/trees/tree_winter_bare_ns.png',
    tree_spring_ns: '/props/trees/tree_spring_bloom_ns.png',

    // Trees EW
    tree_temperate_ew: '/props/trees/tree_temperate_oak_ew.png',
    tree_apple_ew: '/props/trees/tree_apple_fruit_ew.png',
    tree_autumn_ew: '/props/trees/tree_autumn_orange_ew.png',
    tree_cherry_ew: '/props/trees/tree_cherry_bloom_ew.png',
    tree_pine_ew: '/props/trees/tree_astral_pine_ew.png',
    tree_crystal_ew: '/props/trees/tree_crystal_pine_ew.png',
    tree_elm_ew: '/props/trees/tree_golden_elm_ew.png',
    tree_spore_ew: '/props/trees/tree_underdark_spore_ew.png',
    tree_winter_ew: '/props/trees/tree_winter_frost_ew.png',
    tree_summer_ew: '/props/trees/tree_summer_green_ew.png',

    // Monsters
    monster_golem: '/props/monsters/monster_golem_sentry.png',
    monster_spider: '/props/monsters/monster_astral_spider.png',
    monster_skeleton: '/props/monsters/monster_skeleton_guard.png',

    // POIs & Chests
    poi_coffer: '/props/poi/poi_ancient_coffer.png',
    chest: '/props/chest.png'
  });

  // Procedurally generate X-Tree forest, monsters, and Forgotten Realms POIs
  const [propsList, setPropsList] = useState<InteractiveProp[]>(() => {
    const list: InteractiveProp[] = [];

    // 1. Procedural X-Tree Forest with 10 NS x 10 EW Combinations
    const treeSeeds = [
      { id: 'xtree_1', name: 'Primal High Forest Oak', x: -16, z: 14, scale: 7.8, ns: 'tree_temperate_ns', ew: 'tree_temperate_ew', biome: 'temperate' as BiomeType },
      { id: 'xtree_2', name: 'Astral Azure Pine', x: 16, z: 16, scale: 8.4, ns: 'tree_crystal_ns', ew: 'tree_pine_ew', biome: 'tundra' as BiomeType },
      { id: 'xtree_3', name: 'Myth Drannor Sakura', x: -8, z: -10, scale: 7.2, ns: 'tree_cherry_ns', ew: 'tree_cherry_ew', biome: 'sakura' as BiomeType },
      { id: 'xtree_4', name: 'Neverwinter Amber Elm', x: 24, z: -18, scale: 7.6, ns: 'tree_elm_ns', ew: 'tree_autumn_ew', biome: 'autumn' as BiomeType },
      { id: 'xtree_5', name: 'Underdark Phosphor Cap', x: 14, z: -24, scale: 6.8, ns: 'tree_spore_ns', ew: 'tree_spore_ew', biome: 'underdark' as BiomeType },
      { id: 'xtree_6', name: 'Icewind Glacial Birch', x: -10, z: 26, scale: 8.0, ns: 'tree_winter_ns', ew: 'tree_winter_ew', biome: 'arctic' as BiomeType },
      { id: 'xtree_7', name: 'Candlekeep Orchard Apple', x: -26, z: -16, scale: 7.0, ns: 'tree_apple_ns', ew: 'tree_apple_ew', biome: 'temperate' as BiomeType },
      { id: 'xtree_8', name: 'Silvanus Spring Blossom', x: -22, z: 8, scale: 7.5, ns: 'tree_spring_ns', ew: 'tree_summer_ew', biome: 'sakura' as BiomeType },
      { id: 'xtree_9', name: 'Waterdhavian Goldwood', x: 20, z: 8, scale: 8.2, ns: 'tree_autumn_ns', ew: 'tree_elm_ew', biome: 'autumn' as BiomeType },
      { id: 'xtree_10', name: 'Spine of the World Evergreen', x: 28, z: 22, scale: 8.8, ns: 'tree_pine_ns', ew: 'tree_crystal_ew', biome: 'tundra' as BiomeType },
      { id: 'xtree_11', name: 'Mithral Deep Spore Shroom', x: 8, z: -16, scale: 6.2, ns: 'tree_spore_ns', ew: 'tree_spore_ew', biome: 'underdark' as BiomeType },
      { id: 'xtree_12', name: 'Verdant Sylvan Canopy', x: -4, z: -28, scale: 8.5, ns: 'tree_temperate_ns', ew: 'tree_summer_ew', biome: 'temperate' as BiomeType }
    ];

    treeSeeds.forEach(t => {
      list.push({
        id: t.id,
        name: t.name,
        type: 'x-tree',
        pos: [t.x, getAstraElevation(t.x, t.z), t.z],
        scale: t.scale,
        nsTextureUrl: t.ns,
        ewTextureUrl: t.ew,
        biome: t.biome,
        isKnockedDown: false,
        knockDirection: [0, 1],
        knockAngle: 0,
        wobbleVelocity: 0,
        health: 2
      });
    });

    // 2. Monsters & Guardians
    list.push({
      id: 'mob_golem_1',
      name: 'Runic Golem Sentry',
      type: 'monster',
      pos: [-12, getAstraElevation(-12, 4), 4],
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
      pos: [10, getAstraElevation(10, 24), 24],
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
      pos: [-6, getAstraElevation(-6, -18), -18],
      scale: 2.8,
      nsTextureUrl: 'monster_skeleton',
      biome: 'underdark',
      isKnockedDown: false,
      knockDirection: [0, 1],
      knockAngle: 0,
      wobbleVelocity: 0,
      health: 2
    });

    // 3. Canonical Forgotten Realms POI Waystones & Relics
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
        health: 999 // Indestructible lore waystone
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

    // Physics Simulation (Spring Wobble & Hinge Fall)
    setPropsList(prevProps => {
      let changed = false;
      const updated = prevProps.map(prop => {
        let { isKnockedDown, knockAngle, wobbleVelocity, knockDirection, health } = prop;

        // Fall animation
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

        // Striking Collision Detection
        if (prop.health < 900) { // Destructible props
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
              wobbleVelocity = 13.0; // Spring wobble impulse
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

        const nsTex = (textures as Record<string, THREE.Texture>)[prop.nsTextureUrl] || textures.tree_temperate_ns;
        const ewTex = prop.ewTextureUrl ? ((textures as Record<string, THREE.Texture>)[prop.ewTextureUrl] || textures.tree_temperate_ew) : nsTex;

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
