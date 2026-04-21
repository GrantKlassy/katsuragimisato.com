import * as THREE from "three";
import vertexShader from "../assets/shaders/misato.vert?raw";
import fragmentShader from "../assets/shaders/misato.frag?raw";

const IMAGES = ["/images/misato/misato1.png", "/images/misato/misato2.png"];
const CYCLE_SECONDS = 6;

export function isWebGLSupported(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

export function mountMisatoScene(canvas: HTMLCanvasElement): () => void {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTexA: { value: null as THREE.Texture | null },
    uTexB: { value: null as THREE.Texture | null },
    uTexAAspect: { value: 1 },
    uTexBAspect: { value: 1 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uTime: { value: 0 },
    uMix: { value: 0 },
  };

  const loader = new THREE.TextureLoader();
  const loadTexture = (url: string, onReady: (aspect: number) => void) => {
    return loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      const img = tex.image as HTMLImageElement;
      onReady(img.width / img.height);
    });
  };
  const texA = loadTexture(IMAGES[0], (a) => (uniforms.uTexAAspect.value = a));
  const texB = loadTexture(IMAGES[1], (a) => (uniforms.uTexBAspect.value = a));
  uniforms.uTexA.value = texA;
  uniforms.uTexB.value = texB;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(mesh);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    uniforms.uResolution.value.set(w, h);
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  const mouseTarget = new THREE.Vector2(0.5, 0.5);
  const onPointer = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouseTarget.set(
      (e.clientX - rect.left) / rect.width,
      1 - (e.clientY - rect.top) / rect.height,
    );
  };
  window.addEventListener("pointermove", onPointer);

  const start = performance.now();
  let frame = 0;
  const tick = () => {
    frame = requestAnimationFrame(tick);
    const t = (performance.now() - start) / 1000;
    uniforms.uTime.value = t;
    uniforms.uMouse.value.lerp(mouseTarget, 0.08);

    const phase = (t % (CYCLE_SECONDS * 2)) / CYCLE_SECONDS;
    uniforms.uMix.value = phase < 1 ? phase : 2 - phase;

    renderer.render(scene, camera);
  };
  tick();

  return () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    window.removeEventListener("pointermove", onPointer);
    texA.dispose();
    texB.dispose();
    material.dispose();
    mesh.geometry.dispose();
    renderer.dispose();
  };
}
