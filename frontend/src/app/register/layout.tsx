import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daftar",
  description: "Daftar akun Spendfy untuk kelola pemasukan dan pengeluaran uang pribadi dengan bantuan AI",
  alternates: {canonical: '/register'}
};

export default function RegisterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  children
  );
}
