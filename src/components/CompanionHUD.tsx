import React, { useState } from 'react';
import { ALL_ANIMATIONS, AnimationName, CompanionTelemetry, ChatMessage } from '../types';
import { GamepadState } from '../hooks/useGamepad';
import { Play, Sparkles, Send, Gamepad2, Brain, Compass, MessageSquare } from 'lucide-react';

interface CompanionHUDProps {
  telemetry: CompanionTelemetry;
  gamepad: GamepadState;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onTriggerCompanionAction: (action: AnimationName) => void;
  onTriggerPlayerAction: (action: AnimationName) => void;
}

export const CompanionHUD: React.FC<CompanionHUDProps> = ({
  telemetry,
  gamepad,
  messages,
  onSendMessage,
  onTriggerCompanionAction,
  onTriggerPlayerAction
}) => {
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'actions' | 'telemetry'>('chat');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: '380px',
      height: '100%',
      background: 'rgba(11, 15, 29, 0.88)',
      backdropFilter: 'blur(12px)',
      borderLeft: '1px solid rgba(56, 189, 248, 0.25)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10,
      color: '#e2e8f0',
      userSelect: 'none'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Brain style={{ color: '#38bdf8', width: 22, height: 22 }} />
          <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>CORTEX COMPANION</span>
        </div>
        <div style={{
          fontSize: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: gamepad.connected ? '#4ade80' : '#94a3b8'
        }}>
          <Gamepad2 style={{ width: 16, height: 16 }} />
          <span>{gamepad.connected ? 'GAMEPAD ON' : 'KEYBOARD'}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(0, 0, 0, 0.2)'
      }}>
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            flex: 1,
            padding: '10px 0',
            background: activeTab === 'chat' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'chat' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'chat' ? '#38bdf8' : '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
          <MessageSquare size={15} /> Chat
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          style={{
            flex: 1,
            padding: '10px 0',
            background: activeTab === 'actions' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'actions' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'actions' ? '#38bdf8' : '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
          <Sparkles size={15} /> 45 Clips
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          style={{
            flex: 1,
            padding: '10px 0',
            background: activeTab === 'telemetry' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'telemetry' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'telemetry' ? '#38bdf8' : '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
          <Compass size={15} /> Telemetry
        </button>
      </div>

      {/* Main Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {activeTab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              fontSize: '0.75rem',
              color: '#94a3b8',
              background: 'rgba(56, 189, 248, 0.08)',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(56, 189, 248, 0.15)'
            }}>
              💡 Talk to your AI Buddy or click quick commands below. Connected to local Ollama agent on localhost:11434.
            </div>

            {/* Message Feed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.sender === 'player' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: m.sender === 'player' ? '#2563eb' : '#1e293b',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    border: m.sender === 'companion' ? '1px solid rgba(56, 189, 248, 0.3)' : 'none'
                  }}>
                  <div style={{ fontSize: '0.65rem', opacity: 0.7, marginBottom: '2px' }}>
                    {m.sender === 'player' ? 'YOU (P1)' : 'COMPANION'}
                  </div>
                  <div>{m.text}</div>
                  {m.actionTriggered && (
                    <div style={{
                      marginTop: '4px',
                      fontSize: '0.7rem',
                      color: '#38bdf8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Play size={10} /> {m.actionTriggered}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'actions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>
              Direct Animation Overrides (Click to trigger on Companion or Player):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {ALL_ANIMATIONS.map((anim) => (
                <button
                  key={anim}
                  onClick={() => onTriggerCompanionAction(anim)}
                  style={{
                    padding: '8px 6px',
                    background: telemetry.companionAction === anim ? '#0284c7' : 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#e2e8f0',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                  {anim.replace('_Loop', '').replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'telemetry' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.82rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ color: '#38bdf8', fontWeight: 600, marginBottom: '6px' }}>PROXIMITY RADAR</div>
              <div>Distance: <span style={{ color: '#4ade80', fontWeight: 700 }}>{telemetry.distanceToPlayer.toFixed(2)} m</span></div>
              <div>Player State: <span style={{ color: '#f59e0b' }}>{telemetry.playerAction}</span></div>
              <div>Companion State: <span style={{ color: '#38bdf8' }}>{telemetry.companionAction}</span></div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ color: '#38bdf8', fontWeight: 600, marginBottom: '6px' }}>CONTROLLER BINDINGS</div>
              <div>🕹️ <b>Left Stick / WASD</b>: 360° Walk / Jog / Sprint</div>
              <div>🕹️ <b>Right Stick</b>: Orbit Camera</div>
              <div>🟢 <b>A / Space</b>: Jump</div>
              <div>🔴 <b>B / Shift</b>: Combat Roll</div>
              <div>🟦 <b>X / Click</b>: Punch Combo</div>
              <div>🔺 <b>Y / E</b>: Heavy Weapon Attack</div>
              <div>⚡ <b>RB / Q</b>: Spell Cast Shoot</div>
              <div>🕺 <b>D-Pad Up / 1</b>: Dance Emote</div>
              <div>💬 <b>D-Pad Left / 2</b>: Talking Loop</div>
              <div>🪑 <b>D-Pad Down / 3</b>: Sitting Rest</div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input Bar */}
      {activeTab === 'chat' && (
        <form onSubmit={handleSend} style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.3)'
        }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Command your AI buddy..."
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              background: 'rgba(15, 23, 42, 0.9)',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 16px',
              background: '#0284c7',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  );
};
