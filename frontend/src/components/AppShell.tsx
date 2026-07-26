'use client'

import { cn } from "@/lib/utils"
import { ArrowLeftRight, BotMessageSquare, ChartColumnStacked, CircleQuestionMark, LayoutDashboard, LogOutIcon, PhoneForwarded, Wallet } from "lucide-react"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { logoutUser } from "@/lib/actions/auth.actions"
import { Button } from "./ui/button"

type NavItem = {
    href: string
    lable: string
    icon: React.ComponentType<{ className?: string }>
}

const NAV_GROUPS: NavItem[] = [
    {
        href: '/dashboard',
        lable: 'Dashboard',
        icon: LayoutDashboard
    },
    {
        href: '/transactions',
        lable: 'Transactions',
        icon: ArrowLeftRight
    },
    {
        href: '/categories',
        lable: 'Categories',
        icon: ChartColumnStacked
    },
    {
        href: '/budget',
        lable: 'Budget',
        icon: Wallet
    },
    {
        href: '/ai-insight',
        lable: 'AI Insight',
        icon: BotMessageSquare
    }
]

function initials(name: string) {
    return name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
}

const AppShell = () => {
    const pathname = usePathname()

    return (
        <div className="min-h-screen">
            {/* Dekstop Sidebar */}
            <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
                {/* Logo */}
                <div className="flex items-center gap-2.5 px-5 h-16 border-b">
                    <Image src="/logo2.png" width={28} height={28} alt="Logo Spendfy" className="rounded-sm" />
                    <span className="font-extrabold text-lg tracking-wide">Spendfy</span>
                </div>

                {/* Nav item */}
                <nav className="flex-1 px-3 py-4 space-y-5">
                    {NAV_GROUPS.map((item, index) => {
                        const active = pathname.startsWith(item.href)
                        const Icon = item.icon

                        return (
                            <Link
                                key={index}
                                href={item.href}
                                className={cn("flex rounded-sm items-center gap-3 px-3 py-2 text-sm font-medium transition-colors",
                                    active
                                        ? "bg-primary text-white shadow-sm"
                                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
                                <Icon className="size-4" />
                                {item.lable}
                            </Link>
                        )
                    }
                    )}
                </nav>

                {/* Contact */}
                <div className='px-3 py-4 space-y-2'>
                    <Link
                        href='/panduan'
                        className={cn("flex rounded-sm items-center gap-3 px-3 py-2 text-sm font-medium transition-colors",
                            pathname.startsWith('/panduan')
                                ? "bg-primary text-white shadow-sm"
                                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
                        <CircleQuestionMark className="size-4" />
                        Panduan
                    </Link>
                    <a href='' target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                        <PhoneForwarded className="size-4" />Hubungi
                    </a>
                </div>

                {/* Profile */}
                <div className="px-3 py-3 border-t">
                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left hover:bg-sidebar-accent">
                            <Avatar className="size-8">
                                <AvatarFallback className="bg-linear-to-br from-emerald-500 to-teal-600 text-white text-xs font-medium">FA</AvatarFallback>
                            </Avatar>
                            <span className="text-md text-muted-foreground font-medium truncate">Lutung</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuGroup>
                                <DropdownMenuLabel className="font-normal space-y-1">
                                    <p className="text-sm font-medium">Lutung</p>
                                    <p className="text-sm text-muted-foreground">Lutung@gmail.com</p>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive">
                                    <button className="flex items-center gap-3 py-1" onClick={logoutUser}>
                                        <LogOutIcon />
                                        Sign Out
                                    </button>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* Mobile Topbar */}
            <header></header>

            {/* Content */}
            <main></main>

            {/* Mobile bottom bar */}
            <nav></nav>
        </div>
    )
}

export default AppShell
