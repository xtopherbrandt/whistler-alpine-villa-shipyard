import { Resend } from 'resend'
import type { ReactElement } from 'react'

export const resend = new Resend(process.env.RESEND_API_KEY)

export type EmailPayload = {
  to: string
  subject: string
  react: ReactElement
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_ADDRESS ?? 'noreply@localhost',
    ...payload,
  })
  if (error) throw new Error(error.message)
}
