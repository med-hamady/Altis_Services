import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { Logo } from '@/components/ui/logo'

const loginSchema = z.object({
  identifier: z.string().min(1, "Nom d'utilisateur obligatoire"),
  password: z.string().min(1, 'Code PIN obligatoire'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn, user, currentUser } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Rediriger si déjà connecté
  useEffect(() => {
    if (user && currentUser) {
      navigate('/', { replace: true })
    }
  }, [user, currentUser, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    // Convertir username en email + préfixer le code PIN
    const email = `${data.identifier.toLowerCase().trim()}@altis.local`
    const password = `altis${data.password}`

    const { error } = await signIn(email, password)

    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? "Nom d'utilisateur ou code PIN incorrect"
          : error.message
      )
      setIsLoading(false)
      return
    }

    navigate('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <CardDescription>
            Connectez-vous à votre compte
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="identifier">Nom d'utilisateur</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Ex: admin-altis"
                {...register('identifier')}
              />
              {errors.identifier && (
                <p className="text-sm text-destructive">{errors.identifier.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Code PIN</Label>
              <Input
                id="password"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="4 chiffres"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
