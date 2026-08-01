"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "../api/fetcher";

interface RegisterUserParams {
  name: string;
  email: string;
  password: string;
  currency: string;
}

interface RegisterUserResponse {
  user: {
    id: number;
    name: string;
    email: string;
    currency: string;
    created_at: string;
  };
  token: string;
}

interface LoginUserParams {
  email: string;
  password: string;
}

interface LoginUserResponse {
  user: {
    id: number;
    name: string;
    email: string;
    currency: string;
  };
  token: string;
}

interface GetUserResponse {
  id: number;
  name: string;
  email: string;
  currency: string;
  created_at: string;
}

/**
 * Konfigurasi cookie autentikasi untuk menyimpan token sesi pengguna.
 */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

/**
 * Mendaftarkan pengguna baru ke dalam sistem.
 *
 * @param params Data registrasi pengguna yang mencakup nama, email, password, dan mata uang.
 * @returns Objek yang berisi status keberhasilan dan data pengguna yang terdaftar.
 * @throws Error jika terjadi kesalahan selama proses registrasi.
 */
export const registerUsers = async (params: RegisterUserParams) => {
  try {
    const data = await apiFetch<RegisterUserResponse>(`/auth/register`, {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const cookieStore = await cookies();
    cookieStore.set("token", data.token, COOKIE_OPTIONS);

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Login failed",
    };
  }
};

/**
 * Melakukan autentikasi pengguna berdasarkan email dan password.
 *
 * @param params Data login pengguna yang mencakup email dan password.
 * @returns Objek yang berisi status keberhasilan dan data pengguna yang terautentikasi.
 * @throws Error jika terjadi kesalahan selama proses login.
 */
export const loginUsers = async (params: LoginUserParams) => {
  try {
    const data = await apiFetch<LoginUserResponse>("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const cookieStore = await cookies();
    cookieStore.set("token", data.token, COOKIE_OPTIONS);

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Login failed",
    };
  }
};

/**
 * Mengambil data pengguna yang sedang terautentikasi.
 *
 * @returns Data pengguna yang sedang login.
 * @throws {Error} Redirect ke halaman login jika token autentikasi tidak ditemukan.
 * @throws {Error} Error jika terjadi kesalahan saat memproses permintaan.
 */
export const getUser = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  const data = await apiFetch<GetUserResponse>(`/auth/user`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  return data;
};

/**
 * Menghapus sesi pengguna saat ini dan mengalihkan ke halaman login.
 *
 * @throws {Error} Redirect ke halaman login setelah sesi berhasil dihapus.
 */
export const logoutUser = async () => {
  const cookieStore = await cookies();
  cookieStore.delete("token");

  redirect("/login");
};
