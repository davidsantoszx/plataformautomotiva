import type {
  CarpediaApiError,
  CarpediaBrandsResponse,
  CarpediaFichaResponse,
  CarpediaModelsResponse,
  CarpediaVersionsResponse,
} from './carpedia.type';

const CARPEDIA_BASE_URL = 'https://www.carpedia.com.br/api/v1';

class CarpediaClient {
  private readonly apiKey: string;

  constructor() {
    const apiKey = process.env['CARPEDIA_API_KEY'];

    if (!apiKey) {
      throw new Error(
        'CARPEDIA_API_KEY não foi configurada no arquivo .env',
      );
    }

    this.apiKey = apiKey;
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${CARPEDIA_BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });

    const data = (await response.json()) as T | CarpediaApiError;

    if (!response.ok) {
      const error = data as CarpediaApiError;

      throw new Error(
        `Carpedia API ${response.status}: ${
          error.erro?.mensagem ?? 'Erro desconhecido'
        }`,
      );
    }

    return data as T;
  }

  async getBrands(
    page = 1,
    perPage = 100,
  ): Promise<CarpediaBrandsResponse> {
    return this.request<CarpediaBrandsResponse>(
      `/marcas?pagina=${page}&porPagina=${perPage}`,
    );
  }

  async getModelsByBrand(
    brandSlug: string,
    page = 1,
    perPage = 100,
  ): Promise<CarpediaModelsResponse> {
    return this.request<CarpediaModelsResponse>(
      `/marcas/${encodeURIComponent(brandSlug)}/modelos?pagina=${page}&porPagina=${perPage}`,
    );
  }

  async getVersionsByModel(
    brandSlug: string,
    modelSlug: string,
  ): Promise<CarpediaVersionsResponse> {
    return this.request<CarpediaVersionsResponse>(
      `/modelos/${encodeURIComponent(brandSlug)}/${encodeURIComponent(
        modelSlug,
      )}/versoes`,
    );
  }

  async getTechnicalSheet(
    fipeId: number,
    year: number,
  ): Promise<CarpediaFichaResponse> {
    return this.request<CarpediaFichaResponse>(
      `/ficha/${fipeId}/${year}`,
    );
  }
}

export const carpediaClient = new CarpediaClient();