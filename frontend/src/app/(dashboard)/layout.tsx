import AppShell from "@/components/AppShell";
import { getUser } from "@/lib/actions/auth.actions"

const layout = async ({ children }: { children: React.ReactNode }) => {
    const user = await getUser()

    return (
        <AppShell user={user}>
            {children}
        </AppShell>
    )
}

export default layout
