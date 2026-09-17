const part3dModels = {
  spoiler: {
    modelUrl: "/models/cars/toyota/corolla-spoiler.glb",

    position: [0, 0, -2],
    rotation: [0, 0, 0],
    scale: 1,
  },

    wheel: {
    modelUrl: "/models/cars/toyota/roda.glb",
    position: [5, 0, 0],
    rotation: [0, 0, 0],
    scale: 1,
  },
}

export function getPart3DModel(part) {
  if (!part) {
    return null
  }

  const partName = String(part.name || "").toLowerCase()

  if (
  partName.includes("roda") ||
  partName.includes("rodas")
  ) {
  return part3dModels.wheel
  }

  // Configuração específica do spoiler.
  const isSpoiler =
    partName.includes("spoiler") ||
    partName.includes("aerofólio") ||
    partName.includes("aerofolio")

  if (isSpoiler) {
    return {
      ...part3dModels.spoiler,
      ...(part.modelUrl
        ? { modelUrl: part.modelUrl }
        : {}),
    }
  }

  // Outras peças que já possuírem modelUrl
  // entram no 3D na posição padrão.
  if (part.modelUrl) {
    return {
      modelUrl: part.modelUrl,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
    }
  }

  return null
}

export default part3dModels