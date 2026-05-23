import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaCommentDots,
  FaMicrophone,
  FaMicrophoneSlash,
  FaPaperPlane,
  FaPhone,
  FaPhoneSlash,
  FaTimes,
  FaVideo,
  FaVideoSlash,
} from 'react-icons/fa';
import { buildRtcConfiguration } from '../../utils/rtc';

export type CommunicationMode = 'chat' | 'audio' | 'video';
type CallMode = 'none' | 'audio' | 'video';
type CallStatus = 'idle' | 'connecting' | 'live' | 'error';
type PanelRole = 'school' | 'tutor' | 'student';
type ActorRole = PanelRole | 'student';

export type IncomingCallInvite = {
  callId: string;
  fromSessionId: string;
  mode: Exclude<CallMode, 'none'>;
  senderLabel?: string;
  senderRole?: ActorRole;
};

type ChatMessage = {
  id: string;
  sender: ActorRole;
  text: string;
  sentAt: string;
};

type PeerState = {
  role: ActorRole;
  label: string;
  ready: boolean;
  mode: Exclude<CallMode, 'none'> | null;
};

export type CommunicationStudent = {
  id: number;
  name: string;
  phone: string;
  avatar?: string;
};

type StudentCommunicationPanelProps = {
  student: CommunicationStudent;
  role: PanelRole;
  initialMode: CommunicationMode;
  onClose: () => void;
  onNotice?: (notice: string) => void;
  apiBaseUrl?: string;
  initialIncomingCall?: IncomingCallInvite | null;
};

const CHAT_STORAGE_KEY = 'edamaa_student_chat_threads_v1';
const SIGNAL_CHANNEL = 'signal:student-communication';
const RTC_CONFIGURATION: RTCConfiguration = buildRtcConfiguration();

const loadChatThreads = (): Record<number, ChatMessage[]> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as Record<number, ChatMessage[]>;
  } catch {
    return {};
  }
};

const formatTime = (isoDate: string) =>
  new Date(isoDate).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

const formatCallDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const remaining = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
};

const buildId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const isActorRole = (value: unknown): value is ActorRole =>
  value === 'school' || value === 'tutor' || value === 'student';

const roleToLabel = (value: PanelRole) => {
  if (value === 'tutor') {
    return 'Tutor';
  }
  if (value === 'school') {
    return 'School';
  }
  return 'Student';
};

const shouldCreateOffer = (localSessionId: string, remoteSessionId: string) =>
  localSessionId.localeCompare(remoteSessionId) > 0;

