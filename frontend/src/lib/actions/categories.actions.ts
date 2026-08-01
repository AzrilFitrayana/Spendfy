"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { apiFetch } from "../api/fetcher";

export interface Category {
  id: number;
  user_id: number;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  is_default: boolean;
  created_at: string;
}

export interface CreateCategoryParams {
  name: string;
  type: string;
  icon?: string;
  color?: string;
}

export interface UpdateCategoryParams {
  name?: string;
  icon?: string;
  color?: string;
}

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleError = (error: unknown) => ({
  success: false as const,
  message: error instanceof Error ? error.message : "Terjadi kesalahan pada server",
});

/**
 * Mengambil daftar semua kategori milik pengguna yang sedang terautentikasi.
 *
 * @returns Objek yang berisi status keberhasilan dan daftar kategori.
 * @throws Error jika terjadi kesalahan saat memproses permintaan.
 *
 * @example
 * const result = await getCategories()
 * if (result.success) {
 *   console.log(result.data)
 * }
 */
export const getCategories = async () => {
  try {
    const headers = await getAuthHeaders();
    const data = await apiFetch<Category[]>("/categories", {
      method: "GET",
      headers,
    });
    return { success: true as const, data };
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Membuat kategori transaksi baru.
 *
 * @param params Data kategori yang akan dibuat.
 * @returns Objek yang berisi status keberhasilan dan data kategori yang baru dibuat.
 * @throws Error jika terjadi kesalahan saat memproses permintaan.
 */
export const createCategory = async (params: CreateCategoryParams) => {
  try {
    const headers = await getAuthHeaders();
    const data = await apiFetch<Category>("/categories", {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
    revalidatePath("/categories");
    revalidatePath("/dashboard");
    return { success: true as const, data };
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Memperbarui data kategori yang sudah ada.
 *
 * @param id Identifikasi unik kategori yang akan diperbarui.
 * @param params Data kategori yang akan diperbarui.
 * @returns Objek yang berisi status keberhasilan dan data kategori yang baru diperbarui.
 * @throws Error jika terjadi kesalahan saat memproses permintaan.
 */
export const updateCategory = async (id: number, params: UpdateCategoryParams) => {
  try {
    const headers = await getAuthHeaders();
    const data = await apiFetch<Category>(`/categories/${id}`, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
    revalidatePath("/categories");
    revalidatePath("/dashboard");
    return { success: true as const, data };
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Menghapus kategori dari sistem.
 *
 * @param id Identifikasi unik kategori yang akan dihapus.
 * @returns Objek yang berisi status keberhasilan dan respons penghapusan.
 * @throws Error jika terjadi kesalahan saat memproses permintaan.
 */
export const deleteCategory = async (id: number) => {
  try {
    const headers = await getAuthHeaders();
    const data = await apiFetch<{ message: string }>(`/categories/${id}`, {
      method: "DELETE",
      headers,
    });
    revalidatePath("/categories");
    revalidatePath("/dashboard");
    return { success: true as const, data };
  } catch (error) {
    return handleError(error);
  }
};
