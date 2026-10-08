import { SystemErrorPage } from "@/components/patterns/ErrorPage";

export default function ForbiddenPage() {
  return (
    <SystemErrorPage
      code="403"
      icon="compliance"
      title="You don't have access to this"
      message="You're signed in but your role doesn't permit access to this page. Contact your administrator if you need access."
    />
  );
}
