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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { GalleryVerticalEnd } from "lucide-react"


export function RegisterForm({
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
            <h1 className="text-xl lg:text-2xl font-bold">Daftar</h1>
            <p className="text-sm text-balance text-muted-foreground">
              Buat akun dan mulai kelola uang!
            </p>
          </div>
          <div className="space-y-4">
            <Field>
              <FieldLabel htmlFor="name">Nama</FieldLabel>
              <Input id="text" type="text" placeholder="Masukan nama kamu" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" placeholder="m@example.com" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" type="password" placeholder="Minimal panjang 6 karakter" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="currency">Mata Uang</FieldLabel>
              <Select name="currency" defaultValue="IDR" required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih mata uang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Mata Uang</SelectLabel>
                    <SelectItem value="IDR">Indonesian Rupiah (IDR)</SelectItem>
                    <SelectItem value="USD">US Dollar (USD)</SelectItem>
                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    <SelectItem value="JPY">Japanese Yen (JPY)</SelectItem>
                    <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <Button className="cursor-pointer mt-2" type="submit">Daftar</Button>
            </Field>
          </div>
          <FieldSeparator />
          <Field>
            <FieldDescription className="text-center">
              Sudah Punya akun?{" "}
              <Link href="/login" className="underline underline-offset-4 font-bold text-primary">
                Masuk di sini
              </Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </>
  )
}
