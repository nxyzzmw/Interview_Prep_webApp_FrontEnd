import type { PropsWithChildren } from 'react';

type ProtectedRoutingProps = PropsWithChildren<{
  token: string | null;
  fallback: React.ReactNode;
}>;

const ProtectedRouting = ({ token, fallback, children }: ProtectedRoutingProps) => {
  if (!token) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default ProtectedRouting;
