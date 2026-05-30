"use client";
import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function Blob({
  position,
  color,
  scale = 1,
  speed = 2,
  distort = 0.4,
}: {
  position: [number, number, number];
  color: string;
  scale?: number;
  speed?: number;
  distort?: number;
}) {
  return (
    <Float speed={speed} rotationIntensity={0.8} floatIntensity={1.2}>
      <mesh position={position} scale={scale}>
        <icosahedronGeometry args={[1, 3]} />
        <MeshDistortMaterial
          color={color}
          transparent
          opacity={0.52}
          distort={distort}
          speed={speed * 1.5}
          roughness={0}
          metalness={0.15}
        />
      </mesh>
    </Float>
  );
}

function Ring({
  position,
  color,
  radius = 1.2,
}: {
  position: [number, number, number];
  color: string;
  radius?: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.x = state.clock.elapsedTime * 0.28;
    mesh.current.rotation.z = state.clock.elapsedTime * 0.14;
  });
  return (
    <Float speed={1.4} rotationIntensity={0.3} floatIntensity={0.8}>
      <mesh ref={mesh} position={position}>
        <torusGeometry args={[radius, 0.1, 16, 64]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.42}
          roughness={0}
          metalness={1}
        />
      </mesh>
    </Float>
  );
}

function SceneContent() {
  const { mouse } = useThree();
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      mouse.x * 0.12,
      0.045
    );
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      -mouse.y * 0.08,
      0.045
    );
  });

  return (
    <group ref={group}>
      <Blob position={[-4, 2, -4]} color="#0EA5E9" scale={1.5} speed={1.6} distort={0.38} />
      <Blob position={[3.5, -1.2, -5]} color="#38BDF8" scale={1.1} speed={2.4} distort={0.5} />
      <Blob position={[1.2, 2.8, -6]} color="#7DD3FC" scale={0.85} speed={3} distort={0.45} />
      <Blob position={[-1.8, -2.8, -3.5]} color="#BAE6FD" scale={0.65} speed={2.2} distort={0.35} />
      <Ring position={[-2.8, -0.4, -2.5]} color="#0EA5E9" radius={1.5} />
      <Ring position={[3.8, 1.6, -3.5]} color="#F97316" radius={0.95} />
      <Ring position={[-0.2, 3.2, -5]} color="#38BDF8" radius={1.9} />
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 55 }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[0, 10, 5]} intensity={0.5} />
      <pointLight position={[-5, 4, 3]} intensity={4} color="#0EA5E9" />
      <pointLight position={[5, -3, 3]} intensity={2.5} color="#F97316" />
      <pointLight position={[0, -5, 2]} intensity={1.5} color="#38BDF8" />
      <SceneContent />
    </Canvas>
  );
}
