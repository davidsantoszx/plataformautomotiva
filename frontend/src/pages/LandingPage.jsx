import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Check,
  FolderOpen,
  LayoutGrid,
  Share2,
  ShieldCheck,
} from 'lucide-react'
import Lancer from '../assets/lancerisometric1.png'

// ---------- dados ----------

// Pinturas. O desenho original é laranja; cada pintura gira o matiz da imagem
// (hue-rotate). O fundo da vitrine também toma a cor.
const TINTS = [
  { id: 'laranja', label: 'Laranja', swatch: '#ff5a1f', filter: 'hue-rotate(0deg)', glow: 'rgba(255, 90, 31, 0.2)' },
  { id: 'vermelho', label: 'Vermelho', swatch: '#e5383b', filter: 'hue-rotate(-24deg) saturate(1.15)', glow: 'rgba(229, 56, 59, 0.2)' },
  { id: 'verde', label: 'Verde', swatch: '#2fbf71', filter: 'hue-rotate(105deg)', glow: 'rgba(47, 191, 113, 0.18)' },
  { id: 'azul', label: 'Azul', swatch: '#3b82f6', filter: 'hue-rotate(190deg)', glow: 'rgba(59, 130, 246, 0.2)' },
  { id: 'roxo', label: 'Roxo', swatch: '#a855f7', filter: 'hue-rotate(255deg)', glow: 'rgba(168, 85, 247, 0.2)' },
  { id: 'prata', label: 'Prata', swatch: '#d4d8de', filter: 'grayscale(1) brightness(1.25)', glow: 'rgba(212, 216, 222, 0.14)' },
]

// Pontos que aparecem sobre o carro no passo 2. x e y são % da imagem do carro:
// ajuste para cair em cima das peças do seu desenho.
const PINS = [
  { id: 'rodas', label: 'Rodas aro 18', price: 4500, x: 48, y: 78 },
  { id: 'molas', label: 'Molas esportivas', price: 1800, x: 41, y: 47 },
  { id: 'freios', label: 'Freios', price: 3900, x: 93, y: 62 },
  { id: 'aero', label: 'Aerofólio', price: 2400, x: 90, y: 16 },
]

const PINS_TOTAL = PINS.reduce((sum, pin) => sum + pin.price, 0)

// Peças do montador de exemplo (valores ilustrativos)
const DEMO_PARTS = [
  { id: 'rodas', name: 'Jogo de rodas aro 18', price: 4500, fit: 'ok', color: '#ff5a1f' },
  { id: 'molas', name: 'Molas esportivas', price: 1800, fit: 'ok', color: '#ff8a4c' },
  { id: 'saias', name: 'Kit de saias laterais', price: 3100, fit: 'adapt', color: '#ffb27a' },
  { id: 'escape', name: 'Cat-back esportivo', price: 5200, fit: 'ok', color: '#c4410f' },
  { id: 'aerofolio', name: 'Aerofólio traseiro', price: 2400, fit: 'adapt', color: '#ffd2b0' },
]

const FEATURES = [
  { icon: LayoutGrid, title: 'Catálogo de peças', text: 'Categorias organizadas para encontrar rapidamente o que você procura.' },
  { icon: ShieldCheck, title: 'Compatibilidade', text: 'O projeto indica peças compatíveis, adaptações ou incompatibilidades.' },
  { icon: FolderOpen, title: 'Meus projetos', text: 'Salve, edite, duplique e continue seus projetos quando quiser.' },
  { icon: Share2, title: 'Compartilhe', text: 'Publique seu projeto e permita que outras pessoas conheçam sua configuração.' },
]

const STEPS = [
  ['Escolha o carro', 'Selecione marca, modelo, geração, ano e versão do veículo.'],
  ['Escolha as peças', 'Navegue pelas categorias e adicione as peças ao seu projeto.'],
  ['Monte seu projeto', 'Organize sua configuração e acompanhe o investimento estimado.'],
]

