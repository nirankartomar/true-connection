import { useState } from "react";
import Layout from "@/components/Layout";
import ConnectionCard, { Connection } from "@/components/ConnectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, Users, History } from "lucide-react";
import { motion } from "framer-motion";

const MOCK_CONNECTIONS: Connection[] = [
  { id: "1", name: "Priya Sharma", category: "love", photo: "https://i.pravatar.cc/150?img=1", connectedAt: "Jan 2024", isActive: true },
  { id: "2", name: "Rahul Verma", category: "friend", photo: "https://i.pravatar.cc/150?img=3", connectedAt: "Mar 2024", isActive: true },
  { id: "3", name: "Anita Gupta", category: "family", photo: "https://i.pravatar.cc/150?img=5", connectedAt: "Jun 2024", isActive: true },
  { id: "4", name: "Vikram Singh", category: "friend", photo: "https://i.pravatar.cc/150?img=8", connectedAt: "Aug 2023", removedAt: "Dec 2023", isActive: false },
];

const MAX_CONNECTIONS = 5;

const Dashboard = () => {
  const [connections, setConnections] = useState<Connection[]>(MOCK_CONNECTIONS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newConn, setNewConn] = useState({ name: "", category: "" as string, email: "" });

  const active = connections.filter((c) => c.isActive);
  const history = connections.filter((c) => !c.isActive);

  const handleRemove = (id: string) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, isActive: false, removedAt: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }) } : c
      )
    );
    toast({ title: "Connection Removed", description: "This connection has been moved to your history." });
  };

  const handleAdd = () => {
    if (active.length >= MAX_CONNECTIONS) {
      toast({
        title: "Connection Limit Reached",
        description: `You can only have ${MAX_CONNECTIONS} active connections. Remove one to add a new person.`,
        variant: "destructive",
      });
      return;
    }
    if (!newConn.name || !newConn.category) {
      toast({ title: "Missing Fields", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }

    const conn: Connection = {
      id: Date.now().toString(),
      name: newConn.name,
      category: newConn.category as Connection["category"],
      photo: `https://i.pravatar.cc/150?u=${Date.now()}`,
      connectedAt: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      isActive: true,
    };
    setConnections((prev) => [...prev, conn]);
    setNewConn({ name: "", category: "", email: "" });
    setDialogOpen(false);
    toast({ title: "Connection Added", description: `${conn.name} has been added to your circle.` });
  };

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
                  <Label>Name</Label>
                  <Input placeholder="Full name" value={newConn.name} onChange={(e) => setNewConn((n) => ({ ...n, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="Their email" value={newConn.email} onChange={(e) => setNewConn((n) => ({ ...n, email: e.target.value }))} />
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
                <Button onClick={handleAdd} className="w-full">Add to Circle</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Connection capacity indicator */}
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${(active.length / MAX_CONNECTIONS) * 100}%` }}
          />
        </div>

        {/* Active Connections */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Active Connections
            </h2>
          </div>
          {active.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Your circle is empty. Add your first connection.
            </p>
          ) : (
            <div className="grid gap-3">
              {active.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
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
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                History
              </h2>
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
