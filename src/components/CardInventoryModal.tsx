import React, { useState, useMemo } from 'react';
import { Shield, Sword, Sparkles, Feather, X, RefreshCw } from 'lucide-react';

export type EquipmentSlot = 'head' | 'chest' | 'mainhand' | 'offhand' | 'feet' | 'accessory';

export interface EquipmentCard {
  id: string;
  name: string;
  slot: EquipmentSlot;
  weight: number;
  stats: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
  icon: string;
}

export const INITIAL_EQUIPMENT_CARDS: EquipmentCard[] = [
  { id: 'item_moonblade', name: 'Moonblade Longsword', slot: 'mainhand', weight: 3.0, stats: '1d8+2 Slashing', rarity: 'Rare', icon: '/props/equipment/item_moonblade.png' },
  { id: 'item_silver_dagger', name: 'Silvered Dagger', slot: 'mainhand', weight: 1.0, stats: '1d4 Piercing', rarity: 'Common', icon: '/props/equipment/item_silver_dagger.png' },
  { id: 'item_astral_staff', name: 'Astral Pine Staff', slot: 'mainhand', weight: 4.0, stats: '1d6 Bludgeoning + Force', rarity: 'Rare', icon: '/props/equipment/item_astral_staff.png' },
  { id: 'item_sun_blade', name: 'Sun Blade of Lathander', slot: 'mainhand', weight: 3.0, stats: '1d8 Radiant', rarity: 'Legendary', icon: '/props/equipment/item_sun_blade.png' },
  { id: 'item_kite_shield', name: 'Kite Shield of Tempus', slot: 'offhand', weight: 6.0, stats: '+2 Armor Class', rarity: 'Uncommon', icon: '/props/equipment/item_kite_shield.png' },
  { id: 'item_spell_tome', name: 'Candlekeep Spell Tome', slot: 'offhand', weight: 3.0, stats: '+1 Spell DC', rarity: 'Rare', icon: '/props/equipment/item_spell_tome.png' },
  { id: 'item_iron_helm', name: 'Iron Vanguard Helm', slot: 'head', weight: 4.0, stats: '+1 AC, Resists Stun', rarity: 'Common', icon: '/props/equipment/item_iron_helm.png' },
  { id: 'item_circlet_selune', name: 'Silver Circlet of Selûne', slot: 'head', weight: 0.5, stats: '+2 Wis, Darkvision', rarity: 'Legendary', icon: '/props/equipment/item_circlet_selune.png' },
  { id: 'item_mithral_chain', name: 'Mithral Chainmail', slot: 'chest', weight: 18.0, stats: '+4 AC, Stealth Adv.', rarity: 'Rare', icon: '/props/equipment/item_mithral_chain.png' },
  { id: 'item_elven_tunic', name: 'High Forest Ranger Tunic', slot: 'chest', weight: 4.0, stats: '+2 AC, +10ft Speed', rarity: 'Uncommon', icon: '/props/equipment/item_elven_tunic.png' },
  { id: 'item_leather_boots', name: 'Boots of Elvenkind', slot: 'feet', weight: 2.0, stats: 'Silent Movement', rarity: 'Uncommon', icon: '/props/equipment/item_leather_boots.png' },
  { id: 'item_winged_boots', name: 'Winged Astral Greaves', slot: 'feet', weight: 3.0, stats: 'Fly Speed 30ft', rarity: 'Legendary', icon: '/props/equipment/item_winged_boots.png' },
  { id: 'item_ring_protection', name: 'Ring of Protection', slot: 'accessory', weight: 0.1, stats: '+1 AC & Saves', rarity: 'Rare', icon: '/props/equipment/item_ring_protection.png' }
];

interface CardInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  gatheredLeaves: Record<string, number>;
  onEquipChange?: (equipped: Record<EquipmentSlot, EquipmentCard | null>) => void;
}

