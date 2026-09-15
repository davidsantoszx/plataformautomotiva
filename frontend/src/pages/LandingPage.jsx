import Lancer from '../assets/lancerisometric1.png'

export default function LandingPage({ onEnter }) {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-content">
          <span className="landing-eyebrow">
            PLATAFORMA AUTOMOTIVA
          </span>

          <h1>
            Monte o projeto do carro
            <span> que você sempre imaginou.</span>
          </h1>

          <p>
            Escolha seu veículo, encontre peças, monte sua configuração
            e acompanhe uma estimativa do investimento do seu projeto.
          </p>

          <div className="landing-actions">
            <button type="button" onClick={onEnter}>
              Entre para criar projetos
            </button>
          </div>

          <small>
            É necessário entrar ou criar uma conta para montar projetos.
          </small>
        </div>

        <div className="landing-hero-image">
          <img
            src={Lancer}
            alt="Prévia de um projeto automotivo"
          />
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">
            COMO FUNCIONA
          </span>

          <h2>
            Do carro original ao seu projeto
          </h2>

          <p>
            A plataforma organiza o processo para você montar seu projeto
            de forma simples.
          </p>
        </div>

        <div className="landing-steps">
          <article className="landing-step">
            <span>01</span>
            <h3>Escolha o carro</h3>
            <p>
              Selecione marca, modelo, geração, ano e versão do veículo.
            </p>
          </article>

          <article className="landing-step">
            <span>02</span>
            <h3>Escolha as peças</h3>
            <p>
              Navegue pelas categorias e adicione as peças ao seu projeto.
            </p>
          </article>

          <article className="landing-step">
            <span>03</span>
            <h3>Monte seu projeto</h3>
            <p>
              Organize sua configuração e acompanhe o investimento
              estimado.
            </p>
          </article>
        </div>
      </section>

      <section className="landing-section landing-preview-section">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">
            PROJETOS
          </span>

          <h2>
            Crie do seu jeito
          </h2>

          <p>
            Dois modos para diferentes formas de construir seu projeto.
          </p>
        </div>

        <div className="landing-project-types">
          <article className="landing-project-card">
            <div className="landing-card-number">
              REAL
            </div>

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
            <div className="landing-card-number">
              FREE
            </div>

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
        <div className="landing-section-heading">
          <span className="landing-eyebrow">
            PRÉVIA
          </span>

          <h2>
            Seu projeto organizado em um só lugar
          </h2>
        </div>

        <div className="landing-feature-grid">
          <article className="landing-feature-card">
            <div className="landing-feature-icon">01</div>
            <h3>Catálogo de peças</h3>
            <p>
              Categorias organizadas para encontrar rapidamente o que
              você procura.
            </p>
          </article>

          <article className="landing-feature-card">
            <div className="landing-feature-icon">02</div>
            <h3>Compatibilidade</h3>
            <p>
              O projeto pode indicar peças compatíveis, adaptações ou
              incompatibilidades.
            </p>
          </article>

          <article className="landing-feature-card">
            <div className="landing-feature-icon">03</div>
            <h3>Meus projetos</h3>
            <p>
              Salve, edite, duplique e continue seus projetos quando
              quiser.
            </p>
          </article>

          <article className="landing-feature-card">
            <div className="landing-feature-icon">04</div>
            <h3>Compartilhe</h3>
            <p>
              Publique seu projeto e permita que outras pessoas conheçam
              sua configuração.
            </p>
          </article>
        </div>
      </section>

      <section className="landing-community">
        <div className="landing-community-content">
          <span className="landing-eyebrow">
            FUTURO DA PLATAFORMA
          </span>

          <h2>
            Descubra projetos de outros apaixonados por carros.
          </h2>

          <p>
            Projetos públicos poderão aparecer em um feed da comunidade,
            permitindo explorar diferentes carros, configurações e ideias.
          </p>
        </div>

        <div className="landing-feed-preview">
          <article>
            <div className="feed-preview-image">
              PROJETO
            </div>

            <div className="feed-preview-info">
              <strong>Corolla XEi</strong>
              <span>Projeto Real</span>
            </div>
          </article>

          <article>
            <div className="feed-preview-image">
              PROJETO
            </div>

            <div className="feed-preview-info">
              <strong>Projeto Esportivo</strong>
              <span>Projeto Livre</span>
            </div>
          </article>

          <article>
            <div className="feed-preview-image">
              PROJETO
            </div>

            <div className="feed-preview-info">
              <strong>JDM Project</strong>
              <span>Projeto Real</span>
            </div>
          </article>
        </div>
      </section>

      <section className="landing-cta">
        <span className="landing-eyebrow">
          COMECE AGORA
        </span>

        <h2>
          Seu próximo projeto começa aqui.
        </h2>

        <p>
          Crie sua conta e comece a montar seu projeto automotivo.
        </p>

        <button type="button" onClick={onEnter}>
          Entrar e começar
        </button>
      </section>

      <footer className="landing-footer">
        <strong>Plataforma Automotiva</strong>
        <span>Monte. Personalize. Compartilhe.</span>
      </footer>
    </main>
  )
}