import * as THREE from "three";

// ---------------------------------------------------------------------------
// Pintura do carro (cor + acabamento), aplicada no próprio material do modelo
// 3D, sem trocar o arquivo .glb.
//
// Como encontra a pintura dentro do modelo:
//  1. Material com nome de pintura ("paint", "body", "carroceria"...): o
//     material inteiro é pintura. É o jeito mais exato; ao preparar novos
//     modelos no Blender, basta nomear o material da lataria assim.
//  2. Modelos de um material só, com texturas (como o Astra atual): usa o
//     mapa de metal/rugosidade (pintura = lisa e sem metal) e o albedo
//     (pintura original escura e sem cor), o que deixa vidros, rodas, pneus,
//     faróis e cromados como estão. Hoje isso vale para carros de pintura
//     original escura.
//  3. Se não houver nem um nem outro, o carro simplesmente não muda de cor.
// ---------------------------------------------------------------------------

// free: true = disponível no plano Free. O resto é exclusivo do Pro.
// (o backend repete a regra em projects.service.ts: FREE_PAINT_COLORS)
export const PAINT_FINISHES = [
  { id: "GLOSS", label: "Brilhante", hint: "lisa, com brilho", roughness: 0.05, metalness: 0, pearl: false, free: true },
  { id: "MATTE", label: "Fosco", hint: "sem reflexo", roughness: 0.8, metalness: 0, pearl: false, free: false },
  { id: "METALLIC", label: "Metálico", hint: "reflexo metálico", roughness: 0.28, metalness: 0.75, pearl: false, free: false },
  { id: "PEARL", label: "Perolado", hint: "muda de tom com o ângulo", roughness: 0.12, metalness: 0, pearl: true, free: false },
];

export const DEFAULT_FINISH = "GLOSS";

export const PAINT_COLORS = [
  { name: "Preto", hex: "#111214", free: true },
  { name: "Cinza", hex: "#6b7280", free: true },
  { name: "Branco", hex: "#f2f2f2", free: true },
  { name: "Prata", hex: "#b9bec4", free: false },
  { name: "Grafite", hex: "#4a4f55", free: false },
  { name: "Vermelho", hex: "#c4161c", free: false },
  { name: "Laranja", hex: "#ff5a1f", free: false },
  { name: "Amarelo", hex: "#f2c200", free: false },
  { name: "Verde", hex: "#1f7a4d", free: false },
  { name: "Azul", hex: "#1d4ed8", free: false },
  { name: "Roxo", hex: "#6d28d9", free: false },
];

export function paintColorName(hex) {
  const found = PAINT_COLORS.find(
    (item) => item.hex === String(hex || "").toLowerCase(),
  );

  return found ? found.name : "Personalizada";
}

export function paintFinishLabel(id) {
  return PAINT_FINISHES.find((item) => item.id === id)?.label || "";
}

export function isValidPaintColor(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

// Projeto -> { color, finish } ou null (cor original do modelo)
export function paintFromProject(project) {
  if (!project || !isValidPaintColor(project.paintColor)) return null;

  return {
    color: project.paintColor,
    finish: project.paintFinish || DEFAULT_FINISH,
  };
}

const PAINT_MATERIAL_NAME = /paint|pintura|carroceria|body/i;

const UNIFORMS_KEY = "paintUniforms";

function patchMaterial(material) {
  const named = PAINT_MATERIAL_NAME.test(material.name || "");

  if (!named && !material.metalnessMap) return;

  const uniforms = {
    uPaintOn: { value: 0 },
    uPaintAll: { value: named ? 1 : 0 },
    uTint: { value: new THREE.Color() },
    uTint2: { value: new THREE.Color() },
    uFin: { value: new THREE.Vector3(0.05, 0, 0) },
  };

  material.userData[UNIFORMS_KEY] = uniforms;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.fragmentShader =
      "uniform float uPaintOn;uniform float uPaintAll;uniform vec3 uTint;uniform vec3 uTint2;uniform vec3 uFin;\n" +
      shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `
      #include <map_fragment>
      float paint = 0.0;
      float baseLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      #ifdef USE_METALNESSMAP
        vec4 paintMr = texture2D(metalnessMap, vMetalnessMapUv);
        paint = (1.0 - smoothstep(0.30, 0.55, paintMr.g)) * (1.0 - smoothstep(0.30, 0.55, paintMr.b));
        float paintChroma = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b)) - min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b));
        paint *= (1.0 - smoothstep(0.035, 0.09, baseLum)) * (1.0 - smoothstep(0.03, 0.08, paintChroma));
      #endif
      paint = mix(paint, 1.0, uPaintAll) * uPaintOn;
      diffuseColor.rgb = mix(diffuseColor.rgb, uTint * min(0.55 + baseLum * 8.0, 1.25), paint);`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      `
      #include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, uFin.x, paint);`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <metalnessmap_fragment>",
      `
      #include <metalnessmap_fragment>
      metalnessFactor = mix(metalnessFactor, uFin.y, paint);`,
    );

    // perolado: perto das bordas (ângulo rasante) a cor vira o segundo tom
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_maps>",
      `
      #include <normal_fragment_maps>
      if (uFin.z > 0.5) {
        float pearlMix = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
        diffuseColor.rgb = mix(diffuseColor.rgb, uTint2 * 0.9, pearlMix * paint);
      }`,
    );
  };

  material.customProgramCacheKey = () => "car-paint-v1";
  material.needsUpdate = true;
}

// Clona o modelo com materiais PRÓPRIOS (o .glb carregado é compartilhado:
// mexer nele mudaria todos os usos do mesmo carro). As texturas continuam
// compartilhadas, então o custo é pequeno.
export function cloneForPaint(scene) {
  const model = scene.clone(true);
  const materials = [];

  model.traverse((object) => {
    if (!object.isMesh || !object.material) return;

    const own = Array.isArray(object.material)
      ? object.material.map((material) => material.clone())
      : object.material.clone();

    object.material = own;

    (Array.isArray(own) ? own : [own]).forEach((material) => {
      patchMaterial(material);
      materials.push(material);
    });
  });

  return { model, materials };
}

// segundo tom do perolado: mesma cor com o matiz deslocado e um pouco mais clara
function pearlSecondTone(hex) {
  const hsl = {};
  const color = new THREE.Color(hex);

  color.getHSL(hsl, THREE.SRGBColorSpace);
  color.setHSL(
    (hsl.h + 0.12) % 1,
    Math.min(1, hsl.s + 0.1),
    Math.min(0.85, hsl.l + 0.12),
    THREE.SRGBColorSpace,
  );

  return color;
}

// Liga/desliga e ajusta a pintura. Só muda valores (uniforms): não recompila.
export function applyPaint(materials, paint) {
  const enabled = Boolean(paint && isValidPaintColor(paint.color));
  const finish =
    PAINT_FINISHES.find((item) => item.id === paint?.finish) ||
    PAINT_FINISHES[0];

  materials.forEach((material) => {
    const uniforms = material.userData[UNIFORMS_KEY];

    if (!uniforms) return;

    uniforms.uPaintOn.value = enabled ? 1 : 0;

    if (!enabled) return;

    uniforms.uTint.value.set(paint.color);
    uniforms.uTint2.value.copy(pearlSecondTone(paint.color));
    uniforms.uFin.value.set(
      finish.roughness,
      finish.metalness,
      finish.pearl ? 1 : 0,
    );
  });
}
