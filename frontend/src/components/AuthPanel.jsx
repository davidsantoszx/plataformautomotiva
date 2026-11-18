import { useState } from 'react'

const USERNAME_MIN = 6
const USERNAME_MAX = 15

// asterisco vermelho ao lado do nome do campo obrigatório
function Required() {
  return (
    <span className="required-mark" aria-hidden="true">
      *
    </span>
  )
}

// Devolve a mensagem do primeiro problema do username, ou '' se estiver ok.
// A mesma regra vale no servidor (users.service.ts).
function validateUsername(value) {
  const username = value.trim()

  if (!username) return 'Escolha um username.'

  if (!/^[a-z0-9_]+$/.test(username)) {
    return 'O username só pode ter letras minúsculas, números e _.'
  }

  if (username.length < USERNAME_MIN) {
    return `O username precisa ter no mínimo ${USERNAME_MIN} caracteres.`
  }

  if (username.length > USERNAME_MAX) {
    return `O username pode ter no máximo ${USERNAME_MAX} caracteres.`
  }

  return ''
}

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
  onForgot,
  onSubmit,
  onBack,
}) {
  const isRegister = mode === 'register'

  // erro de validação do formulário (só aparece ao tentar cadastrar)
  const [fieldError, setFieldError] = useState('')

  function handleSubmit(event) {
    if (isRegister) {
      const problem = validateUsername(username)

      if (problem) {
        event.preventDefault()
        setFieldError(problem)
        return
      }
    }

    setFieldError('')
    onSubmit(event)
  }

  function handleModeChange(nextMode) {
    setFieldError('')
    onModeChange(nextMode)
  }

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
            onClick={() => handleModeChange('login')}
          >
            Entrar
          </button>

          <button
            type="button"
            className={isRegister ? 'active' : ''}
            onClick={() => handleModeChange('register')}
          >
            Cadastrar
          </button>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          {isRegister && (
            <>
              <div className="form-field">
                <label htmlFor="auth-name">
                  Nome (opcional)
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
                  <Required />
                </label>

                {/* maiúsculas viram minúsculas ao digitar; o resto é validado
                    ao clicar em "Criar conta" */}
                <input
                  id="auth-username"
                  value={username}
                  onChange={(event) => {
                    setFieldError('')
                    onUsernameChange(event.target.value.toLowerCase())
                  }}
                  placeholder="seu_username"
                  aria-required="true"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </div>
            </>
          )}

          <div className="form-field">
            <label htmlFor="auth-email">
              Email
              <Required />
            </label>

            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) =>
                onEmailChange(event.target.value)
              }
              placeholder="seu@email.com"
              aria-required="true"
            />
          </div>

          <div className="form-field">
            <label htmlFor="auth-password">
              Senha
              <Required />
            </label>

            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) =>
                onPasswordChange(event.target.value)
              }
              placeholder="Sua senha"
              aria-required="true"
            />
          </div>

          {!isRegister && onForgot && (
            <button
              className="auth-forgot-link"
              type="button"
              onClick={onForgot}
            >
              Esqueci minha senha
            </button>
          )}

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

        {(fieldError || error) && (
          <p className="message message-error">
            {fieldError || error}
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