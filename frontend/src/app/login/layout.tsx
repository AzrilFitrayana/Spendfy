import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk akun Spendfy untuk kelola pemasukan dan pengeluaran uang pribadi dengan bantuan AI",
  alternates: {canonical: '/login'}
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  children
  );
}

