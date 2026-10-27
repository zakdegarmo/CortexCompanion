import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { getAstraElevation } from '../utils/elevation';
import { CANONICAL_FAERUN_LOCATIONS, FaerunLocation } from '../services/ForgottenRealmsLore';

export type BiomeType = 'temperate' | 'tundra' | 'autumn' | 'sakura' | 'underdark' | 'arctic';
export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';

export const TREE_PROFILE_NAMES: string[] = [
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
  nsTextureKey: string;
  ewTextureKey?: string;
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

// Build texture paths dictionary for all 6 biomes (10 NS x 10 EW = 120 tree textures)
const ALL_TEXTURE_PATHS: Record<string, string> = {
  monster_golem: '/props/monsters/monster_golem_sentry.png',
  monster_spider: '/props/monsters/monster_astral_spider.png',
  monster_skeleton: '/props/monsters/monster_skeleton_guard.png',
  poi_coffer: '/props/poi/poi_ancient_coffer.png'
};

const BIOME_PREFIXES = ['oak', 'pine', 'autumn', 'cherry', 'spore', 'winter'];
BIOME_PREFIXES.forEach(b => {
  for (let i = 0; i < 10; i++) {
    ALL_TEXTURE_PATHS[`${b}_ns_${i}`] = `/props/trees/${b}/${b}_ns_${i}.png`;
    ALL_TEXTURE_PATHS[`${b}_ew_${i}`] = `/props/trees/${b}/${b}_ew_${i}.png`;
  }
});

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
  // Pre-load all 124 textures (120 biome trees + 4 monsters/POIs)
  const textures = useTexture(ALL_TEXTURE_PATHS);

  // Generate groves across all 6 biomes with 10 NS x 10 EW Combinations
  const [propsList, setPropsList] = useState<InteractiveProp[]>(() => {
    const list: InteractiveProp[] = [];

    // 1. High Forest / Primal Oak Grove (Temperate)
    const oakCoords = [
      { x: -14, z: 12 }, { x: -8, z: 18 }, { x: -22, z: 16 }, { x: -18, z: 24 }
    ];
    oakCoords.forEach((coord, idx) => {
      const nsIdx = (idx * 3 + 1) % 10;
      const ewIdx = (idx * 7 + 2) % 10;
      const comboNum = nsIdx * 10 + ewIdx + 1;
      list.push({
        id: `oak_${idx + 1}`,
        name: `Primal Oak #${comboNum} [${TREE_PROFILE_NAMES[nsIdx]} × ${TREE_PROFILE_NAMES[ewIdx]}]`,
        type: 'x-tree',
        pos: [coord.x, getAstraElevation(coord.x, coord.z), coord.z],
        scale: 7.6 + (idx % 3) * 0.4,
        nsTextureKey: `oak_ns_${nsIdx}`,
        ewTextureKey: `oak_ew_${ewIdx}`,
        nsVariantIndex: nsIdx,
        ewVariantIndex: ewIdx,
        comboLabel: `Oak [NS_${nsIdx} × EW_${ewIdx}]`,
        biome: 'temperate',
        isKnockedDown: false,
        knockDirection: [0, 1],
        knockAngle: 0,
        wobbleVelocity: 0,
        health: 2
      });
    });

    // 2. Spine of the World / Astral Pine Grove (Tundra)
    const pineCoords = [
      { x: 18, z: 14 }, { x: 24, z: 20 }, { x: 28, z: 10 }, { x: 16, z: 26 }
    ];
    pineCoords.forEach((coord, idx) => {
      const nsIdx = (idx * 4 + 3) % 10;
      const ewIdx = (idx * 6 + 1) % 10;
      const comboNum = nsIdx * 10 + ewIdx + 1;
      list.push({
        id: `pine_${idx + 1}`,
        name: `Astral Pine #${comboNum} [${TREE_PROFILE_NAMES[nsIdx]} × ${TREE_PROFILE_NAMES[ewIdx]}]`,
        type: 'x-tree',
        pos: [coord.x, getAstraElevation(coord.x, coord.z), coord.z],
        scale: 8.2 + (idx % 3) * 0.5,
        nsTextureKey: `pine_ns_${nsIdx}`,
        ewTextureKey: `pine_ew_${ewIdx}`,
        nsVariantIndex: nsIdx,
        ewVariantIndex: ewIdx,
        comboLabel: `Pine [NS_${nsIdx} × EW_${ewIdx}]`,
        biome: 'tundra',
        isKnockedDown: false,
        knockDirection: [0, 1],
        knockAngle: 0,
        wobbleVelocity: 0,
        health: 2
      });
    });

    // 3. Myth Drannor / Cherry Sakura Grove (Sakura)
    const cherryCoords = [
      { x: -8, z: -10 }, { x: -14, z: -8 }, { x: -6, z: -16 }
    ];
    cherryCoords.forEach((coord, idx) => {
      const nsIdx = (idx * 2 + 5) % 10;
      const ewIdx = (idx * 5 + 3) % 10;
      const comboNum = nsIdx * 10 + ewIdx + 1;
      list.push({
        id: `cherry_${idx + 1}`,
        name: `Myth Drannor Sakura #${comboNum} [${TREE_PROFILE_NAMES[nsIdx]} × ${TREE_PROFILE_NAMES[ewIdx]}]`,
        type: 'x-tree',
        pos: [coord.x, getAstraElevation(coord.x, coord.z), coord.z],
        scale: 7.2 + (idx % 2) * 0.4,
        nsTextureKey: `cherry_ns_${nsIdx}`,
        ewTextureKey: `cherry_ew_${ewIdx}`,
        nsVariantIndex: nsIdx,
        ewVariantIndex: ewIdx,
        comboLabel: `Sakura [NS_${nsIdx} × EW_${ewIdx}]`,
        biome: 'sakura',
        isKnockedDown: false,
        knockDirection: [0, 1],
        knockAngle: 0,
        wobbleVelocity: 0,
        health: 2
      });
    });

    // 4. Neverwinter / Autumn Amber Elm Grove (Autumn)
    const autumnCoords = [
      { x: 20, z: -12 }, { x: 26, z: -18 }, { x: 14, z: -16 }
    ];
    autumnCoords.forEach((coord, idx) => {
      const nsIdx = (idx * 3 + 2) % 10;
      const ewIdx = (idx * 4 + 7) % 10;
      const comboNum = nsIdx * 10 + ewIdx + 1;
      list.push({
        id: `autumn_${idx + 1}`,
        name: `Amber Elm #${comboNum} [${TREE_PROFILE_NAMES[nsIdx]} × ${TREE_PROFILE_NAMES[ewIdx]}]`,
        type: 'x-tree',
        pos: [coord.x, getAstraElevation(coord.x, coord.z), coord.z],
        scale: 7.5 + (idx % 2) * 0.3,
        nsTextureKey: `autumn_ns_${nsIdx}`,
        ewTextureKey: `autumn_ew_${ewIdx}`,
        nsVariantIndex: nsIdx,
        ewVariantIndex: ewIdx,
        comboLabel: `Autumn [NS_${nsIdx} × EW_${ewIdx}]`,
        biome: 'autumn',
        isKnockedDown: false,
        knockDirection: [0, 1],
        knockAngle: 0,
        wobbleVelocity: 0,
        health: 2
      });
    });

    // 5. Underdark Chasm / Spore Fungi Grove (Underdark)
    const sporeCoords = [
      { x: 10, z: -26 }, { x: 16, z: -28 }, { x: 6, z: -22 }
    ];
    sporeCoords.forEach((coord, idx) => {
      const nsIdx = (idx * 5 + 4) % 10;
      const ewIdx = (idx * 3 + 8) % 10;
      const comboNum = nsIdx * 10 + ewIdx + 1;
      list.push({
        id: `spore_${idx + 1}`,
        name: `Underdark Spore Cap #${comboNum} [${TREE_PROFILE_NAMES[nsIdx]} × ${TREE_PROFILE_NAMES[ewIdx]}]`,
        type: 'x-tree',
        pos: [coord.x, getAstraElevation(coord.x, coord.z), coord.z],
        scale: 6.4 + (idx % 2) * 0.5,
        nsTextureKey: `spore_ns_${nsIdx}`,
        ewTextureKey: `spore_ew_${ewIdx}`,
        nsVariantIndex: nsIdx,
        ewVariantIndex: ewIdx,
        comboLabel: `Spore [NS_${nsIdx} × EW_${ewIdx}]`,
        biome: 'underdark',
        isKnockedDown: false,
        knockDirection: [0, 1],
        knockAngle: 0,
        wobbleVelocity: 0,
        health: 2
      });
    });

    // 6. Icewind Dale / Glacial Winter Grove (Arctic)
    const winterCoords = [
      { x: -8, z: 26 }, { x: -14, z: 30 }
    ];
    winterCoords.forEach((coord, idx) => {
      const nsIdx = (idx * 4 + 1) % 10;
      const ewIdx = (idx * 2 + 6) % 10;
      const comboNum = nsIdx * 10 + ewIdx + 1;
      list.push({
        id: `winter_${idx + 1}`,
        name: `Glacial Frost Birch #${comboNum} [${TREE_PROFILE_NAMES[nsIdx]} × ${TREE_PROFILE_NAMES[ewIdx]}]`,
        type: 'x-tree',
        pos: [coord.x, getAstraElevation(coord.x, coord.z), coord.z],
        scale: 7.8,
        nsTextureKey: `winter_ns_${nsIdx}`,
        ewTextureKey: `winter_ew_${ewIdx}`,
        nsVariantIndex: nsIdx,
        ewVariantIndex: ewIdx,
        comboLabel: `Winter [NS_${nsIdx} × EW_${ewIdx}]`,
        biome: 'arctic',
        isKnockedDown: false,
        knockDirection: [0, 1],
        knockAngle: 0,
        wobbleVelocity: 0,
        health: 2
      });
    });

    // 7. Monsters & Guardians
    list.push({
      id: 'mob_golem_1',
      name: 'Runic Golem Sentry',
      type: 'monster',
      pos: [-10, getAstraElevation(-10, 4), 4],
      scale: 3.4,
      nsTextureKey: 'monster_golem',
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
      nsTextureKey: 'monster_spider',
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
      nsTextureKey: 'monster_skeleton',
      biome: 'underdark',
      isKnockedDown: false,
      knockDirection: [0, 1],
      knockAngle: 0,
      wobbleVelocity: 0,
      health: 2
    });

    // 8. Canonical Forgotten Realms POI Waystones
    CANONICAL_FAERUN_LOCATIONS.forEach(loc => {
      list.push({
        id: loc.id,
        name: loc.name,
        type: 'poi',
        pos: [loc.worldCoords[0], getAstraElevation(loc.worldCoords[0], loc.worldCoords[1]), loc.worldCoords[1]],
        scale: 2.6,
        nsTextureKey: 'poi_coffer',
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

        const nsTex = (textures as Record<string, THREE.Texture>)[prop.nsTextureKey] || (textures as Record<string, THREE.Texture>).oak_ns_0;
        const ewTex = prop.ewTextureKey ? ((textures as Record<string, THREE.Texture>)[prop.ewTextureKey] || nsTex) : nsTex;

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
