import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, MessageCircle, Send, Inbox, Link2, Unlink, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { differenceInDays, differenceInMonths, format } from "date-fns";

interface TimelineEvent {
  date: Date;
  label: string;
  icon: React.ReactNode;
  type: "connected" | "removed" | "message" | "milestone";
}

const ConnectionTimeline = () => {
  const { connectedUserId } = useParams<{ connectedUserId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const [connectionRows, setConnectionRows] = useState<any[]>([]);
  const [sentCount, setSentCount] = useState(0);
  const [receivedCount, setReceivedCount] = useState(0);
  const [firstMessageDate, setFirstMessageDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !connectedUserId) return;
    fetchData();
  }, [user, connectedUserId]);

  const fetchData = async () => {
    if (!user || !connectedUserId) return;
    setLoading(true);

    // Fetch other user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", connectedUserId)
      .single();
    setOtherProfile(profile);

    // Fetch all connection rows between these two users (both directions)
    const { data: conns } = await supabase
      .from("connections")
      .select("*")
      .or(
        `and(user_id.eq.${user.id},connected_user_id.eq.${connectedUserId}),and(user_id.eq.${connectedUserId},connected_user_id.eq.${user.id})`
      )
      .order("connected_at", { ascending: true });
    setConnectionRows(conns || []);

    // Message counts
    const { count: sent } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", user.id)
      .eq("receiver_id", connectedUserId);
    setSentCount(sent || 0);

    const { count: received } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", connectedUserId)
      .eq("receiver_id", user.id);
    setReceivedCount(received || 0);

    // First message date
    const { data: firstMsg } = await supabase
      .from("messages")
      .select("created_at")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${connectedUserId}),and(sender_id.eq.${connectedUserId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true })
      .limit(1);
    if (firstMsg?.length) {
      setFirstMessageDate(new Date(firstMsg[0].created_at));
    }

    setLoading(false);
  };

  const stats = useMemo(() => {
    const accepted = connectionRows.filter((c) => c.status === "accepted");
    const removed = accepted.filter((c) => !c.is_active);
    const firstConnected = accepted.length ? new Date(accepted[0].connected_at) : null;

    let durationText = "—";
    if (firstConnected) {
      const months = differenceInMonths(new Date(), firstConnected);
      const days = differenceInDays(new Date(), firstConnected) - months * 30;
      if (months > 0) {
        durationText = `${months} month${months !== 1 ? "s" : ""} and ${days} day${days !== 1 ? "s" : ""}`;
      } else {
        const totalDays = differenceInDays(new Date(), firstConnected);
        durationText = `${totalDays} day${totalDays !== 1 ? "s" : ""}`;
      }
    }

    return {
      duration: durationText,
      timesConnected: accepted.length,
      timesRemoved: removed.length,
    };
  }, [connectionRows]);

  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];
    const accepted = connectionRows.filter((c) => c.status === "accepted");

    accepted.forEach((c, i) => {
      events.push({
        date: new Date(c.connected_at),
        label: i === 0 ? "Connection established" : "Reconnected",
        icon: <Link2 className="h-4 w-4" />,
        type: "connected",
      });
      if (!c.is_active && c.removed_at) {
        events.push({
          date: new Date(c.removed_at),
          label: "Connection removed",
          icon: <Unlink className="h-4 w-4" />,
          type: "removed",
        });
      }
    });

    if (firstMessageDate) {
      events.push({
        date: firstMessageDate,
        label: "First message exchanged",
        icon: <MessageCircle className="h-4 w-4" />,
        type: "message",
      });
    }

    const totalMessages = sentCount + receivedCount;
    const milestones = [100, 500, 1000, 5000];
    milestones.forEach((m) => {
      if (totalMessages >= m) {
        events.push({
          date: new Date(), // approximate
          label: `${m} messages milestone reached!`,
          icon: <Trophy className="h-4 w-4" />,
          type: "milestone",
        });
      }
    });

    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    return events;
  }, [connectionRows, firstMessageDate, sentCount, receivedCount]);

  if (authLoading || loading) {
    return (
      <Layout isAdmin={false}>
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading…</div>
      </Layout>
    );
  }

  const initials = otherProfile?.full_name
    ?.split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  const typeColors: Record<string, string> = {
    connected: "bg-accent/20 text-accent-foreground border-accent/30",
    removed: "bg-destructive/10 text-destructive border-destructive/20",
    message: "bg-primary/10 text-primary border-primary/20",
    milestone: "bg-accent/20 text-accent-foreground border-accent/30",
  };

  const dotColors: Record<string, string> = {
    connected: "bg-accent",
    removed: "bg-destructive",
    message: "bg-primary",
    milestone: "bg-accent",
  };

  return (
    <Layout isAdmin={false}>
      <div className="container max-w-2xl py-8">
        {/* Back button */}
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="mb-6 gap-1 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Circle
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={otherProfile?.avatar_url} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display text-2xl font-bold">{otherProfile?.full_name || "Unknown"}</h1>
            <p className="text-sm text-muted-foreground">Connection Timeline</p>
          </div>
        </div>

        {/* Stats Card */}
        <Card className="mb-8 overflow-hidden">
          <div className="bg-primary/5 px-6 py-3 border-b">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Summary</h2>
          </div>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatItem icon={<Clock className="h-4 w-4 text-accent" />} label="Connected for" value={stats.duration} />
              <StatItem icon={<Send className="h-4 w-4 text-accent" />} label="Messages Sent" value={sentCount.toLocaleString()} />
              <StatItem icon={<Inbox className="h-4 w-4 text-accent" />} label="Messages Received" value={receivedCount.toLocaleString()} />
              <StatItem icon={<Link2 className="h-4 w-4 text-accent" />} label="Times Connected" value={String(stats.timesConnected)} />
              <StatItem icon={<Unlink className="h-4 w-4 text-accent" />} label="Times Removed" value={String(stats.timesRemoved)} />
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Timeline</h2>
        </div>

        {timelineEvents.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No events yet.
          </p>
        ) : (
          <div className="relative ml-4 border-l-2 border-border pl-6 space-y-6">
            {timelineEvents.map((event, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="relative"
              >
                {/* Dot */}
                <div className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-background ${dotColors[event.type]}`} />

                <div className={`rounded-lg border p-4 ${typeColors[event.type]}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {event.icon}
                    <span className="font-medium text-sm">{event.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(event.date, "MMMM d, yyyy")}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

const StatItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {icon}
      {label}
    </div>
    <p className="font-semibold text-sm">{value}</p>
  </div>
);

export default ConnectionTimeline;
