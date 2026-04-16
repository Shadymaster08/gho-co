import { Resend } from 'resend'

// Lazy singleton — avoids crashing at build time when env var is not set
let _resend: Resend | null = null

export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY ?? 'placeholder')
  }
  return _resend
}

// Keep named export for convenience in route handlers
export const resend = {
  emails: {
    send: (args: Parameters<Resend['emails']['send']>[0]) => getResend().emails.send(args),
  },
}
