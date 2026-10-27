import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SeasonType, BiomeType } from './CardboardPropField';

interface AstraTerrainProps {
  playerPos: [number, number, number];
  activeSeason: SeasonType;
  activeBiome: BiomeType;
}

// Seasonal palette definitions for the ground shader
const SEASON_PALETTES: Record<SeasonType, {
  grassLow: THREE.Color;
  grassHigh: THREE.Color;
  soilColor: THREE.Color;
  rockColor: THREE.Color;
  snowColor: THREE.Color;
  snowCoverage: number;
  gridColor: THREE.Color;
}> = {
  spring: {
    grassLow: new THREE.Color('#22542a'),
    grassHigh: new THREE.Color('#388e3c'),
    soilColor: new THREE.Color('#2d1f14'),
    rockColor: new THREE.Color('#475569'),
    snowColor: new THREE.Color('#e0f2fe'),
    snowCoverage: 0.0,
    gridColor: new THREE.Color('#4ade80')
  },
  summer: {
    grassLow: new THREE.Color('#163820'),
    grassHigh: new THREE.Color('#2d6a39'),
    soilColor: new THREE.Color('#281c12'),
    rockColor: new THREE.Color('#3f4a5a'),
    snowColor: new THREE.Color('#ffffff'),
    snowCoverage: 0.0,
    gridColor: new THREE.Color('#38bdf8')
  },
  autumn: {
    grassLow: new THREE.Color('#78350f'),
    grassHigh: new THREE.Color('#d97706'),
    soilColor: new THREE.Color('#382012'),
    rockColor: new THREE.Color('#57534e'),
    snowColor: new THREE.Color('#fef3c7'),
    snowCoverage: 0.0,
    gridColor: new THREE.Color('#f59e0b')
  },
  winter: {
    grassLow: new THREE.Color('#334155'),
    grassHigh: new THREE.Color('#475569'),
    soilColor: new THREE.Color('#1e293b'),
    rockColor: new THREE.Color('#64748b'),
    snowColor: new THREE.Color('#f8fafc'),
    snowCoverage: 0.72,
    gridColor: new THREE.Color('#93c5fd')
  }
};

