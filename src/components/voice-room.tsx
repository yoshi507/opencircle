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
  Maximize2,
  Minimize2,
  Volume2,
} from "lucide-react";

type ParticipantInfo = {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  hasCamera: boolean;
  hasScreen: boolean;
  isLocal: boolean;
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
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);
  const roomRef = useRef<any>(null);
  const videoEls = useRef<Map<string, HTMLVideoElement>>(new Map());
  const screenSupport =
    typeof navigator !== "undefined" &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);

  const refreshParticipants = useCallback((room: any) => {
    const list: ParticipantInfo[] = [];

    const push = (p: any, isLocal: boolean) => {
      const videoPubs = Array.from(p.videoTrackPublications?.values?.() || []);
      const hasCamera = videoPubs.some(
        (pub: any) =>
          pub.track &&
          !pub.isMuted &&
          pub.source !== "screen_share" &&
          pub.source !== "screen_share_audio"
      );
      const hasScreen = videoPubs.some(
        (pub: any) =>
          pub.track &&
          !pub.isMuted &&
          (pub.source === "screen_share" || pub.source === "screen_share_audio")
      );
      // Fallback: any video if source not available
      const anyVideo = videoPubs.some((pub: any) => pub.track && !pub.isMuted);
      list.push({
        identity: p.identity,
        name: p.name || p.identity,
        isSpeaking: p.isSpeaking,
        isMuted: isLocal
          ? !p.isMicrophoneEnabled
          : Array.from(p.audioTrackPublications?.values?.() || []).every(
              (pub: any) => pub.isMuted || !pub.track
            ),
        hasCamera: isLocal
          ? !!p.isCameraEnabled
          : hasCamera || (anyVideo && !hasScreen),
        hasScreen: isLocal ? !!p.isScreenShareEnabled : hasScreen,
        isLocal,
      });
    };

    if (room.localParticipant) push(room.localParticipant, true);
    room.remoteParticipants?.forEach((p: any) => push(p, false));
    setParticipants(list);
  }, []);

  function attachTracks(room: any) {
    const attach = (participant: any, isLocal: boolean) => {
      const el = videoEls.current.get(participant.identity);
      if (!el) return;
      participant.videoTrackPublications?.forEach((pub: any) => {
        if (pub.track && !pub.isMuted) {
          pub.track.attach(el);
        }
      });
    };
    if (room.localParticipant) attach(room.localParticipant, true);
    room.remoteParticipants?.forEach((p: any) => attach(p, false));
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

      const onChange = () => {
        refreshParticipants(room);
        setTimeout(() => attachTracks(room), 80);
      };

      room.on(RoomEvent.ParticipantConnected, onChange);
      room.on(RoomEvent.ParticipantDisconnected, onChange);
      room.on(RoomEvent.TrackMuted, onChange);
      room.on(RoomEvent.TrackUnmuted, onChange);
      room.on(RoomEvent.ActiveSpeakersChanged, onChange);
      room.on(RoomEvent.TrackSubscribed, onChange);
      room.on(RoomEvent.LocalTrackPublished, onChange);
      room.on(RoomEvent.LocalTrackUnpublished, onChange);
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
        setFullscreenId(null);
        roomRef.current = null;
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
    setFullscreenId(null);
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
      if (next && screenOn) {
        await roomRef.current.localParticipant.setScreenShareEnabled(false);
        setScreenOn(false);
      }
      await roomRef.current.localParticipant.setCameraEnabled(next);
      setCameraOn(next);
      refreshParticipants(roomRef.current);
      setTimeout(() => attachTracks(roomRef.current), 80);
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
    if (!screenSupport) {
      setError(
        "Screen share is not supported on this device/browser. Use desktop Chrome, Edge, or Firefox."
      );
      return;
    }
    try {
      const next = !screenOn;
      if (next && cameraOn) {
        await roomRef.current.localParticipant.setCameraEnabled(false);
        setCameraOn(false);
      }
      await roomRef.current.localParticipant.setScreenShareEnabled(next);
      setScreenOn(next);
      refreshParticipants(roomRef.current);
      setTimeout(() => attachTracks(roomRef.current), 80);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/denied|abort|cancel|NotAllowed/i.test(msg)) return;
      if (/getDisplayMedia|not supported|undefined/i.test(msg)) {
        setError(
          "Screen share is not supported on this device/browser. Use desktop Chrome, Edge, or Firefox."
        );
        return;
      }
      setError(msg || "Could not start screen share.");
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
    <div className="flex-1 flex flex-col min-h-0 bg-[#0c0c0e]">
      {/* Tile grid */}
      {inCall ? (
        <div className="flex-1 overflow-y-auto p-3">
          <div
            className={`grid gap-3 h-full content-start ${
              participants.length <= 1
                ? "grid-cols-1 max-w-lg mx-auto"
                : participants.length === 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {participants.map((p) => {
              const showVideo = p.hasCamera || p.hasScreen;
              const isFs = fullscreenId === p.identity;
              return (
                <div
                  key={p.identity}
                  className={`relative rounded-2xl overflow-hidden bg-card border aspect-square sm:aspect-video flex items-center justify-center ${
                    p.isSpeaking ? "border-primary ring-2 ring-primary/40" : "border-border"
                  } ${
                    isFs
                      ? "fixed inset-2 z-50 aspect-auto sm:aspect-auto"
                      : ""
                  }`}
                >
                  {showVideo ? (
                    <video
                      ref={(el) => {
                        if (el) {
                          videoEls.current.set(p.identity, el);
                          if (roomRef.current) attachTracks(roomRef.current);
                        }
                      }}
                      autoPlay
                      playsInline
                      muted={p.isLocal}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-20 h-20 rounded-full bg-primary/20 text-primary flex items-center justify-center text-3xl font-bold">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                  )}

                  {/* Overlay name + icons */}
                  <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/70 to-transparent flex items-center gap-2">
                    <span className="text-xs text-white font-medium truncate flex-1">
                      {p.isLocal ? `${p.name} (you)` : p.name}
                    </span>
                    {p.isMuted && <MicOff className="w-3.5 h-3.5 text-white/80" />}
                    {p.hasScreen && (
                      <button
                        onClick={() =>
                          setFullscreenId(isFs ? null : p.identity)
                        }
                        className="p-1 rounded bg-black/50 text-white hover:bg-black/70"
                        title={isFs ? "Exit fullscreen" : "Fullscreen"}
                      >
                        {isFs ? (
                          <Minimize2 className="w-3.5 h-3.5" />
                        ) : (
                          <Maximize2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            <Volume2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">{channelName}</h2>
          <p className="text-sm text-muted-foreground">Voice & video channel</p>
          {error && (
            <div className="max-w-md text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-xl text-center">
              {error}
            </div>
          )}
          {status === "connecting" ? (
            <button
              disabled
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold opacity-70 flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting…
            </button>
          ) : (
            <button
              onClick={handleJoin}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
            >
              Join call
            </button>
          )}
        </div>
      )}

      {/* Controls bar */}
      {inCall && (
        <div className="shrink-0 border-t border-border bg-card/80 backdrop-blur p-3 flex flex-col items-center gap-2">
          {status === "reconnecting" && (
            <p className="text-xs text-amber-400">Reconnecting…</p>
          )}
          {error && (
            <p className="text-xs text-destructive text-center max-w-sm">{error}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              onClick={toggleMute}
              className={`p-3.5 rounded-full ${
                muted
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-background border border-border hover:bg-accent"
              }`}
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleCamera}
              className={`p-3.5 rounded-full ${
                cameraOn
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border border-border hover:bg-accent"
              }`}
              title={cameraOn ? "Stop camera" : "Camera"}
            >
              {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleScreen}
              disabled={!screenSupport}
              className={`p-3.5 rounded-full ${
                screenOn
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border border-border hover:bg-accent"
              } disabled:opacity-40`}
              title={
                screenSupport
                  ? screenOn
                    ? "Stop sharing"
                    : "Share screen"
                  : "Screen share not supported on this device"
              }
            >
              {screenOn ? (
                <MonitorOff className="w-5 h-5" />
              ) : (
                <Monitor className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={handleLeave}
              className="p-3.5 rounded-full bg-destructive text-destructive-foreground"
              title="Leave"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
