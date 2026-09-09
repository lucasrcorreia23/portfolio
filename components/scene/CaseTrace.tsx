"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { installCaseTrace, type CaseTrace as Trace } from "@/lib/scene/case-trace";
import type { CameraPose } from "@/lib/scene/curve";
import type { SharedUniforms } from "@/lib/scene/uniforms";

type CaseTraceProps = {
  pose: CameraPose;
  shared: SharedUniforms;
  apertureRef: { readonly current: number };
  amountRef: { readonly current: number };
};

/**
 * O laço de captura da travessia — **só em desenvolvimento**, e nunca no chunk
 * de produção.
 *
 * **Prioridade 2: depois do compositor (1).** É a única ordem que funciona. O
 * composite é a última passada, e é ela que escreve no framebuffer padrão; ler
 * antes dela devolveria o alvo intermediário de meio-float, que é o mesmo erro
 * que a sonda já documenta — quadro cheio na tela, medição toda em preto.
 *
 * Ele não roda nada enquanto ninguém pediu: `capture()` sai na primeira linha se
 * não houver gravação em curso, então o custo em repouso é uma comparação por
 * quadro. Ver `lib/scene/case-trace.ts` para por que a leitura de pixel é
 * legítima aqui e proibida na cena.
 */
export function CaseTrace({
  pose,
  shared,
  apertureRef,
  amountRef,
}: CaseTraceProps) {
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const trace = useRef<Trace | null>(null);

  useEffect(() => {
    const installed = installCaseTrace({
      gl,
      camera,
      pose,
      shared,
      apertureRef,
      amountRef,
    });
    trace.current = installed;
    console.info(
      "[case] window.__caseTrace.start() / .stop() / .seam()",
    );
    return () => {
      installed.dispose();
      trace.current = null;
    };
  }, [gl, camera, pose, shared, apertureRef, amountRef]);

  useFrame(() => {
    trace.current?.tick();
  }, 2);

  return null;
}
