
import React, { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, Stars, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

const AnimatedShape = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHover] = useState(false);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.x = time * 0.1;
      meshRef.current.rotation.y = time * 0.15;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <Sphere
        ref={meshRef}
        args={[1, 100, 100]}
        scale={2.2}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <MeshDistortMaterial
          color={hovered ? "#818cf8" : "#3b82f6"}
          attach="material"
          distort={0.4}
          speed={4}
          roughness={0}
          metalness={0.8}
        />
      </Sphere>
    </Float>
  );
};

const MouseParticles = () => {
  const points = useRef<THREE.Points>(null!);
  const { mouse } = useThree();

  useFrame(() => {
    if (points.current) {
      points.current.rotation.x += 0.001;
      points.current.rotation.y += 0.001;
      // Subtle reaction to mouse
      points.current.position.x = THREE.MathUtils.lerp(points.current.position.x, mouse.x * 0.5, 0.1);
      points.current.position.y = THREE.MathUtils.lerp(points.current.position.y, mouse.y * 0.5, 0.1);
    }
  });

  const count = 2000;
  const positions = React.useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return pos;
  }, []);

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#ffffff" transparent opacity={0.4} />
    </points>
  );
};

const Hero3D: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 8]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <pointLight position={[-10, -10, -10]} color="#8b5cf6" intensity={1} />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <AnimatedShape />
        <MouseParticles />
      </Canvas>
    </div>
  );
};

export default Hero3D;
