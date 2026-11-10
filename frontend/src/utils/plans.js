// Definição dos planos num lugar só: a página /planos usa daqui e a landing
// page (etapa 9) vai usar os mesmos dados, para preço e benefícios nunca
// ficarem diferentes entre as telas.

export const FREE_PROJECT_LIMIT = 4;

export const PRICING = {
  monthly: 9.9,
  yearly: 99,
};

// free / pro: true (incluído), false (não incluído) ou um texto.
// soon: o benefício ainda será liberado (aparece como "em breve").
export const PLAN_FEATURES = [
  {
    id: "real",
    label: "Projeto real (peças compatíveis)",
    free: true,
    pro: true,
  },
  {
    id: "free-mode",
    label: "Projeto livre (qualquer peça)",
    free: false,
    pro: true,
  },
  {
    id: "limit",
    label: "Quantidade de projetos",
    free: `Até ${FREE_PROJECT_LIMIT}`,
    pro: "Ilimitados",
  },
  {
    id: "social",
    label: "Publicar no feed, curtir e ter perfil",
    free: true,
    pro: true,
  },
  {
    id: "catalog",
    label: "Catálogo",
    free: "Básico",
    pro: "Completo, com carros e peças premium",
    soon: true,
  },
  {
    id: "cover",
    label: "Capa do projeto",
    free: "Automática",
    pro: "Automática + exportar em alta resolução",
    soon: true,
  },
  {
    id: "shopping",
    label: "Lista de compras com preços",
    free: "Só na tela",
    pro: "Exportar em PDF",
    soon: true,
  },
  {
    id: "badge",
    label: "Selo PRO no perfil",
    free: false,
    pro: true,
    soon: true,
  },
];

// Ideias já decididas para o Pro, ainda sem data.
export const COMING_SOON_PRO = [
  "Projeto em destaque no perfil",
  "Cores e acabamentos (pintura, vidros e rodas)",
  "Comparar dois projetos lado a lado",
  "Projeto privado com link para compartilhar",
  "Estatísticas de visualizações e curtidas",
  "Vídeo giratório 360° do carro",
];

export function formatPrice(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Quanto o plano anual economiza em relação a pagar mês a mês.
export function yearlySavings() {
  const monthlyTotal = PRICING.monthly * 12;
  const saved = monthlyTotal - PRICING.yearly;

  return {
    perMonth: PRICING.yearly / 12,
    saved,
    percent: Math.round((saved / monthlyTotal) * 100),
  };
}