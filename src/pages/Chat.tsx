import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft, MessageCircle, Smile, Phone, Video } from "lucide-react";
import { useWebRTC } from "@/hooks/useWebRTC";
import CallUI from "@/components/CallUI";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface ChatContact {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  category: string;
}

const Chat = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedUserId = searchParams.get("with");
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load active connections as chat contacts
  useEffect(() => {
    if (!user) return;
    const fetchContacts = async () => {
      const { data: connections } = await supabase
        .from("connections")
        .select("connected_user_id, category, user_id, status")
        .eq("is_active", true)
        .eq("status", "accepted" as any)
        .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`);

      if (!connections?.length) return;

      const otherUserIds = connections.map((c: any) =>
        c.user_id === user.id ? c.connected_user_id : c.user_id
      );
      const categoryMap: Record<string, string> = {};
      connections.forEach((c: any) => {
        const otherId = c.user_id === user.id ? c.connected_user_id : c.user_id;
        categoryMap[otherId] = c.category;
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", otherUserIds);

      if (profiles) {
        setContacts(
          profiles.map((p: any) => ({
            ...p,
            category: categoryMap[p.user_id] || "friend",
          }))
        );
      }
    };
    fetchContacts();
  }, [user]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!user || !selectedUserId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (data) setMessages(data as Message[]);

      // Mark unread messages as read
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", selectedUserId)
        .eq("receiver_id", user.id)
        .eq("is_read", false);
    };
    fetchMessages();
  }, [user, selectedUserId]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !selectedUserId) return;

    const channel = supabase
      .channel(`chat-${[user.id, selectedUserId].sort().join("-")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === user.id && msg.receiver_id === selectedUserId) ||
            (msg.sender_id === selectedUserId && msg.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, msg]);
            // Mark as read if we're the receiver
            if (msg.receiver_id === user.id) {
              supabase.from("messages").update({ is_read: true }).eq("id", msg.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedUserId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !selectedUserId || sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: selectedUserId,
      content: newMessage.trim(),
    });
    if (!error) setNewMessage("");
    setSending(false);
  };

  const selectedContact = contacts.find((c) => c.user_id === selectedUserId);

  const webrtc = useWebRTC({
    userId: user?.id || "",
    remoteUserId: selectedUserId || "",
  });

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const categoryEmoji: Record<string, string> = {
    love: "❤️",
    friend: "👥",
    family: "🏠",
  };

  if (!user) return null;

  return (
    <Layout isAdmin={false}>
      <div className="container max-w-4xl py-4">
        <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-lg border bg-card">
          {/* Contacts sidebar */}
          <div
            className={cn(
              "w-full border-r md:w-72 md:block",
              selectedUserId ? "hidden" : "block"
            )}
          >
            <div className="border-b p-4">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-accent" />
                Chats
              </h2>
            </div>
            <ScrollArea className="h-[calc(100%-4rem)]">
              {contacts.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No connections yet.
                  <br />
                  <Link to="/dashboard" className="text-accent hover:underline">
                    Add connections
                  </Link>{" "}
                  to start chatting.
                </div>
              ) : (
                contacts.map((contact) => (
                  <button
                    key={contact.user_id}
                    onClick={() => setSearchParams({ with: contact.user_id })}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      selectedUserId === contact.user_id && "bg-muted"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contact.avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary text-xs">
                        {getInitials(contact.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{contact.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {categoryEmoji[contact.category]} {contact.category}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Chat area */}
          <div
            className={cn(
              "flex flex-1 flex-col",
              !selectedUserId ? "hidden md:flex" : "flex"
            )}
          >
            {selectedContact ? (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 border-b px-4 py-3">
                  <button
                    onClick={() => setSearchParams({})}
                    className="md:hidden rounded p-1 hover:bg-muted"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={selectedContact.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary text-xs">
                      {getInitials(selectedContact.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{selectedContact.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {categoryEmoji[selectedContact.category]} {selectedContact.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-accent"
                      onClick={() => webrtc.startCall("voice")}
                      disabled={webrtc.callState !== "idle"}
                    >
                      <Phone className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-accent"
                      onClick={() => webrtc.startCall("video")}
                      disabled={webrtc.callState !== "idle"}
                    >
                      <Video className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-12">
                        No messages yet. Say hello! 👋
                      </p>
                    )}
                    {messages.map((msg) => {
                      const isMine = msg.sender_id === user.id;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn("flex", isMine ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                              isMine
                                ? "bg-accent text-accent-foreground rounded-br-md"
                                : "bg-muted text-foreground rounded-bl-md"
                            )}
                          >
                            {msg.content}
                            <div
                              className={cn(
                                "mt-1 text-[10px]",
                                isMine ? "text-accent-foreground/60" : "text-muted-foreground"
                              )}
                            >
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="border-t p-3">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex gap-2 items-center"
                  >
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" size="icon" variant="ghost" className="shrink-0">
                          <Smile className="h-5 w-5 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent side="top" align="start" className="w-auto p-0 border-none shadow-xl">
                        <Picker
                          data={data}
                          onEmojiSelect={(emoji: any) => setNewMessage((prev) => prev + emoji.native)}
                          theme="auto"
                          previewPosition="none"
                          skinTonePosition="search"
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      variant="hero"
                      disabled={!newMessage.trim() || sending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="mx-auto h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">Select a connection to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;
