import { useEffect, useMemo, useRef, useState } from 'react';

export type MissedCallReason = 'missed' | 'declined';

export type MissedCallEntry = {
  id: string;
  callId: string;
  studentId: number;
  studentName: string;
  mode: 'audio' | 'video';
  reason: MissedCallReason;
  at: string;
};

type StudentIdentity = {
  id: number;
  name: string;
};

type UseMissedCallInboxOptions = {
  storageKey: string;
  students: StudentIdentity[];
  onNewMissedCall?: (entry: MissedCallEntry) => void;
};

const SIGNAL_CHANNEL = 'signal:student-communication';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const MAX_MISSED_CALLS = 60;

const isMissedReason = (value: unknown): value is MissedCallReason =>
  value === 'missed' || value === 'declined';

const parseDateValue = (value: string) => {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function useMissedCallInbox({
  storageKey,
  students,
  onNewMissedCall,
}: UseMissedCallInboxOptions) {
  const [missedCalls, setMissedCalls] = useState<MissedCallEntry[]>([]);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const seenCallIdsRef = useRef<Set<string>>(new Set());

  const studentNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const student of students) {
      map.set(student.id, student.name);
    }
    return map;
  }, [students]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(storageKey);
      if (!rawValue) {
        setMissedCalls([]);
        seenCallIdsRef.current.clear();
        return;
      }

      const parsed = JSON.parse(rawValue) as unknown;
      if (!Array.isArray(parsed)) {
        setMissedCalls([]);
        seenCallIdsRef.current.clear();
        return;
      }

      const normalized: MissedCallEntry[] = parsed
        .map((entry) => (entry && typeof entry === 'object' ? (entry as Partial<MissedCallEntry>) : null))
        .filter((entry): entry is Partial<MissedCallEntry> => entry !== null)
        .filter(
          (entry) =>
            typeof entry.callId === 'string' &&
            Number.isFinite(Number(entry.studentId)) &&
            (entry.mode === 'audio' || entry.mode === 'video')
        )
        .map<MissedCallEntry>((entry) => ({
          id: typeof entry.id === 'string' ? entry.id : `${entry.callId}-${Date.now()}`,
          callId: entry.callId as string,
          studentId: Number(entry.studentId),
          studentName:
            typeof entry.studentName === 'string' && entry.studentName.trim()
              ? entry.studentName.trim()
              : `Student #${Number(entry.studentId)}`,
          mode: entry.mode as 'audio' | 'video',
          reason: entry.reason === 'declined' ? 'declined' : 'missed',
          at: typeof entry.at === 'string' ? entry.at : new Date().toISOString(),
        }))
        .slice(0, MAX_MISSED_CALLS);

      setMissedCalls(normalized);
      seenCallIdsRef.current = new Set(normalized.map((entry) => entry.callId));
    } catch {
      setMissedCalls([]);
      seenCallIdsRef.current.clear();
    }
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams();
    params.set('channel', SIGNAL_CHANNEL);
    params.set('event', 'call.end');
    params.append('reason', 'missed');
    params.append('reason', 'declined');
    params.set('limit', String(MAX_MISSED_CALLS));

    const syncPersistedMissedCalls = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/realtime/call-events?${params.toString()}`);
        if (!response.ok) {
          return;
        }

        const body = (await response.json()) as { items?: unknown };
        if (!body || !Array.isArray(body.items) || cancelled) {
          return;
        }

        const normalizedRemote = body.items
          .map((entry) => (entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : null))
          .filter((entry): entry is Record<string, unknown> => entry !== null)
          .filter((entry) => isMissedReason(entry.reason))
          .filter((entry) => typeof entry.callId === 'string' && Number.isFinite(Number(entry.studentId)))
          .map<MissedCallEntry>((entry) => {
            const studentId = Number(entry.studentId);
            return {
              id: typeof entry.id === 'number' ? String(entry.id) : `${String(entry.callId)}-${Date.now()}`,
              callId: String(entry.callId),
              studentId,
              studentName: studentNameById.get(studentId) || `Student #${studentId}`,
              mode: entry.mode === 'video' ? 'video' : 'audio',
              reason: entry.reason === 'declined' ? 'declined' : 'missed',
              at: typeof entry.publishedAt === 'string' ? entry.publishedAt : new Date().toISOString(),
            };
          })
          .slice(0, MAX_MISSED_CALLS);

        if (normalizedRemote.length === 0 || cancelled) {
          return;
        }

        for (const entry of normalizedRemote) {
          seenCallIdsRef.current.add(entry.callId);
        }

        setMissedCalls((current) => {
          const byCallId = new Map<string, MissedCallEntry>();
          for (const entry of current) {
            byCallId.set(entry.callId, entry);
          }
          for (const entry of normalizedRemote) {
            if (!byCallId.has(entry.callId)) {
              byCallId.set(entry.callId, entry);
            }
          }

          return Array.from(byCallId.values())
            .sort((left, right) => parseDateValue(right.at) - parseDateValue(left.at))
            .slice(0, MAX_MISSED_CALLS);
        });
      } catch {
        // Keep local mode if persisted call history endpoint is unavailable.
      }
    };

    void syncPersistedMissedCalls();

    return () => {
      cancelled = true;
    };
  }, [studentNameById]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(missedCalls));
    } catch {
      // Ignore storage errors in restricted browser contexts.
    }
  }, [missedCalls, storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const source = new EventSource(
      `${API_BASE_URL}/realtime/stream?channel=${encodeURIComponent(SIGNAL_CHANNEL)}`
    );

    // Listen for student-issued missed/declined call endings and keep a local inbox.
    source.onmessage = (messageEvent) => {
      let envelope: Record<string, unknown> | null = null;
      try {
        const parsed = JSON.parse(messageEvent.data) as unknown;
        envelope = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
      } catch {
        envelope = null;
      }

      if (!envelope || envelope.event !== 'call.end') {
        return;
      }

      const payload =
        envelope.payload && typeof envelope.payload === 'object'
          ? (envelope.payload as Record<string, unknown>)
          : null;
      if (!payload) {
        return;
      }

      const senderRole = typeof payload.role === 'string' ? payload.role : '';
      if (senderRole !== 'student') {
        return;
      }

      const reason = payload.reason;
      if (!isMissedReason(reason)) {
        return;
      }

      const callId = typeof payload.callId === 'string' ? payload.callId : '';
      if (!callId || seenCallIdsRef.current.has(callId)) {
        return;
      }

      const eventId = typeof payload.eventId === 'string' ? payload.eventId : '';
      if (eventId) {
        if (seenEventIdsRef.current.has(eventId)) {
          return;
        }
        if (seenEventIdsRef.current.size > 1000) {
          seenEventIdsRef.current.clear();
        }
        seenEventIdsRef.current.add(eventId);
      }

      const studentId = Number(payload.studentId);
      if (!Number.isFinite(studentId)) {
        return;
      }

      seenCallIdsRef.current.add(callId);
      if (seenCallIdsRef.current.size > 500) {
        // Prevent unbounded growth in long-lived sessions.
        seenCallIdsRef.current = new Set(Array.from(seenCallIdsRef.current).slice(-250));
      }

      const entry: MissedCallEntry = {
        id: `${callId}-${Date.now()}`,
        callId,
        studentId,
        studentName: studentNameById.get(studentId) || `Student #${studentId}`,
        mode: payload.mode === 'video' ? 'video' : 'audio',
        reason,
        at: typeof payload.endedAt === 'string' ? payload.endedAt : new Date().toISOString(),
      };

      setMissedCalls((current) => [entry, ...current].slice(0, MAX_MISSED_CALLS));
      onNewMissedCall?.(entry);
    };

    return () => {
      source.close();
    };
  }, [onNewMissedCall, studentNameById]);

  const missedCallsCount = missedCalls.length;

  const missedCountByStudentId = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const call of missedCalls) {
      counts[call.studentId] = (counts[call.studentId] || 0) + 1;
    }
    return counts;
  }, [missedCalls]);

  const recentMissedCalls = useMemo(() => missedCalls.slice(0, 4), [missedCalls]);

  const clearMissedCalls = () => {
    setMissedCalls([]);
    seenCallIdsRef.current.clear();
  };

  return {
    missedCalls,
    missedCallsCount,
    missedCountByStudentId,
    recentMissedCalls,
    clearMissedCalls,
  };
}
