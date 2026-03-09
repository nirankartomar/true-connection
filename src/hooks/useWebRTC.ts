import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export type CallState = "idle" | "calling" | "ringing" | "connected" | "ended";
export type CallType = "voice" | "video";

interface UseWebRTCProps {
  userId: string;
  remoteUserId: string;
  onCallEnded?: () => void;
}

export function useWebRTC({ userId, remoteUserId, onCallEnded }: UseWebRTCProps) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<CallType>("voice");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const cleanup = useCallback(() => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach((t) => t.stop());
      localStream.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  const sendSignal = useCallback(
    async (signalType: string, signalData: any, type: CallType) => {
      await supabase.from("call_signals").insert({
        caller_id: userId,
        receiver_id: remoteUserId,
        signal_type: signalType,
        signal_data: signalData,
        call_type: type,
      } as any);
    },
    [userId, remoteUserId]
  );

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("ice-candidate", { candidate: event.candidate }, callType);
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallState("connected");
        durationInterval.current = setInterval(() => {
          setCallDuration((d) => d + 1);
        }, 1000);
      }
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        endCall();
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [sendSignal, callType]);

  const startCall = useCallback(
    async (type: CallType) => {
      try {
        setCallType(type);
        setCallState("calling");

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        });
        localStream.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = createPeerConnection();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await sendSignal("call-start", { offer, callType: type }, type);
      } catch (err) {
        console.error("Failed to start call:", err);
        setCallState("idle");
        cleanup();
      }
    },
    [createPeerConnection, sendSignal, cleanup]
  );

  const answerCall = useCallback(
    async (offer: RTCSessionDescriptionInit, type: CallType) => {
      try {
        setCallType(type);
        setCallState("connected");

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        });
        localStream.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = createPeerConnection();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await sendSignal("answer", { answer }, type);
      } catch (err) {
        console.error("Failed to answer call:", err);
        setCallState("idle");
        cleanup();
      }
    },
    [createPeerConnection, sendSignal, cleanup]
  );

  const endCall = useCallback(() => {
    sendSignal("call-end", {}, callType);
    cleanup();
    setCallState("idle");
    onCallEnded?.();
  }, [sendSignal, cleanup, callType, onCallEnded]);

  const rejectCall = useCallback(() => {
    sendSignal("call-reject", {}, callType);
    cleanup();
    setCallState("idle");
  }, [sendSignal, cleanup, callType]);

  const toggleMute = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  // Listen for incoming signals
  useEffect(() => {
    if (!userId || !remoteUserId) return;

    const channel = supabase
      .channel(`calls-${[userId, remoteUserId].sort().join("-")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_signals" },
        async (payload) => {
          const signal = payload.new as any;

          // Only process signals meant for us
          if (signal.receiver_id !== userId) return;
          if (signal.caller_id !== remoteUserId) return;

          switch (signal.signal_type) {
            case "call-start":
              if (callState === "idle") {
                setCallType(signal.signal_data.callType || "voice");
                setCallState("ringing");
                // Store the offer for when user accepts
                (window as any).__pendingOffer = signal.signal_data.offer;
                (window as any).__pendingCallType = signal.signal_data.callType || "voice";
              }
              break;

            case "answer":
              if (peerConnection.current) {
                await peerConnection.current.setRemoteDescription(
                  new RTCSessionDescription(signal.signal_data.answer)
                );
              }
              break;

            case "ice-candidate":
              if (peerConnection.current && signal.signal_data.candidate) {
                try {
                  await peerConnection.current.addIceCandidate(
                    new RTCIceCandidate(signal.signal_data.candidate)
                  );
                } catch (e) {
                  console.error("Error adding ICE candidate:", e);
                }
              }
              break;

            case "call-end":
            case "call-reject":
              cleanup();
              setCallState("idle");
              onCallEnded?.();
              break;
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, remoteUserId, callState, cleanup, onCallEnded]);

  const acceptCall = useCallback(() => {
    const offer = (window as any).__pendingOffer;
    const type = (window as any).__pendingCallType || "voice";
    if (offer) {
      answerCall(offer, type);
      delete (window as any).__pendingOffer;
      delete (window as any).__pendingCallType;
    }
  }, [answerCall]);

  return {
    callState,
    callType,
    isMuted,
    isVideoOff,
    callDuration,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    endCall,
    rejectCall,
    toggleMute,
    toggleVideo,
  };
}
