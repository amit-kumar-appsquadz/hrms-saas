import { SystemErrorPage } from "@/components/patterns/ErrorPage";

export default function NotFound() {
  return (
    <SystemErrorPage
      code="404"
      icon="search"
      title="Not found in this workspace"
      message="The page or resource you're looking for doesn't exist, or you don't have access to it."
    />
  );
}
