"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getVoiceToken } from "@/app/actions/voice";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
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
  hasVideo: boolean;
};

export function VoiceRoom({
  channelId,
  channelName,
}: {
  channelId: string;
  channelName: string;
}) {
  const [status, setStatus] = useState<
    "idle" | "connecting" | "connected" | "reconnecting" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const roomRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  const refreshParticipants = useCallback((room: any) => {
    const list: ParticipantInfo[] = [];
    if (room.localParticipant) {
      const lp = room.localParticipant;
      list.push({
        identity: lp.identity,
        name: lp.name || lp.identity,
        isSpeaking: lp.isSpeaking,
        isMuted: !lp.isMicrophoneEnabled,
        hasVideo: lp.isCameraEnabled || lp.isScreenShareEnabled,
      });
    }
    room.remoteParticipants?.forEach((p: any) => {
      const pubs = Array.from(p.videoTrackPublications?.values?.() || []);
      list.push({
        identity: p.identity,
        name: p.name || p.identity,
        isSpeaking: p.isSpeaking,
        isMuted: Array.from(p.audioTrackPublications?.values?.() || []).every(
          (pub: any) => pub.isMuted || !pub.track
        ),
        hasVideo: pubs.some((pub: any) => pub.track && !pub.isMuted),
      });
    });
    setParticipants(list);
  }, []);

  function attachVideoTrack(track: any, identity: string, isLocal: boolean) {
    if (!track) return;
    if (isLocal && localVideoRef.current) {
      track.attach(localVideoRef.current);
    } else {
      const el = remoteVideosRef.current.get(identity);
      if (el) track.attach(el);
    }
  }

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
      room.on(RoomEvent.TrackMuted, () => refreshParticipants(room));
      room.on(RoomEvent.TrackUnmuted, () => refreshParticipants(room));
      room.on(RoomEvent.ActiveSpeakersChanged, () =>
        refreshParticipants(room)
      );
      room.on(RoomEvent.Reconnecting, () => setStatus("reconnecting"));
      room.on(RoomEvent.Reconnected, () => {
        setStatus("connected");
        setError(null);
      });
      room.on(RoomEvent.Disconnected, () => {
        setStatus("idle");
        setParticipants([]);
        setCameraOn(false);
        setScreenOn(false);
        setMuted(false);
        roomRef.current = null;
      });

      room.on(RoomEvent.TrackSubscribed, (track: any, _pub: any, participant: any) => {
        if (track.kind === Track.Kind.Video) {
          // Attach after a tick so the video element exists
          setTimeout(() => attachVideoTrack(track, participant.identity, false), 50);
        }
        refreshParticipants(room);
      });

      room.on(RoomEvent.LocalTrackPublished, (pub: any) => {
        if (pub.track && pub.track.kind === Track.Kind.Video) {
          setTimeout(() => attachVideoTrack(pub.track, room.localParticipant.identity, true), 50);
        }
        refreshParticipants(room);
      });

      await room.connect(result.url, result.token);
      await room.localParticipant.setMicrophoneEnabled(true);

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
    setCameraOn(false);
    setScreenOn(false);
  }

  async function toggleMute() {
    if (!roomRef.current) return;
    const next = !muted;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
    refreshParticipants(roomRef.current);
  }

  async function toggleCamera() {
    if (!roomRef.current) return;
    try {
      const next = !cameraOn;
      // Turn off screen share if enabling camera
      if (next && screenOn) {
        await roomRef.current.localParticipant.setScreenShareEnabled(false);
        setScreenOn(false);
      }
      await roomRef.current.localParticipant.setCameraEnabled(next);
      setCameraOn(next);
      refreshParticipants(roomRef.current);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not access camera. Check browser permissions."
      );
    }
  }

  async function toggleScreen() {
    if (!roomRef.current) return;
    try {
      const next = !screenOn;
      if (next && cameraOn) {
        await roomRef.current.localParticipant.setCameraEnabled(false);
        setCameraOn(false);
      }
      await roomRef.current.localParticipant.setScreenShareEnabled(next);
      setScreenOn(next);
      refreshParticipants(roomRef.current);
    } catch (err) {
      // User cancelled the browser share dialog — not a hard error
      if (err instanceof Error && err.message.toLowerCase().includes("denied")) {
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : "Could not start screen share."
      );
    }
  }

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, []);

  const inCall = status === "connected" || status === "reconnecting";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Video grid */}
      {inCall && (cameraOn || screenOn || participants.some((p) => p.hasVideo)) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 max-h-[40vh] overflow-y-auto">
          {(cameraOn || screenOn) && (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
              <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
                You{screenOn ? " (screen)" : ""}
              </span>
            </div>
          )}
          {participants
            .filter((p) => p.hasVideo && p.identity !== roomRef.current?.localParticipant?.identity)
            .map((p) => (
              <div
                key={p.identity}
                className="relative rounded-xl overflow-hidden bg-black aspect-video"
              >
                <video
                  ref={(el) => {
                    if (el) remoteVideosRef.current.set(p.identity, el);
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
                  {p.name}
                </span>
              </div>
            ))}
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mx-auto mb-4">
            <Volume2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-1">{channelName}</h2>
          <p className="text-sm text-muted-foreground">
            {status === "reconnecting"
              ? "Reconnecting…"
              : status === "connected"
                ? "Connected"
                : "Voice & video channel"}
          </p>
        </div>

        {error && (
          <div className="max-w-md text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-xl text-center">
            {error}
          </div>
        )}

        {inCall && participants.length > 0 && (
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
                {p.hasVideo && <Video className="w-4 h-4 text-primary" />}
                {p.isMuted ? (
                  <MicOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Mic className="w-4 h-4 text-primary" />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap justify-center">
          {status === "idle" || status === "error" ? (
            <button
              onClick={handleJoin}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Join call
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
                {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleCamera}
                className={`p-4 rounded-full transition-colors ${
                  cameraOn
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border hover:bg-accent"
                }`}
                title={cameraOn ? "Stop camera" : "Start camera"}
              >
                {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleScreen}
                className={`p-4 rounded-full transition-colors ${
                  screenOn
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border hover:bg-accent"
                }`}
                title={screenOn ? "Stop sharing" : "Share screen"}
              >
                {screenOn ? (
                  <MonitorOff className="w-5 h-5" />
                ) : (
                  <Monitor className="w-5 h-5" />
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
    </div>
  );
}
