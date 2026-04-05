import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Float } from '@react-three/drei';

function NeuralNode() {
  return (
    <Float speed={4} rotationIntensity={1} floatIntensity={2}>
      <Sphere args={[1, 100, 100]} scale={1.4}>
        <MeshDistortMaterial
          color="#7B2FBE"
          attach="material"
          distort={0.4}
          speed={1.5}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
    </Float>
  );
}

export default function BrainSection({ data }) {
  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 600, color: '#C9A84C' }}>🧠 The Brain</div>
        <p style={{ fontSize: 13, color: 'rgba(240,232,255,.38)' }}>Neural health and cognitive pattern tracking</p>
      </div>

      <div className="glass-card" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} />
          <Suspense fallback={null}>
            <NeuralNode />
            <OrbitControls enableZoom={false} />
          </Suspense>
        </Canvas>
        
        <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, pointerEvents: 'none' }}>
           <div style={{ background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(201,168,76,0.2)' }}>
              <div style={{ fontSize: 12, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 5 }}>Status</div>
              <div style={{ fontSize: 14, color: '#F0E8FF' }}>System scanning cognitive logs... All neural pathways stable.</div>
           </div>
        </div>
      </div>
    </div>
  );
}