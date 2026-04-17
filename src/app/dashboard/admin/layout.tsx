/**
 * Stable Admin Layout for OPAL-AI.
 * We avoid Server-Side 'redirect()' to prevent infinite refresh loops in Turbopack/Next.js.
 * Granular security is handled by the Client-Side guards in the page components.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
