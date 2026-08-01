"use client"

import { useCallback, useEffect, useState } from "react"
import { CategoriesForm } from "@/components/categories/CategoriesForm"
import { CategoryList } from "@/components/categories/CategoryList"
import { toast } from "sonner"
import {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    Category
} from "@/lib/actions/categories.actions"

const Categories = () => {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)

    const fetchCategories = useCallback(async () => {
        try {
            const res = await getCategories()
            if (res.success && res.data) {
                setCategories(res.data)
            }
        } catch (error) {
            console.error("Failed to load categories:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        let ignore = false

        getCategories()
            .then((res) => {
                if (ignore) return
                if (res.success && res.data) {
                    setCategories(res.data)
                }
            })
            .catch((error) => {
                if (!ignore) console.error("Failed to load categories:", error)
            })
            .finally(() => {
                if (!ignore) setLoading(false)
            })

        return () => {
            ignore = true
        }
    }, [])

    const handleSubmit = async (data: { name: string; type: string; icon: string; color: string }) => {
        const res = await createCategory(data)
        if (!res.success) {
            throw new Error(res.message || "Gagal menambahkan kategori")
        }
        fetchCategories()
    }

    const handleEditSubmit = async (data: { id?: number; name: string; type: string; icon: string; color: string }) => {
        if (!data.id) return
        const res = await updateCategory(data.id, {
            name: data.name,
            icon: data.icon,
            color: data.color
        })
        if (!res.success) {
            throw new Error(res.message || "Gagal memperbarui kategori")
        }
        fetchCategories()
    }

    const handleDelete = async (id: number) => {
        try {
            const res = await deleteCategory(id)
            if (res.success) {
                fetchCategories()
                toast.success("Kategori berhasil dihapus")
            } else {
                throw new Error(res.message || "Gagal menghapus kategori")
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Gagal menghapus kategori"
            toast.error(message)
        }
    }

    const incomeCategories = categories.filter(c => c.type === "income")
    const expenseCategories = categories.filter(c => c.type === "expense")

    if (loading) {
        return (
            <div className="flex h-64 max-w-7xl mx-auto items-center justify-center bg-background rounded-sm border">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="p-6 bg-card rounded-sm border shadow-xs max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Categories</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Kelola kategori pemasukan dan pengeluaran transaksi Anda
                    </p>
                </div>
                <div className="flex shrink-0">
                    <CategoriesForm onSubmit={handleSubmit} />
                </div>
            </div>

            <div className="mt-8 space-y-10">
                <div>
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                        Pendapatan ({incomeCategories.length})
                    </h2>
                    <CategoryList list={incomeCategories} onEdit={handleEditSubmit} onDelete={handleDelete} />
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                        Pengeluaran ({expenseCategories.length})
                    </h2>
                    <CategoryList list={expenseCategories} onEdit={handleEditSubmit} onDelete={handleDelete} />
                </div>
            </div>
        </div>
    )
}

export default Categories
