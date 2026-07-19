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

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
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

    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup className="flex flex-col gap-6">
        <div className="flex flex-col gap-1 lg:mb-4">
          <h1 className="text-xl lg:text-2xl font-bold">Masuk</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Masukan email dan password akunmu!
          </p>
        </div>
        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" type="email" placeholder="m@example.com" className="" required />
          </Field>
          <Field>
            <div className="flex items-center">
              <FieldLabel htmlFor="password">Password</FieldLabel>
            </div>
            <Input id="password" type="password" required />
          </Field>
        <Field>
          <Button className="cursor-pointer mt-2" type="submit">Login</Button>
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
