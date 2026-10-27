import React, { useState } from 'react';
import { ALL_ANIMATIONS, AnimationName, CompanionTelemetry, ChatMessage } from '../types';
import { GamepadState } from '../hooks/useGamepad';
import { MemoryEpisode } from '../services/SpatiotemporalMemory';
import { BiomeType, SeasonType } from './CardboardPropField';
import {
  CANONICAL_FAERUN_LOCATIONS,
  FaerunLocation,
  searchForgottenRealms,
  fetchFaerunArticleLead
} from '../services/ForgottenRealmsLore';
import { GroundLeafResource } from './FallingLeavesField';
import {
  Play,
  Sparkles,
  Send,
  Gamepad2,
  Brain,
  Compass,
  MessageSquare,
  BookOpen,
  Clock,
  MapPin,
  Trees,
  Search,
  ExternalLink,
  Sun,
  CloudSnow,
  Leaf,
  Flower2,
  Shield,
  Package
} from 'lucide-react';

interface CompanionHUDProps {
  telemetry: CompanionTelemetry;
  gamepad: GamepadState;
  messages: ChatMessage[];
  memories: MemoryEpisode[];
  activeSeason: SeasonType;
  activeBiome: BiomeType;
  currentPOI: FaerunLocation | null;
  nearLeaf: GroundLeafResource | null;
  gatheredLeaves: Record<string, number>;
  onSelectSeason: (s: SeasonType) => void;
  onSelectBiome: (b: BiomeType) => void;
  onSendMessage: (text: string) => void;
  onTriggerCompanionAction: (action: AnimationName) => void;
  onTriggerPlayerAction: (action: AnimationName) => void;
  isAutonomousWandering: boolean;
  onToggleAutonomousWander: () => void;
  onReciteFaerunLore: (poi: FaerunLocation, loreText: string) => void;
  onOpenInventory: () => void;
  onGatherNearLeaf: () => void;
}