export default function StudentCommunicationPanel({
  student,
  role,
  initialMode,
  onClose,
  onNotice,
  apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, ''),
  initialIncomingCall = null,
}: StudentCommunicationPanelProps) {
  const [chatThreads, setChatThreads] = useState<Record<number, ChatMessage[]>>(() => loadChatThreads());
  const [chatInput, setChatInput] = useState('');
  const [callMode, setCallMode] = useState<CallMode>(initialMode === 'chat' ? 'none' : initialMode);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callError, setCallError] = useState('');
  const [callStartTime, setCallStartTime] = useState<string | null>(null);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(initialMode === 'video');
  const [hasLocalMedia, setHasLocalMedia] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteParticipantLabel, setRemoteParticipantLabel] = useState('Remote participant');

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const seenSignalIdsRef = useRef<Set<string>>(new Set());
  const sessionIdRef = useRef(buildId('comm-session'));
  const activeCallIdRef = useRef<string | null>(null);
  const pendingIncomingCallRef = useRef<{
    callId: string;
    fromSessionId: string;
    mode: Exclude<CallMode, 'none'>;
  } | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const knownPeersRef = useRef<Map<string, PeerState>>(new Map());
  const callModeRef = useRef<CallMode>(callMode);
  const callDurationRef = useRef(0);

  const chatMessages = useMemo(() => chatThreads[student.id] || [], [chatThreads, student.id]);
  const conversationLabel = role === 'student' ? 'Tutor / School support' : student.name;
  const conversationMeta = role === 'student' ? 'In-app support chat and calls' : student.phone;

  useEffect(() => {
    callModeRef.current = callMode;
  }, [callMode]);

  useEffect(() => {
    callDurationRef.current = callDurationSeconds;
  }, [callDurationSeconds]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatThreads));
  }, [chatThreads]);

  const rememberSignalId = useCallback((id: string) => {
    if (!id) {
      return;
    }

    if (seenSignalIdsRef.current.size > 800) {
      seenSignalIdsRef.current.clear();
    }

    seenSignalIdsRef.current.add(id);
  }, []);

  const sendRealtimeSignal = useCallback(
    async (event: string, payload: Record<string, unknown>) => {
      try {
        const response = await fetch(`${apiBaseUrl}/realtime/signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: SIGNAL_CHANNEL,
            event,
            payload,
          }),
        });
        return response.ok;
      } catch {
        return false;
      }
    },
    [apiBaseUrl]
  );

  const sendSignal = useCallback(
    async (event: string, payload: Record<string, unknown>) => {
      const eventId = typeof payload.eventId === 'string' && payload.eventId ? payload.eventId : buildId(event);
      rememberSignalId(eventId);

      return sendRealtimeSignal(event, {
        eventId,
        sessionId: sessionIdRef.current,
        studentId: student.id,
        role,
        senderLabel: roleToLabel(role),
        ...payload,
      });
    },
    [rememberSignalId, role, sendRealtimeSignal, student.id]
  );

  const updatePeer = useCallback((sessionId: string, updates: Partial<PeerState>) => {
    if (!sessionId || sessionId === sessionIdRef.current) {
      return;
    }

    const existing = knownPeersRef.current.get(sessionId);
    knownPeersRef.current.set(sessionId, {
      role: updates.role || existing?.role || 'student',
      label: updates.label || existing?.label || 'Participant',
      ready: updates.ready ?? existing?.ready ?? false,
      mode: updates.mode ?? existing?.mode ?? null,
    });
  }, []);

  const closePeerConnection = useCallback((remoteSessionId: string) => {
    const connection = peerConnectionsRef.current.get(remoteSessionId);
    if (!connection) {
      return;
    }

    connection.close();
    peerConnectionsRef.current.delete(remoteSessionId);
  }, []);

  const closeAllPeerConnections = useCallback(() => {
    peerConnectionsRef.current.forEach((connection) => connection.close());
    peerConnectionsRef.current.clear();
    pendingIceRef.current.clear();
  }, []);

  const stopCurrentMedia = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setHasLocalMedia(false);
  }, []);

  const queueIceCandidate = useCallback((remoteSessionId: string, candidate: RTCIceCandidateInit) => {
    const queued = pendingIceRef.current.get(remoteSessionId) || [];
    pendingIceRef.current.set(remoteSessionId, [...queued, candidate]);
  }, []);

  const flushPendingIceCandidates = useCallback(async (remoteSessionId: string, connection: RTCPeerConnection) => {
    const pending = pendingIceRef.current.get(remoteSessionId) || [];
    if (pending.length === 0) {
      return;
    }

    for (const candidate of pending) {
      try {
        await connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore stale/invalid ICE candidates.
      }
    }

    pendingIceRef.current.delete(remoteSessionId);
  }, []);

  const createPeerConnection = useCallback(
    (remoteSessionId: string) => {
      closePeerConnection(remoteSessionId);

      const connection = new RTCPeerConnection(RTC_CONFIGURATION);
      peerConnectionsRef.current.set(remoteSessionId, connection);

      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => {
          connection.addTrack(track, stream);
        });
      }

      connection.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        void sendSignal('webrtc.ice', {
          targetSessionId: remoteSessionId,
          callId: activeCallIdRef.current,
          candidate: event.candidate.toJSON(),
        });
      };

      connection.ontrack = (event) => {
        const [streamFromRemote] = event.streams;
        if (!streamFromRemote) {
          return;
        }

        const peer = knownPeersRef.current.get(remoteSessionId);
        if (peer?.label) {
          setRemoteParticipantLabel(peer.label);
        }

        setRemoteStream(streamFromRemote);
        setCallStatus('live');
        setCallError('');
        setCallStartTime((previous) => previous || new Date().toISOString());
      };

      connection.onconnectionstatechange = () => {
        if (
          connection.connectionState === 'failed' ||
          connection.connectionState === 'disconnected' ||
          connection.connectionState === 'closed'
        ) {
          closePeerConnection(remoteSessionId);
          setRemoteStream((previous) => {
            if (!previous) {
              return previous;
            }
            return null;
          });

          if (callModeRef.current !== 'none') {
            setCallStatus('connecting');
          }
        }
      };

      return connection;
    },
    [closePeerConnection, sendSignal]
  );

  const createOfferForPeer = useCallback(
    async (remoteSessionId: string) => {
      const peer = knownPeersRef.current.get(remoteSessionId);
      const localStream = localStreamRef.current;
      const activeCallId = activeCallIdRef.current;

      if (!peer?.ready || !localStream || !activeCallId) {
        return;
      }

      if (!shouldCreateOffer(sessionIdRef.current, remoteSessionId)) {
        return;
      }

      const connection = createPeerConnection(remoteSessionId);

      try {
        const offer = await connection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await connection.setLocalDescription(offer);

        await sendSignal('webrtc.offer', {
          targetSessionId: remoteSessionId,
          callId: activeCallId,
          sdp: offer,
        });
      } catch {
        closePeerConnection(remoteSessionId);
      }
    },
    [closePeerConnection, createPeerConnection, sendSignal]
  );

  const handleIncomingOffer = useCallback(
    async (remoteSessionId: string, callId: string, offer: RTCSessionDescriptionInit) => {
      const localStream = localStreamRef.current;
      if (!localStream) {
        setCallStatus('idle');
        setCallError('Incoming call is waiting. Tap Call to join the media session.');
        return;
      }

      if (callId) {
        activeCallIdRef.current = callId;
      }

      const connection = createPeerConnection(remoteSessionId);

      try {
        await connection.setRemoteDescription(new RTCSessionDescription(offer));
        await flushPendingIceCandidates(remoteSessionId, connection);

        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);

        await sendSignal('webrtc.answer', {
          targetSessionId: remoteSessionId,
          callId: activeCallIdRef.current,
          sdp: answer,
        });

        setCallStatus('connecting');
      } catch {
        closePeerConnection(remoteSessionId);
        setCallStatus('error');
        setCallError('Could not join the live call session.');
      }
    },
    [closePeerConnection, createPeerConnection, flushPendingIceCandidates, sendSignal]
  );

  const handleIncomingAnswer = useCallback(
    async (remoteSessionId: string, answer: RTCSessionDescriptionInit) => {
      const connection = peerConnectionsRef.current.get(remoteSessionId);
      if (!connection) {
        return;
      }

      try {
        await connection.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingIceCandidates(remoteSessionId, connection);
      } catch {
        closePeerConnection(remoteSessionId);
      }
    },
    [closePeerConnection, flushPendingIceCandidates]
  );

  const handleIncomingIce = useCallback(
    async (remoteSessionId: string, candidate: RTCIceCandidateInit) => {
      const connection = peerConnectionsRef.current.get(remoteSessionId);

      if (!connection || !connection.remoteDescription) {
        queueIceCandidate(remoteSessionId, candidate);
        return;
      }

      try {
        await connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        queueIceCandidate(remoteSessionId, candidate);
      }
    },
    [queueIceCandidate]
  );

  const resetCallState = useCallback(() => {
    closeAllPeerConnections();
    stopCurrentMedia();

    setRemoteStream(null);
    setCallMode('none');
    setCallStatus('idle');
    setCallError('');
    setCallStartTime(null);
    setCallDurationSeconds(0);
    setRemoteParticipantLabel('Remote participant');

    activeCallIdRef.current = null;
    pendingIncomingCallRef.current = null;

    knownPeersRef.current.forEach((peer, sessionId) => {
      knownPeersRef.current.set(sessionId, { ...peer, ready: false, mode: null });
    });
  }, [closeAllPeerConnections, stopCurrentMedia]);

  const startCall = useCallback(
    async (mode: Exclude<CallMode, 'none'>) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCallStatus('error');
        setCallError('Your browser does not support in-app calling media devices.');
        onNotice?.('Your browser does not support in-app calling media devices.');
        return;
      }

      const pendingIncoming = pendingIncomingCallRef.current;
      const callId = pendingIncoming?.callId || activeCallIdRef.current || buildId(`call-${student.id}`);
      activeCallIdRef.current = callId;

      setCallStatus('connecting');
      setCallError('');
      setCallMode(mode);
      setCameraEnabled(mode === 'video');
      setCallStartTime(null);
      setCallDurationSeconds(0);

      closeAllPeerConnections();
      setRemoteStream(null);
      stopCurrentMedia();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mode === 'video',
        });

        stream.getAudioTracks().forEach((track) => {
          track.enabled = !micMuted;
        });

        stream.getVideoTracks().forEach((track) => {
          track.enabled = mode === 'video';
        });

        localStreamRef.current = stream;
        setHasLocalMedia(true);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          void localVideoRef.current.play().catch(() => {
            // User gesture can be required on some browsers.
          });
        }

        pendingIncomingCallRef.current = null;

        const startedAt = new Date().toISOString();
        const published = await sendSignal('call.start', {
          callId,
          mode,
          startedAt,
        });

        if (!published) {
          setCallError('Media is ready, but call signaling is currently offline.');
        }

        for (const [remoteSessionId, peer] of knownPeersRef.current.entries()) {
          if (peer.ready) {
            await createOfferForPeer(remoteSessionId);
          }
        }

        onNotice?.(
          `${mode === 'video' ? 'Video' : 'Audio'} call started with ${conversationLabel}. Waiting for remote join.`
        );
      } catch (error: any) {
        setCallStatus('error');
        setCallError(error?.message || 'Could not access microphone/camera.');
        onNotice?.(`Unable to start ${mode} call. Check microphone/camera permissions.`);
      }
    },
    [
      closeAllPeerConnections,
      createOfferForPeer,
      micMuted,
      onNotice,
      sendSignal,
      stopCurrentMedia,
      student.id,
      conversationLabel,
    ]
  );

  const endCall = useCallback(async () => {
    const activeCallId = activeCallIdRef.current;

    if (activeCallId) {
      await sendSignal('call.end', {
        callId: activeCallId,
        endedAt: new Date().toISOString(),
        durationSeconds: callDurationRef.current,
      });
    }

    resetCallState();
    onNotice?.(`Call ended with ${conversationLabel}.`);
  }, [onNotice, resetCallState, sendSignal, conversationLabel]);

  useEffect(() => {
    if (!remoteVideoRef.current) {
      return;
    }

    remoteVideoRef.current.srcObject = remoteStream;
    if (remoteStream) {
      void remoteVideoRef.current.play().catch(() => {
        setCallError('Tap the call preview to resume remote video playback.');
      });
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!remoteAudioRef.current) {
      return;
    }

    remoteAudioRef.current.srcObject = remoteStream;
    if (remoteStream) {
      void remoteAudioRef.current.play().catch(() => {
        // Audio playback may wait for user gesture.
      });
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!callStartTime || callStatus !== 'live') {
      setCallDurationSeconds(0);
      return;
    }

    const interval = window.setInterval(() => {
      const seconds = Math.max(0, Math.floor((Date.now() - new Date(callStartTime).getTime()) / 1000));
      setCallDurationSeconds(seconds);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [callStartTime, callStatus]);

  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) {
      return;
    }

    stream.getAudioTracks().forEach((track) => {
      track.enabled = !micMuted;
    });

    stream.getVideoTracks().forEach((track) => {
      track.enabled = callMode === 'video' && cameraEnabled;
    });
  }, [callMode, cameraEnabled, micMuted]);

  useEffect(() => {
    // Reset local call state when switching to a different student thread.
    resetCallState();
    knownPeersRef.current.clear();
    setChatInput('');
    setMicMuted(false);

    setCallMode(initialMode === 'chat' ? 'none' : initialMode);
    setCameraEnabled(initialMode === 'video');
  }, [initialMode, resetCallState, student.id]);

  useEffect(() => {
    if (!initialIncomingCall) {
      return;
    }

    const incomingLabel =
      typeof initialIncomingCall.senderLabel === 'string' && initialIncomingCall.senderLabel.trim()
        ? initialIncomingCall.senderLabel.trim()
        : 'Tutor / School support';
    const incomingRole = isActorRole(initialIncomingCall.senderRole) ? initialIncomingCall.senderRole : 'tutor';

    activeCallIdRef.current = initialIncomingCall.callId;
    pendingIncomingCallRef.current = {
      callId: initialIncomingCall.callId,
      fromSessionId: initialIncomingCall.fromSessionId,
      mode: initialIncomingCall.mode,
    };

    updatePeer(initialIncomingCall.fromSessionId, {
      role: incomingRole,
      label: incomingLabel,
      ready: true,
      mode: initialIncomingCall.mode,
    });

    setRemoteParticipantLabel(incomingLabel);
    setCallMode(initialIncomingCall.mode);
    setCameraEnabled(initialIncomingCall.mode === 'video');
    setCallStatus('idle');
    setCallError(
      `Incoming ${initialIncomingCall.mode} call request from ${incomingLabel}. Tap Call to join.`
    );
  }, [initialIncomingCall, updatePeer]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const source = new EventSource(`${apiBaseUrl}/realtime/stream?channel=${encodeURIComponent(SIGNAL_CHANNEL)}`);
    eventSourceRef.current = source;

    // Process chat messages and call signaling for the active student thread.
    source.onmessage = (messageEvent) => {
      let envelope: Record<string, unknown> | null = null;
      try {
        const parsed = JSON.parse(messageEvent.data) as unknown;
        envelope = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
      } catch {
        envelope = null;
      }

      if (!envelope) {
        return;
      }

      const event = typeof envelope.event === 'string' ? envelope.event : '';
      const payload =
        envelope.payload && typeof envelope.payload === 'object'
          ? (envelope.payload as Record<string, unknown>)
          : null;

      if (!event || !payload) {
        return;
      }

      const payloadStudentId = Number(payload.studentId);
      if (!Number.isFinite(payloadStudentId) || payloadStudentId !== student.id) {
        return;
      }

      const senderSessionId = typeof payload.sessionId === 'string' ? payload.sessionId : '';
      if (!senderSessionId || senderSessionId === sessionIdRef.current) {
        return;
      }

      const targetSessionId = typeof payload.targetSessionId === 'string' ? payload.targetSessionId : '';
      if (targetSessionId && targetSessionId !== sessionIdRef.current) {
        return;
      }

      const eventId = typeof payload.eventId === 'string' ? payload.eventId : '';
      if (eventId) {
        if (seenSignalIdsRef.current.has(eventId)) {
          return;
        }
        rememberSignalId(eventId);
      }

      const senderRole = isActorRole(payload.role) ? payload.role : 'student';
      const senderLabel =
        typeof payload.senderLabel === 'string' && payload.senderLabel.trim()
          ? payload.senderLabel.trim()
          : senderRole;

      updatePeer(senderSessionId, {
        role: senderRole,
        label: senderLabel,
      });

      if (event === 'chat.message') {
        const text = typeof payload.message === 'string' ? payload.message.trim() : '';
        if (!text) {
          return;
        }

        const sentAt = typeof payload.sentAt === 'string' ? payload.sentAt : new Date().toISOString();
        const messageId =
          typeof payload.messageId === 'string' && payload.messageId ? payload.messageId : `incoming-${student.id}-${sentAt}`;

        if (seenSignalIdsRef.current.has(messageId)) {
          return;
        }
        rememberSignalId(messageId);

        setChatThreads((previous) => {
          const existing = previous[student.id] || [];
          if (existing.some((message) => message.id === messageId)) {
            return previous;
          }

          return {
            ...previous,
            [student.id]: [
              ...existing,
              {
                id: messageId,
                sender: senderRole,
                text,
                sentAt,
              },
            ],
          };
        });

        onNotice?.(`New message from ${conversationLabel}.`);
        return;
      }

      const payloadCallId = typeof payload.callId === 'string' ? payload.callId : '';
      if (payloadCallId && activeCallIdRef.current && payloadCallId !== activeCallIdRef.current) {
        return;
      }

      if (event === 'call.start') {
        const mode = payload.mode === 'video' ? 'video' : 'audio';
        const callId = payloadCallId || buildId(`call-${student.id}`);

        if (!activeCallIdRef.current) {
          activeCallIdRef.current = callId;
        }

        pendingIncomingCallRef.current = {
          callId,
          fromSessionId: senderSessionId,
          mode,
        };

        updatePeer(senderSessionId, {
          ready: true,
          mode,
          label: senderLabel,
          role: senderRole,
        });

        setRemoteParticipantLabel(senderLabel);
        setCallMode(mode);
        setCameraEnabled(mode === 'video');

        if (!localStreamRef.current) {
          setCallStatus('idle');
          setCallError(`Incoming ${mode} call request from ${senderLabel}. Tap Call to join.`);
        } else {
          setCallStatus('connecting');
          setCallError('');
          void createOfferForPeer(senderSessionId);
        }

        onNotice?.(`Incoming ${mode === 'video' ? 'video' : 'audio'} call request from ${senderLabel}.`);
        return;
      }

      if (event === 'call.end') {
        updatePeer(senderSessionId, {
          ready: false,
          mode: null,
        });

        closePeerConnection(senderSessionId);

        const stillConnected = Array.from(knownPeersRef.current.values()).some((peer) => peer.ready);
        if (!stillConnected) {
          resetCallState();
        }

        onNotice?.(`Call ended by ${senderLabel}.`);
        return;
      }

      if (event === 'webrtc.offer') {
        const offer = payload.sdp;
        if (offer && typeof offer === 'object') {
          if (payloadCallId) {
            activeCallIdRef.current = payloadCallId;
          }
          void handleIncomingOffer(senderSessionId, payloadCallId, offer as RTCSessionDescriptionInit);
        }
        return;
      }

      if (event === 'webrtc.answer') {
        const answer = payload.sdp;
        if (answer && typeof answer === 'object') {
          void handleIncomingAnswer(senderSessionId, answer as RTCSessionDescriptionInit);
        }
        return;
      }

      if (event === 'webrtc.ice') {
        const candidate = payload.candidate;
        if (candidate && typeof candidate === 'object') {
          void handleIncomingIce(senderSessionId, candidate as RTCIceCandidateInit);
        }
      }
    };

    return () => {
      source.close();
      if (eventSourceRef.current === source) {
        eventSourceRef.current = null;
      }
    };
  }, [
    apiBaseUrl,
    closePeerConnection,
    createOfferForPeer,
    handleIncomingAnswer,
    handleIncomingIce,
    handleIncomingOffer,
    onNotice,
    rememberSignalId,
    resetCallState,
    student.id,
    conversationLabel,
    updatePeer,
  ]);

  useEffect(() => {
    return () => {
      if (activeCallIdRef.current) {
        void sendSignal('call.end', {
          callId: activeCallIdRef.current,
          endedAt: new Date().toISOString(),
          durationSeconds: callDurationRef.current,
        });
      }

      closeAllPeerConnections();
      stopCurrentMedia();

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [closeAllPeerConnections, sendSignal, stopCurrentMedia]);

  useEffect(() => {
    if (initialMode === 'chat') {
      return;
    }

    void startCall(initialMode);
    // Re-run when opening a different student/session mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id, initialMode]);

  const handleSendMessage = async () => {
    const messageText = chatInput.trim();
    if (!messageText) {
      return;
    }

    const sentAt = new Date().toISOString();
    const messageId = `${student.id}-${role}-${Date.now()}`;
    rememberSignalId(messageId);

    setChatThreads((previous) => ({
      ...previous,
      [student.id]: [
        ...(previous[student.id] || []),
        {
          id: messageId,
          sender: role,
          text: messageText,
          sentAt,
        },
      ],
    }));

    setChatInput('');

    const signaled = await sendSignal('chat.message', {
      messageId,
      message: messageText,
      sentAt,
    });

    onNotice?.(
      signaled
        ? `Message sent to ${conversationLabel}.`
        : `Message saved locally for ${conversationLabel}.`
    );
  };

  const closePanel = async () => {
    if (callMode !== 'none' || hasLocalMedia) {
      await endCall();
    } else {
      stopCurrentMedia();
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    onClose();
  };

  const switchToChat = () => {
    if (callMode !== 'none' || hasLocalMedia) {
      void endCall();
      return;
    }

    setCallMode('none');
    setCallError('');
  };

  const switchToVideo = () => {
    setCameraEnabled(true);
    void startCall('video');
  };

  const switchToAudio = () => {
    setCameraEnabled(false);
    void startCall('audio');
  };

  const statusLabel =
    callStatus === 'connecting' ? 'Connecting' : callStatus === 'live' ? 'Live' : callStatus === 'error' ? 'Error' : 'Idle';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => void closePanel()}></div>
      <div className="relative mx-0 max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-t-2xl bg-white shadow-2xl md:mx-4 md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <h3 className="font-semibold text-gray-900">Talk with {conversationLabel}</h3>
            <p className="text-xs text-gray-500">{conversationMeta}</p>
          </div>
          <button
            onClick={() => void closePanel()}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
            title="Close panel"
          >
            <FaTimes size={14} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
          <button
            onClick={switchToChat}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              callMode === 'none'
                ? 'bg-[#3D08BA] text-white'
                : 'border border-[#3D08BA]/30 bg-white text-[#3D08BA] hover:bg-[#3D08BA]/5'
            }`}
          >
            <FaCommentDots size={11} />
            Chat
          </button>
          <button
            onClick={() => {
              if (callStatus !== 'live' && callStatus !== 'connecting') {
                void startCall(callMode === 'video' ? 'video' : 'audio');
              }
            }}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              callMode === 'audio' || callMode === 'video'
                ? 'bg-blue-600 text-white'
                : 'border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <FaPhone size={11} />
            {callMode !== 'none' && callStatus !== 'live' ? 'Join Call' : 'Call'}
          </button>
          {(callMode !== 'none' || hasLocalMedia) && (
            <button
              onClick={() => void endCall()}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              <FaPhoneSlash size={11} />
              End Call
            </button>
          )}
        </div>

        <div className="grid gap-0 md:grid-cols-2">
          <div className="border-b border-gray-100 bg-gray-50/60 p-4 md:border-b-0 md:border-r">
            {callMode === 'none' && !hasLocalMedia ? (
              <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-gray-500">
                Press Call to start audio. You can switch to video inside the session.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative h-[220px] overflow-hidden rounded-xl bg-gray-900 p-2 text-white">
                  {callMode === 'video' ? (
                    remoteStream ? (
                      <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-lg border border-white/15 bg-white/5 text-center">
                        <div>
                          <p className="text-sm font-semibold">Waiting for {remoteParticipantLabel}</p>
                          <p className="mt-1 text-xs text-white/70">Remote video will appear here once connected.</p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center text-center">
                      <div>
                        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-xl font-semibold">
                          {(remoteParticipantLabel[0] || 'R').toUpperCase()}
                        </div>
                        <p className="text-sm text-white/90">{remoteParticipantLabel}</p>
                        <p className="mt-1 text-xs text-white/70">Audio call in progress</p>
                      </div>
                    </div>
                  )}

                  {hasLocalMedia && callMode === 'video' && (
                    <div className="absolute bottom-3 right-3 h-20 w-32 overflow-hidden rounded-lg border border-white/25 bg-black/40 shadow-md">
                      <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                    </div>
                  )}

                  <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>
                      Status: <span className="font-semibold text-gray-800">{statusLabel}</span>
                    </span>
                    <span className="font-mono">{callStatus === 'live' ? formatCallDuration(callDurationSeconds) : '--:--'}</span>
                  </div>
                  {callError && <p className="mt-2 text-xs text-red-600">{callError}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMicMuted((previous) => !previous)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                      micMuted
                        ? 'border border-red-200 bg-red-50 text-red-700'
                        : 'border border-gray-200 bg-gray-100 text-gray-700'
                    }`}
                  >
                    {micMuted ? <FaMicrophoneSlash size={11} /> : <FaMicrophone size={11} />}
                    {micMuted ? 'Unmute Mic' : 'Mute Mic'}
                  </button>

                  {callMode === 'audio' ? (
                    <button
                      onClick={switchToVideo}
                      className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700"
                    >
                      <FaVideo size={11} />
                      Switch to Video
                    </button>
                  ) : (
                    <button
                      onClick={switchToAudio}
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700"
                    >
                      <FaPhone size={11} />
                      Switch to Audio
                    </button>
                  )}

                  <button
                    onClick={() => setCameraEnabled((previous) => !previous)}
                    disabled={callMode !== 'video'}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                      callMode !== 'video'
                        ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                        : cameraEnabled
                        ? 'border-gray-200 bg-gray-100 text-gray-700'
                        : 'border-yellow-200 bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {cameraEnabled ? <FaVideo size={11} /> : <FaVideoSlash size={11} />}
                    {cameraEnabled ? 'Camera On' : 'Camera Off'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-4">
            <div className="h-[300px] overflow-y-auto rounded-xl border border-gray-200 bg-white p-3">
              {chatMessages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                  Start chatting with {conversationLabel}.
                </div>
              ) : (
                <div className="space-y-3">
                  {chatMessages.map((message) => (
                    <div key={message.id} className={`flex ${message.sender === role ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                          message.sender === role ? 'bg-[#3D08BA] text-white' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <p>{message.text}</p>
                        <p className={`mt-1 text-[10px] ${message.sender === role ? 'text-white/80' : 'text-gray-500'}`}>
                          {formatTime(message.sentAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
              />
              <button
                onClick={() => {
                  void handleSendMessage();
                }}
                className="inline-flex items-center justify-center rounded-lg bg-[#3D08BA] px-3 py-2 text-white transition-colors hover:bg-[#2D0690] disabled:opacity-50"
                disabled={!chatInput.trim()}
                title="Send message"
              >
                <FaPaperPlane size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
