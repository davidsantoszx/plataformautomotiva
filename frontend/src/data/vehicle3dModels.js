const vehicle3dModels = {
  "1": {
    modelUrl: "/models/cars/toyota/toyota-corolla-2023.glb",
    name: "Toyota Corolla 2023 XEi",
  },
}

export function getVehicle3DModel(vehicle) {
  if (!vehicle) {
    return null
  }

  if (vehicle.model3dUrl) {
    return vehicle.model3dUrl
  }

  const model = vehicle3dModels[String(vehicle.id)]

  return model?.modelUrl || null
}

export default vehicle3dModels