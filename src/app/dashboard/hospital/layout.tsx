/**
 * PASSIVE Hospital Layout for OPAL-AI.
 * We have removed ALL server-side redirect() calls.
 * This ensures that a "Loading" session or "Master Admin" session 
 * will NEVER trigger a refresh loop at the layout level.
 */

export default async function HospitalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
