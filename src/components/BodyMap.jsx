import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Capsule, MeshDistortMaterial, Float, Text, ContactShadows } from '@react-three/drei';

function BodyPart({ position, label, severity, active, onClick }) {
  return (
    <group position={position} onClick={onClick}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <Capsule args={[0.2, 0.6, 4, 16]}>
          <meshStandardMaterial 
            color={active ? "#C9A84C" : "#7B2FBE"} 
            emissive={active ? "#C9A84C" : "#7B2FBE"}
            emissiveIntensity={severity / 10}
            roughness={0.3}
            metalness={0.8}
          />
        </Capsule>
      </Float>
      {active && (
        <Text
          position={[0, 1.2, 0]}
          fontSize={0.2}
          color="#F0E8FF"
          font="'DM Sans', sans-serif"
        >
          {`${label}: ${severity}/10`}
        </Text>
      )}
    </group>
  );
}

export default function BodyMap({ data }) {
  const [selected, setSelected] = useState(null);
  
  // Use the bodyMap data from your profile/state
  const mapData = data?.bodyMap || [
    { id: 'head', label: 'Head', severity: 4, pos: [0, 2, 0] },
    { id: 'torso', label: 'Torso', severity: 2, pos: [0, 0, 0] },
    { id: 'l-arm', label: 'Left Arm', severity: 6, pos: [-1, 0.5, 0] },
    { id: 'r-arm', label: 'Right Arm', severity: 1, pos: [1, 0.5, 0] },
  ];

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 600, color: '#C9A84C' }}>◎ Body Map</div>
        <p style={{ fontSize: 13, color: 'rgba(240,232,255,.38)' }}>Interactive pain and symptom localization</p>
      </div>

      <div className="glass-card" style={{ flex: 1, position: 'relative', background: 'rgba(0,0,0,0.2)', borderRadius: 16, border: '1px solid rgba(123,47,190,0.1)' }}>
        <Canvas camera={{ position: [0, 0, 7], fov: 40 }}>
          <ambientLight intensity={0.7} />
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          <Suspense fallback={null}>
            {mapData.map((part) => (
              <BodyPart 
                key={part.id}
                position={part.pos}
                label={part.label}
                severity={part.severity}
                active={selected === part.id}
                onClick={() => setSelected(part.id === selected ? null : part.id)}
              />
            ))}
            <ContactShadows opacity={0.4} scale={10} blur={2} far={4.5} />
            <OrbitControls enableZoom={false} />
          </Suspense>
        </Canvas>

        <div style={{ position: 'absolute', top: 20, right: 20, width: 200 }}>
          <div style={{ background: 'rgba(20,10,30,0.6)', padding: 15, borderRadius: 12, border: '1px solid rgba(201,168,76,0.2)', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: 11, color: '#C9A84C', textTransform: 'uppercase', marginBottom: 8 }}>Legend</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#7B2FBE' }} />
              <span style={{ fontSize: 11, color: 'rgba(240,232,255,0.6)' }}>Low Severity</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#C9A84C' }} />
              <span style={{ fontSize: 11, color: 'rgba(240,232,255,0.6)' }}>Active Selection</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}