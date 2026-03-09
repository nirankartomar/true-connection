import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import type { PendingRequest } from "@/pages/Dashboard";

interface PendingRequestCardProps {
  request: PendingRequest;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

const categoryEmoji: Record<string, string> = {
  love: "❤️",
  friend: "👥",
  family: "🏠",
};

const PendingRequestCard = ({ request, onAccept, onReject }: PendingRequestCardProps) => {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
      <img
        src={request.photo}
        alt={request.name}
        className="h-12 w-12 rounded-full object-cover"
      />
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium truncate">{request.name}</h3>
        <p className="text-xs text-muted-foreground">
          {categoryEmoji[request.category] || ""} {request.category} · {request.sentAt}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="hero"
          size="sm"
          className="gap-1"
          onClick={() => onAccept(request.id)}
        >
          <Check className="h-4 w-4" /> Accept
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onReject(request.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PendingRequestCard;
