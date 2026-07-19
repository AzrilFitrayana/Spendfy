'use client'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { GalleryVerticalEnd } from "lucide-react"
import { useState } from "react"
import { loginUsers } from "@/lib/actions/auth.actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setSubmitting(true)

      const res = await loginUsers({email, password})

      if(!res.success) {
        setSubmitting(false)
        return toast.error(res?.message, { position: "top-right", style: { backgroundColor: '#fee2e2', color: '#991b1b' } })
      }

      toast.success(`Selamat Datang! ${res.data?.user.name}`, { position: "top-right", style: { backgroundColor: '#dcfce7', color: '#166534' } })
      setSubmitting(false)
      router.push('/dashboard')
  }

  return (
    <>
      <div className="lg:hidden flex flex-col p-8">
        <div className="flex justify-center">
          <Link href="#" className="flex items-center gap-2 font-bold text-3xl">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Pundi
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
        <FieldGroup className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl lg:text-2xl font-bold">Masuk</h1>
            <p className="text-sm text-balance text-muted-foreground">
              Masukan email dan password akunmu!
            </p>
          </div>
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" onChange={(e) => setEmail(e.target.value)} placeholder="m@example.com" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" type="password" min='6' max='255' onChange={(e) => setPassword(e.target.value)} placeholder="Minimal panjang 6 karakter" required />
            </Field>
            <Field>
              <Button className="cursor-pointer mt-2" disabled={submitting} type="submit">Login</Button>
            </Field>
          </div>
          <FieldSeparator />
          <Field>
            <FieldDescription className="text-center">
              Tidak Punya akun?{" "}
              <Link href="/register" className="underline underline-offset-4 font-bold text-primary">
                Daftar akun
              </Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </>
  )
}
