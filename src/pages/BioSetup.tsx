import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const BIO_SECTIONS = [
  { key: "whoWasI", dbKey: "bio_who_was_i", title: "Who was I", placeholder: "Reflect on who you were — your past self, beliefs, and journey...", maxLength: 300 },
  { key: "whoIAm", dbKey: "bio_who_i_am", title: "Who I am", placeholder: "Describe who you are today — your values, passions, and identity...", maxLength: 300 },
  { key: "whoWillIBe", dbKey: "bio_who_will_i_be", title: "Who will I be", placeholder: "Envision your future self — your aspirations and the person you're becoming...", maxLength: 300 },
  { key: "whatIAmDoing", dbKey: "bio_what_i_am_doing", title: "What I am doing to become who I will be", placeholder: "Share the actions and habits you're building to reach your future self...", maxLength: 400 },
] as const;

type BioKey = (typeof BIO_SECTIONS)[number]["key"];

const BioSetup = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [bio, setBio] = useState<Record<BioKey, string>>({
    whoWasI: "",
    whoIAm: "",
    whoWillIBe: "",
    whatIAmDoing: "",
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load existing bio data
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("bio_who_was_i, bio_who_i_am, bio_who_will_i_be, bio_what_i_am_doing")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setBio({
          whoWasI: data.bio_who_was_i || "",
          whoIAm: data.bio_who_i_am || "",
          whoWillIBe: data.bio_who_will_i_be || "",
          whatIAmDoing: data.bio_what_i_am_doing || "",
        });
      }
      setLoaded(true);
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/signin");
  }, [user, authLoading]);

  const current = BIO_SECTIONS[currentStep];
  const isLast = currentStep === BIO_SECTIONS.length - 1;
  const value = bio[current.key];
  const isValid = value.trim().length >= 20;

  const handleNext = async () => {
    if (!isValid) {
      toast({ title: "Too Short", description: "Please write at least 20 characters.", variant: "destructive" });
      return;
    }
    if (isLast) {
      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          bio_who_was_i: bio.whoWasI.trim(),
          bio_who_i_am: bio.whoIAm.trim(),
          bio_who_will_i_be: bio.whoWillIBe.trim(),
          bio_what_i_am_doing: bio.whatIAmDoing.trim(),
        })
        .eq("user_id", user!.id);
      setSaving(false);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Bio Complete", description: "Your profile is now active!" });
      navigate("/profile");
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  if (authLoading || !loaded) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-lg px-6 py-12">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold">Complete Your Bio</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Step {currentStep + 1} of {BIO_SECTIONS.length} — Take a moment to reflect.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8 flex gap-2">
          {BIO_SECTIONS.map((s, i) => (
            <div
              key={s.key}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < currentStep ? "bg-accent" : i === currentStep ? "bg-accent/60" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <motion.div
          key={current.key}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">{current.title}</h2>
            {bio[current.key].trim().length >= 20 && (
              <CheckCircle2 className="h-5 w-5 text-accent" />
            )}
          </div>
          <Textarea
            placeholder={current.placeholder}
            maxLength={current.maxLength}
            rows={6}
            value={value}
            onChange={(e) => setBio((b) => ({ ...b, [current.key]: e.target.value }))}
            className="resize-none"
          />
          <div className="mt-2 text-right text-xs text-muted-foreground">
            {value.length} / {current.maxLength}
          </div>
        </motion.div>

        <div className="mt-6 flex gap-3">
          {currentStep > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep((s) => s - 1)}>
              Back
            </Button>
          )}
          <Button className="flex-1" onClick={handleNext} disabled={!isValid || saving}>
            {saving ? "Saving..." : isLast ? "Activate Profile" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BioSetup;
