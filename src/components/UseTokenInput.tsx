import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function UseTokenInput() {
  const [tokenInput, setTokenInput] = useState("");
  const navigate = useNavigate();

  const handleSubmit = () => {
    let token = tokenInput.trim();
    if (!token) {
      toast({ title: "Enter a token or link", variant: "destructive" });
      return;
    }

    // Extract token from link if pasted as full URL
    const match = token.match(/\/connect\/([A-Za-z0-9]+)$/);
    if (match) {
      token = match[1];
    }

    navigate(`/connect/${token}`);
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Paste connection token or link"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="pl-9"
        />
      </div>
      <Button onClick={handleSubmit} variant="outline" size="default">
        Use Token
      </Button>
    </div>
  );
}
