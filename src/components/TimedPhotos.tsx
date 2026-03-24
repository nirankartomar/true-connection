import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  title: string | null;
  caption: string | null;
  location: string | null;
  mood: string[];
  tags: string[];
  category: string;
  privacy: string;
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

const MOOD_OPTIONS = [
  "Happy", "Calm", "Adventure", "Romantic", "Excited",
  "Nostalgic", "Grateful", "Inspired", "Playful", "Peaceful",
];

const CATEGORY_OPTIONS = [
  "Travel", "Food", "Nature", "Selfie", "Event",
  "Friends", "Family", "Work", "Fitness", "Other",
];

const PRIVACY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "friends", label: "Friends" },
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
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [duration, setDuration] = useState("1_hour");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState("Other");
  const [privacy, setPrivacy] = useState("public");

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
    const interval = setInterval(fetchPhotos, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  const resetForm = () => {
    setPendingFile(null);
    setPendingPreview(null);
    setDuration("1_hour");
    setTitle("");
    setCaption("");
    setLocation("");
    setSelectedMoods([]);
    setTagsInput("");
    setCategory("Other");
    setPrivacy("public");
    setShowUploadDialog(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    setShowUploadDialog(true);
    e.target.value = "";
  };

  const toggleMood = (mood: string) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  };

  const parseTags = (input: string): string[] =>
    input
      .split(/[\s,]+/)
      .map((t) => t.replace(/^#/, "").trim())
      .filter(Boolean)
      .map((t) => `#${t}`);

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const ext = pendingFile.name.split(".").pop() || "jpg";
      const storagePath = `${userId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("timed-photos")
        .upload(storagePath, pendingFile, { contentType: pendingFile.type });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("timed-photos")
        .getPublicUrl(storagePath);

      const expiresAt = getExpiresAt(duration);
      const tags = parseTags(tagsInput);

      const { error: dbErr } = await supabase
        .from("profile_timed_photos")
        .insert({
          user_id: userId,
          photo_url: urlData.publicUrl,
          storage_path: storagePath,
          duration_type: duration,
          expires_at: expiresAt,
          title: title.trim() || null,
          caption: caption.trim() || null,
          location: location.trim() || null,
          mood: selectedMoods,
          tags,
          category,
          privacy,
        });
      if (dbErr) throw dbErr;

      toast({ title: "Photo uploaded!" });
      resetForm();
      fetchPhotos();
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    }
    setUploading(false);
  };

  const handleDelete = async (photo: TimedPhoto) => {
    await supabase.storage.from("timed-photos").remove([photo.storage_path]);
    await supabase.from("profile_timed_photos").delete().eq("id", photo.id);
    setPhotos((p) => p.filter((x) => x.id !== photo.id));
    setSelectedPhoto(null);
    toast({ title: "Photo deleted" });
  };

  if (!isOwn && photos.length === 0) return null;

  const viewingPhoto = photos.find((p) => p.id === selectedPhoto);

  return (
    <Card className="mt-4">
      <CardContent className="py-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Timed Photos
          </h2>
          {isOwn && (
            <label>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 cursor-pointer"
                asChild
              >
                <span>
                  <ImagePlus className="h-4 w-4" />
                  Add Photo
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
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
                  alt={photo.title || "Timed photo"}
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

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Timed Photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {pendingPreview && (
                <img
                  src={pendingPreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}

              <div className="space-y-1.5">
                <Label>Photo Title</Label>
                <Input
                  placeholder="e.g. Sunset in Goa"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Caption / Description</Label>
                <Textarea
                  placeholder="What's happening or story behind the photo..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={500}
                  className="min-h-[60px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input
                  placeholder="City or place"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Mood / Feel</Label>
                <div className="flex flex-wrap gap-1.5">
                  {MOOD_OPTIONS.map((mood) => (
                    <Badge
                      key={mood}
                      variant={selectedMoods.includes(mood) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleMood(mood)}
                    >
                      {mood}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Tags</Label>
                <Input
                  placeholder="#travel #friends #beach"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Privacy</Label>
                  <Select value={privacy} onValueChange={setPrivacy}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIVACY_OPTIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="h-9 text-xs">
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
              </div>

              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Upload Photo
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Lightbox */}
        {viewingPhoto && (
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
            <div
              className="max-w-lg w-full bg-background rounded-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={viewingPhoto.photo_url}
                alt={viewingPhoto.title || "Timed photo"}
                className="w-full max-h-[60vh] object-contain"
              />
              <div className="p-4 space-y-2">
                {viewingPhoto.title && (
                  <h3 className="font-semibold text-foreground">{viewingPhoto.title}</h3>
                )}
                {viewingPhoto.caption && (
                  <p className="text-sm text-muted-foreground">{viewingPhoto.caption}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {viewingPhoto.location && (
                    <Badge variant="outline" className="text-xs">📍 {viewingPhoto.location}</Badge>
                  )}
                  <Badge variant="outline" className="text-xs">{viewingPhoto.category}</Badge>
                  <Badge variant="secondary" className="text-xs">{timeRemaining(viewingPhoto.expires_at)}</Badge>
                </div>
                {viewingPhoto.mood?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {viewingPhoto.mood.map((m) => (
                      <Badge key={m} variant="default" className="text-xs">{m}</Badge>
                    ))}
                  </div>
                )}
                {viewingPhoto.tags?.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {viewingPhoto.tags.join(" ")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimedPhotos;
