import { useEffect, useMemo, useRef, useState } from 'react';
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

export type CommunicationMode = 'chat' | 'audio' | 'video';
type CallMode = 'none' | 'audio' | 'video';
type CallStatus = 'idle' | 'connecting' | 'live' | 'error';
type Role = 'school' | 'tutor';

type ChatMessage = {
  id: string;
  sender: Role | 'student';
  text: string;
  sentAt: string;
};

export type CommunicationStudent = {
  id: number;
  name: string;
  phone: string;
  avatar?: string;
};

type StudentCommunicationPanelProps = {
  student: CommunicationStudent;
  role: Role;
  initialMode: CommunicationMode;
  onClose: () => void;
  onNotice?: (notice: string) => void;
  apiBaseUrl?: string;
};

const CHAT_STORAGE_KEY = 'edamaa_student_chat_threads_v1';
const SIGNAL_CHANNEL = 'signal:student-communication';

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

const isRole = (value: unknown): value is Role => value === 'school' || value === 'tutor';

export default function StudentCommunicationPanel({
  student,
  role,
  initialMode,
  onClose,
  onNotice,
  apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, ''),
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
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const seenSignalIdsRef = useRef<Set<string>>(new Set());

  const chatMessages = useMemo(() => chatThreads[student.id] || [], [chatThreads, student.id]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatThreads));
  }, [chatThreads]);

  useEffect(() => {
    setCallMode(initialMode === 'chat' ? 'none' : initialMode);
    setCameraEnabled(initialMode === 'video');
    setChatInput('');
  }, [student.id, initialMode]);

  useEffect(() => {
    if (!callStartTime || callStatus !== 'live') {
      setCallDurationSeconds(0);
      return;
    }

    const interval = window.setInterval(() => {
      const seconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(callStartTime).getTime()) / 1000)
      );
      setCallDurationSeconds(seconds);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [callStartTime, callStatus]);

  useEffect(() => {
    return () => {
      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const sendRealtimeSignal = async (event: string, payload: unknown) => {
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
  };

  const rememberSignalId = (id: string) => {
    if (!id) {
      return;
    }

    if (seenSignalIdsRef.current.size > 500) {
      seenSignalIdsRef.current.clear();
    }

    seenSignalIdsRef.current.add(id);
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const source = new EventSource(
      `${apiBaseUrl}/realtime/stream?channel=${encodeURIComponent(SIGNAL_CHANNEL)}`
    );
    eventSourceRef.current = source;

    // Keep chat/call states synchronized across active sessions for this student.
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

      const senderRole = payload.role;
      if (isRole(senderRole) && senderRole === role) {
        return;
      }

      if (event === 'chat.message') {
        const text = typeof payload.message === 'string' ? payload.message.trim() : '';
        if (!text) {
          return;
        }

        const sentAt = typeof payload.sentAt === 'string' ? payload.sentAt : new Date().toISOString();
        const messageId =
          typeof payload.messageId === 'string' && payload.messageId
            ? payload.messageId
            : `incoming-${student.id}-${sentAt}`;

        if (seenSignalIdsRef.current.has(messageId)) {
          return;
        }
        rememberSignalId(messageId);

        setChatThreads((prev) => {
          const existing = prev[student.id] || [];
          if (existing.some((message) => message.id === messageId)) {
            return prev;
          }

          return {
            ...prev,
            [student.id]: [
              ...existing,
              {
                id: messageId,
                sender: isRole(senderRole) ? senderRole : 'student',
                text,
                sentAt,
              },
            ],
          };
        });
        onNotice?.(`New message from ${student.name}.`);
        return;
      }

      if (event === 'call.start') {
        const mode = payload.mode === 'video' ? 'video' : 'audio';
        setCallMode(mode);
        setCameraEnabled(mode === 'video');
        setCallStatus('idle');
        setCallError(`Incoming ${mode} call request. Tap Call to join.`);
        onNotice?.(
          `Incoming ${mode === 'video' ? 'video' : 'audio'} call request from ${
            isRole(senderRole) ? senderRole : 'student'
          }.`
        );
        return;
      }

      if (event === 'call.end') {
        stopCurrentMedia();
        setCallMode('none');
        setCallStatus('idle');
        setCallError('');
        setCallStartTime(null);
        setCallDurationSeconds(0);
        onNotice?.(`Call ended by ${isRole(senderRole) ? senderRole : 'student'}.`);
      }
    };

    return () => {
      source.close();
      if (eventSourceRef.current === source) {
        eventSourceRef.current = null;
      }
    };
  }, [apiBaseUrl, onNotice, role, student.id, student.name]);

  const applyTrackStates = (stream: MediaStream) => {
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !micMuted;
    });
    stream.getVideoTracks().forEach((track) => {
      track.enabled = cameraEnabled;
    });
  };

  const stopCurrentMedia = () => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  const startCall = async (mode: Exclude<CallMode, 'none'>) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCallStatus('error');
      setCallError('Your browser does not support in-app calling media devices.');
      onNotice?.('Your browser does not support in-app calling media devices.');
      return;
    }

    stopCurrentMedia();
    setCallStatus('connecting');
    setCallError('');
    setCallMode(mode);
    setCameraEnabled(mode === 'video');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === 'video',
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      applyTrackStates(stream);
      setCallStatus('live');
      const startedAt = new Date().toISOString();
      setCallStartTime(startedAt);

      await sendRealtimeSignal('call.start', {
        role,
        mode,
        studentId: student.id,
        studentName: student.name,
        startedAt,
      });

      onNotice?.(`${mode === 'video' ? 'Video' : 'Audio'} call is now live with ${student.name}.`);
    } catch (error: any) {
      setCallStatus('error');
      setCallError(error?.message || 'Could not access microphone/camera.');
      onNotice?.(`Unable to start ${mode} call. Check microphone/camera permissions.`);
    }
  };

  useEffect(() => {
    if (initialMode === 'chat') {
      return;
    }
    void startCall(initialMode);
    // Re-run when opening a different student/session mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id, initialMode]);

  const endCall = async () => {
    await sendRealtimeSignal('call.end', {
      role,
      studentId: student.id,
      studentName: student.name,
      endedAt: new Date().toISOString(),
      durationSeconds: callDurationSeconds,
    });
    stopCurrentMedia();
    setCallMode('none');
    setCallStatus('idle');
    setCallError('');
    setCallStartTime(null);
    setCallDurationSeconds(0);
    onNotice?.(`Call ended with ${student.name}.`);
  };

  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) {
      return;
    }
    applyTrackStates(stream);
  }, [micMuted, cameraEnabled]);

  const handleSendMessage = async () => {
    const messageText = chatInput.trim();
    if (!messageText) {
      return;
    }

    const sentAt = new Date().toISOString();
    const messageId = `${student.id}-${role}-${Date.now()}`;
    rememberSignalId(messageId);
    const message: ChatMessage = {
      id: messageId,
      sender: role,
      text: messageText,
      sentAt,
    };

    setChatThreads((prev) => ({
      ...prev,
      [student.id]: [...(prev[student.id] || []), message],
    }));
    setChatInput('');

    const signaled = await sendRealtimeSignal('chat.message', {
      role,
      studentId: student.id,
      studentName: student.name,
      message: messageText,
      sentAt,
      messageId,
    });

    onNotice?.(signaled ? `Message sent to ${student.name}.` : `Message saved locally for ${student.name}.`);
  };

  const closePanel = async () => {
    if (callMode !== 'none' && callStatus !== 'idle') {
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
    if (callMode !== 'none' && callStatus !== 'idle') {
      void endCall();
      return;
    }
    stopCurrentMedia();
    setCallMode('none');
  };

  const switchToVideo = () => {
    setCameraEnabled(true);
    void startCall('video');
  };

  const switchToAudio = () => {
    setCameraEnabled(false);
    void startCall('audio');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => void closePanel()}></div>
      <div className="relative w-full max-w-4xl bg-white rounded-t-2xl md:rounded-2xl shadow-2xl mx-0 md:mx-4 max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Talk with {student.name}</h3>
            <p className="text-xs text-gray-500">{student.phone}</p>
          </div>
          <button
            onClick={() => void closePanel()}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title="Close panel"
          >
            <FaTimes size={14} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
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
          {callMode !== 'none' && (
            <button
              onClick={() => void endCall()}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
            >
              <FaPhoneSlash size={11} />
              End Call
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-0">
          <div className="p-4 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/60">
            {callMode === 'none' ? (
              <div className="h-[300px] rounded-xl border border-dashed border-gray-300 bg-white flex items-center justify-center text-sm text-gray-500">
                Press Call to start audio. You can switch to video inside the session.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-[220px] rounded-xl bg-gray-900 text-white p-4 flex items-center justify-center">
                  {callMode === 'video' ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="h-full w-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="mx-auto mb-2 h-14 w-14 rounded-full bg-white/10 flex items-center justify-center text-xl font-semibold">
                        {student.name[0] || 'S'}
                      </div>
                      <p className="text-sm text-white/90">{student.name}</p>
                      <p className="text-xs text-white/70 mt-1">Audio call in progress</p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>
                      Status:{' '}
                      <span className="font-semibold text-gray-800">
                        {callStatus === 'connecting'
                          ? 'Connecting'
                          : callStatus === 'live'
                          ? 'Live'
                          : callStatus === 'error'
                          ? 'Error'
                          : 'Idle'}
                      </span>
                    </span>
                    <span className="font-mono">
                      {callStatus === 'live' ? formatCallDuration(callDurationSeconds) : '--:--'}
                    </span>
                  </div>
                  {callError && <p className="mt-2 text-xs text-red-600">{callError}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMicMuted((prev) => !prev)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                      micMuted
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {micMuted ? <FaMicrophoneSlash size={11} /> : <FaMicrophone size={11} />}
                    {micMuted ? 'Unmute Mic' : 'Mute Mic'}
                  </button>
                  {callMode === 'audio' ? (
                    <button
                      onClick={switchToVideo}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border border-green-200 bg-green-50 text-green-700"
                    >
                      <FaVideo size={11} />
                      Switch to Video
                    </button>
                  ) : (
                    <button
                      onClick={switchToAudio}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700"
                    >
                      <FaPhone size={11} />
                      Switch to Audio
                    </button>
                  )}
                  <button
                    onClick={() => setCameraEnabled((prev) => !prev)}
                    disabled={callMode !== 'video'}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border ${
                      callMode !== 'video'
                        ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                        : cameraEnabled
                        ? 'bg-gray-100 text-gray-700 border-gray-200'
                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
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
                <div className="h-full flex items-center justify-center text-sm text-gray-500">
                  Start chatting with {student.name}.
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
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
              />
              <button
                onClick={() => {
                  void handleSendMessage();
                }}
                className="inline-flex items-center justify-center rounded-lg bg-[#3D08BA] text-white px-3 py-2 hover:bg-[#2D0690] transition-colors disabled:opacity-50"
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
