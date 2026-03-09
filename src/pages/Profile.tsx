import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, Mail, Phone, ArrowLeft, MessageCircle, Calendar, Pencil } from "lucide-react";
import { motion } from "framer-motion";

interface ProfileData {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  bio_who_was_i: string | null;
  bio_who_i_am: string | null;
  bio_who_will_i_be: string | null;
  bio_what_i_am_doing: string | null;
  created_at: string;
}

const Profile = () => {
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnection, setIsConnection] = useState(false);

  const targetUserId = paramUserId || user?.id;

  useEffect(() => {
    if (!targetUserId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", targetUserId)
        .single();
      setProfile(data);

      if (user && user.id !== targetUserId) {
        const { data: conn } = await supabase
          .from("connections")
          .select("id")
          .or(`and(user_id.eq.${user.id},connected_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},connected_user_id.eq.${user.id})`)
          .eq("is_active", true)
          .eq("status", "accepted" as any)
          .limit(1);
        setIsConnection((conn?.length ?? 0) > 0);
      }
      setLoading(false);
    };
    load();
  }, [targetUserId, user]);

  const isOwn = user?.id === targetUserId;

  if (loading) {
    return (
      <Layout>
        <div className="container max-w-2xl py-16 text-center text-muted-foreground">Loading...</div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="container max-w-2xl py-16 text-center">
          <h2 className="font-display text-xl font-semibold">Profile not found</h2>
          <Link to="/dashboard">
            <Button variant="outline" className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const location = [profile.city, profile.state].filter(Boolean).join(", ");
  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const bioSections = [
    { title: "Who I Was", content: profile.bio_who_was_i },
    { title: "Who I Am", content: profile.bio_who_i_am },
    { title: "Who I Will Be", content: profile.bio_who_will_i_be },
    { title: "What I Am Doing", content: profile.bio_what_i_am_doing },
  ].filter((s) => s.content);

  return (
    <Layout>
      <div className="container max-w-2xl py-8">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* Header */}
          <Card className="overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-primary/20 to-accent/20" />
            <CardContent className="relative pb-6">
              <div className="-mt-12 flex flex-col items-center sm:flex-row sm:items-end sm:gap-5">
                <Avatar className="h-24 w-24 border-4 border-card shadow-lg">
                  {profile.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                  ) : null}
                  <AvatarFallback className="text-lg font-semibold bg-secondary text-secondary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="mt-3 text-center sm:mt-0 sm:text-left flex-1">
                  <h1 className="font-display text-2xl font-bold">{profile.full_name}</h1>
                  <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    {profile.gender && (
                      <Badge variant="secondary" className="capitalize">{profile.gender}</Badge>
                    )}
                    {location && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> {location}
                      </span>
                    )}
                  </div>
                </div>

                {isOwn && (
                  <Link to="/bio">
                    <Button variant="outline" size="sm" className="gap-1 mt-3 sm:mt-0">
                      <Pencil className="h-4 w-4" /> Edit Profile
                    </Button>
                  </Link>
                )}
                {!isOwn && isConnection && (
                  <Link to="/chat">
                    <Button variant="hero" size="sm" className="gap-1 mt-3 sm:mt-0">
                      <MessageCircle className="h-4 w-4" /> Message
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="mt-4">
            <CardContent className="py-5 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Member since {memberSince}
              </div>
              {profile.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {profile.phone}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bio Sections */}
          {bioSections.length > 0 && (
            <Card className="mt-4">
              <CardContent className="py-5 space-y-5">
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
        </motion.div>
      </div>
    </Layout>
  );
};

export default Profile;
