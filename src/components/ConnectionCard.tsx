import { cn } from "@/lib/utils";
import { Heart, Users, Home, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ConnectionCategory = "love" | "friend" | "family";

export interface Connection {
  id: string;
  name: string;
  category: ConnectionCategory;
  photo: string;
  connectedAt: string;
  removedAt?: string;
  isActive: boolean;
}

const categoryConfig: Record<ConnectionCategory, { icon: typeof Heart; label: string; colorClass: string }> = {
  love: { icon: Heart, label: "Love", colorClass: "text-love bg-love/10 border-love/20" },
  friend: { icon: Users, label: "Friend", colorClass: "text-friend bg-friend/10 border-friend/20" },
  family: { icon: Home, label: "Family", colorClass: "text-family bg-family/10 border-family/20" },
};

interface ConnectionCardProps {
  connection: Connection;
  onRemove?: (id: string) => void;
}

const ConnectionCard = ({ connection, onRemove }: ConnectionCardProps) => {
  const config = categoryConfig[connection.category];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "group relative rounded-lg border p-4 transition-all",
        connection.isActive
          ? "bg-card hover:shadow-md"
          : "bg-muted/50 opacity-75"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-secondary">
          <img
            src={connection.photo}
            alt={connection.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{connection.name}</h3>
          <div className={cn("mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", config.colorClass)}>
            <Icon className="h-3 w-3" />
            {config.label}
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {connection.isActive
              ? `Connected ${connection.connectedAt}`
              : `Removed ${connection.removedAt}`}
          </div>
        </div>
        {connection.isActive && onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(connection.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {!connection.isActive && (
        <div className="mt-2 rounded bg-muted px-2 py-1 text-xs text-muted-foreground italic">
          History Connection
        </div>
      )}
    </div>
  );
};

export default ConnectionCard;
