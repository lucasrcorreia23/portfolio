import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [".next/**", "out/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    /**
     * `react-hooks/immutability` desligado **só** dentro da cena.
     *
     * A regra existe para impedir que um componente mute um valor devolvido
     * por um hook e produza render inconsistente. Ela está certa em todo o
     * resto do projeto e continua ligada lá.
     *
     * Dentro do canvas ela descreve outra coisa. O modelo do React Three Fiber
     * é imperativo por construção: `useThree()` devolve o renderer, a câmera e
     * o relógio — objetos do three, com estado próprio, que existem fora do
     * React —, e `useFrame` roda sessenta vezes por segundo justamente para
     * mutá-los. Escrever `camera.position` ou `uniform.value` não é um efeito
     * colateral de render; é o render. A alternativa que a regra sugere —
     * estado do React — significaria um `setState` por quadro, que é
     * exatamente o que este projeto evita no store de scroll, no contador do
     * portão e aqui.
     *
     * O escopo é a pasta, e não um `eslint-disable` por linha, porque a
     * exceção é do modelo de programação inteiro daquele diretório, não de
     * uma linha específica. Fora de `components/scene/`, mutar valor de hook
     * continua sendo erro.
     */
    files: ["components/scene/**/*.tsx"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
];

export default config;
