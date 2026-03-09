import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { MapPin, UserPlus, Eye, Loader2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface TokenInfo {
  token_id: string;
  owner_user_id: string;
  relationship_type: string;
  intent_message: string | null;
  profile: {
    full_name: string;
    avatar_url: string | null;
    city: string | null;
    state: string | null;
    gender: string | null;
    bio_who_i_am: string | null;
  } | null;
}

const RELATIONSHIP_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  friend: { label: "Friend", emoji: "👥", color: "bg-[hsl(var(--friend))]" },
  family: { label: "Family", emoji: "🏠", color: "bg-[hsl(var(--family))]" },
  lover: { label: "Lover", emoji: "❤️", color: "bg-[hsl(var(--love))]" },
  view_only: { label: "View Only", emoji: "👁️", color: "bg-muted" },
};

export default function ConnectToken() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/signin?redirect=/connect/${token}`);
      return;
    }
    if (!token) return;

    const validate = async () => {
      setLoading(true);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("redeem-token", {
          body: { action: "validate", token },
        });

        if (fnError || data?.error) {
          setError(data?.error || fnError?.message || "Invalid token");
        } else {
          setTokenInfo(data);
        }
      } catch {
        setError("Failed to validate token");
      }
      setLoading(false);
    };

    validate();
  }, [token, user, authLoading]);

  const handleConnect = async () => {
    if (!token) return;
    setRedeeming(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("redeem-token", {
        body: { action: "redeem", token },
      });

      if (fnError || data?.error) {
        toast({ title: "Error", description: data?.error || fnError?.message, variant: "destructive" });
      } else {
        toast({ title: "Connected!", description: "You are now connected." });
        navigate("/dashboard");
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    }

    setRedeeming(false);
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="container max-w-md py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Validating token…</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container max-w-md py-16 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-destructive mb-4" />
          <h2 className="font-display text-xl font-semibold mb-2">Invalid Token</h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  if (!tokenInfo) return null;

  const rel = RELATIONSHIP_LABELS[tokenInfo.relationship_type] || RELATIONSHIP_LABELS.friend;
  const profile = tokenInfo.profile;
  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
  const location = [profile?.city, profile?.state].filter(Boolean).join(", ");

  return (
    <Layout>
      <div className="container max-w-md py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-primary/20 to-accent/20" />
            <CardContent className="relative pb-6">
              <div className="-mt-10 flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 border-4 border-card shadow-lg">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                  ) : null}
                  <AvatarFallback className="text-lg font-semibold bg-secondary text-secondary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <h1 className="font-display text-xl font-bold mt-3">
                  {profile?.full_name || "Unknown User"}
                </h1>

                {location && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3.5 w-3.5" /> {location}
                  </span>
                )}

                {profile?.bio_who_i_am && (
                  <p className="text-sm text-muted-foreground mt-3 max-w-xs">
                    {profile.bio_who_i_am}
                  </p>
                )}
              </div>

              <Separator className="my-5" />

              {/* Connection Intent */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    {rel.emoji} {rel.label}
                  </Badge>
                </div>

                {tokenInfo.intent_message && (
                  <p className="text-sm text-center text-muted-foreground italic">
                    "{tokenInfo.intent_message}"
                  </p>
                )}
              </div>

              {/* Action */}
              <div className="mt-6">
                {tokenInfo.relationship_type === "view_only" ? (
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      <span>This is a view-only token. No connection will be created.</span>
                    </div>
                    <Button variant="outline" onClick={() => navigate("/dashboard")}>
                      Back to Dashboard
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleConnect}
                    className="w-full gap-2"
                    disabled={redeeming}
                  >
                    {redeeming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    {redeeming ? "Connecting…" : `Connect as ${rel.label}`}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
