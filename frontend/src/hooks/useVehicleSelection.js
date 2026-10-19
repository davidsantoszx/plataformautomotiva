import { useEffect, useState } from "react";
import {
  getBrands,
  getModelsByBrand,
  getGenerationsByModel,
  getVehiclesByGeneration,
} from "../services/api";

export default function useVehicleSelection() {
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");

  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBrands() {
      try {
        const data = await getBrands();
        setBrands(data.brands || []);
      } catch (err) {
        console.error(err);
        setError("Não foi possível carregar as marcas.");
      } finally {
        setLoadingBrands(false);
      }
    }

    loadBrands();
  }, []);

  async function handleBrandChange(event) {
    const brandId = event.target.value;

    setSelectedBrand(brandId);
    setSelectedModel("");
    setSelectedYear("");
    setSelectedVehicle("");
    setModels([]);
    setVehicles([]);
    setError("");

    if (!brandId) return;

    try {
      setLoadingModels(true);
      const data = await getModelsByBrand(brandId);
      setModels(data.models || []);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os modelos.");
    } finally {
      setLoadingModels(false);
    }
  }

  async function handleModelChange(event) {
    const modelId = event.target.value;

    setSelectedModel(modelId);
    setSelectedYear("");
    setSelectedVehicle("");
    setVehicles([]);
    setError("");

    if (!modelId) return;

    try {
      setLoadingVehicles(true);

      const data = await getGenerationsByModel(modelId);
      const generations = data.generations || [];

      const responses = await Promise.all(
        generations.map((generation) => getVehiclesByGeneration(generation.id)),
      );

      setVehicles(responses.flatMap((response) => response.vehicles || []));
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os veículos.");
    } finally {
      setLoadingVehicles(false);
    }
  }

  function handleYearChange(event) {
    setSelectedYear(event.target.value);
    setSelectedVehicle("");
  }

  function handleVehicleChange(event) {
    setSelectedVehicle(event.target.value);
  }

  const years = [
    ...new Set(
      vehicles.map((v) => Number(v.year)).filter((y) => Number.isFinite(y)),
    ),
  ].sort((a, b) => b - a);

  const visibleVehicles = selectedYear
    ? vehicles.filter((v) => String(v.year) === String(selectedYear))
    : [];

  const selectedVehicleData = vehicles.find(
    (v) => String(v.id) === String(selectedVehicle),
  );

  return {
    brands,
    models,
    years,
    visibleVehicles,
    selectedBrand,
    selectedModel,
    selectedYear,
    selectedVehicle,
    selectedVehicleData,
    loadingBrands,
    loadingModels,
    loadingVehicles,
    error,
    handleBrandChange,
    handleModelChange,
    handleYearChange,
    handleVehicleChange,
  };
}