// Cards de exemplo da comunidade: cada um tem a própria pintura
const COMMUNITY = [
  { name: 'Corolla XEi', type: 'Projeto Real', tint: 3, from: 'left' },
  { name: 'Projeto Esportivo', type: 'Projeto Livre', tint: 1, from: 'bottom' },
  { name: 'JDM Project', type: 'Projeto Real', tint: 2, from: 'right' },
]

// ---------- utilidades ----------

function formatBRL(value) {
  return Math.round(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Número que "corre" até o novo valor
function useCountUp(target, duration = 650) {
  const [value, setValue] = useState(target)
  const current = useRef(target)

  useEffect(() => {
    if (prefersReducedMotion()) {
      current.current = target
      setValue(target)
      return undefined
    }

    const from = current.current
    const start = performance.now()
    let frame

    function tick(now) {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)

      current.current = from + (target - from) * eased
      setValue(current.current)

      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

// ---------- montador de exemplo ----------

function PartBuilder({ onEnter }) {
  const [selected, setSelected] = useState(['rodas', 'molas'])

  const chosen = DEMO_PARTS.filter((part) => selected.includes(part.id))
  const total = chosen.reduce((sum, part) => sum + part.price, 0)
  const adaptations = chosen.filter((part) => part.fit === 'adapt').length
  const shownTotal = useCountUp(total)

  function toggle(id) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )
  }

  return (
    <div className="builder" data-rv>
      <ul className="builder-parts">
        {DEMO_PARTS.map((part) => {
          const on = selected.includes(part.id)

          return (
            <li key={part.id}>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                className={`builder-part ${on ? 'on' : ''}`}
                onClick={() => toggle(part.id)}
              >
                <span className="builder-check">
                  <Check size={14} />
                </span>

                <span className="builder-part-text">
                  <strong>{part.name}</strong>
                  <small className={part.fit}>
                    {part.fit === 'ok' ? 'Compatível' : 'Requer adaptação'}
                  </small>
                </span>

                <span className="builder-price">{formatBRL(part.price)}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <aside className="builder-summary" aria-live="polite">
        <span className="builder-summary-label">Total estimado</span>

        <strong className="builder-total">{formatBRL(shownTotal)}</strong>

        <div className="builder-bar" aria-hidden="true">
          {chosen.map((part) => (
            <span
              key={part.id}
              style={{ flexGrow: part.price, background: part.color }}
            />
          ))}
        </div>

        <p className="builder-status">
          {chosen.length === 0
            ? 'Marque uma peça para começar.'
            : `${chosen.length} ${chosen.length === 1 ? 'peça' : 'peças'} no projeto. ${
                adaptations === 0
                  ? 'Tudo compatível.'
                  : adaptations === 1
                    ? '1 peça exige adaptação.'
                    : `${adaptations} peças exigem adaptação.`
              }`}
        </p>

        <button type="button" className="builder-cta" onClick={onEnter}>
          Criar meu projeto
          <ArrowRight size={16} />
        </button>

        <small className="builder-note">
          Exemplo ilustrativo. No projeto de verdade, as peças e os valores
          vêm do catálogo do seu carro.
        </small>
      </aside>
    </div>
  )
}

// ---------- página ----------

export default function LandingPage({ onEnter }) {
  const [ready, setReady] = useState(false)
  const [introDone, setIntroDone] = useState(false)
  const [step, setStep] = useState(0)
  const [heroOff, setHeroOff] = useState(false)
  const [activeCard, setActiveCard] = useState(null)

  const pageRef = useRef(null)
  const stageRef = useRef(null)
  const giantRef = useRef(null)

  const shownTotal = useCountUp(step >= 2 ? PINS_TOTAL : 0, 1100)

  // Abertura: o nome gigante sobe, depois a cortina some e o topo anima
  useEffect(() => {
    if (prefersReducedMotion()) {
      setReady(true)
      setIntroDone(true)
      return undefined
    }

    const t1 = setTimeout(() => setReady(true), 2100)
    const t2 = setTimeout(() => setIntroDone(true), 3000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  // Entrada dos elementos [data-rv] quando aparecem na tela
  useEffect(() => {
    const items = pageRef.current?.querySelectorAll('[data-rv]') ?? []

    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('in'))
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.18 },
    )

    items.forEach((item) => observer.observe(item))

    return () => observer.disconnect()
  }, [])

  // Rolagem: a vitrine troca de projeto e o título gigante do fim se preenche
  useEffect(() => {
    let frame = 0

    function update() {
      frame = 0
      const vh = window.innerHeight

      const stage = stageRef.current
      if (stage) {
        const rect = stage.getBoundingClientRect()
        const navHeight = 65
        const total = rect.height - (vh - navHeight)
        const p = total > 0 ? Math.min(1, Math.max(0, (navHeight - rect.top) / total)) : 0

        // 0 = topo (carro à direita, texto) · 1 = vitrine (carro no centro, nome gigante)
        const raw = Math.min(1, Math.max(0, (p - 0.05) / 0.15))
        const t = raw * raw * (3 - 2 * raw)
        const after = Math.min(0.999, Math.max(0, (p - 0.2) / 0.78))

        stage.style.setProperty('--t', t.toFixed(3))
        setHeroOff(t > 0.5)
        setStep(Math.floor(after * STEPS.length))
      }

      const giant = giantRef.current
      if (giant) {
        const rect = giant.getBoundingClientRect()
        const p = Math.min(1, Math.max(0, (vh * 0.95 - rect.top) / (vh * 0.7)))

        giant.style.setProperty('--fp', p.toFixed(3))
      }
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  function handleCardMove(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5

    event.currentTarget.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--ry', `${(x * 12).toFixed(2)}deg`)
  }

  function handleCardLeave(event) {
    event.currentTarget.style.setProperty('--rx', '0deg')
    event.currentTarget.style.setProperty('--ry', '0deg')
    setActiveCard(null)
  }

  return (
    <main
      className={`landing-page ${ready ? 'is-ready' : ''}`}
      ref={pageRef}
    >
      {!introDone && (
        <div className={`landing-intro ${ready ? 'leaving' : ''}`} aria-hidden="true">
          {['PLATAFORMA', 'AUTOMOTIVA'].map((word, line) => (
            <span className="landing-intro-word" key={word}>
              {word.split('').map((letter, index) => (
                <i
                  key={index}
                  style={{ '--d': `${line * 380 + index * 45}ms` }}
                >
                  {letter}
                </i>
              ))}
            </span>
          ))}
        </div>
      )}

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
          <button type="button" onClick={() => scrollToSection('experimente')}>
            Experimente
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
        className={`stage ${heroOff ? 'hero-off' : ''}`}
        id="vitrine"
        ref={stageRef}
      >
        <span className="stage-anchor" id="como-funciona" aria-hidden="true" />

        <div className="stage-sticky">
          <div className="stage-color" aria-hidden="true" />
          <div className="stage-band" aria-hidden="true" />

          <div className="stage-hero-text">
            <h1>
              <span className="hl">
                <span style={{ '--d': '0ms' }}>Monte o projeto</span>
              </span>
              <span className="hl">
                <span style={{ '--d': '110ms' }}>do carro</span>
              </span>
              <span className="hl hl-accent">
                <span style={{ '--d': '220ms' }}>que você sempre imaginou.</span>
              </span>
            </h1>

            <p className="landing-rise" style={{ '--d': '350ms' }}>
              Escolha seu veículo, encontre peças, monte sua configuração
              e acompanhe uma estimativa do investimento do seu projeto.
            </p>

            <div className="landing-actions landing-rise" style={{ '--d': '480ms' }}>
              <button type="button" onClick={onEnter}>
                Entre para criar projetos
                <ArrowRight size={17} />
              </button>
            </div>

            <small className="landing-rise" style={{ '--d': '600ms' }}>
              É necessário entrar ou criar uma conta para montar projetos.
            </small>
          </div>

          <div className="stage-steps-text">
            <h2>Do carro original ao seu projeto</h2>

            <ol className="story-steps">
              {STEPS.map(([title, text], index) => (
                <li
                  key={title}
                  className={`story-step ${index === step ? 'active' : ''} ${
                    index < step ? 'done' : ''
                  }`}
                >
                  <span className="story-step-dot">{index + 1}</span>

                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="stage-car">
            <div className="stage-car-drop">
              <div className="stage-car-box">
                <img
                  src={Lancer}
                  alt="Prévia de um projeto automotivo"
                />

                {PINS.map((pin, index) => (
                  <span
                    className={`stage-pin ${step >= 1 ? 'on' : ''}`}
                    key={pin.id}
                    style={{ left: `${pin.x}%`, top: `${pin.y}%`, '--i': index }}
                  >
                    <i />
                    <b>
                      {pin.label}
                      <em>{formatBRL(pin.price)}</em>
                    </b>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="stage-picker">
            {['Mitsubishi', 'Lancer', 'GT'].map((item, index) => (
              <span key={item} style={{ '--i': index }}>
                {item}
              </span>
            ))}
          </div>

          <div className={`stage-total ${step >= 2 ? 'on' : ''}`}>
            <small>Total do projeto</small>
            <strong>{formatBRL(shownTotal)}</strong>

            <button type="button" onClick={onEnter}>
              Criar meu projeto
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <section className="landing-section" id="experimente">
        <div className="landing-section-heading" data-rv>
          <h2>Monte um projeto aqui mesmo</h2>

          <p>
            Marque as peças e veja o valor e a compatibilidade mudarem na
            hora.
          </p>
        </div>

        <PartBuilder onEnter={onEnter} />
      </section>

      <section className="landing-section landing-preview-section">
        <div className="landing-section-heading" data-rv>
          <h2>Crie do seu jeito</h2>

          <p>Dois modos para diferentes formas de construir seu projeto.</p>
        </div>

        <div className="landing-project-types" data-rv>
          <article className="landing-project-card">
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

          <article className="landing-project-card landing-project-card-highlight">
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
        <div className="landing-section-heading" data-rv>
          <h2>Seu projeto organizado em um só lugar</h2>
        </div>

        <div className="landing-feature-grid" data-rv>
          {FEATURES.map(({ icon: Icon, title, text }, index) => (
            <article
              className="landing-feature-card"
              key={title}
              style={{ '--i': index }}
            >
              <div className="landing-feature-icon">
                <Icon size={19} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="landing-community"
        id="comunidade"
        style={
          activeCard === null
            ? undefined
            : { '--ctint': TINTS[COMMUNITY[activeCard].tint].swatch }
        }
      >
        <div className="landing-community-content" data-rv>
          <h2>Descubra projetos de outros apaixonados por carros.</h2>

          <p>
            Projetos publicados aparecem no feed da comunidade, para você
            explorar diferentes carros, configurações e ideias.
          </p>
        </div>

        <div className="community-cards" data-rv>
          {COMMUNITY.map((card, index) => (
            <article
              key={card.name}
              className={`community-card from-${card.from}`}
              style={{ '--i': index }}
              onMouseEnter={() => setActiveCard(index)}
              onMouseMove={handleCardMove}
              onMouseLeave={handleCardLeave}
            >
              <div
                className="community-card-art"
                style={{ '--c': TINTS[card.tint].swatch }}
              >
                <img
                  src={Lancer}
                  alt=""
                  style={{ filter: TINTS[card.tint].filter }}
                />
              </div>

              <div className="feed-preview-info">
                <strong>{card.name}</strong>
                <span>{card.type}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-giant-section">
        <div className="landing-giant" ref={giantRef} aria-hidden="true">
          <span>PLATAFORMA</span>
          <span>AUTOMOTIVA</span>
        </div>

        <div className="landing-cta" data-rv>
          <h2>Seu próximo projeto começa aqui.</h2>

          <p>Crie sua conta e comece a montar seu projeto automotivo.</p>

          <button type="button" onClick={onEnter}>
            Entrar e começar
            <ArrowRight size={17} />
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <strong>Plataforma Automotiva</strong>
        <span>Monte. Personalize. Compartilhe.</span>
      </footer>
    </main>
  )
}