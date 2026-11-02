import { useEffect, useRef } from 'react';
import { AccessibilityInfo, type StyleProp, type ViewStyle } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { BRAND_ACCENTS } from '@/constants/theme';

// Port of the web CoinScene. There is no DOM canvas for a texture here, so the
// ₹ is built from extruded shapes and embossed on both faces of the coin.

function rect(x0: number, y0: number, x1: number, y1: number) {
  const s = new THREE.Shape();
  s.moveTo(x0, y0);
  s.lineTo(x1, y0);
  s.lineTo(x1, y1);
  s.lineTo(x0, y1);
  s.closePath();
  return s;
}

function rupeeShapes() {
  // Bowl: the right half of a ring, from the top bar down to the lower stub.
  const bowl = new THREE.Shape();
  bowl.moveTo(0, 0.62);
  bowl.absarc(0, 0.33, 0.29, Math.PI / 2, -Math.PI / 2, true);
  bowl.lineTo(0, 0.14);
  bowl.absarc(0, 0.33, 0.19, -Math.PI / 2, Math.PI / 2, false);
  bowl.closePath();

  const leg = new THREE.Shape();
  leg.moveTo(-0.42, 0.1);
  leg.lineTo(-0.25, 0.1);
  leg.lineTo(0.32, -0.62);
  leg.lineTo(0.13, -0.62);
  leg.closePath();

  return [rect(-0.45, 0.52, 0.45, 0.62), rect(-0.45, 0.3, 0.45, 0.4), rect(-0.45, 0.04, 0, 0.14), bowl, leg];
}

type Item = { object: THREE.Object3D; base: THREE.Vector3; scale: number; spin: number; phase: number };

export default function CoinScene({ variant = 'hero', style }: { variant?: 'hero' | 'banner'; style?: StyleProp<ViewStyle> }) {
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanup.current?.(), []);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const reduced = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;

    // three.js expects a canvas; expo-gl only gives a context.
    const canvas = {
      width,
      height,
      style: {},
      clientHeight: height,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as HTMLCanvasElement;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGL2RenderingContext, antialias: true, alpha: true });
    } catch {
      return; // No WebGL2 on this device: the layout works without the scene.
    }
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 0, variant === 'hero' ? 7 : 8);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8ab4f8, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(3, 4, 5);
    scene.add(key);
    const rim = new THREE.PointLight(0x4285f4, 40, 20);
    rim.position.set(-3, -2, 3);
    scene.add(rim);

    const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xe0a21a, metalness: 0.85, roughness: 0.28 });
    const faceMaterial = new THREE.MeshStandardMaterial({ color: 0xf2b733, metalness: 0.6, roughness: 0.35 });
    const glyphMaterial = new THREE.MeshStandardMaterial({ color: 0x9a6510, metalness: 0.7, roughness: 0.3 });
    const coinGeometry = new THREE.CylinderGeometry(1, 1, 0.16, 72);
    const rimGeometry = new THREE.TorusGeometry(0.84, 0.035, 12, 72);
    const glyphGeometry = new THREE.ExtrudeGeometry(rupeeShapes(), {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.01,
      bevelSegments: 2,
      curveSegments: 20,
    });
    const accentGeometry = new THREE.SphereGeometry(1, 24, 24);
    const accentMaterials = BRAND_ACCENTS.map(
      (color) => new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.35, metalness: 0.1 }),
    );

    const makeCoin = () => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(coinGeometry, [edgeMaterial, faceMaterial, faceMaterial]);
      body.rotation.x = Math.PI / 2; // caps face the camera
      group.add(body);
      for (const side of [1, -1]) {
        const ring = new THREE.Mesh(rimGeometry, glyphMaterial);
        ring.position.z = 0.08 * side;
        const glyph = new THREE.Mesh(glyphGeometry, glyphMaterial);
        glyph.position.z = 0.075 * side;
        glyph.scale.setScalar(0.95);
        if (side < 0) glyph.rotation.y = Math.PI; // readable from the back too
        group.add(ring, glyph);
      }
      return group;
    };

    const cluster = new THREE.Group();
    scene.add(cluster);
    const items: Item[] = [];
    const add = (object: THREE.Object3D, position: THREE.Vector3, scale: number, spin: number) => {
      object.position.copy(position);
      object.scale.setScalar(reduced ? scale : 0.001);
      cluster.add(object);
      items.push({ object, base: position.clone(), scale, spin, phase: Math.random() * Math.PI * 2 });
    };

    if (variant === 'hero') {
      add(makeCoin(), new THREE.Vector3(0, 0, 0), 1.35, 0.6);
      [
        [-1.9, 1.2, -0.5],
        [1.9, 1.0, 0.3],
        [1.6, -1.4, -0.2],
        [-1.7, -1.2, 0.4],
      ].forEach(([x, y, z], i) => add(new THREE.Mesh(accentGeometry, accentMaterials[i]), new THREE.Vector3(x, y, z), 0.16 + i * 0.03, 0));
    } else {
      add(makeCoin(), new THREE.Vector3(0, 0.15, 0), 0.95, 0.55);
      add(makeCoin(), new THREE.Vector3(-1.25, -0.55, -0.8), 0.6, -0.7);
      add(makeCoin(), new THREE.Vector3(0.9, 0.95, -1.2), 0.5, 0.9);
      add(new THREE.Mesh(accentGeometry, accentMaterials[0]), new THREE.Vector3(-1.1, 0.9, 0.2), 0.12, 0);
      add(new THREE.Mesh(accentGeometry, accentMaterials[2]), new THREE.Vector3(1.05, -0.8, 0.4), 0.1, 0);
      add(new THREE.Mesh(accentGeometry, accentMaterials[3]), new THREE.Vector3(-0.2, -1.1, 0.6), 0.08, 0);
    }

    const start = Date.now();
    let frame = 0;
    const render = () => {
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const t = (Date.now() - start) / 1000;
      items.forEach((item, i) => {
        // Elastic pop-in, staggered, replacing the web version's GSAP intro.
        const p = Math.min(Math.max((t - i * 0.08) / 1.1, 0), 1);
        const pop = p === 1 ? 1 : 1 - Math.pow(2, -10 * p) * Math.cos(p * Math.PI * 4.5);
        item.object.scale.setScalar(Math.max(item.scale * pop, 0.001));
        item.object.position.y = item.base.y + Math.sin(t * 1.2 + item.phase) * 0.12;
        item.object.rotation.y += item.spin * 0.016;
        item.object.rotation.x = Math.sin(t * 0.7 + item.phase) * 0.15;
      });
      cluster.rotation.y = Math.sin(t * 0.3) * 0.25;
      render();
    };
    if (reduced) render();
    else tick();

    cleanup.current = () => {
      cancelAnimationFrame(frame);
      [coinGeometry, rimGeometry, glyphGeometry, accentGeometry].forEach((g) => g.dispose());
      [edgeMaterial, faceMaterial, glyphMaterial, ...accentMaterials].forEach((m) => m.dispose());
      renderer.dispose();
    };
  };

  return <GLView style={style} onContextCreate={onContextCreate} accessible={false} importantForAccessibility="no-hide-descendants" />;
}
