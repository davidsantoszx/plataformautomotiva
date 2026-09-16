const part3dModels = {
  spoiler: {
    modelUrl: "/models/cars/toyota/corolla-spoiler.glb",

    // Ajustaremos estes valores depois de visualizar
    // o spoiler no Corolla.
    position: [0, 0, -2],
    rotation: [0, 0, 0],
    scale: 1,
  },
}

export function getPart3DModel(part) {
  if (!part) {
    return null
  }

  // Quando o banco já tiver um modelUrl,
  // ele terá prioridade.
  if (part.modelUrl) {
    return {
      modelUrl: part.modelUrl,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
    }
  }

  // Modo temporário para nosso teste do spoiler.
  const partName = String(part.name || "").toLowerCase()

  if (
    partName.includes("spoiler") ||
    partName.includes("aerofólio") ||
    partName.includes("aerofolio")
  ) {
    return part3dModels.spoiler
  }

  return null
}

export default part3dModels