import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export type CharState = "idle" | "run" | "jump" | "kick" | "stunned";

interface Props {
  position: [number, number, number];
  rotationY: number;
  state: CharState;
  team: "red" | "blue";
  label?: string;
  isSelf?: boolean;
}

/**
 * Chibi character built from smooth primitives (no boxes).
 * Anime-style: black hair, red bow, small wings, red jacket.
 */
export function ChibiCharacter({ position, rotationY, state, team, isSelf }: Props) {
  const group = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Mesh>(null);
  const rightLeg = useRef<THREE.Mesh>(null);
  const leftArm = useRef<THREE.Mesh>(null);
  const rightArm = useRef<THREE.Mesh>(null);
  const body = useRef<THREE.Mesh>(null);
  const wings = useRef<THREE.Group>(null);

  const jacketColor = team === "red" ? "#c8102e" : "#1e4d9e";
  const pantsColor = "#3a2818";
  const skinColor = "#f5d6b8";
  const hairColor = "#1a1a1a";
  const bowColor = "#ef4444";
  const wingColor = "#fef3c7";

  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    if (!group.current) return;

    // Base facing
    group.current.position.set(position[0], position[1], position[2]);
    group.current.rotation.y = rotationY;

    // Reset limbs
    const swing = (a: number) => a;

    if (state === "idle") {
      const b = Math.sin(t * 2) * 0.05;
      if (body.current) body.current.scale.y = 1 + b * 0.5;
      if (leftLeg.current) leftLeg.current.rotation.x = 0;
      if (rightLeg.current) rightLeg.current.rotation.x = 0;
      if (leftArm.current) leftArm.current.rotation.x = 0;
      if (rightArm.current) rightArm.current.rotation.x = 0;
    } else if (state === "run") {
      const s = Math.sin(t * 12);
      if (leftLeg.current) leftLeg.current.rotation.x = swing(s * 0.9);
      if (rightLeg.current) rightLeg.current.rotation.x = swing(-s * 0.9);
      if (leftArm.current) leftArm.current.rotation.x = swing(-s * 0.7);
      if (rightArm.current) rightArm.current.rotation.x = swing(s * 0.7);
    } else if (state === "jump") {
      if (leftLeg.current) leftLeg.current.rotation.x = -0.4;
      if (rightLeg.current) rightLeg.current.rotation.x = -0.4;
      if (leftArm.current) leftArm.current.rotation.x = -1.2;
      if (rightArm.current) rightArm.current.rotation.x = -1.2;
    } else if (state === "kick") {
      if (rightLeg.current) rightLeg.current.rotation.x = -1.6;
      if (leftLeg.current) leftLeg.current.rotation.x = 0.2;
      if (leftArm.current) leftArm.current.rotation.x = 0.4;
      if (rightArm.current) rightArm.current.rotation.x = -0.4;
    } else if (state === "stunned") {
      const s = Math.sin(t * 20) * 0.15;
      group.current.rotation.z = s;
      if (leftArm.current) leftArm.current.rotation.z = 0.6 + s;
      if (rightArm.current) rightArm.current.rotation.z = -0.6 - s;
    }

    if (state !== "stunned") group.current.rotation.z = 0;

    // Wings flap
    if (wings.current) {
      const f = Math.sin(t * 8) * 0.3;
      wings.current.children.forEach((c, i) => {
        (c as THREE.Mesh).rotation.z = (i === 0 ? 1 : -1) * (0.5 + f);
      });
    }
  });

  const mat = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 }),
      hair: new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.4 }),
      jacket: new THREE.MeshStandardMaterial({ color: jacketColor, roughness: 0.5 }),
      pants: new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 }),
      bow: new THREE.MeshStandardMaterial({ color: bowColor, roughness: 0.4, emissive: bowColor, emissiveIntensity: 0.2 }),
      wing: new THREE.MeshStandardMaterial({ color: wingColor, roughness: 0.3, emissive: wingColor, emissiveIntensity: 0.15 }),
      eye: new THREE.MeshBasicMaterial({ color: "#000" }),
      selfRing: new THREE.MeshBasicMaterial({ color: "#22c55e", transparent: true, opacity: 0.5 }),
    }),
    [jacketColor],
  );

  return (
    <group ref={group}>
      {/* Self indicator ring on ground */}
      {isSelf && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[0.7, 0.9, 32]} />
          <primitive object={mat.selfRing} attach="material" />
        </mesh>
      )}

      {/* Legs — pivot at hip */}
      <group position={[-0.18, 0.6, 0]}>
        <mesh ref={leftLeg} castShadow position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.7, 16]} />
          <primitive object={mat.pants} attach="material" />
        </mesh>
      </group>
      <group position={[0.18, 0.6, 0]}>
        <mesh ref={rightLeg} castShadow position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.7, 16]} />
          <primitive object={mat.pants} attach="material" />
        </mesh>
      </group>

      {/* Body (jacket) — capsule */}
      <mesh ref={body} castShadow position={[0, 1.05, 0]}>
        <capsuleGeometry args={[0.32, 0.5, 8, 16]} />
        <primitive object={mat.jacket} attach="material" />
      </mesh>

      {/* Arms — pivot at shoulder */}
      <group position={[-0.42, 1.25, 0]}>
        <mesh ref={leftArm} castShadow position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.6, 16]} />
          <primitive object={mat.jacket} attach="material" />
        </mesh>
      </group>
      <group position={[0.42, 1.25, 0]}>
        <mesh ref={rightArm} castShadow position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.6, 16]} />
          <primitive object={mat.jacket} attach="material" />
        </mesh>
      </group>

      {/* Head (big chibi head) */}
      <group position={[0, 1.9, 0]}>
        {/* Skin */}
        <mesh castShadow>
          <sphereGeometry args={[0.4, 32, 32]} />
          <primitive object={mat.skin} attach="material" />
        </mesh>
        {/* Hair cap */}
        <mesh position={[0, 0.08, -0.02]} scale={[1.05, 0.75, 1.1]}>
          <sphereGeometry args={[0.4, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          <primitive object={mat.hair} attach="material" />
        </mesh>
        {/* Bow */}
        <mesh position={[0.22, 0.34, 0]} rotation={[0, 0, Math.PI / 3]}>
          <torusGeometry args={[0.09, 0.04, 8, 16]} />
          <primitive object={mat.bow} attach="material" />
        </mesh>
        {/* Eyes — face front (character faces -Z when rotation.y=0? we render facing +Z) */}
        <mesh position={[-0.14, 0.02, 0.34]}>
          <sphereGeometry args={[0.055, 12, 12]} />
          <primitive object={mat.eye} attach="material" />
        </mesh>
        <mesh position={[0.14, 0.02, 0.34]}>
          <sphereGeometry args={[0.055, 12, 12]} />
          <primitive object={mat.eye} attach="material" />
        </mesh>
      </group>

      {/* Wings on back */}
      <group ref={wings} position={[0, 1.3, -0.28]}>
        <mesh position={[-0.15, 0, 0]} rotation={[0, 0, 0.5]}>
          <coneGeometry args={[0.1, 0.35, 8]} />
          <primitive object={mat.wing} attach="material" />
        </mesh>
        <mesh position={[0.15, 0, 0]} rotation={[0, 0, -0.5]}>
          <coneGeometry args={[0.1, 0.35, 8]} />
          <primitive object={mat.wing} attach="material" />
        </mesh>
      </group>
    </group>
  );
}
