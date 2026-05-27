import type { ReactElement } from 'react'

export function PasswordResetEmail({
  resetUrl,
  name,
}: {
  resetUrl: string
  name: string
}): ReactElement {
  return (
    <div>
      <p>Hi {name},</p>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href={resetUrl}>{resetUrl}</a>
      <p>If you did not request this, ignore this email.</p>
    </div>
  )
}
