import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImagePlus, Loader2, Clock, Trash2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface TimedPhoto {
  id: string;
  photo_url: string;
  storage_path: string;
  duration_type: string;
  expires_at: string;
  created_at: string;
}

interface TimedPhotosProps {
  userId: string;
  isOwn: boolean;
}

const DURATION_OPTIONS = [
  { value: "1_hour", label: "1 Hour" },
  { value: "1_day", label: "1 Day" },
  { value: "1_week", label: "1 Week" },
];

function getExpiresAt(duration: string): string {
  const now = new Date();
  switch (duration) {
    case "1_hour":
      now.setHours(now.getHours() + 1);
      break;
    case "1_day":
      now.setDate(now.getDate() + 1);
      break;
    case "1_week":
      now.setDate(now.getDate() + 7);
      break;
  }
  return now.toISOString();
}

function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  }
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

const TimedPhotos = ({ userId, isOwn }: TimedPhotosProps) => {
  const [photos, setPhotos] = useState<TimedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState("1_hour");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const fetchPhotos = async () => {
    const { data } = await supabase
      .from("profile_timed_photos")
      .select("*")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    setPhotos((data as TimedPhoto[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPhotos();
    const interval = setInterval(fetchPhotos, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [userId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const storagePath = `${userId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("timed-photos")
        .upload(storagePath, file, { contentType: file.type });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("timed-photos")
        .getPublicUrl(storagePath);

      const expiresAt = getExpiresAt(duration);
      const { error: dbErr } = await supabase
        .from("profile_timed_photos")
        .insert({
          user_id: userId,
          photo_url: urlData.publicUrl,
          storage_path: storagePath,
          duration_type: duration,
          expires_at: expiresAt,
        });
      if (dbErr) throw dbErr;

      toast({ title: "Photo uploaded!" });
      fetchPhotos();
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (photo: TimedPhoto) => {
    await supabase.storage.from("timed-photos").remove([photo.storage_path]);
    await supabase.from("profile_timed_photos").delete().eq("id", photo.id);
    setPhotos((p) => p.filter((x) => x.id !== photo.id));
    setSelectedPhoto(null);
    toast({ title: "Photo deleted" });
  };

  if (!isOwn && photos.length === 0) return null;

  return (
    <Card className="mt-4">
      <CardContent className="py-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Timed Photos
          </h2>
          {isOwn && (
            <div className="flex items-center gap-2">
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="w-[110px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 cursor-pointer"
                  asChild
                >
                  <span>
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                    Add
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            Loading...
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            No timed photos yet. Add one with a self-destruct timer!
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer border border-border"
                onClick={() => setSelectedPhoto(photo.id)}
              >
                <img
                  src={photo.photo_url}
                  alt="Timed photo"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1">
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1 py-0 bg-transparent text-white border-none"
                  >
                    {timeRemaining(photo.expires_at)}
                  </Badge>
                </div>
                {isOwn && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(photo);
                    }}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Lightbox */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <button
              className="absolute top-4 right-4 text-white"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={photos.find((p) => p.id === selectedPhoto)?.photo_url}
              alt="Timed photo"
              className="max-w-full max-h-[85vh] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimedPhotos;
