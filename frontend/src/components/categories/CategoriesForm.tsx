"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
    Plus,
    Pencil,
} from "lucide-react"

import { HexColorPicker } from "react-colorful"

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

const ICONS = [
    { key: "tag", icon: Tag, label: "Lainnya" },
    { key: "food", icon: Utensils, label: "Makanan" },
    { key: "shopping", icon: ShoppingCart, label: "Belanja" },
    { key: "bag", icon: ShoppingBag, label: "Shopping" },
    { key: "transport", icon: Car, label: "Transportasi" },
    { key: "home", icon: Home, label: "Rumah" },
    { key: "bill", icon: Zap, label: "Tagihan" },
    { key: "entertainment", icon: Video, label: "Hiburan" },
    { key: "health", icon: Heart, label: "Kesehatan" },
    { key: "education", icon: BookOpen, label: "Pendidikan" },
    { key: "travel", icon: Plane, label: "Perjalanan" },
    { key: "salary", icon: Briefcase, label: "Gaji" },
    { key: "gift", icon: Gift, label: "Hadiah" },
    { key: "freelance", icon: Laptop, label: "Freelance" },
    { key: "investment", icon: TrendingUp, label: "Investasi" },
    { key: "bonus", icon: Star, label: "Bonus" },
];

const COLORS = [
    '#10B981', '#22C55E', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6',
    '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#64748B',
];

interface CategoriesFormProps {
    initial?: {
        id?: number
        name?: string
        type?: string
        icon?: string
        color?: string
    }
    onSubmit?: (data: { id?: number; name: string; type: string; icon: string; color: string }) => void
}

/**
 * Formulir dialog untuk menambah atau mengedit kategori transaksi.
 *
 * @param initial - Data awal kategori untuk mode edit.
 * @param onSubmit - Fungsi yang dipanggil ketika form berhasil disubmit.
 */
export const CategoriesForm = ({ initial, onSubmit }: CategoriesFormProps) => {
    const isEdit = !!initial
    const [open, setOpen] = useState(false)
    const [form, setForm] = useState({
        name: initial?.name || '',
        type: initial?.type || 'expense',
        icon: initial?.icon || 'tag',
        color: initial?.color || '#10B981',
    });

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (newOpen && initial) {
            setForm({
                name: initial.name || '',
                type: initial.type || 'expense',
                icon: initial.icon || 'tag',
                color: initial.color || '#10B981',
            })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name.trim()) return
        try {
            await onSubmit?.({
                id: initial?.id,
                ...form
            })
            // Success
            if (initial) {
                toast.success("Kategori berhasil diperbarui")
            } else {
                toast.success("Kategori berhasil ditambahkan")
            }
            setOpen(false)
            if (!initial) {
                // Reset hanya untuk create mode
                setForm({
                    name: '',
                    type: 'expense',
                    icon: 'tag',
                    color: '#10B981',
                })
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Gagal menyimpan kategori"
            toast.error(message)
        }
    }

    const iconGrid = useMemo(() => {
        return (
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {ICONS.map(({ key, icon: Icon, label }) => {
                    const isSelected = form.icon === key;
                    return (
                        <Button
                            key={key}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="icon"
                            title={label}
                            aria-label={`Pilih icon ${label}`}
                            className={`transition duration-200 ${
                                isSelected
                                    ? "ring-2 ring-primary ring-offset-2 scale-105"
                                    : "hover:scale-105"
                            }`}
                            onClick={() =>
                                setForm((prev) => ({
                                    ...prev,
                                    icon: key,
                                }))
                            }
                        >
                            <Icon className="size-5" />
                        </Button>
                    );
                })}
            </div>
        );
    }, [form.icon]);

    const colorGrid = useMemo(() => {
        return (
            <div className="mt-4 grid grid-cols-6 sm:grid-cols-9 gap-2 justify-items-center">
                {COLORS.map((color) => {
                    const isSelected = form.color.toLowerCase() === color.toLowerCase();
                    return (
                        <button
                            key={color}
                            type="button"
                            title={color}
                            aria-label={`Pilih warna ${color}`}
                            className={`
                                h-8 w-8 rounded-full border border-black/10 shadow-sm transition duration-200 hover:scale-110 cursor-pointer
                                ${isSelected ? "ring-2 ring-primary ring-offset-2 scale-105" : ""}
                            `}
                            style={{
                                backgroundColor: color,
                                borderColor: isSelected ? color : 'rgba(0,0,0,0.1)'
                            }}
                            onClick={() =>
                                setForm((prev) => ({
                                    ...prev,
                                    color,
                                }))
                            }
                        />
                    );
                })}
            </div>
        );
    }, [form.color]);

    const defaultTrigger = (
        <Button className="font-semibold gap-2 shadow-xs">
            <Plus className="size-4" />
            Tambah Kategori
        </Button>
    );

    const editTrigger = (
        <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Edit ${initial?.name}`}
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
        >
            <Pencil className="size-4" />
        </Button>
    );

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger render={isEdit ? editTrigger : defaultTrigger} />
            <DialogContent className="sm:max-w-[480px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
                        <DialogDescription>
                            {isEdit
                                ? "Silakan ubah data kategori di bawah ini."
                                : "Kategori yang ditambahkan akan muncul di halaman dashboard. Silakan isi form di bawah ini untuk menambahkan kategori baru."
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-5">
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="name">Nama Kategori</FieldLabel>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="Contoh: Makanan, Transportasi"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                    className="w-full"
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="type">Tipe Transaksi</FieldLabel>
                                <Select
                                    value={form.type}
                                    onValueChange={(value) => setForm({ ...form, type: value ?? 'expense' })}
                                    disabled={isEdit}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Pilih tipe transaksi" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="expense">Pengeluaran</SelectItem>
                                            <SelectItem value="income">Pendapatan</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field>
                                <FieldLabel>Pilih Icon</FieldLabel>
                                {iconGrid}
                            </Field>

                            <Field>
                                <FieldLabel>Pilih Warna</FieldLabel>

                                <div className="flex items-center gap-3">
                                    <Popover>
                                        <PopoverTrigger render={
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="border-2 transition duration-200 hover:scale-105 shrink-0"
                                                aria-label="Pilih warna kustom"
                                            />
                                        }>
                                            <div
                                                className="size-6 rounded-md shadow-inner border border-black/10"
                                                style={{
                                                    backgroundColor: form.color,
                                                }}
                                            />
                                        </PopoverTrigger>

                                        <PopoverContent className="w-auto p-3">
                                            <HexColorPicker
                                                color={form.color}
                                                onChange={(color) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        color,
                                                    }))
                                                }
                                            />
                                        </PopoverContent>
                                    </Popover>

                                    <Input
                                        readOnly
                                        value={form.color}
                                        className="font-mono text-center max-w-[120px] bg-muted/30"
                                        aria-label="Kode warna hex"
                                    />
                                </div>

                                {colorGrid}
                            </Field>
                        </FieldGroup>
                    </div>

                    <DialogFooter>
                        <DialogClose render={<Button type="button" variant="outline" />}>
                            Batal
                        </DialogClose>
                        <Button type="submit">
                            Simpan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}