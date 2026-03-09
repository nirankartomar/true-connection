import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import type { CallState, CallType } from "@/hooks/useWebRTC";
import { cn } from "@/lib/utils";

interface CallUIProps {
  callState: CallState;
  callType: CallType;
  isMuted: boolean;
  isVideoOff: boolean;
  callDuration: number;
  contactName: string;
  contactAvatar: string | null;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

export default function CallUI({
  callState,
  callType,
  isMuted,
  isVideoOff,
  callDuration,
  contactName,
  contactAvatar,
  localVideoRef,
  remoteVideoRef,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleVideo,
}: CallUIProps) {
  if (callState === "idle") return null;

  const isVideo = callType === "video";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
      >
        <div className="relative flex flex-col items-center gap-6 w-full max-w-lg mx-4">
          {/* Video views */}
          {isVideo && (callState === "connected") && (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-muted">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 right-3 w-28 aspect-video rounded-lg overflow-hidden border-2 border-background shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn("w-full h-full object-cover", isVideoOff && "hidden")}
                />
                {isVideoOff && (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <VideoOff className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Avatar & info (voice call or non-connected video) */}
          {(!isVideo || callState !== "connected") && (
            <div className="flex flex-col items-center gap-4">
              <motion.div
                animate={callState === "ringing" ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Avatar className="h-24 w-24 border-4 border-accent/20">
                  <AvatarImage src={contactAvatar || undefined} />
                  <AvatarFallback className="bg-secondary text-xl">
                    {getInitials(contactName)}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              <div className="text-center">
                <h3 className="text-xl font-display font-semibold">{contactName}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {callState === "calling" && "Calling..."}
                  {callState === "ringing" && "Incoming call..."}
                  {callState === "connected" && formatDuration(callDuration)}
                  {callState === "ended" && "Call ended"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                  {callType} call
                </p>
              </div>
            </div>
          )}

          {/* Connected info overlay for video */}
          {isVideo && callState === "connected" && (
            <div className="text-center">
              <p className="text-sm font-medium">{contactName}</p>
              <p className="text-xs text-muted-foreground">{formatDuration(callDuration)}</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Ringing: Accept / Reject */}
            {callState === "ringing" && (
              <>
                <Button
                  onClick={onReject}
                  size="lg"
                  variant="destructive"
                  className="rounded-full h-14 w-14"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
                <Button
                  onClick={onAccept}
                  size="lg"
                  className="rounded-full h-14 w-14 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Phone className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Calling or Connected: Mute, Video toggle, End */}
            {(callState === "calling" || callState === "connected") && (
              <>
                <Button
                  onClick={onToggleMute}
                  size="lg"
                  variant={isMuted ? "destructive" : "secondary"}
                  className="rounded-full h-12 w-12"
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                {isVideo && (
                  <Button
                    onClick={onToggleVideo}
                    size="lg"
                    variant={isVideoOff ? "destructive" : "secondary"}
                    className="rounded-full h-12 w-12"
                  >
                    {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </Button>
                )}
                <Button
                  onClick={onEnd}
                  size="lg"
                  variant="destructive"
                  className="rounded-full h-14 w-14"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>

          {/* Hidden video elements for voice calls */}
          {!isVideo && (
            <>
              <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
              <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
