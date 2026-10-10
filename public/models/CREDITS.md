# Modelos 3D

`flower_empodium.glb`: Flower Empodium, Poly Haven (https://polyhaven.com/a/flower_empodium).
Modelagem de Rico Cilliers, fotografia de Jenelle van Heerden. Licença CC0 1.0.
Montado a partir do glTF 1k: cinco variantes (nós `flower_empodium_a` a `e`), 3.053 triângulos no total,
textura base com alfa em PNG, material em `alphaMode: MASK` (corte 0.5) para funcionar com instâncias.

## Variedade (mesma família, Poly Haven, todos CC0 1.0)

Montados a partir do glTF 1k de cada asset, em GLB único. Onde o material tinha transparência e existia mapa de alfa,
o alfa foi embutido num PNG e o material passou para `MASK` (corte 0.5). Onde não havia mapa de alfa, o material ficou opaco.

| arquivo | triângulos | MB | autores |
|---|---:|---:|---|
| flower_heliophila.glb | 101.621 | 4.8 | Jenelle van Heerden |
| flower_stinkkruid.glb | 80.716 | 5.5 | Jenelle van Heerden, Rico Cilliers |
| flower_gazania.glb | 14.340 | 2.8 | James Ray Cock, Jenelle van Heerden |
| flower_ursinia.glb | 24.933 | 2.8 | Jenelle van Heerden, Rico Cilliers |
| celandine_01.glb | 8.966 | 2.4 | Rob Tuytel, Rico Cilliers |
| dandelion_01.glb | 54.764 | 3.8 | Rob Tuytel, Rico Cilliers |
| periwinkle_plant.glb | 34.350 | 2.9 | Amal Kumar |
| wild_rooibos_bush.glb | 27.519 | 4.4 | James Ray Cock, Jenelle van Heerden |
| weed_plant_02.glb | 11.116 | 3.0 | Rob Tuytel, Rico Cilliers |
| didelta_spinosa.glb | 417.187 | 14.8 | Jenelle van Heerden |
| namaqualand_boulder_04.glb | 59.066 | 3.7 | Jenelle van Heerden |
| namaqualand_boulder_06.glb | 109.114 | 5.3 | Greg Zaal, Jenelle van Heerden |

Fonte de cada um: https://polyhaven.com/a/<nome do arquivo sem .glb>

## Em uso na cena

`scripts/extract-plants.mjs` tira dos GLB só as variantes leves e a textura de cor (512 px, WebP) e grava em
`public/models/plantas/`. É isso que o site carrega; os GLB ficam como fonte.

| espécie | variantes | papel |
|---|---|---|
| flower_empodium | a, c, e | a flor alta em estrela e a folhagem |
| flower_gazania | a, b, e | a roseta baixa e a margarida aberta |
| celandine_01 | b, e | cobertura de chão |
| wild_rooibos_bush | e | arbusto ao pé dos pórticos e da parede da vitrine |
| namaqualand_boulder_04, _06 | versões `_low` | pedras ao longo da trilha |

Os `_low.glb` são os boulders decimados (59 mil → 708 e 109 mil → 654 triângulos) com
`npx @gltf-transform/cli simplify <original> <saida> --ratio 0.012 --error 0.05` (0.006 no 06).

## Indústria (Poly Haven, CC0 1.0)

| arquivo | triângulos | MB | autores |
|---|---:|---:|---|
| rollershutter_door.glb | 1.104 | 2.3 | MP |
| overhead_crane.glb | 89.964 | 7.3 | Timothy3D |

`scripts/compress-assets.mjs` grava em `public/models/industria/` o que o site carrega: `porta.glb` é a
`rollershutter_door` sem a cópia grafitada, com a geometria em meshopt e as texturas em WebP 1k.

## Indústria (Sketchfab, CC BY 4.0, exige crédito)

| arquivo | triângulos | MB | autor | fonte |
|---|---:|---:|---|---|
| large_industrial_storage_tanks.glb | 8.412 | 1.5 | Duane's Mind (@duanesmind) | https://sketchfab.com/3d-models/large-industrial-storage-tanks-bd3ac97071104b64bc388a155b64f79e |
| old_oil_tank.glb | 12.502 | 0.9 | Mouad Hsaine (@ittoKubashi7) | https://sketchfab.com/3d-models/old-oil-tank-d8e9ced5cc11428280ffad57f96d8686 |
| rusted_tank_storage.glb | 5.769 | 0.8 | Mkc (@ixMkc1) | https://sketchfab.com/3d-models/rusted-tank-storage-57be2eaf4d6b4d2980bcee4ccb35f780 |
| industrial_smoke_stacks.glb | 2.868 | 0.5 | FrodoUndead (@FrodoUndead) | https://sketchfab.com/3d-models/industrial-smoke-stacks-ffaf6bfbd8b84eb985dee2a35ba79440 |

`scripts/extract-industry.mjs` tira de cada um só a forma, decimada e sem textura, e grava em
`public/models/industria/`: entram na silhueta da indústria no lugar dos tanques e das torres de primitivas.

| saída | fonte | triângulos | altura |
|---|---|---:|---:|
| tanques.bin | large_industrial_storage_tanks | 975 | 11,5 m |
| tanque-oleo.bin | old_oil_tank | 423 | 10 m |
| tanque-ferrugem.bin | rusted_tank_storage | 300 | 11 m |
| chamine.bin | industrial_smoke_stacks (uma das três) | 72 | 34,6 m |
