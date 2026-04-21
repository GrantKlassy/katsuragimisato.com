precision highp float;

uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform float uTexAAspect;
uniform float uTexBAspect;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uTime;
uniform float uMix;

varying vec2 vUv;

// hash-based noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// cover-fit UVs so the image fills the viewport and crops the overflow
vec2 coverUv(vec2 uv, float texAspect) {
  float screenAspect = uResolution.x / uResolution.y;
  vec2 scale = screenAspect > texAspect
    ? vec2(1.0, texAspect / screenAspect)
    : vec2(screenAspect / texAspect, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

// sample with per-channel offset for chromatic aberration
vec3 sampleAberrated(sampler2D tex, vec2 uv, vec2 dir, float amount) {
  float r = texture2D(tex, uv + dir * amount).r;
  float g = texture2D(tex, uv).g;
  float b = texture2D(tex, uv - dir * amount).b;
  return vec3(r, g, b);
}

void main() {
  vec2 uv = vUv;

  // mouse-driven parallax warp
  vec2 mouseOffset = (uMouse - 0.5) * 0.04;
  vec2 center = uv - 0.5;
  float dist = length(center);
  vec2 warped = uv + mouseOffset * (1.0 - dist);

  // subtle breathing motion
  warped += vec2(sin(uTime * 0.3) * 0.004, cos(uTime * 0.25) * 0.004);

  vec2 uvA = coverUv(warped, uTexAAspect);
  vec2 uvB = coverUv(warped, uTexBAspect);

  // chromatic aberration increases toward edges
  vec2 aberrationDir = normalize(center + 1e-6);
  float aberration = 0.002 + dist * 0.006;

  vec3 colA = sampleAberrated(uTexA, uvA, aberrationDir, aberration);
  vec3 colB = sampleAberrated(uTexB, uvB, aberrationDir, aberration);
  vec3 col = mix(colA, colB, smoothstep(0.0, 1.0, uMix));

  // NERV-flavored tint lift on the shadows
  vec3 shadowTint = vec3(0.12, 0.04, 0.22);
  col += shadowTint * (1.0 - dot(col, vec3(0.333))) * 0.35;

  // animated scanlines
  float scan = 0.92 + 0.08 * sin(uv.y * uResolution.y * 1.5 + uTime * 2.0);
  col *= scan;

  // film grain
  float grain = (hash(uv * uResolution + uTime) - 0.5) * 0.06;
  col += grain;

  // radial vignette
  float vignette = smoothstep(1.1, 0.3, dist);
  col *= mix(0.55, 1.0, vignette);

  gl_FragColor = vec4(col, 1.0);
}
