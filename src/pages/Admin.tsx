import { useState } from "react";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Search, AlertTriangle, CheckCircle, Ban, Users, History, Shield } from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  status: "active" | "pending" | "blocked";
  activeConnections: number;
  historyConnections: number;
  duplicateFlag?: string;
}

const MOCK_USERS: AdminUser[] = [
  { id: "1", name: "Priya Sharma", email: "priya@email.com", phone: "+91 9876543210", city: "Mumbai", state: "Maharashtra", status: "active", activeConnections: 3, historyConnections: 1 },
  { id: "2", name: "Rahul Verma", email: "rahul@email.com", phone: "+91 9876543211", city: "Delhi", state: "Delhi", status: "active", activeConnections: 5, historyConnections: 0 },
  { id: "3", name: "Anita Gupta", email: "anita@email.com", phone: "+91 9876543212", city: "Bangalore", state: "Karnataka", status: "pending", activeConnections: 0, historyConnections: 0 },
  { id: "4", name: "Priya Sharma", email: "priya.s@email.com", phone: "+91 9876543213", city: "Mumbai", state: "Maharashtra", status: "pending", activeConnections: 0, historyConnections: 0, duplicateFlag: "Name + City match with User #1" },
  { id: "5", name: "Vikram Singh", email: "vikram@email.com", phone: "+91 9876543214", city: "Jaipur", state: "Rajasthan", status: "blocked", activeConnections: 2, historyConnections: 3 },
];

const statusConfig = {
  active: { label: "Active", variant: "default" as const, icon: CheckCircle },
  pending: { label: "Pending", variant: "secondary" as const, icon: AlertTriangle },
  blocked: { label: "Blocked", variant: "destructive" as const, icon: Ban },
};

const Admin = () => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState(MOCK_USERS);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search)
  );

  const duplicates = users.filter((u) => u.duplicateFlag);
  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    pending: users.filter((u) => u.status === "pending").length,
    blocked: users.filter((u) => u.status === "blocked").length,
  };

  const handleApprove = (id: string) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: "active" as const } : u)));
    toast({ title: "User Approved" });
  };

  const handleBlock = (id: string) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: "blocked" as const } : u)));
    toast({ title: "User Blocked" });
  };

  return (
    <Layout isAdmin>
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-accent" />
            <h1 className="font-display text-2xl font-bold">Admin Panel</h1>
          </div>
          <p className="text-sm text-muted-foreground">Manage users, connections, and identity validation.</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Total Users", value: stats.total, icon: Users },
            { label: "Active", value: stats.active, icon: CheckCircle },
            { label: "Pending", value: stats.pending, icon: AlertTriangle },
            { label: "Blocked", value: stats.blocked, icon: Ban },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <s.icon className="h-4 w-4" />
                <span className="text-xs font-medium">{s.label}</span>
              </div>
              <p className="mt-1 font-display text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">All Users</TabsTrigger>
            <TabsTrigger value="duplicates" className="gap-1">
              Duplicates
              {duplicates.length > 0 && (
                <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-destructive-foreground">
                  {duplicates.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, or phone..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="hidden md:table-cell">Contact</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">
                      <Users className="inline h-4 w-4" />
                    </TableHead>
                    <TableHead className="text-center">
                      <History className="inline h-4 w-4" />
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((user) => {
                    const sc = statusConfig[user.status];
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{user.name}</div>
                          <div className="text-xs text-muted-foreground md:hidden">{user.email}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-sm">{user.email}</div>
                          <div className="text-xs text-muted-foreground">{user.phone}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{user.city}, {user.state}</TableCell>
                        <TableCell>
                          <Badge variant={sc.variant} className="text-xs gap-1">
                            <sc.icon className="h-3 w-3" />
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm">{user.activeConnections}</TableCell>
                        <TableCell className="text-center text-sm">{user.historyConnections}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {user.status !== "active" && (
                              <Button size="sm" variant="ghost" onClick={() => handleApprove(user.id)} className="text-xs">
                                Approve
                              </Button>
                            )}
                            {user.status !== "blocked" && (
                              <Button size="sm" variant="ghost" onClick={() => handleBlock(user.id)} className="text-xs text-destructive">
                                Block
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="duplicates" className="mt-4">
            {duplicates.length === 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No duplicate flags found.
              </p>
            ) : (
              <div className="space-y-3">
                {duplicates.map((user) => (
                  <div key={user.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email} · {user.phone}</p>
                        <p className="mt-2 flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          {user.duplicateFlag}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleApprove(user.id)}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleBlock(user.id)}>Block</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
