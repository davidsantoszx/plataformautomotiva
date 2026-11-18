import { useEffect, useState } from 'react'
import {
  forgotPassword,
  resetPassword,
  verifyResetCode,
} from '../services/api'

const RESEND_SECONDS = 60

const STEP_TEXT = {
  email: {
    title: 'Esqueci minha senha',
    text: 'Informe o e-mail da sua conta e enviaremos um código de 6 dígitos.',
  },
  code: {
    title: 'Digite o código',
    text: 'O código vale por 15 minutos.',
  },
  password: {
    title: 'Nova senha',
    text: 'Escolha a senha que você vai usar para entrar.',
  },
}

const STEPS = ['email', 'code', 'password']

export default function ForgotPasswordPanel({
  initialEmail,
  onBack,
  onDone,
}) {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState(initialEmail || '')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // contagem para poder pedir um novo código
  useEffect(() => {
    if (cooldown <= 0) return undefined

    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000)

    return () => clearTimeout(timer)
  }, [cooldown])

  function goBack() {
    setError('')
    setMessage('')

    if (step === 'email') {
      onBack()
      return
    }

    setStep(step === 'password' ? 'code' : 'email')
  }

  async function sendCode() {
    await forgotPassword(email.trim())

    setCooldown(RESEND_SECONDS)
    setCode('')
    setStep('code')
    setMessage(
      `Se ${email.trim()} estiver cadastrado, enviamos um código para ele.`,
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    try {
      if (step === 'email') {
        if (!email.trim()) {
          setError('Informe o seu e-mail.')
          return
        }

        setLoading(true)
        await sendCode()
        return
      }

      if (step === 'code') {
        if (!/^\d{6}$/.test(code)) {
          setError('Digite os 6 dígitos do código.')
          return
        }

        setLoading(true)
        await verifyResetCode(email.trim(), code)
        setStep('password')
        return
      }

      if (password.length < 6) {
        setError('A senha deve possuir pelo menos 6 caracteres.')
        return
      }

      if (password !== confirm) {
        setError('As senhas não são iguais.')
        return
      }

      setLoading(true)
      await resetPassword(email.trim(), code, password)
      onDone(email.trim())
    } catch (err) {
      setError(err.message || 'Erro ao recuperar a senha.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setMessage('')

    try {
      setLoading(true)
      await sendCode()
      setMessage('Enviamos um novo código.')
    } catch (err) {
      setError(err.message || 'Erro ao enviar o código.')
    } finally {
      setLoading(false)
    }
  }

  const { title, text } = STEP_TEXT[step]
  const stepNumber = STEPS.indexOf(step) + 1

  return (
    <main className="auth-page">
      <div className="auth-card">
        <button className="auth-back" type="button" onClick={goBack}>
          ← Voltar
        </button>

        <div className="auth-header">
          <span className="auth-eyebrow">
            PASSO {stepNumber} DE {STEPS.length}
          </span>

          <h1>{title}</h1>

          <p>{text}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {step === 'email' && (
            <div className="form-field">
              <label htmlFor="forgot-email">Email</label>

              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>
          )}

          {step === 'code' && (
            <div className="form-field">
              <label htmlFor="forgot-code">Código de 6 dígitos</label>

              <input
                id="forgot-code"
                className="auth-code-input"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
              />
            </div>
          )}

          {step === 'password' && (
            <>
              <div className="form-field">
                <label htmlFor="forgot-password">Nova senha</label>

                <input
                  id="forgot-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  autoComplete="new-password"
                />
              </div>

              <div className="form-field">
                <label htmlFor="forgot-confirm">Repita a nova senha</label>

                <input
                  id="forgot-confirm"
                  type="password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                />
              </div>
            </>
          )}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? 'Aguarde...'
              : step === 'email'
                ? 'Enviar código'
                : step === 'code'
                  ? 'Confirmar código'
                  : 'Salvar nova senha'}
          </button>

          {step === 'code' && (
            <button
              className="auth-secondary"
              type="button"
              onClick={handleResend}
              disabled={loading || cooldown > 0}
            >
              {cooldown > 0
                ? `Enviar novo código em ${cooldown}s`
                : 'Enviar novo código'}
            </button>
          )}
        </form>

        {error && <p className="message message-error">{error}</p>}

        {message && !error && (
          <p className="message message-success">{message}</p>
        )}
      </div>
    </main>
  )
}