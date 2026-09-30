"use client";

import { useEffect, useMemo } from "react";
import {
  BufferAttribute,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  ShaderMaterial,
  Sphere,
  Vector2,
  Vector3,
} from "three";
import { wallX, type ChamberPlan } from "@/lib/scene/chamber-plan";
import {
  ATLAS_WIDTH,
  TILE,
  createEngravingAtlas,
  tileOf,
} from "@/lib/scene/engraving-atlas";
import { CONCRETE_GLSL } from "@/lib/scene/shaders/chamber";
import { FOG_GLSL, FOG_UNIFORMS_GLSL } from "@/lib/scene/shaders/fog";
import { LIGHTS_GLSL, LIGHTS_UNIFORMS_GLSL } from "@/lib/scene/shaders/lights";
import {
  fogUniforms,
  lightUniforms,
  type SharedUniforms,
} from "@/lib/scene/uniforms";

/**
 * Os fósseis gravados — folhas, samambaias, amonites, conchas, sementes e
 * peixes em baixo-relevo, na parede e no piso (rodada 16). Até a rodada 15
 * eram os números `EST. NNN` e `COTA ±NN.NN`; a câmara trocou a medida pela
 * natureza (decisão do Lucas, 2026-09-30) e o mecanismo ficou o mesmo.
 *
 * Cada fóssil é uma placa rente à superfície, instanciada, amostrando um
 * ladrilho do atlas de altura (`engraving-atlas.ts`). **A placa só desenha onde
 * há vala**: fora da máscara ela descarta, e o concreto da parede aparece.
 * Dentro, o sombreamento é o **mesmo** da parede (`CONCRETE_GLSL`) com a normal
 * perturbada pelo gradiente da máscara — então na borda do traço a placa e a
 * parede são o mesmo pixel, e o que se lê é só a vala e o chanfro dela.
 *
 * Sem emissivo e sem blending: o fóssil existe quando a luz do bando ou de uma
 * lanterna pega o chanfro, e a vala escurece mesmo sem luz nenhuma.
 */

const VERT = /* glsl */ `
in vec3 aCenter;
in vec3 aU;
in vec3 aV;
in vec3 aNormal;
in vec2 aTile;

uniform vec2 uAtlasSize;

out vec3 vWorld;
out vec3 vNormal;
out vec3 vU;
out vec3 vV;
out vec2 vUv;
out float vViewDepth;

void main() {
  vec3 world = aCenter + aU * position.x + aV * position.y;
  vWorld = world;
  vNormal = aNormal;
  vU = normalize(aU);
  vV = normalize(aV);
  float u = (aTile.x + position.x * 0.5 + 0.5) * ${TILE.toFixed(1)} / uAtlasSize.x;
  float v = (aTile.y + 0.5 - position.y * 0.5) * ${TILE.toFixed(1)} / uAtlasSize.y;
  vUv = vec2(u, v);
  vec4 view = viewMatrix * vec4(world, 1.0);
  vViewDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

const FRAG = /* glsl */ `
${FOG_UNIFORMS_GLSL}
${LIGHTS_UNIFORMS_GLSL}

uniform sampler2D uAtlas;
uniform vec2 uAtlasSize;

in vec3 vWorld;
in vec3 vNormal;
in vec3 vU;
in vec3 vV;
in vec2 vUv;
in float vViewDepth;

out vec4 fragColor;

${FOG_GLSL}
${LIGHTS_GLSL}
${CONCRETE_GLSL}

void main() {
  vec2 texel = 1.4 / uAtlasSize;
  float h = texture(uAtlas, vUv).r;
  float gu = texture(uAtlas, vUv + vec2(texel.x, 0.0)).r - texture(uAtlas, vUv - vec2(texel.x, 0.0)).r;
  // v cresce para baixo no atlas e V aponta para cima no mundo.
  float gv = texture(uAtlas, vUv - vec2(0.0, texel.y)).r - texture(uAtlas, vUv + vec2(0.0, texel.y)).r;
  if (h < 0.01 && abs(gu) + abs(gv) < 0.01) discard;

  vec3 n = normalize(vNormal);
  // A normal inclina para dentro da vala: é o chanfro que olha para a luz.
  vec3 shading = normalize(n + 1.1 * (gu * vU + gv * vV));
  fragColor = vec4(shadeConcrete(vWorld, n, shading, h, vViewDepth), 1.0);
}
`;

/** Quanto a placa fica à frente da superfície — menos que qualquer grão. */
const LIFT = 0.004;

export function Structure({
  shared,
  plan,
}: {
  shared: SharedUniforms;
  plan: ChamberPlan;
}) {
  const { geometry, material, atlas } = useMemo(() => {
    const fossils = plan.fossils;
    const atlas = createEngravingAtlas(fossils);
    const count = fossils.length;

    const centers = new Float32Array(count * 3);
    const us = new Float32Array(count * 3);
    const vs = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    const tiles = new Float32Array(count * 2);

    fossils.forEach((fossil, i) => {
      const half = fossil.size / 2;
      let center: Vector3;
      let u: Vector3;
      let v: Vector3;
      let n: Vector3;
      if (fossil.surface === "floor" || fossil.surface === "sill") {
        const s = plan.section(fossil.z);
        n = new Vector3(0, 1, 0);
        u = new Vector3(1, 0, 0);
        v = new Vector3(0, 0, -1);
        // A soleira é horizontal como o piso, mas mora na altura dela.
        const y = fossil.surface === "sill" ? fossil.y : -s.floor;
        center = new Vector3(fossil.x, y + LIFT, fossil.z);
      } else {
        const s = plan.section(fossil.z);
        const x = wallX(s, fossil.side);
        n = new Vector3(-fossil.side, 0, 0);
        u = new Vector3(0, 0, fossil.side);
        v = new Vector3(0, 1, 0);
        center = new Vector3(x - fossil.side * LIFT, fossil.y, fossil.z);
      }
      const [col, row] = tileOf(i);
      centers.set([center.x, center.y, center.z], i * 3);
      us.set([u.x * half, u.y * half, u.z * half], i * 3);
      vs.set([v.x * half, v.y * half, v.z * half], i * 3);
      normals.set([n.x, n.y, n.z], i * 3);
      tiles.set([col, row], i * 2);
    });

    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(
        new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]),
        3,
      ),
    );
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.setAttribute("aCenter", new InstancedBufferAttribute(centers, 3));
    geometry.setAttribute("aU", new InstancedBufferAttribute(us, 3));
    geometry.setAttribute("aV", new InstancedBufferAttribute(vs, 3));
    geometry.setAttribute("aNormal", new InstancedBufferAttribute(normals, 3));
    geometry.setAttribute("aTile", new InstancedBufferAttribute(tiles, 2));
    geometry.instanceCount = count;
    // Quem sabe onde as placas estão é o vertex shader.
    geometry.boundingSphere = new Sphere(new Vector3(), 1e4);

    const material = new ShaderMaterial({
      uniforms: {
        ...fogUniforms(shared),
        ...lightUniforms(shared),
        uWallColor: shared.abyss,
        uCyan: shared.cyan,
        uAtlas: { value: atlas.texture },
        uAtlasSize: {
          value: new Vector2(ATLAS_WIDTH, atlas.height),
        },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthWrite: true,
      transparent: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -4,
    });
    material.glslVersion = GLSL3;

    return { geometry, material, atlas };
  }, [shared, plan]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      atlas.dispose();
    };
  }, [geometry, material, atlas]);

  return (
    <mesh geometry={geometry} material={material} frustumCulled={false} />
  );
}
