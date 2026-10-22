"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getVoiceToken } from "@/app/actions/voice";
import {
  Mic,
  MicOff,
  PhoneOff,
  Loader2,
  Users,
  Volume2,
} from "lucide-react";

type ParticipantInfo = {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
};

export function VoiceRoom({
  channelId,
  channelName,
}: {
  channelId: string;
  channelName: string;
}) {
  const [status, setStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const roomRef = useRef<any>(null);
  const localAudioRef = useRef<any>(null);

  const refreshParticipants = useCallback((room: any) => {
    const list: ParticipantInfo[] = [];
    // Local
    if (room.localParticipant) {
      const lp = room.localParticipant;
      list.push({
        identity: lp.identity,
        name: lp.name || lp.identity,
        isSpeaking: lp.isSpeaking,
        isMuted: !lp.isMicrophoneEnabled,
      });
    }
    // Remote
    room.remoteParticipants?.forEach((p: any) => {
      list.push({
        identity: p.identity,
        name: p.name || p.identity,
        isSpeaking: p.isSpeaking,
        isMuted: Array.from(p.audioTrackPublications?.values?.() || []).every(
          (pub: any) => pub.isMuted || !pub.track
        ),
      });
    });
    setParticipants(list);
  }, []);

  async function handleJoin() {
    setStatus("connecting");
    setError(null);

    const result = await getVoiceToken(channelId);
    if (result.error || !result.token || !result.url) {
      setError(result.error || "Failed to get voice token.");
      setStatus("error");
      return;
    }

    try {
      const { Room, RoomEvent, Track } = await import("livekit-client");

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      room.on(RoomEvent.ParticipantConnected, () => refreshParticipants(room));
      room.on(RoomEvent.ParticipantDisconnected, () =>
        refreshParticipants(room)
      );
      room.on(RoomEvent.TrackSubscribed, () => refreshParticipants(room));
      room.on(RoomEvent.TrackMuted, () => refreshParticipants(room));
      room.on(RoomEvent.TrackUnmuted, () => refreshParticipants(room));
      room.on(RoomEvent.ActiveSpeakersChanged, () =>
        refreshParticipants(room)
      );
      room.on(RoomEvent.Disconnected, () => {
        setStatus("idle");
        setParticipants([]);
        roomRef.current = null;
      });

      await room.connect(result.url, result.token);

      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true);
      localAudioRef.current = true;

      refreshParticipants(room);
      setStatus("connected");
      setMuted(false);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to connect to voice room."
      );
      setStatus("error");
      roomRef.current = null;
    }
  }

  async function handleLeave() {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    setStatus("idle");
    setParticipants([]);
    setMuted(false);
  }

  async function toggleMute() {
    if (!roomRef.current) return;
    const next = !muted;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
    refreshParticipants(roomRef.current);
  }

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mx-auto mb-4">
          <Volume2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-1">{channelName}</h2>
        <p className="text-sm text-muted-foreground">Voice channel</p>
      </div>

      {error && (
        <div className="max-w-md text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-xl text-center">
          {error}
        </div>
      )}

      {status === "connected" && participants.length > 0 && (
        <div className="w-full max-w-sm space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider px-1">
            <Users className="w-3.5 h-3.5" />
            In call — {participants.length}
          </div>
          {participants.map((p) => (
            <div
              key={p.identity}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${
                p.isSpeaking
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card"
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 text-sm font-medium truncate">{p.name}</span>
              {p.isMuted ? (
                <MicOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Mic className="w-4 h-4 text-primary" />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        {status === "idle" || status === "error" ? (
          <button
            onClick={handleJoin}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Join voice
          </button>
        ) : status === "connecting" ? (
          <button
            disabled
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold opacity-70 flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting…
          </button>
        ) : (
          <>
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-colors ${
                muted
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-card border border-border hover:bg-accent"
              }`}
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={handleLeave}
              className="p-4 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              title="Leave"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
