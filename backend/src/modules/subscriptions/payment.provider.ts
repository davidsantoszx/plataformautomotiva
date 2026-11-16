// Adaptador de pagamento.
//
// O resto do sistema só conhece esta interface. Hoje o único provedor é o
// "mock" (simulado, ninguém é cobrado). Quando houver gateway de verdade
// (Mercado Pago, Stripe, Asaas...), cria-se uma classe nova que implementa
// PaymentProvider, registra-se em getPaymentProvider() e troca-se a variável
// PAYMENT_PROVIDER no .env. Telas e regras de plano não mudam.

export type CardInput = {
  number: string
  name: string
  expiry: string // MM/AA
  cvc: string
}

export type ChargeInput = {
  userId: number
  amountCents: number
  description: string
  // Só vem na primeira cobrança. Renovações usam o que o provedor já guardou.
  card?: CardInput
}

export type ChargeResult =
  | { ok: true; reference: string }
  | { ok: false; reason: 'DECLINED' }

export interface PaymentProvider {
  readonly name: string
  charge(input: ChargeInput): Promise<ChargeResult>
  cancel(reference: string | null): Promise<void>
}

// Provedor simulado. Nunca guarda dados de cartão.
// Cartão que termina em 0002 simula uma recusa, para testar esse caminho.
class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock'

  async charge(input: ChargeInput): Promise<ChargeResult> {
    const digits = String(input.card?.number ?? '').replace(/\D/g, '')

    if (digits.endsWith('0002')) {
      return { ok: false, reason: 'DECLINED' }
    }

    return {
      ok: true,
      reference: `mock_${input.userId}_${Date.now()}`,
    }
  }

  async cancel() {
    // nada a cancelar fora do sistema
  }
}

export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER || 'mock'

  switch (name) {
    case 'mock':
      return new MockPaymentProvider()
    default:
      throw new Error(`PAYMENT_PROVIDER desconhecido: ${name}`)
  }
}