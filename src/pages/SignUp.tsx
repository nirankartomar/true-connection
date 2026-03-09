import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Camera, ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SignUp = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingFace, setCheckingFace] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    gender: "",
    pincode: "",
    city: "",
    state: "",
    photo: null as File | null,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [faceChecked, setFaceChecked] = useState(false);
  const [faceDuplicateError, setFaceDuplicateError] = useState<string | null>(null);

  const handlePincodeChange = async (pincode: string) => {
    setForm((f) => ({ ...f, pincode, city: "", state: "" }));
    if (pincode.length === 6) {
      setPincodeLoading(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await res.json();
        if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          setForm((f) => ({ ...f, city: po.District, state: po.State }));
        } else {
          toast({ title: "Invalid Pincode", description: "Could not find city/state for this pincode.", variant: "destructive" });
        }
      } catch {
        toast({ title: "Error", description: "Failed to fetch pincode data.", variant: "destructive" });
      }
      setPincodeLoading(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setForm((f) => ({ ...f, photo: file }));
    setFaceChecked(false);
    setFaceDuplicateError(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setPhotoPreview(dataUrl);

      // Run face duplicate check
      setCheckingFace(true);
      try {
        const { data, error } = await supabase.functions.invoke("check-face-duplicate", {
          body: { imageBase64: dataUrl, mimeType: file.type },
        });

        if (error) {
          console.error("Face check error:", error);
          toast({ title: "Face Check Failed", description: "Could not verify your photo. Please try again.", variant: "destructive" });
          setCheckingFace(false);
          return;
        }

        if (data?.isDuplicate) {
          setFaceDuplicateError(`This face appears to match an existing account (${data.matchedName || "unknown"}). Please use your original account or contact support.`);
        } else {
          setFaceChecked(true);
        }
      } catch (err) {
        console.error("Face check exception:", err);
        toast({ title: "Error", description: "Failed to verify photo.", variant: "destructive" });
      }
      setCheckingFace(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate mandatory selfie
    if (!form.photo || !photoPreview) {
      toast({ title: "Selfie Required", description: "Please upload a profile selfie to create your account.", variant: "destructive" });
      return;
    }

    if (checkingFace) {
      toast({ title: "Please Wait", description: "Verifying your photo...", variant: "destructive" });
      return;
    }

    if (faceDuplicateError) {
      toast({ title: "Duplicate Detected", description: faceDuplicateError, variant: "destructive" });
      return;
    }

    if (!faceChecked) {
      toast({ title: "Verification Needed", description: "Please wait for photo verification to complete.", variant: "destructive" });
      return;
    }

    if (!form.fullName || !form.email || !form.password || !form.gender || !form.pincode || !form.city) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    if (form.password.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setLoading(true);

    // Sign up the user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: form.fullName,
          phone: form.phone,
          gender: form.gender,
          pincode: form.pincode,
          city: form.city,
          state: form.state,
        },
      },
    });

    if (signUpError) {
      setLoading(false);
      toast({ title: "Sign Up Failed", description: signUpError.message, variant: "destructive" });
      return;
    }

    const userId = signUpData.user?.id;

    // Upload avatar if we have the user
    if (userId && form.photo) {
      const fileExt = form.photo.name.split(".").pop() || "jpg";
      const filePath = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, form.photo, {
        upsert: true,
        contentType: form.photo.type,
      });

      if (uploadError) {
        console.error("Avatar upload error:", uploadError);
        // Don't block signup, avatar can be uploaded later
      } else {
        // Get public URL and update profile
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
        if (urlData?.publicUrl) {
          await supabase.from("profiles").update({ 
            avatar_url: urlData.publicUrl,
            phone: form.phone,
            gender: form.gender,
            pincode: form.pincode,
            city: form.city,
            state: form.state,
          }).eq("user_id", userId);
        }
      }
    }

    setLoading(false);

    toast({
      title: "Account Created!",
      description: "Please check your email to verify your account, then sign in.",
    });
    navigate("/signin");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-md py-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Create Account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Join Bonded and build your intentional circle.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photo - MANDATORY */}
          <div className="flex flex-col items-center">
            <label className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted transition-colors hover:border-accent">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-6 w-6 text-muted-foreground group-hover:text-accent transition-colors" />
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Upload profile selfie <span className="text-destructive">*</span>
            </p>

            {checkingFace && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Verifying your photo...
              </div>
            )}

            {faceChecked && !faceDuplicateError && (
              <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                ✓ Photo verified
              </div>
            )}

            {faceDuplicateError && (
              <div className="mt-2 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{faceDuplicateError}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
            <Input id="fullName" placeholder="Your full name" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" type="tel" placeholder="+91 9876543210" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
            <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
            <Input id="password" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label>Gender <span className="text-destructive">*</span></Label>
            <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
              <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pincode">Pincode <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input
                id="pincode"
                placeholder="Enter 6-digit pincode"
                maxLength={6}
                value={form.pincode}
                onChange={(e) => handlePincodeChange(e.target.value.replace(/\D/g, ""))}
              />
              {pincodeLoading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.city} readOnly className="bg-muted" placeholder="Auto-filled" />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={form.state} readOnly className="bg-muted" placeholder="Auto-filled" />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || checkingFace || !!faceDuplicateError}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/signin" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
