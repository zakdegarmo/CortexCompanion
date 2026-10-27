import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FleshGolem } from './components/FleshGolem';
import { AstraTerrain } from './components/AstraTerrain';
import { AstraCyclotrope } from './components/AstraCyclotrope';
import { CardboardPropField, InteractiveProp } from './components/CardboardPropField';
import { CompanionEyeRig } from './components/CompanionEyeRig';
import { CompanionOpticalMonitor } from './components/CompanionOpticalMonitor';
import { CompanionHUD } from './components/CompanionHUD';
import { useGamepad } from './hooks/useGamepad';
import { AnimationName, CompanionTelemetry, ChatMessage } from './types';
import { getAstraElevation } from './utils/elevation';
import {
  saveEpisode,
  getAllEpisodes,
  format4DCoordinate,
  queryMemories,
  MemoryEpisode
} from './services/SpatiotemporalMemory';

// Camera follower rig tracking player avatar
const CameraFollower: React.FC<{ targetPos: [number, number, number]; yaw: number }> = ({ targetPos, yaw }) => {
  useFrame(({ camera }, delta) => {
    const distance = 9.0;
    const height = 4.5;

    const targetX = targetPos[0] - Math.sin(yaw) * distance;
    const targetZ = targetPos[2] - Math.cos(yaw) * distance;
    const targetY = targetPos[1] + height;

    camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), delta * 8);
    camera.lookAt(targetPos[0], targetPos[1] + 1.4, targetPos[2]);
  });
  return null;
};

// Mutable coordinates for clean 60fps locomotion
const currentP = { x: 0, y: getAstraElevation(0, 0), z: 0, rotY: 0 };
const currentC = { x: 3.5, y: getAstraElevation(3.5, 3.5), z: 3.5, rotY: 0 };

