import { redirect } from "next/navigation";

/** Root → dashboard. The authenticated shell guards and bounces to /login when
 * there is no session (FRONTEND_ARCHITECTURE §3). */
export default function Home() {
  redirect("/dashboard");
}
