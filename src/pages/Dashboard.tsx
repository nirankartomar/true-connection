import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ConnectionCard, { Connection } from "@/components/ConnectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, Users, History, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";

const MAX_CONNECTIONS = 5;

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newConn, setNewConn] = useState({ email: "", category: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/signin");
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    fetchConnections();
  }, [user]);

  const fetchConnections = async () => {
    if (!user) return;
    const { data: conns } = await supabase
      .from("connections")
      .select("*")
      .eq("user_id", user.id)
      .order("connected_at", { ascending: false });

    if (!conns?.length) { setConnections([]); return; }

    const otherIds = conns.map((c: any) => c.connected_user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", otherIds);

    const profileMap: Record<string, any> = {};
    profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

    setConnections(
      conns.map((c: any) => ({
        id: c.id,
        name: profileMap[c.connected_user_id]?.full_name || "Unknown",
        category: c.category,
        photo: profileMap[c.connected_user_id]?.avatar_url || `https://i.pravatar.cc/150?u=${c.connected_user_id}`,
        connectedAt: new Date(c.connected_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        removedAt: c.removed_at ? new Date(c.removed_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : undefined,
        isActive: c.is_active,
        connectedUserId: c.connected_user_id,
      }))
    );
  };

  const active = connections.filter((c) => c.isActive);
  const history = connections.filter((c) => !c.isActive);

  const handleRemove = async (id: string) => {
    await supabase
      .from("connections")
      .update({ is_active: false, removed_at: new Date().toISOString() })
      .eq("id", id);
    toast({ title: "Connection Removed", description: "Moved to history." });
    fetchConnections();
  };

  const handleAdd = async () => {
    if (active.length >= MAX_CONNECTIONS) {
      toast({ title: "Limit Reached", description: `Max ${MAX_CONNECTIONS} active connections.`, variant: "destructive" });
      return;
    }
    if (!newConn.email || !newConn.category) {
      toast({ title: "Missing Fields", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    setAdding(true);

    // Find user by email
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", newConn.email)
      .single();

    if (!profiles) {
      toast({ title: "User Not Found", description: "No user with that email exists.", variant: "destructive" });
      setAdding(false);
      return;
    }

    if (profiles.user_id === user?.id) {
      toast({ title: "Invalid", description: "You can't add yourself.", variant: "destructive" });
      setAdding(false);
      return;
    }

    const { error } = await supabase.from("connections").insert({
      user_id: user!.id,
      connected_user_id: profiles.user_id,
      category: newConn.category,
    });

    setAdding(false);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already Connected", description: "This person is already in your circle.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
      return;
    }

    setNewConn({ email: "", category: "" });
    setDialogOpen(false);
    toast({ title: "Connection Added!" });
    fetchConnections();
  };

  if (authLoading) return null;

  return (
    <Layout isAdmin>
      <div className="container max-w-2xl py-8">
        {/* Status bar */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Your Circle</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {active.length} of {MAX_CONNECTIONS} connections used
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/chat">
              <Button variant="outline" size="sm" className="gap-1">
                <MessageCircle className="h-4 w-4" /> Chat
              </Button>
            </Link>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="sm" className="gap-1">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Add Connection</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Email of the person</Label>
                    <Input type="email" placeholder="Their email on Bonded" value={newConn.email} onChange={(e) => setNewConn((n) => ({ ...n, email: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={newConn.category} onValueChange={(v) => setNewConn((n) => ({ ...n, category: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="love">❤️ Love</SelectItem>
                        <SelectItem value="friend">👥 Friend</SelectItem>
                        <SelectItem value="family">🏠 Family</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAdd} className="w-full" disabled={adding}>
                    {adding ? "Adding..." : "Add to Circle"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Capacity indicator */}
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${(active.length / MAX_CONNECTIONS) * 100}%` }} />
        </div>

        {/* Active Connections */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Active Connections</h2>
          </div>
          {active.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Your circle is empty. Add your first connection.
            </p>
          ) : (
            <div className="grid gap-3">
              {active.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <ConnectionCard connection={c} onRemove={handleRemove} />
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* History */}
        {history.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">History</h2>
            </div>
            <div className="grid gap-3">
              {history.map((c) => (
                <ConnectionCard key={c.id} connection={c} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
