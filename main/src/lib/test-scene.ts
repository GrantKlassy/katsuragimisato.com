import * as THREE from "three";

export function mountTestScene(canvas: HTMLCanvasElement): () => void {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(dpr);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 4;

  const geometry = new THREE.EdgesGeometry(
    new THREE.BoxGeometry(1.5, 1.5, 1.5),
  );
  const material = new THREE.LineBasicMaterial({ color: 0xffffff });
  const cube = new THREE.LineSegments(geometry, material);
  scene.add(cube);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const RATE_X = 0.6;
  const RATE_Y = 0.9;

  let frame = 0;
  let prev = performance.now();
  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    const dt = (now - prev) / 1000;
    prev = now;
    cube.rotation.x += RATE_X * dt;
    cube.rotation.y += RATE_Y * dt;
    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    ro.disconnect();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };
}
