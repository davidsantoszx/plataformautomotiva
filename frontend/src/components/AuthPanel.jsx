export default function AuthPanel({
  mode,
  email,
  password,
  name,
  username,
  loading,
  error,
  message,
  onModeChange,
  onEmailChange,
  onPasswordChange,
  onNameChange,
  onUsernameChange,
  onSubmit,
  onBack,
}) {
  const isRegister = mode === 'register'

  return (
    <main className="auth-page">
      <div className="auth-card">
        <button
          className="auth-back"
          type="button"
          onClick={onBack}
        >
          ← Voltar
        </button>

        <div className="auth-header">
          <span className="auth-eyebrow">
            PLATAFORMA AUTOMOTIVA
          </span>

          <h1>
            {isRegister ? 'Criar conta' : 'Entrar'}
          </h1>

          <p>
            {isRegister
              ? 'Crie sua conta e comece a montar seus projetos.'
              : 'Entre para continuar seus projetos automotivos.'}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={!isRegister ? 'active' : ''}
            onClick={() => onModeChange('login')}
          >
            Entrar
          </button>

          <button
            type="button"
            className={isRegister ? 'active' : ''}
            onClick={() => onModeChange('register')}
          >
            Cadastrar
          </button>
        </div>

        <form
          className="auth-form"
          onSubmit={onSubmit}
        >
          {isRegister && (
            <>
              <div className="form-field">
                <label htmlFor="auth-name">
                  Nome
                </label>

                <input
                  id="auth-name"
                  value={name}
                  onChange={(event) =>
                    onNameChange(event.target.value)
                  }
                  placeholder="Seu nome"
                />
              </div>

              <div className="form-field">
                <label htmlFor="auth-username">
                  Username
                </label>

                <input
                  id="auth-username"
                  value={username}
                  onChange={(event) =>
                    onUsernameChange(event.target.value)
                  }
                  placeholder="Seu username"
                />
              </div>
            </>
          )}

          <div className="form-field">
            <label htmlFor="auth-email">
              Email
            </label>

            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) =>
                onEmailChange(event.target.value)
              }
              placeholder="seu@email.com"
            />
          </div>

          <div className="form-field">
            <label htmlFor="auth-password">
              Senha
            </label>

            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) =>
                onPasswordChange(event.target.value)
              }
              placeholder="Sua senha"
            />
          </div>

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Aguarde...'
              : isRegister
                ? 'Criar conta'
                : 'Entrar'}
          </button>
        </form>

        {error && (
          <p className="message message-error">
            {error}
          </p>
        )}

        {message && (
          <p className="message message-success">
            {message}
          </p>
        )}
      </div>
    </main>
  )
}