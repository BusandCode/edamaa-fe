import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaMicrophone,
  FaPaperPlane,
  FaStopCircle,
  FaTimes,
  FaUsers,
  FaWaveSquare,
} from 'react-icons/fa';

export type CourseMate = {
  id: number;
  name: string;
  avatar?: string;
};

export type CourseChatCourse = {
  id: number;
  title: string;
  classmates: CourseMate[];
  currentStudent: CourseMate;
};

type CourseChatMessage = {
  id: string;
  courseId: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  type: 'text' | 'voice';
  text?: string;
  audioDataUrl?: string;
  durationSeconds?: number;
  sentAt: string;
};

type CourseMatesChatPanelProps = {
  course: CourseChatCourse;
  onClose: () => void;
  onNotice?: (notice: string) => void;
  apiBaseUrl?: string;
};

const CHAT_STORAGE_KEY = 'edamaa_course_chat_threads_v1';
const SIGNAL_CHANNEL = 'signal:course-chat';
const MAX_VOICE_SECONDS = 60;

const loadThreads = (): Record<number, CourseChatMessage[]> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as Record<number, CourseChatMessage[]>;
  } catch {
    return {};
  }
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Could not read voice note data.'));
    reader.readAsDataURL(blob);
  });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const remaining = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
};

export default function CourseMatesChatPanel({
  course,
  onClose,
  onNotice,
  apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, ''),
}: CourseMatesChatPanelProps) {
  const [threads, setThreads] = useState<Record<number, CourseChatMessage[]>>(() => loadThreads());
  const [chatInput, setChatInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState('');

  const eventSourceRef = useRef<EventSource | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingSecondsRef = useRef(0);
  const recordingTickerRef = useRef<number | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  const messages = useMemo(() => threads[course.id] || [], [threads, course.id]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    setChatInput('');
    setRecordingError('');
  }, [course.id]);

  useEffect(() => {
    recordingSecondsRef.current = recordingSeconds;
  }, [recordingSeconds]);

  const rememberMessageId = (id: string) => {
    if (!id) {
      return;
    }
    if (seenMessageIdsRef.current.size > 1000) {
      seenMessageIdsRef.current.clear();
    }
    seenMessageIdsRef.current.add(id);
  };

  const appendMessage = (message: CourseChatMessage) => {
    setThreads((prev) => {
      const existing = prev[course.id] || [];
      if (existing.some((item) => item.id === message.id)) {
        return prev;
      }

      return {
        ...prev,
        [course.id]: [...existing, message],
      };
    });
  };

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

  // Listen for course chat events so course mates can see each other's messages.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const source = new EventSource(
      `${apiBaseUrl}/realtime/stream?channel=${encodeURIComponent(SIGNAL_CHANNEL)}`
    );
    eventSourceRef.current = source;

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

      const payloadCourseId = Number(payload.courseId);
      if (!Number.isFinite(payloadCourseId) || payloadCourseId !== course.id) {
        return;
      }

      const senderId = Number(payload.senderId);
      if (Number.isFinite(senderId) && senderId === course.currentStudent.id) {
        return;
      }

      const messageId =
        typeof payload.messageId === 'string' && payload.messageId
          ? payload.messageId
          : `course-${course.id}-${Date.now()}`;
      if (seenMessageIdsRef.current.has(messageId)) {
        return;
      }
      rememberMessageId(messageId);

      const sentAt = typeof payload.sentAt === 'string' ? payload.sentAt : new Date().toISOString();
      const senderName = typeof payload.senderName === 'string' ? payload.senderName : 'Course mate';
      const senderAvatar = typeof payload.senderAvatar === 'string' ? payload.senderAvatar : undefined;

      if (event === 'course.chat.message') {
        const text = typeof payload.message === 'string' ? payload.message.trim() : '';
        if (!text) {
          return;
        }

        appendMessage({
          id: messageId,
          courseId: course.id,
          senderId: Number.isFinite(senderId) ? senderId : 0,
          senderName,
          senderAvatar,
          type: 'text',
          text,
          sentAt,
        });
        return;
      }

      if (event === 'course.chat.voice') {
        const audioDataUrl = typeof payload.audioDataUrl === 'string' ? payload.audioDataUrl : '';
        if (!audioDataUrl) {
          return;
        }

        const durationSeconds = Number(payload.durationSeconds);
        appendMessage({
          id: messageId,
          courseId: course.id,
          senderId: Number.isFinite(senderId) ? senderId : 0,
          senderName,
          senderAvatar,
          type: 'voice',
          audioDataUrl,
          durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 0,
          sentAt,
        });
      }
    };

    return () => {
      source.close();
      if (eventSourceRef.current === source) {
        eventSourceRef.current = null;
      }
    };
  }, [apiBaseUrl, course.id, course.currentStudent.id]);

  useEffect(() => {
    if (!isRecording) {
      if (recordingTickerRef.current) {
        window.clearInterval(recordingTickerRef.current);
        recordingTickerRef.current = null;
      }
      return;
    }

    recordingTickerRef.current = window.setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (recordingTickerRef.current) {
        window.clearInterval(recordingTickerRef.current);
        recordingTickerRef.current = null;
      }
    };
  }, [isRecording]);

  useEffect(() => {
    if (isRecording && recordingSeconds >= MAX_VOICE_SECONDS) {
      void stopVoiceRecording();
    }
  }, [isRecording, recordingSeconds]);

  const releaseMicrophone = () => {
    const stream = mediaStreamRef.current;
    if (!stream) {
      return;
    }

    stream.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const resetRecorder = () => {
    mediaRecorderRef.current = null;
    recordingChunksRef.current = [];
    setIsRecording(false);
  };

  useEffect(() => {
    return () => {
      if (recordingTickerRef.current) {
        window.clearInterval(recordingTickerRef.current);
      }
      releaseMicrophone();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const sendTextMessage = async () => {
    const text = chatInput.trim();
    if (!text) {
      return;
    }

    const sentAt = new Date().toISOString();
    const messageId = `course-${course.id}-${course.currentStudent.id}-${Date.now()}`;
    rememberMessageId(messageId);

    appendMessage({
      id: messageId,
      courseId: course.id,
      senderId: course.currentStudent.id,
      senderName: course.currentStudent.name,
      senderAvatar: course.currentStudent.avatar,
      type: 'text',
      text,
      sentAt,
    });
    setChatInput('');

    const signaled = await sendRealtimeSignal('course.chat.message', {
      courseId: course.id,
      messageId,
      senderId: course.currentStudent.id,
      senderName: course.currentStudent.name,
      senderAvatar: course.currentStudent.avatar,
      message: text,
      sentAt,
    });

    onNotice?.(
      signaled
        ? `Message sent to classmates in ${course.title}.`
        : `Message saved locally for ${course.title}.`
    );
  };

  const startVoiceRecording = async () => {
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
      setRecordingError('Voice notes are not supported in this browser.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordingError('Microphone is not available on this device.');
      return;
    }

    try {
      setRecordingError('');
      setRecordingSeconds(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsSavingVoice(true);

        try {
          const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
          releaseMicrophone();
          resetRecorder();

          if (!blob.size) {
            setIsSavingVoice(false);
            return;
          }

          const audioDataUrl = await blobToDataUrl(blob);
          if (!audioDataUrl) {
            throw new Error('Voice note could not be saved.');
          }

          const sentAt = new Date().toISOString();
          const messageId = `voice-${course.id}-${course.currentStudent.id}-${Date.now()}`;
          const durationSeconds = Math.max(1, recordingSecondsRef.current);
          rememberMessageId(messageId);

          appendMessage({
            id: messageId,
            courseId: course.id,
            senderId: course.currentStudent.id,
            senderName: course.currentStudent.name,
            senderAvatar: course.currentStudent.avatar,
            type: 'voice',
            audioDataUrl,
            durationSeconds,
            sentAt,
          });

          const signaled = await sendRealtimeSignal('course.chat.voice', {
            courseId: course.id,
            messageId,
            senderId: course.currentStudent.id,
            senderName: course.currentStudent.name,
            senderAvatar: course.currentStudent.avatar,
            audioDataUrl,
            durationSeconds,
            sentAt,
          });

          onNotice?.(
            signaled
              ? `Voice note sent to classmates in ${course.title}.`
              : `Voice note saved locally for ${course.title}.`
          );
        } catch (error: any) {
          setRecordingError(error?.message || 'Could not save voice note.');
        } finally {
          setIsSavingVoice(false);
          setRecordingSeconds(0);
        }
      };

      recorder.onerror = () => {
        setRecordingError('Recording failed. Please try again.');
        releaseMicrophone();
        resetRecorder();
      };

      recorder.start();
      setIsRecording(true);
      onNotice?.(`Recording voice note for ${course.title}...`);
    } catch {
      setRecordingError('Microphone permission is required for voice notes.');
      releaseMicrophone();
      resetRecorder();
    }
  };

  const stopVoiceRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      return;
    }

    setIsRecording(false);
    recorder.stop();
  };

  const closePanel = async () => {
    if (isRecording) {
      await stopVoiceRecording();
    }
    releaseMicrophone();
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => void closePanel()}></div>
      <div className="relative w-full max-w-5xl bg-white rounded-t-2xl md:rounded-2xl shadow-2xl mx-0 md:mx-4 max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Course Chat: {course.title}</h3>
            <p className="text-xs text-gray-500">Text + voice notes only</p>
          </div>
          <button
            onClick={() => void closePanel()}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title="Close panel"
          >
            <FaTimes size={14} />
          </button>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-0">
          <aside className="border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
              <FaUsers size={13} />
              Course Mates
            </div>
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {[course.currentStudent, ...course.classmates].map((mate) => (
                <div
                  key={mate.id}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${
                    mate.id === course.currentStudent.id
                      ? 'bg-[#3D08BA]/5 border-[#3D08BA]/20 text-[#3D08BA]'
                      : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  {mate.avatar ? (
                    <img src={mate.avatar} alt={mate.name} className="h-8 w-8 rounded-full border border-gray-200 object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-700 text-xs font-semibold flex items-center justify-center">
                      {(mate.name[0] || 'S').toUpperCase()}
                    </div>
                  )}
                  <div className="leading-tight">
                    <p className="font-medium">{mate.name}</p>
                    <p className="text-[11px] text-gray-500">
                      {mate.id === course.currentStudent.id ? 'You' : 'Classmate'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="p-4">
            <div className="h-[360px] overflow-y-auto rounded-xl border border-gray-200 bg-white p-3">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-500">
                  Start the course conversation with your classmates.
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => {
                    const isMine = message.senderId === course.currentStudent.id;

                    return (
                      <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
                            isMine ? 'bg-[#3D08BA] text-white' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {!isMine && <p className="text-[11px] font-semibold mb-1">{message.senderName}</p>}

                          {message.type === 'text' ? (
                            <p>{message.text}</p>
                          ) : (
                            <div className="space-y-2">
                              <div className={`flex items-center gap-2 text-xs ${isMine ? 'text-white/85' : 'text-gray-600'}`}>
                                <FaWaveSquare size={11} />
                                <span>Voice note ({formatDuration(message.durationSeconds || 0)})</span>
                              </div>
                              {message.audioDataUrl && (
                                <audio controls preload="none" src={message.audioDataUrl} className="max-w-full" />
                              )}
                            </div>
                          )}

                          <p className={`mt-1 text-[10px] ${isMine ? 'text-white/80' : 'text-gray-500'}`}>
                            {formatTime(message.sentAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void sendTextMessage();
                    }
                  }}
                  placeholder="Type a course message..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
                />
                <button
                  onClick={() => {
                    void sendTextMessage();
                  }}
                  className="inline-flex items-center justify-center rounded-lg bg-[#3D08BA] text-white px-3 py-2 hover:bg-[#2D0690] transition-colors disabled:opacity-50"
                  disabled={!chatInput.trim()}
                  title="Send message"
                >
                  <FaPaperPlane size={12} />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <div className="text-xs text-gray-600">
                  {isRecording ? (
                    <span className="font-semibold text-red-600">Recording... {formatDuration(recordingSeconds)}</span>
                  ) : isSavingVoice ? (
                    <span className="font-semibold text-[#3D08BA]">Saving voice note...</span>
                  ) : (
                    <span>Hold discussions with short voice notes (max 60 seconds).</span>
                  )}
                </div>

                {isRecording ? (
                  <button
                    onClick={() => {
                      void stopVoiceRecording();
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                  >
                    <FaStopCircle size={11} />
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      void startVoiceRecording();
                    }}
                    disabled={isSavingVoice}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#3D08BA]/30 bg-white px-3 py-1.5 text-xs font-medium text-[#3D08BA] hover:bg-[#3D08BA]/5 disabled:opacity-50"
                  >
                    <FaMicrophone size={11} />
                    Record Voice
                  </button>
                )}
              </div>

              {recordingError && <p className="text-xs text-red-600">{recordingError}</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
