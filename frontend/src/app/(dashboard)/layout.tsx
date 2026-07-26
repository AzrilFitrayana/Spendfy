import AppShell from "@/components/AppShell";
import { getUser } from "@/lib/actions/auth.actions"

const layout = async () => {
    const user = await getUser()

    const { name, email } = user;
    return (
        <AppShell>

        </AppShell>
    )
}

export default layout
