import { useState, useEffect, useRef } from 'react';

export interface GamepadState {
  connected: boolean;
  leftStick: { x: number; y: number };
  rightStick: { x: number; y: number };
  buttons: {
    a: boolean; // Button 0 (Cross / A) -> Jump / Interact
    b: boolean; // Button 1 (Circle / B) -> Roll / Dodge
    x: boolean; // Button 2 (Square / X) -> Punch / Light Attack
    y: boolean; // Button 3 (Triangle / Y) -> Heavy Melee Attack
    lb: boolean; // Button 4 -> Crouch
    rb: boolean; // Button 5 -> Spell Shoot
    lt: boolean; // Button 6 -> Aim
    rt: boolean; // Button 7 -> Attack
    select: boolean; // Button 8
    start: boolean; // Button 9
    l3: boolean; // Button 10 -> Sprint Toggle
    r3: boolean; // Button 11 -> Reset Cam
    dpadUp: boolean; // Button 12 -> Emote / Dance
    dpadDown: boolean; // Button 13 -> Emote / Sit
    dpadLeft: boolean; // Button 14 -> Emote / Wave
    dpadRight: boolean; // Button 15 -> Emote / Torch
  };
}

export function useGamepad() {
  const [gamepadState, setGamepadState] = useState<GamepadState>({
    connected: false,
    leftStick: { x: 0, y: 0 },
    rightStick: { x: 0, y: 0 },
    buttons: {
      a: false, b: false, x: false, y: false,
      lb: false, rb: false, lt: false, rt: false,
      select: false, start: false, l3: false, r3: false,
      dpadUp: false, dpadDown: false, dpadLeft: false, dpadRight: false
    }
  });

  const stateRef = useRef(gamepadState);
  stateRef.current = gamepadState;

  useEffect(() => {
    let animId: number;

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let activeGp: Gamepad | null = null;
      for (const gp of gamepads) {
        if (gp && gp.connected) {
          activeGp = gp;
          break;
        }
      }

      if (activeGp) {
        const deadzone = 0.15;
        const applyDeadzone = (v: number) => Math.abs(v) > deadzone ? v : 0;

        const lx = applyDeadzone(activeGp.axes[0] || 0);
        const ly = applyDeadzone(activeGp.axes[1] || 0);
        const rx = applyDeadzone(activeGp.axes[2] || 0);
        const ry = applyDeadzone(activeGp.axes[3] || 0);

        const btn = (idx: number) => activeGp!.buttons[idx]?.pressed || false;

        setGamepadState({
          connected: true,
          leftStick: { x: lx, y: ly },
          rightStick: { x: rx, y: ry },
          buttons: {
            a: btn(0),
            b: btn(1),
            x: btn(2),
            y: btn(3),
            lb: btn(4),
            rb: btn(5),
            lt: btn(6),
            rt: btn(7),
            select: btn(8),
            start: btn(9),
            l3: btn(10),
            r3: btn(11),
            dpadUp: btn(12),
            dpadDown: btn(13),
            dpadLeft: btn(14),
            dpadRight: btn(15)
          }
        });
      } else {
        if (stateRef.current.connected) {
          setGamepadState(prev => ({ ...prev, connected: false }));
        }
      }

      animId = requestAnimationFrame(pollGamepad);
    };

    animId = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(animId);
  }, []);

  return gamepadState;
}
