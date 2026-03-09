import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link2, Copy, Check } from "lucide-react";

const RELATIONSHIP_TYPES = [
  { value: "friend", label: "👥 Friend", desc: "Looking for a genuine friendship" },
  { value: "family", label: "🏠 Family", desc: "Private family connection" },
  { value: "lover", label: "❤️ Lover", desc: "Romantic connection only" },
  { value: "view_only", label: "👁️ View Only", desc: "Sharing profile for viewing only" },
];

function generateSecureToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  for (const byte of array) {
    result += chars[byte % chars.length];
  }
  return result;
}

export default function GenerateTokenDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [relationshipType, setRelationshipType] = useState("");
  const [intentMessage, setIntentMessage] = useState("");
  const [expiresIn, setExpiresIn] = useState("1");
  const [generatedToken, setGeneratedToken] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!relationshipType) {
      toast({ title: "Select a relationship type", variant: "destructive" });
      return;
    }
    if (!user) return;

    setGenerating(true);
    const token = generateSecureToken();

    let expiresAt: string | null = null;
    if (expiresIn) {
      const minutes = parseInt(expiresIn);
      if (minutes > 0) {
        expiresAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      }
    }

    const { error } = await supabase.from("connection_tokens" as any).insert({
      token,
      owner_user_id: user.id,
      relationship_type: relationshipType,
      intent_message: intentMessage.trim() || null,
      expires_at: expiresAt,
      status: "active",
    } as any);

    setGenerating(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setGeneratedToken(token);
  };

  const handleCopy = async () => {
    const link = `${window.location.origin}/connect/${generatedToken}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "Copied!", description: "Share this link with someone you trust." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setRelationshipType("");
      setIntentMessage("");
      setExpiresIn("1use"); // Reset to default 1-time use
      setGeneratedToken("");
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Link2 className="h-4 w-4" /> Generate Token
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Generate Connection Token</DialogTitle>
        </DialogHeader>

        {!generatedToken ? (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Relationship Type</Label>
              <Select value={relationshipType} onValueChange={setRelationshipType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {relationshipType && (
                <p className="text-xs text-muted-foreground">
                  {RELATIONSHIP_TYPES.find((t) => t.value === relationshipType)?.desc}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Intent Message (optional)</Label>
              <Textarea
                placeholder="Why are you sharing this token?"
                value={intentMessage}
                onChange={(e) => setIntentMessage(e.target.value)}
                maxLength={200}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Expires In (optional)</Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger>
                  <SelectValue placeholder="No expiry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1use">1-time use (10 min window)</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="1440">24 hours</SelectItem>
                  <SelectItem value="10080">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleGenerate} className="w-full" disabled={generating}>
              {generating ? "Generating..." : "Generate Token"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border bg-muted/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">Your connection link</p>
              <p className="font-mono text-sm break-all select-all">
                {window.location.origin}/connect/{generatedToken}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex-1">
                {RELATIONSHIP_TYPES.find((t) => t.value === relationshipType)?.label} token
                {intentMessage && ` — "${intentMessage}"`}
              </span>
            </div>

            <Button onClick={handleCopy} className="w-full gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              This token can only be used once. Share it with someone you trust.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
