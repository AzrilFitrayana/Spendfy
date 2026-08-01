"use client"

import { Category } from "@/lib/actions/categories.actions"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CategoriesForm } from "@/components/categories/CategoriesForm"
import {
    Tag,
    Utensils,
    ShoppingCart,
    ShoppingBag,
    Car,
    Home,
    Zap,
    Video,
    Heart,
    BookOpen,
    Plane,
    Briefcase,
    Gift,
    Laptop,
    TrendingUp,
    Star,
    Trash2,
    Trash2Icon,
} from "lucide-react"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    tag: Tag,
    food: Utensils,
    shopping: ShoppingCart,
    bag: ShoppingBag,
    transport: Car,
    home: Home,
    bill: Zap,
    entertainment: Video,
    health: Heart,
    education: BookOpen,
    travel: Plane,
    salary: Briefcase,
    gift: Gift,
    freelance: Laptop,
    investment: TrendingUp,
    bonus: Star,
}

interface CategoryListProps {
    list: Category[]
    onEdit: (data: { id?: number; name: string; type: string; icon: string; color: string }) => void
    onDelete: (id: number) => void
}

/**
 * Menampilkan daftar kategori dalam bentuk grid dengan aksi edit dan hapus.
 *
 * @param list - Daftar kategori yang akan ditampilkan.
 * @param onEdit - Fungsi yang dipanggil ketika pengguna mengedit kategori.
 * @param onDelete - Fungsi yang dipanggil ketika pengguna menghapus kategori.
 */
export const CategoryList = ({ list, onEdit, onDelete }: CategoryListProps) => {
    if (list.length === 0) {
        return (
            <div className="py-8 text-center text-muted-foreground text-sm border-2 border-dashed rounded-sm bg-muted/10">
                Belum ada kategori
            </div>
        )
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {list.map((c) => {
                const Icon = ICON_MAP[c.icon || "tag"] || Tag
                return (
                    <div
                        key={c.id}
                        className="flex items-center justify-between p-4 rounded-xl border bg-card hover:shadow-xs transition duration-200"
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="flex items-center justify-center size-10 rounded-sm shrink-0 border border-black/5"
                                style={{
                                    backgroundColor: `${c.color}15`,
                                    color: c.color || 'inherit'
                                }}
                            >
                                <Icon className="size-5" />
                            </div>
                            <span className="font-medium text-sm text-foreground">{c.name}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                            <CategoriesForm
                                initial={{
                                    id: c.id,
                                    name: c.name,
                                    type: c.type,
                                    icon: c.icon || undefined,
                                    color: c.color || undefined
                                }}
                                onSubmit={onEdit}
                            />
                            <AlertDialog>
                                <AlertDialogTrigger render={
                                    <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label={`Hapus ${c.name}`}
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    />
                                }>
                                    <Trash2 className="size-4" />
                                </AlertDialogTrigger>
                                <AlertDialogContent size="sm">
                                    <AlertDialogHeader>
                                        <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                                            <Trash2Icon />
                                        </AlertDialogMedia>
                                        <AlertDialogTitle>Hapus Kategori</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Yakin ingin menghapus <strong>{c.name}</strong>? Transaksi terkait akan menjadi tidak berkategori.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction
                                            variant="destructive"
                                            onClick={() => onDelete(c.id)}
                                        >
                                            Hapus
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
