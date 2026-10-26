import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FleshGolem } from './components/FleshGolem';
import { AstraTerrain, BillboardProps } from './components/AstraTerrain';
import { AstraCyclotrope } from './components/AstraCyclotrope';
import { CompanionHUD } from './components/CompanionHUD';
import { useGamepad } from './hooks/useGamepad';
import { AnimationName, CompanionTelemetry, ChatMessage } from './types';
import { getAstraElevation } from './utils/elevation';

// Camera follower rig tracking player avatar
const CameraFollower: React.FC<{ targetPos: [number, number, number]; yaw: number }> = ({ targetPos, yaw }) => {
  useFrame(({ camera }, delta) => {
    const distance = 9.0;
    const height = 4.5;

    // Camera sits behind player at (yaw)
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

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'companion',
      text: 'Systems nominal, Zak. Strafe axes recalibrated.',
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

  // 60 FPS Game Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // 1. INPUT RESOLUTION (Standard Gamepad & WASD conventions)
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
          // Camera forward vector in XZ plane
          const camFwdX = Math.sin(cameraYaw);
          const camFwdZ = Math.cos(cameraYaw);
          
          // Camera true right vector in standard right-handed Three.js coordinates
          // Since camera looks toward (+sin(yaw), +cos(yaw)), right is (+cos(yaw), -sin(yaw)) inverted to screen right:
          const camRightX = -Math.cos(cameraYaw);
          const camRightZ = Math.sin(cameraYaw);

          // Combined movement direction vector
          const moveDirX = (camFwdX * inputForward + camRightX * inputStrafe) / mag;
          const moveDirZ = (camFwdZ * inputForward + camRightZ * inputStrafe) / mag;

          const speed = (gamepad.buttons.l3 || keys.current['shift']) ? 9.5 : (mag > 0.6 ? 6.2 : 3.2);
          const currentAnim: AnimationName = speed > 7.0 ? 'Sprint_Loop' : (speed > 4.0 ? 'Jog_Fwd_Loop' : 'Walk_Loop');
          setPlayerAction(currentAnim);

          // Heading rotation angle facing movement direction
          currentP.rotY = Math.atan2(moveDirX, moveDirZ);
          currentP.x += moveDirX * speed * delta;
          currentP.z += moveDirZ * speed * delta;
          currentP.y = getAstraElevation(currentP.x, currentP.z);

          setPlayerRot([0, currentP.rotY, 0]);
          setPlayerPos([currentP.x, currentP.y, currentP.z]);
        } else {
          setPlayerAction(prev => (prev === 'Idle_Talking_Loop' || prev === 'Sitting_Idle_Loop') ? prev : 'Idle_Loop');
        }
      }

      // 3. COMPANION LOCOMOTION & FOLLOWER ENGINE
      const dx = currentP.x - currentC.x;
      const dz = currentP.z - currentC.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const followRadius = 3.2;

      // Face player
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
        if (playerAction === 'Dance_Loop') {
          setCompanionAction('Dance_Loop');
        } else if (playerAction === 'Sitting_Idle_Loop') {
          setCompanionAction('Sitting_Idle_Loop');
        } else if (['Punch_Cross', 'Punch_Jab', 'Melee_Weapon_Attack'].includes(playerAction)) {
          setCompanionAction('Punch_Jab');
        } else {
          setCompanionAction('Idle_Loop');
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
  }, [gamepad, cameraYaw, playerAction, triggerOneShotPlayerAction]);

  // Chat with Local Ollama Model
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'player',
      text,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma4',
          prompt: `You are the CortexCompanion flesh golem buddy in a 3D Astra sandbox. The user says: "${text}". Reply with a short companion response (1-2 sentences), and optionally choose one action from: [Dance_Loop, Melee_Weapon_Attack, Spell_Simple_Shoot, Wave, Sitting_Idle_Loop]. Format response as plain text with [ActionName] at the end if you perform one.`,
          stream: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        const replyText = data.response.trim();
        
        let actionTriggered: AnimationName | undefined = undefined;
        if (replyText.includes('Dance_Loop')) actionTriggered = 'Dance_Loop';
        else if (replyText.includes('Spell_Simple_Shoot')) actionTriggered = 'Spell_Simple_Shoot';
        else if (replyText.includes('Melee_Weapon_Attack')) actionTriggered = 'Melee_Weapon_Attack';
        else if (replyText.includes('Sitting_Idle_Loop')) actionTriggered = 'Sitting_Idle_Loop';

        if (actionTriggered) setCompanionAction(actionTriggered);
        setCompanionSpeech(replyText);

        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'companion',
          text: replyText,
          timestamp: Date.now(),
          actionTriggered
        }]);
      } else {
        throw new Error('Ollama offline');
      }
    } catch {
      const mockReplies: Array<{ text: string; act?: AnimationName }> = [
        { text: "Right beside you, Zak! Watching your perimeter.", act: 'Walk_Formal_Loop' },
        { text: "Astra topology scanned. Cyclotrope clouds rotating.", act: 'Spell_Simple_Enter' },
        { text: "Let's test our combat routines!", act: 'Punch_Jab' },
        { text: "Enjoying the rhythm of the grid with you.", act: 'Dance_Loop' }
      ];
      const pick = mockReplies[Math.floor(Math.random() * mockReplies.length)];
      if (pick.act) setCompanionAction(pick.act);
      setCompanionSpeech(pick.text);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'companion',
        text: pick.text,
        timestamp: Date.now(),
        actionTriggered: pick.act
      }]);
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
        <BillboardProps />

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
      </Canvas>

      <CompanionHUD
        telemetry={telemetry}
        gamepad={gamepad}
        messages={messages}
        onSendMessage={handleSendMessage}
        onTriggerCompanionAction={(act) => setCompanionAction(act)}
        onTriggerPlayerAction={(act) => triggerOneShotPlayerAction(act)}
      />
    </div>
  );
};
