import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BackgroundGridProps {
  activity: 'low' | 'medium' | 'high';
}

function AnimatedGrid({ activity }: BackgroundGridProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uActivity;
        varying vec2 vUv;
        
        float grid(vec2 uv, float scale) {
          vec2 grid = abs(fract(uv * scale) - 0.5);
          return min(grid.x, grid.y);
        }
        
        void main() {
          vec2 uv = vUv;
          
          // Create animated grid pattern
          float gridPattern = grid(uv + sin(uTime * 0.5) * 0.1, 20.0);
          gridPattern = smoothstep(0.02, 0.05, gridPattern);
          
          // Add breathing effect based on activity
          float breathing = sin(uTime * (0.5 + uActivity * 2.0)) * 0.3 + 0.7;
          
          // Warehouse-style ambient color
          vec3 color = vec3(0.1, 0.15, 0.2) * breathing;
          
          // Grid lines with activity-based intensity
          color += vec3(0.0, 0.3, 0.6) * (1.0 - gridPattern) * (0.3 + uActivity * 0.7);
          
          // Add subtle scanlines
          float scanline = sin(uv.y * 300.0 + uTime * 2.0) * 0.02;
          color += scanline;
          
          gl_FragColor = vec4(color, 0.8);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uActivity: { value: activity === 'low' ? 0.2 : activity === 'medium' ? 0.5 : 0.8 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending
    });
  }, [activity]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uActivity.value = 
        activity === 'low' ? 0.2 : activity === 'medium' ? 0.5 : 0.8;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -5]}>
      <planeGeometry args={[20, 20]} />
      <shaderMaterial ref={materialRef} attach="material" {...shaderMaterial} />
    </mesh>
  );
}

function FloatingParticles({ activity }: BackgroundGridProps) {
  const particlesRef = useRef<THREE.Points>(null);
  
  const particleCount = activity === 'low' ? 50 : activity === 'medium' ? 100 : 150;
  
  const positions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 20;     // x
      positions[i + 1] = (Math.random() - 0.5) * 15; // y
      positions[i + 2] = (Math.random() - 0.5) * 10; // z
    }
    return positions;
  }, [particleCount]);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      
      // Animate particles based on activity
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(state.clock.elapsedTime + positions[i]) * 0.001;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color={activity === 'high' ? '#ff6b35' : activity === 'medium' ? '#4fc3f7' : '#81c784'}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function AmbientLighting({ activity }: BackgroundGridProps) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  
  useFrame((state) => {
    if (lightRef.current) {
      // Breathing light intensity based on activity
      const breathing = Math.sin(state.clock.elapsedTime * 2) * 0.2 + 0.8;
      const baseIntensity = activity === 'low' ? 0.3 : activity === 'medium' ? 0.5 : 0.7;
      lightRef.current.intensity = baseIntensity * breathing;
      
      // Color shift based on activity
      if (activity === 'high') {
        lightRef.current.color.setHSL(0.08, 0.8, 0.6); // Orange for high activity
      } else if (activity === 'medium') {
        lightRef.current.color.setHSL(0.55, 0.6, 0.7); // Blue for medium
      } else {
        lightRef.current.color.setHSL(0.33, 0.4, 0.6); // Green for low
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight
        ref={lightRef}
        position={[10, 10, 5]}
        intensity={0.5}
      />
    </>
  );
}

interface DynamicBackgroundProps {
  trucks: any[];
  className?: string;
}

export function DynamicBackground({ trucks, className = "" }: DynamicBackgroundProps) {
  // Calculate activity level based on truck statuses
  const activity = useMemo(() => {
    const inProgressCount = trucks.filter(t => t.status === 'IN_PROGRESS').length;
    const arrivedCount = trucks.filter(t => t.status === 'ARRIVED').length;
    const totalActiveCount = inProgressCount + arrivedCount;
    
    if (totalActiveCount >= 5) return 'high';
    if (totalActiveCount >= 2) return 'medium';
    return 'low';
  }, [trucks]);

  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ background: 'transparent' }}
      >
        <AmbientLighting activity={activity} />
        <AnimatedGrid activity={activity} />
        <FloatingParticles activity={activity} />
      </Canvas>
      
      {/* CSS-based breathing overlay for active operations */}
      {activity === 'high' && (
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 animate-pulse" />
      )}
      {activity === 'medium' && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 to-cyan-500/3 animate-pulse" 
             style={{ animationDuration: '3s' }} />
      )}
    </div>
  );
}