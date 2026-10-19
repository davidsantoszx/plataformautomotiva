// Monta o texto do veículo a partir do resumo que o backend devolve:
// { id, year, version, model3dUrl, generationName, model: { name, brand: { name } } }
export function vehicleLabel(vehicle, { withVersion = false } = {}) {
  if (!vehicle) return "";

  const base = [
    vehicle.model?.brand?.name,
    vehicle.model?.name,
    vehicle.year,
  ]
    .filter(Boolean)
    .join(" ");

  if (withVersion && vehicle.version) {
    return `${base} · ${vehicle.version}`;
  }

  return base;
}