export const CompanionHUD: React.FC<CompanionHUDProps> = ({
  telemetry,
  gamepad,
  messages,
  memories,
  activeSeason,
  activeBiome,
  currentPOI,
  nearLeaf,
  gatheredLeaves,
  onSelectSeason,
  onSelectBiome,
  onSendMessage,
  onTriggerCompanionAction,
  onTriggerPlayerAction,
  isAutonomousWandering,
  onToggleAutonomousWander,
  onReciteFaerunLore,
  onOpenInventory,
  onGatherNearLeaf
}) => {
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'realm' | 'journal' | 'actions' | 'telemetry'>('realm');

  // Forgotten Realms Wiki Search State
  const [loreSearchQuery, setLoreSearchQuery] = useState('');
  const [isSearchingLore, setIsSearchingLore] = useState(false);
  const [selectedPoiDetails, setSelectedPoiDetails] = useState<{ title: string; text: string; url?: string } | null>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleInspectLocation = async (loc: FaerunLocation) => {
    setIsSearchingLore(true);
    const lead = await fetchFaerunArticleLead(loc.name.replace(/ /g, '_'));
    const text = lead || `${loc.summary} ${loc.loreSnippet}`;
    setSelectedPoiDetails({
      title: loc.name,
      text,
      url: `https://forgottenrealms.fandom.com/wiki/${encodeURIComponent(loc.name)}`
    });
    setIsSearchingLore(false);
  };

  const handleWikiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loreSearchQuery.trim()) return;
    setIsSearchingLore(true);
    const results = await searchForgottenRealms(loreSearchQuery.trim());
    if (results.length > 0) {
      const top = results[0];
      const lead = await fetchFaerunArticleLead(top.title.replace(/ /g, '_'));
      setSelectedPoiDetails({
        title: top.title,
        text: lead || `Discovered ${top.title} along the Sword Coast.`,
        url: top.url
      });
    } else {
      setSelectedPoiDetails({
        title: loreSearchQuery,
        text: `No exact chronicles found for "${loreSearchQuery}" in the Candlekeep archives.`
      });
    }
    setIsSearchingLore(false);
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: '420px',
      height: '100%',
      background: 'rgba(11, 15, 29, 0.92)',
      backdropFilter: 'blur(16px)',
      borderLeft: '1px solid rgba(56, 189, 248, 0.25)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10,
      color: '#e2e8f0',
      userSelect: 'none'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Brain style={{ color: '#38bdf8', width: 20, height: 20 }} />
          <span style={{ fontWeight: 700, fontSize: '1.02rem', letterSpacing: '0.05em' }}>CORTEX COMPANION</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onOpenInventory}
            title="Open D&D Equipment Deck & Encumbrance (I key)"
            style={{
              padding: '4px 10px',
              background: 'linear-gradient(90deg, #0284c7, #2563eb)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
            <Shield size={13} /> DECK [I]
          </button>
          <div style={{
            fontSize: '0.72rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: gamepad.connected ? '#4ade80' : '#94a3b8'
          }}>
            <Gamepad2 style={{ width: 15, height: 15 }} />
            <span>{gamepad.connected ? 'GAMEPAD' : 'KEYBOARD'}</span>
          </div>
        </div>
      </div>

      {/* Near Leaf Resource Proximity Banner */}
      {nearLeaf && (
        <div style={{
          padding: '8px 14px',
          background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.35), rgba(15, 23, 42, 0.9))',
          borderBottom: '1px solid #10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem'
        }}>
          <div>
            <span style={{ color: '#4ade80', fontWeight: 700 }}>🍃 NEAR FLORA: </span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{nearLeaf.name}</span>
          </div>
          <button
            onClick={onGatherNearLeaf}
            style={{
              padding: '3px 9px',
              background: '#10b981',
              border: 'none',
              borderRadius: '4px',
              color: '#000',
              fontSize: '0.70rem',
              cursor: 'pointer',
              fontWeight: 700
            }}>
            GATHER [E]
          </button>
        </div>
      )}

      {/* Persistent POI Proximity Banner */}
      {currentPOI && (
        <div style={{
          padding: '8px 14px',
          background: 'linear-gradient(90deg, rgba(2, 132, 199, 0.35), rgba(15, 23, 42, 0.9))',
          borderBottom: '1px solid #38bdf8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem'
        }}>
          <div>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>🏛️ NEAR WAYSTONE: </span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{currentPOI.name}</span>
            <span style={{ color: '#94a3b8', fontSize: '0.68rem', marginLeft: '4px' }}>({currentPOI.region})</span>
          </div>
          <button
            onClick={() => handleInspectLocation(currentPOI)}
            style={{
              padding: '3px 8px',
              background: '#0284c7',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '0.68rem',
              cursor: 'pointer',
              fontWeight: 600
            }}>
            INSPECT
          </button>
        </div>
      )}

      {/* Autonomous Free-Will Switch Bar */}
      <div style={{
        padding: '7px 16px',
        background: isAutonomousWandering ? 'rgba(2, 132, 199, 0.25)' : 'rgba(0, 0, 0, 0.3)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.74rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Compass size={13} style={{ color: isAutonomousWandering ? '#38bdf8' : '#94a3b8' }} />
          <span style={{ fontWeight: 600 }}>Roam:</span>
          <span style={{ color: isAutonomousWandering ? '#38bdf8' : '#64748b' }}>
            {isAutonomousWandering ? 'FREE WILL' : 'TETHERED'}
          </span>
        </div>
        <button
          onClick={onToggleAutonomousWander}
          style={{
            padding: '2px 8px',
            background: isAutonomousWandering ? '#0284c7' : 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '0.68rem',
            cursor: 'pointer',
            fontWeight: 600
          }}>
          {isAutonomousWandering ? 'TETHER' : 'UNLEASH'}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(0, 0, 0, 0.2)'
      }}>
        <button
          onClick={() => setActiveTab('realm')}
          style={{
            flex: 1,
            padding: '9px 0',
            background: activeTab === 'realm' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'realm' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'realm' ? '#38bdf8' : '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
          <Trees size={13} /> Faerûn
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            flex: 1,
            padding: '9px 0',
            background: activeTab === 'chat' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'chat' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'chat' ? '#38bdf8' : '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
          <MessageSquare size={13} /> Chat
        </button>
        <button
          onClick={() => setActiveTab('journal')}
          style={{
            flex: 1,
            padding: '9px 0',
            background: activeTab === 'journal' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'journal' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'journal' ? '#38bdf8' : '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
          <BookOpen size={13} /> 4D Journal ({memories.length})
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          style={{
            flex: 1,
            padding: '9px 0',
            background: activeTab === 'actions' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'actions' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'actions' ? '#38bdf8' : '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
          <Sparkles size={13} /> Clips
        </button>
      </div>

      {/* Main Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
        {/* TAB 1: FAERÛN REALM & X-TREE BIOMES */}
        {activeTab === 'realm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Season Selector */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.8)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(56, 189, 248, 0.2)'
            }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sun size={14} /> ACTIVE SEASONAL PALETTE
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {(['spring', 'summer', 'autumn', 'winter'] as SeasonType[]).map(season => {
                  const isSelected = activeSeason === season;
                  const icons = {
                    spring: <Flower2 size={12} />,
                    summer: <Sun size={12} />,
                    autumn: <Leaf size={12} />,
                    winter: <CloudSnow size={12} />
                  };
                  return (
                    <button
                      key={season}
                      onClick={() => onSelectSeason(season)}
                      style={{
                        padding: '6px 4px',
                        background: isSelected ? '#0284c7' : 'rgba(30, 41, 59, 0.8)',
                        border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: isSelected ? '#fff' : '#94a3b8',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        textTransform: 'capitalize'
                      }}>
                      {icons[season]} {season}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Combinatorial X-Tree Engine Metrics */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(56, 189, 248, 0.15)',
              fontSize: '0.74rem',
              color: '#94a3b8'
            }}>
              <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '4px' }}>
                🌲 DOUBLE-BILLBOARD ("X-TREE") MATRIX
              </div>
              <div>
                Formula: <code style={{ color: '#4ade80' }}>11 NS × 11 EW × 6 Biomes × 4 Seasons</code>
              </div>
              <div style={{ marginTop: '2px', color: '#e2e8f0', fontWeight: 600 }}>
                = 2,904 Combinatorial Procedural Trees
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>
                Perpendicular double-planes (45° cross) provide omnidirectional volumetric depth & tip over on combat impact.
              </div>
            </div>

            {/* Forgotten Realms Live Wiki Search */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.8)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(56, 189, 248, 0.2)'
            }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Search size={14} /> FORGOTTEN REALMS FANDOM API
              </div>
              <form onSubmit={handleWikiSearch} style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                <input
                  type="text"
                  value={loreSearchQuery}
                  onChange={e => setLoreSearchQuery(e.target.value)}
                  placeholder="Query lore (e.g. Baldur's Gate, Mystra)..."
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    background: 'rgba(30, 41, 59, 0.9)',
                    color: '#fff',
                    fontSize: '0.75rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={isSearchingLore}
                  style={{
                    padding: '6px 12px',
                    background: '#0284c7',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}>
                  {isSearchingLore ? '...' : 'QUERY'}
                </button>
              </form>

              {/* Quick Canonical Landmarks */}
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '6px' }}>Sword Coast Waystones:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {CANONICAL_FAERUN_LOCATIONS.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => handleInspectLocation(loc)}
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(30, 41, 59, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      color: '#e2e8f0',
                      fontSize: '0.68rem',
                      cursor: 'pointer'
                    }}>
                    📍 {loc.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Lore Details Card */}
            {selectedPoiDetails && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.9)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #38bdf8',
                fontSize: '0.78rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.85rem' }}>{selectedPoiDetails.title}</span>
                  {selectedPoiDetails.url && (
                    <a
                      href={selectedPoiDetails.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}>
                      Wiki <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                <div style={{ color: '#cbd5e1', lineHeight: '1.45', marginBottom: '10px' }}>
                  {selectedPoiDetails.text}
                </div>
                <button
                  onClick={() => {
                    const matchedLoc = CANONICAL_FAERUN_LOCATIONS.find(l => l.name === selectedPoiDetails.title) || {
                      id: 'custom_poi',
                      name: selectedPoiDetails.title,
                      aliases: [],
                      region: 'Faerûn',
                      summary: selectedPoiDetails.text,
                      loreSnippet: '',
                      biome: 'temperate' as BiomeType,
                      poiType: 'waystone' as const,
                      worldCoords: [0, 0] as [number, number]
                    };
                    onReciteFaerunLore(matchedLoc, selectedPoiDetails.text);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'linear-gradient(90deg, #0284c7, #2563eb)',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}>
                  <Brain size={14} /> RECITE LORE VIA CORTEX (LOG 4D MEMORY)
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CHAT WITH MYOS CORTEX */}
        {activeTab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              fontSize: '0.72rem',
              color: '#94a3b8',
              background: 'rgba(56, 189, 248, 0.08)',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(56, 189, 248, 0.15)'
            }}>
              💡 Wired to MyOS Cortex on localhost:11434. 4D spatiotemporal memory indexed by mxbai-embed-large.
            </div>

            {/* Message Feed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.sender === 'player' ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: m.sender === 'player' ? '#2563eb' : '#1e293b',
                    color: '#f8fafc',
                    fontSize: '0.83rem',
                    border: m.sender === 'companion' ? '1px solid rgba(56, 189, 248, 0.3)' : 'none'
                  }}>
                  <div style={{ fontSize: '0.65rem', opacity: 0.7, marginBottom: '2px' }}>
                    {m.sender === 'player' ? 'YOU (ZAK)' : 'MYOS CORTEX'}
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

        {/* TAB 3: 4D SPATIOTEMPORAL JOURNAL */}
        {activeTab === 'journal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Chronological 4D travel log. Each entry records (X, Z, Time, Dwell Duration) and mxbai-embed-large vector:
            </div>

            {memories.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                No journal entries yet. Linger near an X-Tree, topple a prop, inspect a Forgotten Realms waystone, or hit "SCAN VISION" to record a memory!
              </div>
            ) : (
              memories.map(entry => (
                <div
                  key={entry.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '0.78rem'
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#38bdf8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} />
                      <span style={{ fontWeight: 600 }}>({entry.coords[0].toFixed(1)}, {entry.coords[2].toFixed(1)})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '0.7rem' }}>
                      <Clock size={11} />
                      <span>{entry.timestamp}</span>
                    </div>
                  </div>

                  <div style={{ color: '#e2e8f0', marginTop: '2px' }}>
                    {entry.observation}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '4px',
                    fontSize: '0.68rem',
                    color: '#64748b'
                  }}>
                    <span>Dwell: {Math.round(entry.dwellSeconds)}s</span>
                    <span style={{ color: entry.embedding ? '#4ade80' : '#f59e0b' }}>
                      {entry.embedding ? '● 1024-dim Vector Indexed' : '○ Text Only'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: ANIMATION CLIPS OVERRIDE */}
        {activeTab === 'actions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px' }}>
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
