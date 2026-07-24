"use client";

// The hero's 3D object — a distorted metallic icosahedron with an FGA-yellow
// wireframe shell, floating + pointer-reactive. Inline Lightformer environment
// (no external HDR fetch) for reliable premium reflections.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";

export function WebGLObject() {
  const mesh = useRef<THREE.Mesh>(null);
  const wire = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const px = state.pointer.x;
    const py = state.pointer.y;
    if (mesh.current) {
      mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x, py * 0.3 + t * 0.04, 0.04);
      mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, px * 0.5 + t * 0.07, 0.04);
    }
    if (wire.current && mesh.current) {
      wire.current.rotation.x = mesh.current.rotation.x;
      wire.current.rotation.y = mesh.current.rotation.y;
    }
  });

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 4, 5]} intensity={2.2} color="#ffffff" />
      <pointLight position={[-5, -2, -3]} intensity={4} color="#f6eb1e" />
      <Float speed={1.3} rotationIntensity={0.35} floatIntensity={0.7} position={[0, 0.1, 0]}>
        {/* Scale is tuned so the object fits INSIDE its column without cropping.
            The R3F camera frames the container vertically, so a tall narrow
            column crops a wide object; 1.05 keeps the silhouette whole. */}
        <mesh ref={mesh} scale={1.05}>
          <icosahedronGeometry args={[1, 18]} />
          <MeshDistortMaterial color="#101015" roughness={0.18} metalness={0.92} distort={0.34} speed={1.5} envMapIntensity={1.3} />
        </mesh>
        <mesh ref={wire} scale={1.1}>
          <icosahedronGeometry args={[1, 3]} />
          <meshBasicMaterial color="#f6eb1e" wireframe transparent opacity={0.22} />
        </mesh>
      </Float>
      <Environment resolution={256}>
        <Lightformer intensity={2} position={[0, 2, 4]} scale={[5, 5, 1]} color="#ffffff" />
        <Lightformer intensity={3.4} position={[-4, -1, -2]} scale={[4, 4, 1]} color="#f6eb1e" />
        <Lightformer intensity={1.4} position={[4, 1, -3]} scale={[3, 3, 1]} color="#8ab4ff" />
      </Environment>
    </>
  );
}
