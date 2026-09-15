export interface CarpediaPagination {
  pagina: number;
  porPagina: number;
  total: number;
  totalPaginas: number;
}

export interface CarpediaBrand {
  slug: string
  nome: string
  tipos?: string[]
  modelos?: number
}

export interface CarpediaBrandsResponse {
  ref: string
  marcas: CarpediaBrand[]
  paginacao: CarpediaPagination
}

export interface CarpediaModelImage {
  tipo: 'foto' | 'logo' | 'monograma';
  url?: string;
  ano?: string;
  ia?: boolean;
  angulo?: string;
  monograma?: string;
  cor?: string;
}

export interface CarpediaModel {
  slug: string
  nome: string
  tipos?: string[]
  versoes?: number
  imagem?: CarpediaModelImage
}

export interface CarpediaModelsResponse {
  ref: string;
  marca: {
    slug: string;
    nome: string;
  };
  modelos: CarpediaModel[];
  paginacao: CarpediaPagination;
}

export interface CarpediaVersion {
  id: number;
  nome: string;
  versao: string;
  slug: string;
  tipo: string;
  anos: string[];
  combustiveis: string[];
  manual: boolean;
  precoRef?: {
    valor: number;
    ano: string;
    estimado: boolean;
  };
}

export interface CarpediaVersionsResponse {
  ref: string;
  marca: {
    slug: string;
    nome: string;
  };
  modelo: {
    slug: string;
    nome: string;
  };
  versoes: CarpediaVersion[];
}

export interface CarpediaFichaItem {
  label: string;
  valor: string;
}

export interface CarpediaFichaSecao {
  titulo: string;
  itens: CarpediaFichaItem[];
}

export interface CarpediaFichaResponse {
  ref: string;
  versao: {
    id: number;
    nome: string;
    marca: string;
    modelo: string;
  };
  ano: string;
  fonte?: {
    fonte: string;
    em: string;
  };
  secoes: CarpediaFichaSecao[];
  consumo?: {
    kml_cidade?: number;
    kml_estrada?: number;
    autonomia_km?: number;
    selo?: string;
    fonte?: string;
  };
  porte?: {
    rotulo: string;
    criterio: string;
    comprimento_mm: number;
    carroceria: string;
  };
  anosDisponiveis?: number[];
}

export interface CarpediaApiError {
  erro?: {
    codigo?: string;
    mensagem?: string;
    status?: number;
  };
}