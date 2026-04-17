'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LocaleSwitcherLight } from '@/components/ui/LocaleSwitcher'
import { useLocale } from '@/lib/i18n/LocaleContext'

export default function RegisterPage() {
  const { t } = useLocale()
  const a = t.auth.register
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error(a.passwordTooShort)
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id)
    }
    toast.success(a.successMessage)
    window.location.href = '/portal'
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <LocaleSwitcherLight />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Gho&Co</h1>
          <p className="mt-1 text-sm text-gray-500">{a.title}</p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label={a.fullNameLabel}
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
            <Input
              label={a.emailLabel}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label={a.passwordLabel}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              helper={a.passwordHelper}
            />
            <Button type="submit" loading={loading} className="mt-2 w-full">
              {a.submitButton}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          {a.alreadyHaveAccount}{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:underline">
            {a.signIn}
          </Link>
        </p>
      </div>
    </div>
  )
}
