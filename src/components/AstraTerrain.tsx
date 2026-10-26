import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { getAstraElevation } from '../utils/elevation';

export const AstraTerrain: React.FC<{ playerPos: [number, number, number] }> = ({ playerPos }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const GRID_SIZE = 3.048; // 10 ft grid snapped scale

  const snapX = Math.floor(playerPos[0] / GRID_SIZE) * GRID_SIZE;
  const snapZ = Math.floor(playerPos[2] / GRID_SIZE) * GRID_SIZE;

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uGridColor: { value: new THREE.Color('#38bdf8') },
        uGroundColor: { value: new THREE.Color('#0b1329') },
        uElevationColor: { value: new THREE.Color('#1e1b4b') },
        uPlayerPos: { value: new THREE.Vector3(0, 0, 0) },
        uGridSpacing: { value: GRID_SIZE },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        varying float vElevation;

        float getElevation(vec2 pos) {
          float hill1 = sin(pos.x * 0.04) * cos(pos.y * 0.04) * 2.2;
          float hill2 = sin(pos.x * 0.09 + 1.2) * cos(pos.y * 0.08) * 1.1;
          return hill1 + hill2;
        }

        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          float elev = getElevation(worldPos.xz);
          worldPos.y += elev;
          vElevation = elev;
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uGridColor;
        uniform vec3 uGroundColor;
        uniform vec3 uElevationColor;
        uniform vec3 uPlayerPos;
        uniform float uGridSpacing;

        varying vec3 vWorldPosition;
        varying vec2 vUv;
        varying float vElevation;

        void main() {
          vec2 grid = abs(fract(vWorldPosition.xz / uGridSpacing - 0.5) - 0.5) / fwidth(vWorldPosition.xz / uGridSpacing);
          float line = 1.0 - min(min(grid.x, grid.y), 1.0);

          float t = clamp((vElevation + 2.5) / 5.0, 0.0, 1.0);
          vec3 baseColor = mix(uGroundColor, uElevationColor, t);

          float distToPlayer = length(vWorldPosition.xz - uPlayerPos.xz);
          float playerGlow = exp(-distToPlayer * 0.035);

          vec3 finalColor = mix(baseColor, uGridColor, line * 0.45 + playerGlow * line * 0.55);
          float fog = smoothstep(140.0, 40.0, distToPlayer);
          finalColor = mix(vec3(0.04, 0.07, 0.15), finalColor, fog);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });
  }, [GRID_SIZE]);

  return (
    <group position={[snapX, 0, snapZ]}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} material={shaderMaterial} receiveShadow>
        <planeGeometry args={[300, 300, 140, 140]} />
      </mesh>
    </group>
  );
};

export const BillboardProps: React.FC = () => {
  const treeTexture1 = useTexture('/props/tree1.png');
  const treeTexture2 = useTexture('/props/tree2.png');

  const propsList = useMemo(() => {
    const list: Array<{ id: number; pos: [number, number, number]; scale: number; type: 1 | 2 }> = [];
    const seedPoints = [
      [-14, 18], [16, 14], [-24, -18], [26, -22],
      [-36, 12], [38, 32], [-20, 46], [42, -42],
      [-10, -30], [20, -36], [-46, -36], [52, 16]
    ];
    seedPoints.forEach(([x, z], i) => {
      const elev = getAstraElevation(x, z);
      const scale = 7.5 + (i % 3) * 1.8;
      list.push({
        id: i,
        pos: [x, elev + scale * 0.5, z],
        scale,
        type: i % 2 === 0 ? 1 : 2
      });
    });
    return list;
  }, []);

  return (
    <group>
      {propsList.map((p) => (
        <group key={p.id} position={p.pos}>
          <mesh>
            <planeGeometry args={[p.scale * 0.85, p.scale]} />
            <meshStandardMaterial
              map={p.type === 1 ? treeTexture1 : treeTexture2}
              transparent
              alphaTest={0.3}
              side={THREE.DoubleSide}
              roughness={0.8}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};