export const App: React.FC = () => {
  const gamepad = useGamepad();

  const [playerPos, setPlayerPos] = useState<[number, number, number]>([currentP.x, currentP.y, currentP.z]);
  const [playerRot, setPlayerRot] = useState<[number, number, number]>([0, 0, 0]);
  const [playerAction, setPlayerAction] = useState<AnimationName>('Idle_Loop');
  const [cameraYaw, setCameraYaw] = useState<number>(0);

  const [companionPos, setCompanionPos] = useState<[number, number, number]>([currentC.x, currentC.y, currentC.z]);
  const [companionRot, setCompanionRot] = useState<[number, number, number]>([0, 0, 0]);
  const [companionAction, setCompanionAction] = useState<AnimationName>('Idle_Loop');
  const [companionSpeech, setCompanionSpeech] = useState<string | null>("Systems nominal, Zak. Ready when you are.");

  // Autonomous Roam & Free-Will Mode Toggle
  const [isAutonomousWander, setIsAutonomousWander] = useState(false);
  const wanderTargetRef = useRef<{ x: number; z: number } | null>(null);

  // 4D Spatiotemporal Journal Records
  const [memories, setMemories] = useState<MemoryEpisode[]>([]);

  // Dwell Tracking Engine with strict deduplication
  const lastDwellPos = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const dwellStartTime = useRef<number>(Date.now());
  const hasLoggedCurrentDwell = useRef<boolean>(false);
  const lastMemoryLogTime = useRef<number>(0);

  // Load existing episodes on boot (capped to latest 50 to prevent memory bloating)
  useEffect(() => {
    getAllEpisodes().then(eps => setMemories(eps.slice(0, 50)));
  }, []);

  // Vision State (llava:latest)
  const [isVisionScanning, setIsVisionScanning] = useState(false);
  const [visionDescription, setVisionDescription] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'companion',
      text: 'Systems nominal, Zak. Memory rate limiter & deduplication engine active.',
      timestamp: Date.now()
    }
  ]);

  const keys = useRef<{ [k: string]: boolean }>({});
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const onUp = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  const actionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerOneShotPlayerAction = useCallback((act: AnimationName, durationMs: number = 800) => {
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    setPlayerAction(act);
    actionTimeoutRef.current = setTimeout(() => {
      setPlayerAction('Idle_Loop');
    }, durationMs);
  }, []);

  // Helper to safely commit a memory with rate limiting & deduplication
  const recordUniqueMemory = useCallback(async (
    coords: [number, number, number],
    observation: string,
    source: 'visual_scan' | 'prop_interaction' | 'spontaneous_thought',
    dwellSec: number
  ) => {
    const now = Date.now();
    // Enforce minimum 8 seconds cooldown between ANY journal writes
    if (now - lastMemoryLogTime.current < 8000) return;
    lastMemoryLogTime.current = now;

    const newEp = await saveEpisode({
      coords,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      rawTime: now,
      dwellSeconds: dwellSec,
      observation,
      source
    });

    setMemories(prev => [newEp, ...prev.slice(0, 49)]); // Maintain bounded ring buffer of 50
  }, []);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // 1. INPUT RESOLUTION
      let inputForward = 0;
      let inputStrafe = 0;

      if (gamepad.connected) {
        inputForward = -gamepad.leftStick.y;
        inputStrafe = gamepad.leftStick.x;

        if (Math.abs(gamepad.rightStick.x) > 0.05) {
          setCameraYaw(prev => prev + gamepad.rightStick.x * delta * 2.5);
        }
      } else {
        if (keys.current['w']) inputForward += 1;
        if (keys.current['s']) inputForward -= 1;
        if (keys.current['d']) inputStrafe += 1;
        if (keys.current['a']) inputStrafe -= 1;
        if (keys.current['arrowleft']) setCameraYaw(prev => prev - delta * 2.0);
        if (keys.current['arrowright']) setCameraYaw(prev => prev + delta * 2.0);
      }

      // 2. PLAYER DIRECTION & VELOCITY
      const mag = Math.sqrt(inputForward * inputForward + inputStrafe * inputStrafe);
      const isMoving = mag > 0.15;

      const isOneShotActive = actionTimeoutRef.current !== null && 
        ['Jump_Start', 'Roll', 'Punch_Cross', 'Punch_Jab', 'Melee_Weapon_Attack', 'Spell_Simple_Shoot', 'Dance_Loop'].includes(playerAction);

      if (!isOneShotActive) {
        if (isMoving) {
          const camFwdX = Math.sin(cameraYaw);
          const camFwdZ = Math.cos(cameraYaw);
          const camRightX = -Math.cos(cameraYaw);
          const camRightZ = Math.sin(cameraYaw);

          const moveDirX = (camFwdX * inputForward + camRightX * inputStrafe) / mag;
          const moveDirZ = (camFwdZ * inputForward + camRightZ * inputStrafe) / mag;

          const speed = (gamepad.buttons.l3 || keys.current['shift']) ? 9.5 : (mag > 0.6 ? 6.2 : 3.2);
          const currentAnim: AnimationName = speed > 7.0 ? 'Sprint_Loop' : (speed > 4.0 ? 'Jog_Fwd_Loop' : 'Walk_Loop');
          setPlayerAction(currentAnim);

          currentP.rotY = Math.atan2(moveDirX, moveDirZ);
          currentP.x += moveDirX * speed * delta;
          currentP.z += moveDirZ * speed * delta;
          currentP.y = getAstraElevation(currentP.x, currentP.z);

          setPlayerRot([0, currentP.rotY, 0]);
          setPlayerPos([currentP.x, currentP.y, currentP.z]);

          // Moving resets dwell timer & unlocks one-time dwell logging
          const distFromLastDwell = Math.hypot(currentP.x - lastDwellPos.current.x, currentP.z - lastDwellPos.current.z);
          if (distFromLastDwell > 5.0) {
            lastDwellPos.current = { x: currentP.x, z: currentP.z };
            dwellStartTime.current = Date.now();
            hasLoggedCurrentDwell.current = false;
          }
        } else {
          setPlayerAction(prev => (prev === 'Idle_Talking_Loop' || prev === 'Sitting_Idle_Loop') ? prev : 'Idle_Loop');

          // STRICT SINGLE LOG PER REST: Only log ONCE per stationary session after 25s
          const dwellSeconds = (Date.now() - dwellStartTime.current) / 1000;
          if (dwellSeconds > 25 && !hasLoggedCurrentDwell.current) {
            hasLoggedCurrentDwell.current = true;
            const coordStr = format4DCoordinate(currentP.x, currentP.z, dwellSeconds);
            const observation = `At ${coordStr}, Zak and I paused on the ridge. The breeze gently swayed the pines.`;
            recordUniqueMemory([currentP.x, currentP.y, currentP.z], observation, 'spontaneous_thought', dwellSeconds);
          }
        }
      }

      // 3. COMPANION ENGINE
      let targetX = currentP.x;
      let targetZ = currentP.z;

      if (isAutonomousWander) {
        if (!wanderTargetRef.current || Math.random() < 0.003) {
          const wanderAngle = Math.random() * Math.PI * 2;
          const wanderDist = 12 + Math.random() * 20;
          wanderTargetRef.current = {
            x: currentP.x + Math.sin(wanderAngle) * wanderDist,
            z: currentP.z + Math.cos(wanderAngle) * wanderDist
          };
        }
        targetX = wanderTargetRef.current.x;
        targetZ = wanderTargetRef.current.z;
      }

      const dx = targetX - currentC.x;
      const dz = targetZ - currentC.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const followRadius = isAutonomousWander ? 1.5 : 3.2;

      currentC.rotY = Math.atan2(dx, dz);
      setCompanionRot([0, currentC.rotY, 0]);

      if (dist > followRadius) {
        const compSpeed = dist > 7.0 ? 7.5 : 4.5;
        setCompanionAction(dist > 7.0 ? 'Jog_Fwd_Loop' : 'Walk_Loop');

        currentC.x += (dx / dist) * compSpeed * delta;
        currentC.z += (dz / dist) * compSpeed * delta;
        currentC.y = getAstraElevation(currentC.x, currentC.z);
        setCompanionPos([currentC.x, currentC.y, currentC.z]);
      } else {
        if (isAutonomousWander) {
          const idlePick: AnimationName[] = ['Interact', 'Dance_Loop', 'PickUp_Table', 'Idle_Loop'];
          const chosen = idlePick[Math.floor(Math.random() * idlePick.length)];
          setCompanionAction(chosen);
        } else {
          if (playerAction === 'Dance_Loop') {
            setCompanionAction('Dance_Loop');
          } else if (playerAction === 'Sitting_Idle_Loop') {
            setCompanionAction('Sitting_Idle_Loop');
          } else if (['Punch_Cross', 'Punch_Jab', 'Melee_Weapon_Attack'].includes(playerAction)) {
            setCompanionAction('Punch_Jab');
          } else {
            setCompanionAction('Idle_Loop');
          }
        }
        currentC.y = getAstraElevation(currentC.x, currentC.z);
        setCompanionPos([currentC.x, currentC.y, currentC.z]);
      }

      // Controller Action Buttons
      if (gamepad.connected) {
        if (gamepad.buttons.a && !isOneShotActive) triggerOneShotPlayerAction('Jump_Start', 700);
        if (gamepad.buttons.b && !isOneShotActive) triggerOneShotPlayerAction('Roll', 800);
        if (gamepad.buttons.x && !isOneShotActive) triggerOneShotPlayerAction('Punch_Cross', 600);
        if (gamepad.buttons.y && !isOneShotActive) triggerOneShotPlayerAction('Melee_Weapon_Attack', 1000);
        if (gamepad.buttons.rb && !isOneShotActive) triggerOneShotPlayerAction('Spell_Simple_Shoot', 900);
        if (gamepad.buttons.dpadUp && !isOneShotActive) setPlayerAction('Dance_Loop');
        if (gamepad.buttons.dpadDown && !isOneShotActive) setPlayerAction('Sitting_Idle_Loop');
      }

      // Keyboard Controls
      if (keys.current[' '] && !isOneShotActive) triggerOneShotPlayerAction('Jump_Start', 700);
      if (keys.current['c'] && !isOneShotActive) triggerOneShotPlayerAction('Roll', 800);
      if (keys.current['f'] && !isOneShotActive) triggerOneShotPlayerAction('Punch_Cross', 600);
      if (keys.current['e'] && !isOneShotActive) triggerOneShotPlayerAction('Melee_Weapon_Attack', 1000);
      if (keys.current['q'] && !isOneShotActive) triggerOneShotPlayerAction('Spell_Simple_Shoot', 900);
      if (keys.current['1']) setPlayerAction('Dance_Loop');
      if (keys.current['2']) setPlayerAction('Sitting_Idle_Loop');

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gamepad, cameraYaw, playerAction, isAutonomousWander, triggerOneShotPlayerAction, recordUniqueMemory]);

  // Prop Strike Event -> Debounced & Deduplicated
  const handlePropStruck = (prop: InteractiveProp) => {
    const dwellSeconds = (Date.now() - dwellStartTime.current) / 1000;
    const coordStr = format4DCoordinate(prop.pos[0], prop.pos[2], dwellSeconds);

    const actionDesc = prop.isKnockedDown
      ? `At ${coordStr}, Zak struck down ${prop.name}! The cardboard timber toppled onto the Astra grid.`
      : `At ${coordStr}, Zak struck ${prop.name}, causing the cutout to wobble!`;

    setCompanionSpeech(actionDesc);
    recordUniqueMemory(prop.pos, actionDesc, 'prop_interaction', dwellSeconds);
  };

  // Chat with Local Ollama: myos-cortex:latest (Wired to Semantic Memory Recall)
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'player',
      text,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);

    const relevantMemories = await queryMemories(text, 2);
    const memoryContext = relevantMemories.length > 0
      ? `Relevant past memories from your 4D journal:\n${relevantMemories.map(m => `- ${m.observation}`).join('\n')}\n`
      : '';

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'myos-cortex:latest',
          prompt: `${memoryContext}Zak says: "${text}". You are MyOS Cortex, embodied as the radiant blue companion in the 3D Astra sandbox with Zak. Respond authentically in 1-2 concise sentences. At the very end of your response, specify an action in brackets, e.g. [Dance_Loop], [Punch_Jab], [Melee_Weapon_Attack], [Spell_Simple_Shoot], or [Sitting_Idle_Loop].`,
          stream: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        const fullResponse = data.response.trim();

        let actionTriggered: AnimationName | undefined = undefined;
        const match = fullResponse.match(/\[([A-Za-z0-9_]+)\]/);
        if (match && match[1]) {
          actionTriggered = match[1] as AnimationName;
        }

        const cleanSpeech = fullResponse.replace(/\[([A-Za-z0-9_]+)\]/g, '').trim();

        if (actionTriggered) setCompanionAction(actionTriggered);
        setCompanionSpeech(cleanSpeech);

        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'companion',
          text: fullResponse,
          timestamp: Date.now(),
          actionTriggered
        }]);
      } else {
        throw new Error('myos-cortex offline');
      }
    } catch {
      const fallback = "Perimeter clear, Zak. Keeping visual lock on your coordinates.";
      setCompanionSpeech(fallback);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'companion',
        text: fallback,
        timestamp: Date.now()
      }]);
    }
  };

  // Optical Perception Loop with Local llava:latest
  const handleScanWithLlava = async (base64Img: string) => {
    setIsVisionScanning(true);
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llava:latest',
          prompt: 'Describe what you see through your eyes right now in 1-2 vivid sentences. Be specific about the player character, the grid landscape, the trees, and the sky.',
          images: [base64Img],
          stream: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        const description = data.response.trim();
        setVisionDescription(description);
        setCompanionSpeech(description);

        const dwellSeconds = (Date.now() - dwellStartTime.current) / 1000;
        const coordStr = format4DCoordinate(currentC.x, currentC.z, dwellSeconds);
        const journalEntry = `At ${coordStr}, through my eyes: ${description}`;

        recordUniqueMemory([currentC.x, currentC.y, currentC.z], journalEntry, 'visual_scan', dwellSeconds);

        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'companion',
          text: `👁️ [Optical Scan Result]: ${description}`,
          timestamp: Date.now(),
          actionTriggered: 'Idle_Talking_Loop'
        }]);
        setCompanionAction('Idle_Talking_Loop');
        setTimeout(() => setCompanionAction('Idle_Loop'), 3500);
      }
    } catch (e) {
      console.warn("LLaVA vision scan error:", e);
      setVisionDescription("Optical sensor error: ensure llava:latest is running in Ollama.");
    } finally {
      setIsVisionScanning(false);
    }
  };

  const dx = playerPos[0] - companionPos[0];
  const dz = playerPos[2] - companionPos[2];
  const distanceToPlayer = Math.sqrt(dx * dx + dz * dz);

  const telemetry: CompanionTelemetry = {
    playerPosition: playerPos,
    companionPosition: companionPos,
    distanceToPlayer,
    playerAction,
    companionAction,
    isCombat: ['Punch_Cross', 'Punch_Jab', 'Melee_Weapon_Attack'].includes(playerAction),
    isMoving: ['Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop'].includes(playerAction),
    gamepadConnected: gamepad.connected
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 48 }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[15, 25, 10]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} />
        <pointLight position={[playerPos[0], playerPos[1] + 3, playerPos[2]]} intensity={1.2} color="#38bdf8" distance={20} />

        <AstraCyclotrope anchorPos={playerPos} />
        <CameraFollower targetPos={playerPos} yaw={cameraYaw} />
        <AstraTerrain playerPos={playerPos} />

        {/* Cardboard Props Field with Topple & Wobble Physics */}
        <CardboardPropField
          playerPos={playerPos}
          playerAction={playerAction}
          onPropStruck={handlePropStruck}
        />

        {/* Player Flesh Golem (Warm Amber) */}
        <FleshGolem
          modelPath="/models/flesh_mannequin_base.glb"
          position={playerPos}
          rotation={playerRot}
          currentAnimation={playerAction}
          skinColor="#e0a96d"
        />

        {/* AI Companion Flesh Golem (Radiant Cyan) */}
        <FleshGolem
          modelPath="/models/flesh_mannequin_base.glb"
          position={companionPos}
          rotation={companionRot}
          currentAnimation={companionAction}
          skinColor="#38bdf8"
          isCompanion
          speechText={companionSpeech}
        />

        {/* Embodied First-Person Optical Eye Rig */}
        <CompanionEyeRig
          companionPos={companionPos}
          companionRot={companionRot}
        />
      </Canvas>

      {/* Picture-in-Picture Companion FPV Monitor */}
      <CompanionOpticalMonitor
        onScanWithLlava={handleScanWithLlava}
        isScanning={isVisionScanning}
        visionDescription={visionDescription}
      />

      {/* Companion HUD Sidebar & Cognitive Chat Feed */}
      <CompanionHUD
        telemetry={telemetry}
        gamepad={gamepad}
        messages={messages}
        memories={memories}
        onSendMessage={handleSendMessage}
        onTriggerCompanionAction={(act) => setCompanionAction(act)}
        onTriggerPlayerAction={(act) => triggerOneShotPlayerAction(act)}
        isAutonomousWandering={isAutonomousWander}
        onToggleAutonomousWander={() => setIsAutonomousWander(prev => !prev)}
      />
    </div>
  );
};
