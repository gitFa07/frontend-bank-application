import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { prefersReducedMotion } from "../lib/motion";

// Google blue, red, yellow, green, used for the small orbiting accents.
const ACCENTS = [0x4285f4, 0xea4335, 0xfbbc04, 0x34a853];

function makeFaceTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const c = size / 2;

  const gradient = ctx.createRadialGradient(c * 0.7, c * 0.6, 20, c, c, c);
  gradient.addColorStop(0, "#ffe9a8");
  gradient.addColorStop(0.55, "#f2b733");
  gradient.addColorStop(1, "#c98a0c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(120, 70, 0, 0.45)";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(c, c, c - 40, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(110, 62, 0, 0.85)";
  ctx.font = "bold 280px Roboto, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("₹", c, c + 12);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  // Cylinder cap UVs are rotated a quarter turn relative to the camera.
  texture.center.set(0.5, 0.5);
  texture.rotation = Math.PI / 2;
  return texture;
}

/**
 * Floating 3D rupee coins.
 * variant "hero": one large coin with orbiting accents (splash / sign-in).
 * variant "banner": a small cluster pinned to the right edge (home banner).
 */
export default function CoinScene({ variant = "hero", className = "" }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const reduced = prefersReducedMotion();

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return; // No WebGL: the surrounding layout still works without the scene.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = "block";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, variant === "hero" ? 7 : 8);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8ab4f8, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(3, 4, 5);
    scene.add(key);
    const rim = new THREE.PointLight(0x4285f4, 40, 20);
    rim.position.set(-3, -2, 3);
    scene.add(rim);

    const faceTexture = makeFaceTexture();
    const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xe0a21a, metalness: 0.85, roughness: 0.28 });
    const faceMaterial = new THREE.MeshStandardMaterial({ map: faceTexture, metalness: 0.55, roughness: 0.35 });
    const coinGeometry = new THREE.CylinderGeometry(1, 1, 0.16, 96);
    const accentGeometry = new THREE.SphereGeometry(1, 32, 32);
    const accentMaterials = ACCENTS.map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1 }),
    );

    const makeCoin = () => {
      const mesh = new THREE.Mesh(coinGeometry, [edgeMaterial, faceMaterial, faceMaterial]);
      mesh.rotation.x = Math.PI / 2; // turn the cap towards the camera
      const group = new THREE.Group();
      group.add(mesh);
      return group;
    };

    const cluster = new THREE.Group();
    scene.add(cluster);

    // Each item: object, base position, float phase, spin speed.
    const items = [];
    const addItem = (object, position, scale, spin) => {
      object.position.copy(position);
      object.scale.setScalar(scale);
      cluster.add(object);
      items.push({ object, base: position.clone(), scale, spin, phase: Math.random() * Math.PI * 2 });
    };

    if (variant === "hero") {
      addItem(makeCoin(), new THREE.Vector3(0, 0, 0), 1.35, 0.6);
      [
        [-1.9, 1.2, -0.5],
        [1.9, 1.0, 0.3],
        [1.6, -1.4, -0.2],
        [-1.7, -1.2, 0.4],
      ].forEach(([x, y, z], i) => {
        addItem(new THREE.Mesh(accentGeometry, accentMaterials[i]), new THREE.Vector3(x, y, z), 0.16 + i * 0.03, 0);
      });
    } else {
      addItem(makeCoin(), new THREE.Vector3(0, 0.15, 0), 0.95, 0.55);
      addItem(makeCoin(), new THREE.Vector3(-1.25, -0.55, -0.8), 0.6, -0.7);
      addItem(makeCoin(), new THREE.Vector3(0.9, 0.95, -1.2), 0.5, 0.9);
      addItem(new THREE.Mesh(accentGeometry, accentMaterials[0]), new THREE.Vector3(-1.1, 0.9, 0.2), 0.12, 0);
      addItem(new THREE.Mesh(accentGeometry, accentMaterials[2]), new THREE.Vector3(1.05, -0.8, 0.4), 0.1, 0);
      addItem(new THREE.Mesh(accentGeometry, accentMaterials[3]), new THREE.Vector3(-0.2, -1.1, 0.6), 0.08, 0);
    }

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (variant === "banner") {
        // Keep the cluster tucked against the right edge whatever the width.
        const visibleWidth = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
        cluster.position.x = visibleWidth / 2 - 1.5;
      }
      renderer.render(scene, camera);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(el);
    resize();

    let visible = true;
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    intersectionObserver.observe(el);

    const pointer = { x: 0, y: 0 };
    const onPointerMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    // Pop the items in with an elastic stagger.
    const intro = reduced
      ? null
      : gsap.from(
          items.map((i) => i.object.scale),
          { x: 0, y: 0, z: 0, duration: 1.1, ease: "elastic.out(1, 0.55)", stagger: 0.08 },
        );

    const clock = new THREE.Clock();
    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!visible) return;
      const t = clock.getElapsedTime();
      for (const item of items) {
        item.object.position.y = item.base.y + Math.sin(t * 1.2 + item.phase) * 0.12;
        item.object.rotation.y += item.spin * 0.016;
        item.object.rotation.x = Math.sin(t * 0.7 + item.phase) * 0.15;
      }
      cluster.rotation.y += (pointer.x * 0.35 - cluster.rotation.y) * 0.05;
      cluster.rotation.x += (pointer.y * 0.2 - cluster.rotation.x) * 0.05;
      renderer.render(scene, camera);
    };
    if (reduced) renderer.render(scene, camera);
    else tick();

    return () => {
      cancelAnimationFrame(frame);
      intro?.kill();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      coinGeometry.dispose();
      accentGeometry.dispose();
      edgeMaterial.dispose();
      faceMaterial.dispose();
      accentMaterials.forEach((m) => m.dispose());
      faceTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [variant]);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
