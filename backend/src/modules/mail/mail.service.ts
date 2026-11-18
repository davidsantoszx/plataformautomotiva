import nodemailer, { type Transporter } from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = Number(process.env.SMTP_PORT || 465)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const MAIL_FROM =
  process.env.MAIL_FROM || `Plataforma Automotiva <${SMTP_USER ?? 'no-reply@localhost'}>`

let transporter: Transporter | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  }

  return transporter
}

export async function sendPasswordResetEmail(
  to: string,
  code: string,
  minutes: number,
) {
  // Sem SMTP configurado (ex.: no seu PC, para testar), o código aparece
  // no terminal do backend em vez de ser enviado por e-mail.
  if (!SMTP_USER || !SMTP_PASS) {
    console.log(
      `[e-mail desativado] Código de recuperação para ${to}: ${code} (vale ${minutes} min)`,
    )
    return
  }

  await getTransporter().sendMail({
    from: MAIL_FROM,
    to,
    subject: 'Seu código para redefinir a senha',
    text:
      `Seu código de recuperação é ${code}.\n\n` +
      `Ele vale por ${minutes} minutos. Se você não pediu para redefinir a senha, ` +
      `pode ignorar este e-mail: nada será alterado.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#111">
        <h2 style="margin:0 0 12px">Redefinir senha</h2>
        <p style="margin:0 0 20px;color:#444">Use o código abaixo para criar uma nova senha:</p>
        <div style="font-size:34px;font-weight:800;letter-spacing:8px;padding:16px;background:#f4f4f5;border-radius:10px;text-align:center">${code}</div>
        <p style="margin:20px 0 0;color:#666;font-size:14px">O código vale por ${minutes} minutos. Se você não pediu para redefinir a senha, pode ignorar este e-mail: nada será alterado.</p>
      </div>`,
  })
}