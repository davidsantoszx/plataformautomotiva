import { useEffect, useState } from 'react'
import { getPublicProject } from '../services/api'

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function PublicProjectPage({ shareToken }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError('')

        const result = await getPublicProject(shareToken)
        setData(result)
      } catch (error) {
        console.error(error)
        setError(
          error.message || 'Projeto público não encontrado.',
        )
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [shareToken])

  if (loading) {
    return <main><p>Carregando projeto...</p></main>
  }

  if (error || !data) {
    return (
      <main>
        <h1>Projeto não encontrado</h1>
        <p>{error || 'Este projeto não está disponível publicamente.'}</p>
      </main>
    )
  }

  const total = (data.parts || []).reduce(
    (sum, item) =>
      sum +
      Number(item.priceAtTime || 0) *
        Number(item.quantity || 0),
    0,
  )

  return (
    <main>
      <header>
        <h1>{data.project.name}</h1>
        <p>
          {data.project.mode === 'REAL'
            ? 'Projeto Real'
            : 'Projeto Livre'}
        </p>
        <p>Veículo ID: {data.project.vehicleId}</p>
      </header>

      <section>
        <h2>Peças do projeto</h2>

        {(data.parts || []).length === 0 ? (
          <p>Nenhuma peça adicionada.</p>
        ) : (
          data.parts.map((projectPart) => (
            <article key={projectPart.id}>
              <h3>
                {projectPart.part?.name ||
                  `Peça #${projectPart.partId}`}
              </h3>

              {projectPart.part?.brand && (
                <p>Marca: {projectPart.part.brand}</p>
              )}

              <p>Quantidade: {projectPart.quantity}</p>
              <p>
                Preço unitário:{' '}
                {formatCurrency(projectPart.priceAtTime)}
              </p>
            </article>
          ))
        )}
      </section>

      <h2>Total estimado: {formatCurrency(total)}</h2>

      <p>
        Visualização pública — somente leitura.
      </p>
    </main>
  )
}
