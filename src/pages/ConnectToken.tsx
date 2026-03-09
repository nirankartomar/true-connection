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
import { MapPin, UserPlus, Eye, Loader2, AlertTriangle, Heart, Users, Home, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface ConnProfile {
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  gender: string | null;
  bio_who_i_am: string | null;
  bio_who_was_i: string | null;
  bio_who_will_i_be: string | null;
  bio_what_i_am_doing: string | null;
}

interface ConnectionSummary {
  id: string;
  category: string;
  connected_at: string;
  removed_at: string | null;
  name: string;
  avatar_url: string | null;
}

interface TokenInfo {
  token_id: string;
  owner_user_id: string;
  relationship_type: string;
  intent_message: string | null;
  profile: ConnProfile | null;
  active_connections: ConnectionSummary[];
  history_connections: ConnectionSummary[];
}

const RELATIONSHIP_LABELS: Record<string, { label: string; emoji: string }> = {
  friend: { label: "Friend", emoji: "👥" },
  family: { label: "Family", emoji: "🏠" },
  lover: { label: "Lover", emoji: "❤️" },
  view_only: { label: "View Only", emoji: "👁️" },
};

const categoryIcons: Record<string, typeof Heart> = {
  love: Heart,
  friend: Users,
  family: Home,
};

const categoryColors: Record<string, string> = {
  love: "text-love bg-love/10 border-love/20",
  friend: "text-friend bg-friend/10 border-friend/20",
  family: "text-family bg-family/10 border-family/20",
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
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  if (!tokenInfo) return null;

  const rel = RELATIONSHIP_LABELS[tokenInfo.relationship_type] || RELATIONSHIP_LABELS.friend;
  const profile = tokenInfo.profile;
  const initials = profile?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const location = [profile?.city, profile?.state].filter(Boolean).join(", ");

  const bioSections = [
    { title: "Who I Was", content: profile?.bio_who_was_i },
    { title: "Who I Am", content: profile?.bio_who_i_am },
    { title: "Who I Will Be", content: profile?.bio_who_will_i_be },
    { title: "What I Am Doing", content: profile?.bio_what_i_am_doing },
  ].filter((s) => s.content);

  return (
    <Layout>
      <div className="container max-w-lg py-8 space-y-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* Profile Header */}
          <Card className="overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-primary/20 to-accent/20" />
            <CardContent className="relative pb-6">
              <div className="-mt-10 flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 border-4 border-card shadow-lg">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
                  <AvatarFallback className="text-lg font-semibold bg-secondary text-secondary-foreground">{initials}</AvatarFallback>
                </Avatar>
                <h1 className="font-display text-xl font-bold mt-3">{profile?.full_name || "Unknown User"}</h1>
                {location && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3.5 w-3.5" /> {location}
                  </span>
                )}
              </div>

              <Separator className="my-5" />

              {/* Connection Intent */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="secondary" className="text-sm">{rel.emoji} {rel.label}</Badge>
                </div>
                {tokenInfo.intent_message && (
                  <p className="text-sm text-center text-muted-foreground italic">"{tokenInfo.intent_message}"</p>
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
                    <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
                  </div>
                ) : (
                  <Button onClick={handleConnect} className="w-full gap-2" disabled={redeeming}>
                    {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    {redeeming ? "Connecting…" : `Connect as ${rel.label}`}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bio Sections */}
          {bioSections.length > 0 && (
            <Card className="mt-4">
              <CardContent className="py-5 space-y-5">
                <h2 className="font-display text-base font-semibold">Their Story</h2>
                {bioSections.map((section, i) => (
                  <div key={section.title}>
                    {i > 0 && <Separator className="mb-5" />}
                    <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {section.title}
                    </h3>
                    <p className="text-sm leading-relaxed">{section.content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Active Connections */}
          {tokenInfo.active_connections.length > 0 && (
            <Card className="mt-4">
              <CardContent className="py-5 space-y-3">
                <h2 className="font-display text-base font-semibold">
                  Connections ({tokenInfo.active_connections.length}/5)
                </h2>
                {tokenInfo.active_connections.map((conn) => (
                  <ConnectionItem key={conn.id} conn={conn} isActive />
                ))}
              </CardContent>
            </Card>
          )}

          {/* History Connections */}
          {tokenInfo.history_connections.length > 0 && (
            <Card className="mt-4">
              <CardContent className="py-5 space-y-3">
                <h2 className="font-display text-base font-semibold text-muted-foreground">History</h2>
                {tokenInfo.history_connections.map((conn) => (
                  <ConnectionItem key={conn.id} conn={conn} isActive={false} />
                ))}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}

function ConnectionItem({ conn, isActive }: { conn: ConnectionSummary; isActive: boolean }) {
  const Icon = categoryIcons[conn.category] || Users;
  const colorClass = categoryColors[conn.category] || "text-muted-foreground bg-muted/10 border-muted/20";
  const initials = conn.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const connDate = new Date(conn.connected_at).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <div className={`flex items-center gap-3 rounded-lg border p-3 ${isActive ? "bg-card" : "bg-muted/50 opacity-75"}`}>
      <Avatar className="h-9 w-9">
        {conn.avatar_url && <AvatarImage src={conn.avatar_url} alt={conn.name} />}
        <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{conn.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${colorClass}`}>
            <Icon className="h-2.5 w-2.5" />
            {conn.category}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            {connDate}
          </span>
        </div>
      </div>
      {!isActive && (
        <Badge variant="outline" className="text-[10px] text-muted-foreground">Past</Badge>
      )}
    </div>
  );
}
