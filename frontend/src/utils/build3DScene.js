import { getVehicle3DModel } from "../data/vehicle3dModels";
import { getPart3DModel } from "../data/part3dModels";

// Recebe o veículo e o mapa { partId: peça } e devolve o modelo base + peças 3D visíveis.
export function build3DScene(vehicle, partDetailsMap) {
  const baseModel = vehicle ? getVehicle3DModel(vehicle) : null;
  const details = Object.values(partDetailsMap || {});

  const isAstra = String(baseModel || "").toLowerCase().includes("astra.glb");

  const hasWheelSelected = details.some((part) =>
    String(part.name || "").toLowerCase().match(/rodas?|pneus?/),
  );

  const selectedParts = details
    .filter((part) => !(isAstra && /rodas?|pneus?/i.test(part.name || "")))
    .map((part) => {
      const model = getPart3DModel(part);
      if (!model) return null;
      return { key: String(part.id), ...model };
    })
    .filter(Boolean);

  const modelUrl =
    isAstra && hasWheelSelected
      ? "/models/cars/chevrolet/astra/astra-base.glb"
      : baseModel;

  const parts = [
    ...selectedParts,
    ...(isAstra && hasWheelSelected
      ? [
          {
            key: "astra-4rodas",
            modelUrl: "/models/parts/wheels/4rodas.glb",
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: 1,
          },
        ]
      : []),
  ];

  return { modelUrl, parts };
}