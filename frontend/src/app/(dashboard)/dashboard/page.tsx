import { Button } from "@/components/ui/button"
import { getUser, logoutUser } from "@/lib/actions/auth.actions"

const Dashboard = async () => {
  const user = await getUser()

  const { name, email } = user;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="mt-4 p-4 bg-muted rounded-lg border">
        <p className="font-medium text-foreground">Halo, {name}!</p>
        <p className="text-sm text-muted-foreground">{email}</p>
        <form action={logoutUser}>
          <Button variant="outline" type="submit">
            Logout
          </Button>
        </form>
      </div>
    </div>
  )
}

export default Dashboard
