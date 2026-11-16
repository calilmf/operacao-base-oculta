// Cena 3D: galáxia, planetas, rotas de hiperespaço e naves.
// Tudo que representa o RESULTADO do modelo é construído a partir do objeto de solução
// (mesmo formato do solucao.json exportado do notebook) em applySolution().
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { BASES, FRENTES, CUSTO } from './data/problema.js';

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){float a=0.5,s=0.0;for(int i=0;i<5;i++){s+=a*snoise(p);p*=2.03;a*=0.5;}return s;}
`;

const PLANET_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vP; varying vec3 vV;
void main(){
  vP = position;
  vec4 wp = modelMatrix * vec4(position,1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = cameraPosition - wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const PLANET_FRAG = /* glsl */ `
uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uAtmo; uniform vec3 uLight;
uniform float uMode; uniform float uSeed; uniform float uDim; uniform float uFocus; uniform float uRadius;
varying vec3 vN; varying vec3 vP; varying vec3 vV;
${NOISE}
void main(){
  vec3 q = normalize(vP);
  vec3 p = q * 2.1 + uSeed;
  float n = uMode > 0.5 ? sin(q.y * 16.0 + fbm(p * 0.9) * 2.6) * 0.5 + 0.5 : fbm(p) * 0.5 + 0.5;
  vec3 col = mix(uC1, uC2, smoothstep(0.32, 0.58, n));
  col = mix(col, uC3, smoothstep(0.6, 0.82, n));
  vec3 N = normalize(vN);
  float diff = max(dot(N, normalize(uLight)), 0.0);
  col *= 0.16 + 1.0 * diff;
  float fres = pow(1.0 - max(dot(N, normalize(vV)), 0.0), 2.4);
  col += uAtmo * fres * (0.45 + uFocus * 0.45);
  float g = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(g) * 0.28, uDim);
  gl_FragColor = vec4(col, 1.0);
}`;

const RING_VERT = /* glsl */ `varying vec2 vXY; void main(){ vXY = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const RING_FRAG = /* glsl */ `
uniform float uFill; uniform float uOpacity; uniform vec3 uColor; varying vec2 vXY;
void main(){
  float a = fract(atan(vXY.x, vXY.y) / 6.2831853 + 1.0);
  float on = step(a, uFill);
  vec3 c = mix(vec3(0.35,0.45,0.6), uColor, on);
  gl_FragColor = vec4(c, uOpacity * mix(0.18, 1.0, on));
}`;

const STREAK_VERT = /* glsl */ `
uniform float uSpeed; attribute float aEnd;
void main(){ vec3 p = position; p.z += aEnd * uSpeed * 14.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }`;
const STREAK_FRAG = /* glsl */ `uniform float uSpeed; void main(){ gl_FragColor = vec4(0.75,0.9,1.0, clamp(uSpeed,0.0,1.0)*0.85); }`;

function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// cor da rota pelo custo por caixa: barata = azul, cara = laranja
export function corDoCusto(c) {
  const t = THREE.MathUtils.clamp((c - 2) / 7, 0, 1);
  return new THREE.Color('#38b6ff').lerp(new THREE.Color('#ff7a2f'), t);
}

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

export function createScene(canvas, labelsEl, { lite = false, reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lite ? 1 : 1.75));
  renderer.setClearColor(0x03040a, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x03040a, 0.0035);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
  camera.position.set(0, 70, 110);
  scene.add(camera);
  const dot = dotTexture();
  const LUZ = new THREE.Vector3(-0.6, 0.7, 0.5).normalize();

  // ---------- Galáxia espiral ----------
  const galaxy = (() => {
    const N = lite ? 14000 : 55000, R = 70, ARMS = 4;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const inner = new THREE.Color('#ffd7a3'), outer = new THREE.Color('#5b6cff'), pink = new THREE.Color('#c86bff');
    for (let i = 0; i < N; i++) {
      const r = Math.pow(Math.random(), 1.6) * R;
      const branch = ((i % ARMS) / ARMS) * Math.PI * 2;
      const spin = r * 0.11;
      const rnd = () => Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * (0.6 + r * 0.12);
      pos[i * 3] = Math.cos(branch + spin) * r + rnd();
      pos[i * 3 + 1] = rnd() * 0.35 - 6;
      pos[i * 3 + 2] = Math.sin(branch + spin) * r + rnd();
      const c = inner.clone().lerp(outer, r / R);
      if (Math.random() < 0.12) c.lerp(pink, 0.6);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.32, map: dot, vertexColors: true, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    return pts;
  })();

  // ---------- Estrelas de fundo ----------
  (() => {
    const N = lite ? 1500 : 4000; const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(350 + Math.random() * 250);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.4, map: dot, color: 0xcfd8ff,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
  })();

  // ---------- Nebulosas ----------
  [['#4b2bff', [-60, -10, -80], 140], ['#00b3c7', [70, -15, 40], 120], ['#b0278f', [10, -20, 90], 110]].forEach(([c, p, s]) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: c, transparent: true, opacity: 0.12,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sp.position.set(...p); sp.scale.setScalar(s); scene.add(sp);
  });

  // ---------- Rastros de hiperespaço (presos à câmera; intensidade = velocidade da câmera) ----------
  const streaks = (() => {
    const N = lite ? 250 : 700;
    const pos = new Float32Array(N * 6), end = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 30, z = -10 - Math.random() * 120;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      pos.set([x, y, z, x, y, z], i * 6); end.set([0, 1], i * 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    const mat = new THREE.ShaderMaterial({ vertexShader: STREAK_VERT, fragmentShader: STREAK_FRAG,
      uniforms: { uSpeed: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const ls = new THREE.LineSegments(geo, mat); ls.frustumCulled = false; camera.add(ls);
    return mat;
  })();

  // ---------- Planetas ----------
  const halos = [];
  function makePlanet(d, kind, idx) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG,
      uniforms: {
        uC1: { value: new THREE.Color(d.cores[0]) }, uC2: { value: new THREE.Color(d.cores[1]) },
        uC3: { value: new THREE.Color(d.cores[2]) }, uAtmo: { value: new THREE.Color(d.atmo) },
        uLight: { value: LUZ }, uMode: { value: d.modo }, uSeed: { value: d.seed },
        uDim: { value: 0 }, uFocus: { value: 0 }, uRadius: { value: d.raio },
      },
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(d.raio, lite ? 48 : 96, lite ? 32 : 64), mat);
    mesh.position.set(...d.pos);
    mesh.rotation.z = 0.25;
    scene.add(mesh);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: d.atmo, transparent: true, opacity: 0.35,
      depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(d.raio * 4.2); halo.position.copy(mesh.position); scene.add(halo);
    halos.push(halo);

    const label = document.createElement('div');
    label.className = `label label-${kind}`;
    label.innerHTML = `<span class="label-tipo">${kind === 'base' ? 'Base candidata' : 'Frente de batalha'}</span>
      <strong>${d.nome}</strong><span class="label-info"></span>`;
    labelsEl.appendChild(label);
    const infoPre = kind === 'base' ? `montagem ${d.custo} · cap. ${d.cap}` : `demanda ${d.demanda} caixas`;
    return { d, kind, idx, mesh, mat, halo, label, info: label.querySelector('.label-info'),
      infoPre, infoRes: infoPre, clsRes: '', fase: null, dim: 0, focus: 0, labelOp: 0 };
  }
  const planets = [
    ...BASES.map((b, i) => makePlanet(b, 'base', i)),
    ...FRENTES.map((f, j) => makePlanet(f, 'frente', j)),
  ];
  const basePl = planets.filter((p) => p.kind === 'base');
  const frentePl = planets.filter((p) => p.kind === 'frente');
  const porNome = Object.fromEntries(planets.map((p) => [p.d.nome, p]));

  // anéis de capacidade nas bases (preenchimento = enviado / capacidade)
  const rings = basePl.map((p) => {
    const mat = new THREE.ShaderMaterial({ vertexShader: RING_VERT, fragmentShader: RING_FRAG, transparent: true,
      depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uFill: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color('#ffd166') } } });
    const r = p.d.raio;
    const m = new THREE.Mesh(new THREE.RingGeometry(r * 1.55, r * 1.75, 128), mat);
    m.rotation.x = -Math.PI / 2; m.position.copy(p.mesh.position); scene.add(m);
    return { mat, fill: 0, target: 0 };
  });

  // ---------- Rotas candidatas (as 20 combinações base→frente, cor = custo) ----------
  function curva(a, b) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const M = A.clone().add(B).multiplyScalar(0.5); M.y += 2.2 + A.distanceTo(B) * 0.12;
    return new THREE.QuadraticBezierCurve3(A, M, B);
  }
  const candidatas = [];
  BASES.forEach((b, i) => FRENTES.forEach((f, j) => {
    const c = curva(b.pos, f.pos);
    const mat = new THREE.MeshBasicMaterial({ color: corDoCusto(CUSTO[i][j]), transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(c, 48, 0.045, 6), mat);
    scene.add(mesh);
    candidatas.push({ i, j, mat, op: 0 });
  }));

  // ---------- Rotas da solução + naves (reconstruídas a cada solução) ----------
  const solGroup = new THREE.Group(); scene.add(solGroup);
  let solRotas = [];
  const MAX_SHIPS = 400;
  const shipGeo = new THREE.BufferGeometry();
  const shipPos = new Float32Array(MAX_SHIPS * 3);
  shipGeo.setAttribute('position', new THREE.BufferAttribute(shipPos, 3));
  const shipMat = new THREE.PointsMaterial({ size: 0.55, map: dot, color: 0xffffff, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending });
  const ships = new THREE.Points(shipGeo, shipMat); ships.frustumCulled = false; scene.add(ships);
  let shipList = [];

  let solucaoAtual = null;
  function applySolution(sol) {
    solucaoAtual = sol;
    solGroup.children.forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
    solGroup.clear(); solRotas = []; shipList = [];
    const ok = sol && sol.status === 'optimal';

    basePl.forEach((p, i) => {
      const b = ok ? sol.bases[i] : null;
      p.aberta = ok ? b.aberta === 1 : false;
      rings[i].target = ok && p.aberta ? b.enviado / b.capacidade : 0;
      p.infoPre = `montagem ${BASES[i].custo} · cap. ${BASES[i].cap}`;
      p.infoRes = !ok ? 'sem solução' : p.aberta ? `ABERTA · ${b.enviado}/${b.capacidade} caixas` : 'FECHADA';
      p.clsRes = !ok ? '' : p.aberta ? 'aberta' : 'fechada';
      p.fase = null;
    });
    frentePl.forEach((p) => {
      const rec = ok ? sol.rotas.filter((r) => r.para === p.d.nome).reduce((s, r) => s + r.caixas, 0) : 0;
      p.infoRes = `${rec}/${p.d.demanda} caixas`;
      p.fase = null;
    });
    if (!ok) return;

    sol.rotas.forEach((r) => {
      const i = BASES.findIndex((b) => b.nome === r.de), j = FRENTES.findIndex((f) => f.nome === r.para);
      const c = curva(BASES[i].pos, FRENTES[j].pos);
      const raio = 0.05 + r.caixas * 0.0032; // espessura proporcional às caixas (X_ij)
      const mat = new THREE.MeshBasicMaterial({ color: corDoCusto(r.custo_unit), transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending });
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(c, 64, raio, 8), mat);
      solGroup.add(mesh);
      const lut = c.getSpacedPoints(120);
      solRotas.push({ ...r, i, j, mat, lut });
      const n = Math.max(2, Math.round(r.caixas / 4)); // nº de naves proporcional às caixas
      for (let k = 0; k < n; k++) shipList.push({ lut, fase: k / n + Math.random() * 0.02, vel: 0.07 + Math.random() * 0.02 });
    });
    shipGeo.setDrawRange(0, Math.min(shipList.length, MAX_SHIPS));
  }

  // ---------- Pós-processamento ----------
  let composer = null;
  if (!lite) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.6, 0.18));
    composer.addPass(new OutputPass());
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w < 700 ? 65 : 50;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- Estado visual (vem do scroll) ----------
  let estado = { cand: 0, sol: 0, dim: 0, labels: 0, rings: 0, res: false, focus: [], focusBase: null, destaques: [] };
  const camTarget = new THREE.Vector3();
  const prevCam = new THREE.Vector3().copy(camera.position);
  let speed = 0;
  const tmp = new THREE.Vector3();

  function setView(camPos, lookAt, s) {
    camera.position.copy(camPos);
    camTarget.copy(lookAt);
    estado = s;
  }

  let last = performance.now(), t = 0;
  function frame() {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;

    camera.lookAt(camTarget);
    const v = camera.position.distanceTo(prevCam) / Math.max(dt, 1e-3);
    prevCam.copy(camera.position);
    speed = damp(speed, reduced ? 0 : THREE.MathUtils.clamp((v - 12) / 90, 0, 1), 6, dt);
    streaks.uniforms.uSpeed.value = speed;

    galaxy.rotation.y += dt * 0.006;

    const w = window.innerWidth, h = window.innerHeight;
    planets.forEach((p) => {
      p.mesh.rotation.y += dt * 0.08;
      const fase = estado.res ? 'res' : 'pre';
      if (p.fase !== fase) {
        p.fase = fase;
        p.info.textContent = fase === 'res' ? p.infoRes : p.infoPre;
        p.label.classList.toggle('aberta', fase === 'res' && p.clsRes === 'aberta');
        p.label.classList.toggle('fechada', fase === 'res' && p.clsRes === 'fechada');
      }
      const fechada = p.kind === 'base' && p.aberta === false;
      p.dim = damp(p.dim, fechada ? estado.dim : 0, 4, dt);
      p.focus = damp(p.focus, estado.focus.includes(p.d.nome) ? 1 : 0, 4, dt);
      p.mat.uniforms.uDim.value = p.dim;
      p.mat.uniforms.uFocus.value = p.focus;
      p.halo.material.opacity = (0.3 + p.focus * 0.1) * (1 - p.dim * 0.85);
      // rótulo HTML projetado na tela
      tmp.copy(p.mesh.position); tmp.y += p.d.raio + 0.6; tmp.project(camera);
      const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.15 && Math.abs(tmp.y) < 1.15;
      p.labelOp = damp(p.labelOp, vis ? estado.labels * (estado.focus.length && !estado.focus.includes(p.d.nome) ? 0.45 : 1) : 0, 6, dt);
      p.label.style.opacity = p.labelOp.toFixed(3);
      p.label.style.transform = `translate(-50%,-100%) translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`;
    });

    rings.forEach((r) => {
      r.fill = damp(r.fill, r.target * Math.min(estado.rings * 1.2, 1), 2.5, dt);
      r.mat.uniforms.uFill.value = r.fill;
      r.mat.uniforms.uOpacity.value = damp(r.mat.uniforms.uOpacity.value, r.target > 0 ? estado.rings : 0, 4, dt);
    });

    candidatas.forEach((c) => {
      let alvo = estado.cand;
      if (estado.focusBase !== null && estado.focusBase !== undefined) alvo *= c.i === estado.focusBase ? 1 : 0.08;
      if (estado.destaques.some(([i, j]) => i === c.i && j === c.j)) alvo = 0.95;
      c.op = damp(c.op, alvo * 0.7, 5, dt);
      c.mat.opacity = c.op;
    });

    solRotas.forEach((r) => { r.mat.opacity = damp(r.mat.opacity, estado.sol * 0.9, 4, dt); });
    shipMat.opacity = damp(shipMat.opacity, estado.sol, 4, dt);
    const n = Math.min(shipList.length, MAX_SHIPS);
    for (let k = 0; k < n; k++) {
      const s = shipList[k];
      const u = (s.fase + t * s.vel) % 1;
      const p = s.lut[Math.floor(u * (s.lut.length - 1))];
      shipPos[k * 3] = p.x; shipPos[k * 3 + 1] = p.y; shipPos[k * 3 + 2] = p.z;
    }
    shipGeo.attributes.position.needsUpdate = true;

    // qualidade adaptativa: se o computador não sustentar ~40 fps, desliga o bloom e reduz a resolução
    fpsAcc += dt; fpsN++;
    if (fpsAcc < 0) fpsN = 0;
    if (fpsAcc > 2) {
      const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
      if (fps < 40 && composer) { composer = null; renderer.setPixelRatio(1); resize(); }
      else if (fps < 30 && renderer.getPixelRatio() > 0.75) { renderer.setPixelRatio(0.75); resize(); }
    }

    if (composer) composer.render(); else renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  let fpsAcc = -2, fpsN = 0; // ignora os 2 primeiros segundos (carregamento)
  requestAnimationFrame(frame);

  return {
    setView, applySolution,
    get solucao() { return solucaoAtual; },
    posicao: (nome) => new THREE.Vector3(...porNome[nome].d.pos),
  };
}
