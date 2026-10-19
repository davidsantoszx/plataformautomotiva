import {
  getBrands,
  getModelsByBrand,
  getGenerationsByModel,
  getVehiclesByGeneration,
} from "./api";

const cache = new Map();

export async function findVehicleById(vehicleId) {
  const key = Number(vehicleId);

  if (cache.has(key)) return cache.get(key);

  const brandsData = await getBrands();

  for (const brand of brandsData.brands || []) {
    const modelsData = await getModelsByBrand(brand.id);

    for (const model of modelsData.models || []) {
      const generationsData = await getGenerationsByModel(model.id);

      for (const generation of generationsData.generations || []) {
        const vehiclesData = await getVehiclesByGeneration(generation.id);
        const vehicle = (vehiclesData.vehicles || []).find(
          (item) => Number(item.id) === key,
        );

        if (vehicle) {
          cache.set(key, vehicle);
          return vehicle;
        }
      }
    }
  }

  return null;
}