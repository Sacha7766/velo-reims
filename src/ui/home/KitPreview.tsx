// The rider as the Kit settings dress them: the ride's own model in a small studio light, drawn again when the
// outfit, helmet or colours change. Its own WebGL canvas, only while Settings is open; it draws once the model
// has loaded and then stops.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Rider, type RiderStyle } from '../../engine/Rider.ts';

export function KitPreview({ style }: { style: RiderStyle }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera } | null>(null);

  useEffect(() => {
    const el = canvas.current!;
    // (a kept drawing buffer: the picture is drawn once and stays readable, for the kit sheet too)
    const renderer = new THREE.WebGLRenderer({ canvas: el, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xdde6f0, 0x3b352c, 1.5));
    const key = new THREE.DirectionalLight(0xfff3e2, 3.0);
    key.position.set(-2.5, 4, 3);
    const rim = new THREE.DirectionalLight(0xcfe0ff, 1.6);
    rim.position.set(2.5, 2.5, -3);
    scene.add(key, rim);
    // three-quarter front, at a standing person's eye: jersey front, helmet and glasses, bibs, socks and shoes
    const camera = new THREE.PerspectiveCamera(26, el.clientWidth / el.clientHeight, 0.1, 30);
    camera.position.set(-2.6, 1.5, 2.7);
    camera.lookAt(0, 0.78, 0.02);
    stage.current = { renderer, scene, camera };
    return () => {
      stage.current = null;
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, []);

  const key = [style.outfit?.id, style.helmet?.id, style.kit, style.accent, style.bike].join(',');
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    const rider = new Rider(style);
    // a pedal stroke in: the cranks off the vertical, the knees at different heights
    rider.update(0.2, 8, 75);
    s.scene.add(rider);
    let live = true;
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(() => live && s.renderer.render(s.scene, s.camera));
    };
    draw();
    void rider.ready.then(draw);
    // (its materials are left to the preview's renderer: the untinted ones are the ride model's own, shared)
    return () => {
      live = false;
      cancelAnimationFrame(raf);
      s.scene.remove(rider);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <canvas ref={canvas} className="kit-preview" role="img" aria-label="Your rider in this kit" />;
}
