import { useEffect, useRef } from 'react';

/**
 * Animated cyberspace topography rendered with a WebGL fragment shader.
 * Falls back to a static gradient when WebGL isn't available or the user
 * prefers reduced motion.
 *
 * Design notes:
 *  - Deep night-blue gradient base.
 *  - Layered sine "ridge" lines that drift diagonally to feel like data flow.
 *  - Gentle vignette so panel content stays the focus.
 *  - Pauses when the tab is hidden to save battery.
 */

const VERT = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec2 v_uv;

// 2D simplex-ish noise (cheap)
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
             mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y);

  // Base gradient: very dark slate -> deep blue toward bottom
  vec3 cBase  = vec3(0.012, 0.020, 0.043);  // slate-950 ~ #030712
  vec3 cDeep  = vec3(0.039, 0.078, 0.196);  // deep night blue
  vec3 bg = mix(cBase, cDeep, smoothstep(0.0, 1.0, uv.y * 0.85 + 0.05));

  // Layered ridge lines (topography lines drifting)
  float lines = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float speed = 0.06 + fi * 0.03;
    float freq  = 1.6 + fi * 1.1;
    float phase = u_time * speed + fi * 1.7;

    // Soft horizontal "contour" lines warped by noise
    float warp = noise(vec2(p.x * 1.2, p.y * 0.8 + phase)) * 0.45;
    float line = sin((p.y * (4.0 + fi * 1.5) + warp + phase) * 3.14159) * 0.5 + 0.5;
    line = pow(line, 22.0);
    lines += line * (0.55 - fi * 0.1);
  }
  lines = clamp(lines, 0.0, 1.0);

  // Subtle slanted "data stream" overlay
  float stream = sin((p.x + p.y * 0.4 - u_time * 0.18) * 8.0) * 0.5 + 0.5;
  stream = smoothstep(0.95, 1.0, stream) * 0.25;

  // Accent color is blue-500ish
  vec3 accent  = vec3(0.231, 0.510, 0.965);  // ~ #3B82F6
  vec3 accent2 = vec3(0.376, 0.647, 0.980);  // ~ #60A5FA

  vec3 col = bg;
  col += lines * mix(accent, accent2, uv.y) * 0.55;
  col += stream * accent2;

  // Vignette so the edges fall off into the dark
  vec2 vc = uv - 0.5;
  float vignette = smoothstep(0.85, 0.2, length(vc));
  col *= (0.55 + 0.45 * vignette);

  gl_FragColor = vec4(col, 1.0);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[NetworkBackground] shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false });
    if (!gl) {
      // No WebGL — leave the static gradient div behind.
      return;
    }

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[NetworkBackground] link error:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, 'u_time');
    const uRes = gl.getUniformLocation(program, 'u_resolution');

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = performance.now();
    let elapsed = reduceMotion ? 0 : 0;
    const targetFps = 30;
    const minFrameMs = 1000 / targetFps;

    const render = (now: number) => {
      const dt = now - last;
      if (dt < minFrameMs) {
        raf = requestAnimationFrame(render);
        return;
      }
      last = now;
      if (!reduceMotion) elapsed += dt / 1000;

      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        last = performance.now();
        raf = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      cancelAnimationFrame(raf);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#020617]">
      {/* WebGL canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* Faint grid overlay for that holographic CAD feel */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_55%,transparent_100%)] opacity-40" />
      {/* Subtle blue corner haze */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[120px]" />
    </div>
  );
}