const RARITY_COLORS: Record<string, { border: string; glow: string; text: string }> = {
  Common: { border: '#64748b', glow: 'rgba(100, 116, 139, 0.3)', text: '#cbd5e1' },
  Uncommon: { border: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', text: '#6ee7b7' },
  Rare: { border: '#0284c7', glow: 'rgba(2, 132, 199, 0.45)', text: '#38bdf8' },
  Legendary: { border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.55)', text: '#fde047' }
};

export const CardInventoryModal: React.FC<CardInventoryModalProps> = ({
  isOpen,
  onClose,
  gatheredLeaves,
  onEquipChange
}) => {
  // Equipped slots on the paper-doll
  const [equipped, setEquipped] = useState<Record<EquipmentSlot, EquipmentCard | null>>({
    head: INITIAL_EQUIPMENT_CARDS.find(c => c.id === 'item_iron_helm') || null,
    chest: INITIAL_EQUIPMENT_CARDS.find(c => c.id === 'item_elven_tunic') || null,
    mainhand: INITIAL_EQUIPMENT_CARDS.find(c => c.id === 'item_moonblade') || null,
    offhand: INITIAL_EQUIPMENT_CARDS.find(c => c.id === 'item_kite_shield') || null,
    feet: INITIAL_EQUIPMENT_CARDS.find(c => c.id === 'item_leather_boots') || null,
    accessory: INITIAL_EQUIPMENT_CARDS.find(c => c.id === 'item_ring_protection') || null
  });

  // Remaining cards in the inventory deck
  const [deck, setDeck] = useState<EquipmentCard[]>(() => {
    const equippedIds = new Set(['item_iron_helm', 'item_elven_tunic', 'item_moonblade', 'item_kite_shield', 'item_leather_boots', 'item_ring_protection']);
    return INITIAL_EQUIPMENT_CARDS.filter(c => !equippedIds.has(c.id));
  });

  // Strength score & Skyrim / D&D encumbrance formula (Strength * 15 = max carry weight)
  const strengthScore = 14;
  const maxCarryWeight = strengthScore * 15; // 210 lbs

  // Total weight calculation
  const totalWeight = useMemo(() => {
    let w = 0;
    Object.values(equipped).forEach(item => { if (item) w += item.weight; });
    deck.forEach(item => { w += item.weight; });
    // Leaves weigh 0.05 lbs each
    Object.values(gatheredLeaves).forEach(count => { w += count * 0.05; });
    return Math.round(w * 10) / 10;
  }, [equipped, deck, gatheredLeaves]);

  const encumbranceRatio = totalWeight / maxCarryWeight;
  const encumbranceColor = encumbranceRatio > 1.0 ? '#ef4444' : (encumbranceRatio > 0.7 ? '#f59e0b' : '#10b981');

  // Equip card: takes card from deck and swaps with slot
  const handleEquipCard = (card: EquipmentCard) => {
    const slot = card.slot;
    const currentEquipped = equipped[slot];

    // Remove new card from deck, and add previous equipped card back to deck
    setDeck(prevDeck => {
      const nextDeck = prevDeck.filter(c => c.id !== card.id);
      if (currentEquipped) {
        nextDeck.push(currentEquipped);
      }
      return nextDeck;
    });

    setEquipped(prev => {
      const updated = { ...prev, [slot]: card };
      if (onEquipChange) onEquipChange(updated);
      return updated;
    });
  };

  // Unequip card: moves item from slot back to deck
  const handleUnequipSlot = (slot: EquipmentSlot) => {
    const item = equipped[slot];
    if (!item) return;

    setDeck(prev => [...prev, item]);
    setEquipped(prev => {
      const updated = { ...prev, [slot]: null };
      if (onEquipChange) onEquipChange(updated);
      return updated;
    });
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(5, 10, 20, 0.85)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      userSelect: 'none'
    }}>
      <div style={{
        width: '920px',
        maxHeight: '90vh',
        background: 'linear-gradient(180deg, #0f172a 0%, #090d16 100%)',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        borderRadius: '14px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#e2e8f0'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield style={{ color: '#38bdf8', width: 22, height: 22 }} />
            <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '0.05em' }}>
              D&D 5E EQUIPMENT DECK & ENCUMBRANCE
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
            <X size={20} />
          </button>
        </div>

        {/* Encumbrance Bar (Skyrim / D&D Style) */}
        <div style={{
          padding: '10px 22px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
            <Feather size={15} style={{ color: encumbranceColor }} />
            <span>Carry Weight: <b>{totalWeight}</b> / {maxCarryWeight} lbs (STR {strengthScore})</span>
            <span style={{
              marginLeft: '6px',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 700,
              background: encumbranceColor,
              color: '#000'
            }}>
              {encumbranceRatio > 1.0 ? 'OVERENCUMBERED' : (encumbranceRatio > 0.7 ? 'HEAVY LOAD' : 'LIGHT')}
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ width: '220px', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, encumbranceRatio * 100)}%`,
              height: '100%',
              background: encumbranceColor,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Main Content: Paper-Doll Left, Card Deck Right */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left: Paper-Doll Equipment Slots */}
          <div style={{
            width: '320px',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px',
            background: 'rgba(11, 15, 29, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            overflowY: 'auto'
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
              EQUIPPED SLOTS (CLICK TO UNEQUIP)
            </div>

            {(['head', 'chest', 'mainhand', 'offhand', 'feet', 'accessory'] as EquipmentSlot[]).map(slot => {
              const item = equipped[slot];
              const slotLabels: Record<EquipmentSlot, string> = {
                head: 'HEAD',
                chest: 'CHEST',
                mainhand: 'MAIN HAND',
                offhand: 'OFF HAND',
                feet: 'FEET',
                accessory: 'ACCESSORY'
              };

              return (
                <div
                  key={slot}
                  onClick={() => handleUnequipSlot(slot)}
                  style={{
                    background: item ? 'rgba(30, 41, 59, 0.85)' : 'rgba(15, 23, 42, 0.5)',
                    border: item ? `1px solid ${RARITY_COLORS[item.rarity].border}` : '1px dashed rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: item ? 'pointer' : 'default',
                    transition: 'all 0.2s'
                  }}>
                  {item ? (
                    <img src={item.icon} alt={item.name} style={{ width: 40, height: 40, objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: 40, height: 40, border: '1px dashed #64748b', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.7rem' }}>
                      EMPTY
                    </div>
                  )}

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                      {slotLabels[slot]}
                    </div>
                    {item ? (
                      <>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: RARITY_COLORS[item.rarity].text, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          {item.stats} (⚖️ {item.weight} lbs)
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>No item equipped</div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Gathered Alchemy Resources Section */}
            <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4ade80', marginBottom: '6px' }}>
                🍃 GATHERED FLORA RESOURCES
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.72rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px' }}>
                  Oak Leaves: <b>{gatheredLeaves['Emerald Oak Leaf'] || 0}</b>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px' }}>
                  Pine Needles: <b>{gatheredLeaves['Astral Pine Needle'] || 0}</b>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px' }}>
                  Amber Leaves: <b>{gatheredLeaves['Golden Amber Leaf'] || 0}</b>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px' }}>
                  Sakura Petals: <b>{gatheredLeaves['Myth Drannor Petal'] || 0}</b>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px' }}>
                  Spore Shards: <b>{gatheredLeaves['Luminescent Spore Shard'] || 0}</b>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px' }}>
                  Frost Crystals: <b>{gatheredLeaves['Glacial Frost Crystal'] || 0}</b>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Equipment Card Deck */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8' }}>
                AVAILABLE DECK CARDS ({deck.length} ITEMS)
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                Click a card to equip to its matching body slot
              </div>
            </div>

            {deck.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                All equipment cards are currently equipped!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '12px' }}>
                {deck.map(card => {
                  const rarity = RARITY_COLORS[card.rarity];
                  return (
                    <div
                      key={card.id}
                      onClick={() => handleEquipCard(card)}
                      style={{
                        background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)',
                        border: `1.5px solid ${rarity.border}`,
                        borderRadius: '10px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        boxShadow: `0 4px 14px ${rarity.glow}`,
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = `0 8px 22px ${rarity.glow}`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = `0 4px 14px ${rarity.glow}`;
                      }}>
                      {/* Slot & Rarity Tag */}
                      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', fontWeight: 700 }}>
                        <span style={{ color: '#94a3b8', textTransform: 'uppercase' }}>{card.slot}</span>
                        <span style={{ color: rarity.text }}>{card.rarity}</span>
                      </div>

                      {/* Card Icon */}
                      <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <img src={card.icon} alt={card.name} style={{ width: 52, height: 52, objectFit: 'contain' }} />
                      </div>

                      {/* Name & Stats */}
                      <div style={{ textAlign: 'center', width: '100%' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: rarity.text, marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {card.name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#cbd5e1', lineHeight: '1.2' }}>
                          {card.stats}
                        </div>
                      </div>

                      {/* Weight & Equip Action */}
                      <div style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 'auto',
                        paddingTop: '6px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        fontSize: '0.68rem',
                        color: '#94a3b8'
                      }}>
                        <span>⚖️ {card.weight} lbs</span>
                        <span style={{ color: '#38bdf8', fontWeight: 700 }}>EQUIP ➔</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
