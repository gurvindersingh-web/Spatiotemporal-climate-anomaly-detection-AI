import React, { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { Stars } from '@react-three/drei';

export default function R3FEarth() {
  const earthRef = useRef();
  const atmosphereRef = useRef();
  const cloudsRef = useRef();

  const earthMap = useLoader(
    THREE.TextureLoader,
    'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'
  );
  const cloudMap = useLoader(
    THREE.TextureLoader,
    'https://threejs.org/examples/textures/planets/earth_clouds_1024.png'
  );

  earthMap.colorSpace = THREE.SRGBColorSpace;
  cloudMap.colorSpace = THREE.SRGBColorSpace;

  useFrame(({ clock, pointer }) => {
    const elapsedTime = clock.getElapsedTime();
    if (earthRef.current) {
      earthRef.current.rotation.y = elapsedTime / 8;
      earthRef.current.rotation.z = 0.1;
      earthRef.current.rotation.x = pointer.y * 0.1;
      earthRef.current.rotation.y += pointer.x * 0.1;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y = elapsedTime / 6;
      atmosphereRef.current.rotation.z = 0.1;
      atmosphereRef.current.rotation.x = pointer.y * 0.1;
      atmosphereRef.current.rotation.y += pointer.x * 0.1;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = elapsedTime / 7;
      cloudsRef.current.rotation.z = 0.1;
      cloudsRef.current.rotation.x = pointer.y * 0.08;
      cloudsRef.current.rotation.y += pointer.x * 0.08;
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 3, 5]} intensity={2.0} color="#00f3ff" />
      <pointLight position={[-5, 3, -5]} intensity={1.5} color="#bc13fe" />

      {/* Stars Background */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={1} fade speed={1} />

      {/* Earth body */}
      <mesh ref={earthRef} position={[0, 0, 0]} scale={2.5}>
        <sphereGeometry args={[1, 96, 96]} />
        <meshStandardMaterial
          map={earthMap}
          color="#ffffff"
          roughness={1}
          metalness={0.02}
          emissive="#08111f"
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Cloud layer */}
      <mesh ref={cloudsRef} scale={2.53}>
        <sphereGeometry args={[1, 96, 96]} />
        <meshStandardMaterial
          map={cloudMap}
          transparent
          opacity={0.32}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color="#ffffff"
        />
      </mesh>

      {/* Atmospheric Glow */}
      <mesh ref={atmosphereRef} scale={2.65}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#2d7ff9"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  );
}
