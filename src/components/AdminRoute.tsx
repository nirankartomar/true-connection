import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    let active = true;

    const checkAdminRole = async () => {
      if (!user) {
        if (active) setCheckingRole(false);
        return;
      }

      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .limit(1);

      if (!active) return;
      setIsAdmin(!error && (data?.length ?? 0) > 0);
      setCheckingRole(false);
    };

    if (!loading) {
      checkAdminRole();
    }

    return () => {
      active = false;
    };
  }, [user, loading]);

  if (loading || checkingRole) return null;

  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
