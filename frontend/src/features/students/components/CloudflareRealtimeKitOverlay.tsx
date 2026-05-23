import { useEffect, useRef, useState } from 'react';
import { RealtimeKitProvider, useRealtimeKitClient, useRealtimeKitMeeting } from '@cloudflare/realtimekit-react';
import { RtkMeeting } from '@cloudflare/realtimekit-react-ui';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { CloudflareRealtimeKitSession } from '../utils/cloudflareRealtimeKitApi';

type CloudflareRealtimeKitOverlayProps = {
  session: CloudflareRealtimeKitSession;
  onClose: () => void;
  onError?: (message: string) => void;
};

type MeetingLike = {
  leave?: () => Promise<void> | void;
};

const CloudflareRealtimeKitMeetingView = ({ session }: { session: CloudflareRealtimeKitSession }) => {
  const { meeting } = useRealtimeKitMeeting();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.24)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
            Cloudflare Realtime
          </p>
          <h2 className="truncate text-sm font-semibold text-slate-900 sm:text-base">{session.title}</h2>
          <p className="truncate text-[11px] text-slate-500 sm:text-xs">
            Meeting {session.meetingId} • {session.participant.name}
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold capitalize text-sky-700">
          {session.participant.role}
        </span>
      </div>
      <div className="min-h-0 flex-1 bg-slate-100">
        <RtkMeeting meeting={meeting} mode="fill" showSetupScreen />
      </div>
    </div>
  );
};

export default function CloudflareRealtimeKitOverlay({
  session,
  onClose,
  onError,
}: CloudflareRealtimeKitOverlayProps) {
  const [meeting, initMeeting] = useRealtimeKitClient({ resetOnLeave: true });
  const [loadState, setLoadState] = useState<'connecting' | 'ready' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  const meetingRef = useRef<MeetingLike | null>(null);

  useEffect(() => {
    let cancelled = false;

    const connect = async () => {
      setLoadState('connecting');
      setErrorMessage('');

      try {
        const activeMeeting = await initMeeting({
          authToken: session.participant.token,
        });

        if (cancelled) {
          if (activeMeeting?.leave) {
            void Promise.resolve(activeMeeting.leave()).catch(() => undefined);
          }
          return;
        }

        meetingRef.current = activeMeeting ?? null;
        setLoadState('ready');
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error && error.message.trim()
            ? error.message
            : 'Cloudflare RealtimeKit failed to join the room.';
        setLoadState('error');
        setErrorMessage(message);
        onError?.(message);
      }
    };

    void connect();

    return () => {
      cancelled = true;
      const activeMeeting = meetingRef.current;
      meetingRef.current = null;
      if (activeMeeting?.leave) {
        void Promise.resolve(activeMeeting.leave()).catch(() => undefined);
      }
    };
  }, [initMeeting, onError, session.meetingId, session.participant.token]);

  return (
    <div className="fixed inset-0 z-[82] bg-slate-950/82 backdrop-blur-sm">
      <div className="flex h-full flex-col px-3 py-3 sm:px-5 sm:py-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200/85">
              Cloudflare classroom
            </p>
            <h2 className="text-sm font-semibold text-white sm:text-base">
              {session.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
          >
            <XMarkIcon className="h-4 w-4" />
            Close room
          </button>
        </div>

        <div className="min-h-0 flex-1">
          {loadState === 'error' ? (
            <div className="flex h-full items-center justify-center">
              <div className="w-full max-w-lg rounded-[28px] border border-red-200/25 bg-[#10182e] p-6 text-white shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
                <p className="text-sm font-semibold text-red-100">Cloudflare room unavailable</p>
                <p className="mt-2 text-sm text-white/75">
                  {errorMessage || 'The room could not be opened. Continue with the standard Edamaa classroom flow.'}
                </p>
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
                  >
                    Return to classroom
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <RealtimeKitProvider
              value={meeting}
              fallback={
                <div className="flex h-full items-center justify-center">
                  <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#10182e] p-6 text-center text-white shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
                    <p className="text-sm font-semibold text-white">Connecting Cloudflare room...</p>
                    <p className="mt-2 text-sm text-white/70">
                      Preparing audio, video, and meeting access for this class.
                    </p>
                  </div>
                </div>
              }
            >
              <CloudflareRealtimeKitMeetingView session={session} />
            </RealtimeKitProvider>
          )}
        </div>
      </div>
    </div>
  );
}
