import { useEffect, useRef } from 'react'
import { ArrowRight, Box, Calculator, ShieldCheck } from 'lucide-react'
import Lancer from '../assets/lancerisometric1.png'

// Faixa que corre entre o topo e "Como funciona"
const MARQUEE_ITEMS = [
  'Rodas',
  'Suspensão',
  'Escapamento',
  'Freios',
  'Aerodinâmica',
  'Iluminação',
  'Interior',
  'Performance',
]

// Cartões flutuando em volta do carro
const HERO_CHIPS = [
  { icon: ShieldCheck, label: 'Peças compatíveis', className: 'chip-a' },
  { icon: Calculator, label: 'Orçamento em tempo real', className: 'chip-b' },
  { icon: Box, label: 'Visualizador 3D', className: 'chip-c' },
]

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

export default function LandingPage({ onEnter }) {
  const pageRef = useRef(null)

  // Revela cada bloco quando ele entra na tela. Sem JS (ou com "reduzir
  // movimento" ligado) tudo aparece direto, sem animação.
  useEffect(() => {
    const root = pageRef.current
    if (!root) return undefined

    const items = root.querySelectorAll('[data-reveal]')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('in-view'))
      return undefined
    }

    root.classList.add('landing-animated')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )

    items.forEach((item) => observer.observe(item))

    return () => observer.disconnect()
  }, [])

  // O carro e os cartões se mexem de leve com o mouse (profundidade)
  function handleHeroMove(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5

    event.currentTarget.style.setProperty('--px', x.toFixed(3))
    event.currentTarget.style.setProperty('--py', y.toFixed(3))
  }

  function handleHeroLeave(event) {
    event.currentTarget.style.setProperty('--px', '0')
    event.currentTarget.style.setProperty('--py', '0')
  }

  // Brilho laranja que segue o mouse dentro dos cartões (.spot)
  function handleMove(event) {
    const card = event.target.closest?.('.spot')
    if (!card) return

    const rect = card.getBoundingClientRect()
    card.style.setProperty('--mx', `${event.clientX - rect.left}px`)
    card.style.setProperty('--my', `${event.clientY - rect.top}px`)
  }

  // atraso escalonado dos itens de uma mesma grade
  const delay = (index) => ({ '--d': `${index * 90}ms` })

  return (
    <main className="landing-page" ref={pageRef} onMouseMove={handleMove}>
      <div className="landing-bg" aria-hidden="true">
        <span className="landing-bg-glow glow-a" />
        <span className="landing-bg-glow glow-b" />
        <span className="landing-bg-grid" />
      </div>

      <nav className="landing-nav">
        <span className="landing-brand">PLATAFORMA AUTOMOTIVA</span>

        <div className="landing-nav-links">
          <button type="button" onClick={() => scrollToSection('como-funciona')}>
            Como funciona
          </button>
          <button type="button" onClick={() => scrollToSection('comunidade')}>
            Comunidade
          </button>
        </div>

        <button type="button" className="landing-nav-cta" onClick={onEnter}>
          Entrar
        </button>
      </nav>

      <section
        className="landing-hero"
        onMouseMove={handleHeroMove}
        onMouseLeave={handleHeroLeave}
      >
        <div className="landing-hero-content">
          <span className="landing-eyebrow landing-rise" style={delay(0)}>
            PLATAFORMA AUTOMOTIVA
          </span>

          <h1 className="landing-rise" style={delay(1)}>
            Monte o projeto do carro
            <span> que você sempre imaginou.</span>
          </h1>

          <p className="landing-rise" style={delay(2)}>
            Escolha seu veículo, encontre peças, monte sua configuração
            e acompanhe uma estimativa do investimento do seu projeto.
          </p>

          <div className="landing-actions landing-rise" style={delay(3)}>
            <button type="button" onClick={onEnter}>
              Entre para criar projetos
              <ArrowRight size={17} />
            </button>
          </div>

          <small className="landing-rise" style={delay(4)}>
            É necessário entrar ou criar uma conta para montar projetos.
          </small>
        </div>

        <div className="landing-hero-image landing-rise-image">
          <div className="landing-car">
            <div className="landing-car-float">
              <img src={Lancer} alt="Prévia de um projeto automotivo" />
            </div>
          </div>

          {HERO_CHIPS.map(({ icon: Icon, label, className }) => (
            <span key={label} className={`landing-chip ${className}`}>
              <Icon size={15} />
              {label}
            </span>
          ))}
        </div>
      </section>

      <div className="landing-marquee" aria-hidden="true">
        <div className="landing-marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
      </div>

      <section className="landing-section" id="como-funciona">
        <div className="landing-section-heading" data-reveal>
          <span className="landing-eyebrow">COMO FUNCIONA</span>

          <h2>Do carro original ao seu projeto</h2>

          <p>
            A plataforma organiza o processo para você montar seu projeto
            de forma simples.
          </p>
        </div>

        <div className="landing-steps">
          {[
            ['01', 'Escolha o carro', 'Selecione marca, modelo, geração, ano e versão do veículo.'],
            ['02', 'Escolha as peças', 'Navegue pelas categorias e adicione as peças ao seu projeto.'],
            ['03', 'Monte seu projeto', 'Organize sua configuração e acompanhe o investimento estimado.'],
          ].map(([number, title, text], index) => (
            <article
              className="landing-step spot"
              key={number}
              data-reveal
              style={delay(index)}
            >
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-preview-section">
        <div className="landing-section-heading" data-reveal>
          <span className="landing-eyebrow">PROJETOS</span>

          <h2>Crie do seu jeito</h2>

          <p>Dois modos para diferentes formas de construir seu projeto.</p>
        </div>

        <div className="landing-project-types">
          <article className="landing-project-card spot" data-reveal>
            <div className="landing-card-number">REAL</div>

            <h3>Projeto Real</h3>

            <p>
              Para quem quer planejar uma preparação para um veículo
              existente, levando em consideração a compatibilidade das
              peças.
            </p>

            <ul>
              <li>Compatibilidade com o veículo</li>
              <li>Peças compatíveis e adaptações</li>
              <li>Estimativa de investimento</li>
            </ul>
          </article>

          <article
            className="landing-project-card landing-project-card-highlight spot"
            data-reveal
            style={delay(1)}
          >
            <div className="landing-card-number">FREE</div>

            <h3>Projeto Livre</h3>

            <p>
              Para experimentar combinações e criar configurações sem
              ficar limitado às regras de compatibilidade.
            </p>

            <ul>
              <li>Mais liberdade para criar</li>
              <li>Experimente diferentes combinações</li>
              <li>Monte projetos conceituais</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-heading" data-reveal>
          <span className="landing-eyebrow">PRÉVIA</span>

          <h2>Seu projeto organizado em um só lugar</h2>
        </div>

        <div className="landing-feature-grid">
          {[
            ['01', 'Catálogo de peças', 'Categorias organizadas para encontrar rapidamente o que você procura.'],
            ['02', 'Compatibilidade', 'O projeto pode indicar peças compatíveis, adaptações ou incompatibilidades.'],
            ['03', 'Meus projetos', 'Salve, edite, duplique e continue seus projetos quando quiser.'],
            ['04', 'Compartilhe', 'Publique seu projeto e permita que outras pessoas conheçam sua configuração.'],
          ].map(([number, title, text], index) => (
            <article
              className="landing-feature-card spot"
              key={number}
              data-reveal
              style={delay(index)}
            >
              <div className="landing-feature-icon">{number}</div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-community" id="comunidade">
        <div className="landing-community-content" data-reveal>
          <span className="landing-eyebrow">COMUNIDADE</span>

          <h2>Descubra projetos de outros apaixonados por carros.</h2>

          <p>
            Projetos publicados aparecem no feed da comunidade, para você
            explorar diferentes carros, configurações e ideias.
          </p>
        </div>

        <div className="landing-feed-preview">
          {[
            ['Corolla XEi', 'Projeto Real'],
            ['Projeto Esportivo', 'Projeto Livre'],
            ['JDM Project', 'Projeto Real'],
          ].map(([name, type], index) => (
            <article
              className="spot"
              key={name}
              data-reveal
              style={delay(index)}
            >
              <div className="feed-preview-image">PROJETO</div>

              <div className="feed-preview-info">
                <strong>{name}</strong>
                <span>{type}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta" data-reveal>
        <span className="landing-eyebrow">COMECE AGORA</span>

        <h2>Seu próximo projeto começa aqui.</h2>

        <p>Crie sua conta e comece a montar seu projeto automotivo.</p>

        <button type="button" onClick={onEnter}>
          Entrar e começar
          <ArrowRight size={17} />
        </button>
      </section>

      <footer className="landing-footer">
        <strong>Plataforma Automotiva</strong>
        <span>Monte. Personalize. Compartilhe.</span>
      </footer>
    </main>
  )
}