export const AstraTerrain: React.FC<AstraTerrainProps> = ({
  playerPos,
  activeSeason,
  activeBiome
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const GRID_SIZE = 3.048; // 10 ft tactical grid cell

  // Continuous snap position to follow player seamlessly
  const snapX = Math.floor(playerPos[0] / GRID_SIZE) * GRID_SIZE;
  const snapZ = Math.floor(playerPos[2] / GRID_SIZE) * GRID_SIZE;

  const palette = SEASON_PALETTES[activeSeason] || SEASON_PALETTES.summer;

  const uniforms = useMemo(() => {
    return {
      uGridColor: { value: palette.gridColor.clone() },
      uGrassLow: { value: palette.grassLow.clone() },
      uGrassHigh: { value: palette.grassHigh.clone() },
      uSoilColor: { value: palette.soilColor.clone() },
      uRockColor: { value: palette.rockColor.clone() },
      uSnowColor: { value: palette.snowColor.clone() },
      uSnowCoverage: { value: palette.snowCoverage },
      uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
      uPlayerPos: { value: new THREE.Vector3(playerPos[0], playerPos[1], playerPos[2]) },
      uGridSpacing: { value: GRID_SIZE },
      uTime: { value: 0 }
    };
  }, [GRID_SIZE]);

  // Smoothly update uniform colors on season transition
  useEffect(() => {
    uniforms.uGridColor.value.copy(palette.gridColor);
    uniforms.uGrassLow.value.copy(palette.grassLow);
    uniforms.uGrassHigh.value.copy(palette.grassHigh);
    uniforms.uSoilColor.value.copy(palette.soilColor);
    uniforms.uRockColor.value.copy(palette.rockColor);
    uniforms.uSnowColor.value.copy(palette.snowColor);
    uniforms.uSnowCoverage.value = palette.snowCoverage;
  }, [palette, uniforms]);

  useFrame((state, delta) => {
    uniforms.uTime.value += delta;
    uniforms.uPlayerPos.value.set(playerPos[0], playerPos[1], playerPos[2]);
  });

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vElevation;

        // Elevation function matching getAstraElevation(x, z) exactly
        float getElevation(vec2 pos) {
          float hill1 = sin(pos.x * 0.04) * cos(pos.y * 0.04) * 2.2;
          float hill2 = sin(pos.x * 0.09 + 1.2) * cos(pos.y * 0.08) * 1.1;
          return hill1 + hill2;
        }

        // Analytical normal derivation
        vec3 getNormal(vec2 pos) {
          float eps = 0.15;
          float hL = getElevation(vec2(pos.x - eps, pos.y));
          float hR = getElevation(vec2(pos.x + eps, pos.y));
          float hD = getElevation(vec2(pos.x, pos.y - eps));
          float hU = getElevation(vec2(pos.x, pos.y + eps));
          vec3 normal = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));
          return normal;
        }

        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          float elev = getElevation(worldPos.xz);
          worldPos.y += elev;

          vElevation = elev;
          vWorldPosition = worldPos.xyz;
          vNormal = getNormal(worldPos.xz);

          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uGridColor;
        uniform vec3 uGrassLow;
        uniform vec3 uGrassHigh;
        uniform vec3 uSoilColor;
        uniform vec3 uRockColor;
        uniform vec3 uSnowColor;
        uniform float uSnowCoverage;
        uniform vec3 uSunDirection;
        uniform vec3 uPlayerPos;
        uniform float uGridSpacing;
        uniform float uTime;

        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vElevation;

        // Fast procedural hash noise
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }

        // 3-octave Fractal Brownian Motion
        float fbm(vec2 p) {
          float v = 0.0;
          v += 0.5000 * noise(p); p *= 2.02;
          v += 0.2500 * noise(p); p *= 2.03;
          v += 0.1250 * noise(p);
          return v;
        }

        void main() {
          vec2 worldXZ = vWorldPosition.xz;

          // 1. Procedural Terrain Texture Layers
          float soilNoise = fbm(worldXZ * 0.18);
          float grassNoise = fbm(worldXZ * 0.55 + vec2(soilNoise * 1.5));
          float microNoise = hash(floor(worldXZ * 3.5));

          // Base grass variation
          vec3 grass = mix(uGrassLow, uGrassHigh, grassNoise);

          // Loam / Soil patches in hollows or lower elevations
          float soilBlend = smoothstep(0.40, 0.68, soilNoise);
          vec3 terrainColor = mix(grass, uSoilColor, soilBlend * 0.45);

          // Slope detection: steep cliffs expose rock
          float slope = 1.0 - vNormal.y;
          float rockBlend = smoothstep(0.22, 0.55, slope);
          terrainColor = mix(terrainColor, uRockColor, rockBlend);

          // Winter Snow Accumulation on ridges and flat areas
          if (uSnowCoverage > 0.01) {
            float snowFactor = smoothstep(0.35, 0.85, (vNormal.y * 0.6 + (vElevation + 2.5) * 0.15 + microNoise * 0.2));
            terrainColor = mix(terrainColor, uSnowColor, snowFactor * uSnowCoverage);
          }

          // 2. Analytical 3D Lighting & Sunlight Diffuse
          float NdotL = max(0.0, dot(vNormal, uSunDirection));
          float diffuse = NdotL * 0.65 + 0.35; // Ambient lift
          vec3 litColor = terrainColor * diffuse;

          // 3. Astra Grid Lattice (Antialiased lines via fwidth)
          vec2 gridCoord = worldXZ / uGridSpacing;
          vec2 gridWidth = fwidth(gridCoord);
          vec2 gridDist = abs(fract(gridCoord - 0.5) - 0.5) / max(gridWidth, vec2(0.001));
          float line = 1.0 - min(min(gridDist.x, gridDist.y), 1.0);

          // Player proximity tactical glow on the grid
          float distToPlayer = length(worldXZ - uPlayerPos.xz);
          float playerGlow = exp(-distToPlayer * 0.045);

          // Blend subtle grid lines into terrain
          float lineIntensity = line * 0.22 + playerGlow * line * 0.58;
          vec3 finalColor = mix(litColor, uGridColor, lineIntensity);

          // 4. Distance Atmospheric Cyclotrope Fog
          float fog = smoothstep(145.0, 45.0, distToPlayer);
          vec3 horizonFogColor = vec3(0.05, 0.08, 0.16);
          finalColor = mix(horizonFogColor, finalColor, fog);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });
  }, [uniforms]);

  return (
    <group position={[snapX, 0, snapZ]}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} material={shaderMaterial} receiveShadow>
        <planeGeometry args={[320, 320, 160, 160]} />
      </mesh>
    </group>
  );
};
