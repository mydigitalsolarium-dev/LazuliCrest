import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Float, ContactShadows, PresentationControls, Text } from '@react-three/drei';
import { FRIDGE_ITEMS } from '../utils/helpers'; // Using your specific beverage list

// ── 3D Glass Pitcher Component ────────────────────────────────
function Pitcher({ fillLevel, color }) {
  return (
    <group position={[0, -1, 0]}>
      {/* Outer Glass Shell */}
      <mesh>
        <cylinderGeometry args={[1.2, 1, 3, 32]} />
        <meshPhysicalMaterial 
          transparent 
          opacity={0.2} 
          transmission={0.95} 
          thickness={0.2} 
          roughness={0} 
        />
      </mesh>
      
      {/* Dynamic Liquid Fill */}
      <mesh position={[0, -1.5 + (fillLevel * 1.5), 0]}>
        <cylinderGeometry args={[1.15, 0.95, fillLevel * 3, 32]} />
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={0.8} 
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
}

// ── Main UI Component ─────────────────────────────────────────
export default function HydrationTracker({ data, upd }) {
  const [selectedDrink, setSelectedDrink] = useState(FRIDGE_ITEMS[0]);
  const currentHydration = data.hydration?.today || 0;
  const goal = data.hydration?.goal || 8;
  const fillPercentage = Math.min(currentHydration / goal, 1);

  const addDrink = (item) => {
    const newTotal = currentHydration + item.hydration;
    const newLog = [
      ...(data.hydration?.log || []),
      { id: Date.now(), type: item.label, amount: item.hydration, time: new Date().toISOString() }
    ];
    upd('hydration', { ...data.hydration, today: newTotal, log: newLog });
  };

  return (
    <div className="page-fade" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
      <div className="glass-card-static" style={{ height: '600px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond', color: '#C9A84C' }}>Daily Intake</h2>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>{currentHydration.toFixed(1)} / {goal} <span style={{ fontSize: 14, opacity: 0.5 }}>Units</span></div>
        </div>

        {/* 3D Scene */}
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <PresentationControls global config={{ mass: 2, tension: 500 }} snap={{ mass: 4, tension: 1500 }} rotation={[0, 0.3, 0]} polar={[-Math.PI / 3, Math.PI / 3]} azimuth={[-Math.PI / 1.4, Math.PI / 1.4]}>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
              <Pitcher fillLevel={fillPercentage} color={selectedDrink.color} />
            </Float>
          </PresentationControls>
          <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2} far={4.5} />
        </Canvas>
      </div>

      {/* "Mini Fridge" Selection Menu */}
      <div className="sidebar-selection" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(201,168,76,0.5)', letterSpacing: '1px' }}>MINI FRIDGE</div>
        {FRIDGE_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => { setSelectedDrink(item); addDrink(item); }}
            className="glass-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              cursor: 'pointer',
              borderLeft: selectedDrink.id === item.id ? `4px solid ${item.color}` : '1px solid rgba(123,47,190,0.2)',
              textAlign: 'left',
              background: selectedDrink.id === item.id ? 'rgba(255,255,255,0.05)' : 'transparent'
            }}
          >
            <span style={{ fontSize: '20px' }}>{item.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>{item.label}</div>
              <div style={{ fontSize: '10px', opacity: 0.5 }}>+{item.hydration} hydration unit</div>
            </div>
          </button>
        ))}
        
        <button 
          className="btn btn-subtle" 
          style={{ marginTop: 'auto', fontSize: '11px' }}
          onClick={() => upd('hydration', { ...data.hydration, today: 0, log: [] })}
        >
          Reset Daily Goal
        </button>
      </div>
    </div>
  );
}