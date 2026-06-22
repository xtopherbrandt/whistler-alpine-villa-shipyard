import { LoginForm } from './login-form'

interface Props {
  searchParams: Promise<{ message?: string; callbackUrl?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { message, callbackUrl } = await searchParams
  return <LoginForm successMessage={message} callbackUrl={callbackUrl} />
}
