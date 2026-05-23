import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  HomeModernIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../../components/layout/school-layout/NavBar';
import { loadSchoolHasHostelPreference } from '../../../utils/schoolBranding';
import {
  assignSchoolHostelStudent,
  createSchoolHostelRoom,
  fetchSchoolHostelOverview,
  releaseSchoolHostelAllocation,
  type SchoolHostelAllocation,
  type SchoolHostelRoom,
  type SchoolHostelSummary,
} from '../utils/schoolHostelApi';

type RoomFormState = {
  block: string;
  roomName: string;
  roomCode: string;
  gender: SchoolHostelRoom['gender'];
  capacity: string;
};

type AllocationFormState = {
  roomId: string;
  studentName: string;
  studentRef: string;
  classGroup: string;
};

const createRoomForm = (): RoomFormState => ({
  block: '',
  roomName: '',
  roomCode: '',
  gender: 'mixed',
  capacity: '4',
});

const createAllocationForm = (roomId = ''): AllocationFormState => ({
  roomId,
  studentName: '',
  studentRef: '',
  classGroup: '',
});

const createSummary = (): SchoolHostelSummary => ({
  totalRooms: 0,
  totalCapacity: 0,
  occupiedSpaces: 0,
  availableSpaces: 0,
  occupiedRooms: 0,
});

const summaryCards: Array<{
  key: keyof SchoolHostelSummary;
  label: string;
  description: string;
  accentClassName: string;
  icon: typeof HomeModernIcon;
}> = [
  {
    key: 'totalRooms',
    label: 'Rooms ready',
    description: 'Registered hostel rooms',
    accentClassName: 'bg-[#3D08BA]/10 text-[#3D08BA]',
    icon: HomeModernIcon,
  },
  {
    key: 'totalCapacity',
    label: 'Total spaces',
    description: 'Bed capacity across rooms',
    accentClassName: 'bg-sky-100 text-sky-700',
    icon: BuildingOffice2Icon,
  },
  {
    key: 'occupiedSpaces',
    label: 'Occupied now',
    description: 'Students currently assigned',
    accentClassName: 'bg-amber-100 text-amber-700',
    icon: UserGroupIcon,
  },
  {
    key: 'availableSpaces',
    label: 'Available spaces',
    description: 'Vacant spaces ready to allocate',
    accentClassName: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircleIcon,
  },
];

const getOccupancyBarClassName = (room: SchoolHostelRoom) => {
  if (room.capacity <= 0) {
    return 'bg-gray-200';
  }
  const ratio = room.occupiedSpaces / room.capacity;
  if (ratio >= 0.9) {
    return 'bg-rose-500';
  }
  if (ratio >= 0.5) {
    return 'bg-amber-500';
  }
  return 'bg-emerald-500';
};

const getAllocationStatusClassName = (status: SchoolHostelAllocation['status']) =>
  status === 'released'
    ? 'border-slate-200 bg-slate-100 text-slate-600'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700';

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }

  return parsed.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const matchesSearch = (value: string, searchTerm: string) =>
  value.toLowerCase().includes(searchTerm.toLowerCase().trim());

const SchoolHostel = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SchoolHostelSummary>(createSummary());
  const [rooms, setRooms] = useState<SchoolHostelRoom[]>([]);
  const [allocations, setAllocations] = useState<SchoolHostelAllocation[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingRoom, setSavingRoom] = useState(false);
  const [savingAllocation, setSavingAllocation] = useState(false);
  const [activeAllocationId, setActiveAllocationId] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState<RoomFormState>(createRoomForm());
  const [allocationForm, setAllocationForm] = useState<AllocationFormState>(createAllocationForm());
  const [roomQuery, setRoomQuery] = useState('');
  const [allocationQuery, setAllocationQuery] = useState('');

  const hostelEnabled = loadSchoolHasHostelPreference();

  const loadOverview = async (nextNotice?: string) => {
    setLoading(true);
    try {
      const payload = await fetchSchoolHostelOverview();
      setSummary(payload.summary);
      setRooms(Array.isArray(payload.rooms) ? payload.rooms : []);
      setAllocations(Array.isArray(payload.allocations) ? payload.allocations : []);
      setNotice(nextNotice || '');
    } catch (error) {
      setSummary(createSummary());
      setRooms([]);
      setAllocations([]);
      setNotice(error instanceof Error ? error.message : 'Could not load hostel records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const availableRooms = useMemo(
    () => rooms.filter((room) => room.availableSpaces > 0),
    [rooms]
  );

  useEffect(() => {
    if (availableRooms.length === 0) {
      setAllocationForm((current) => ({ ...current, roomId: '' }));
      return;
    }

    const hasSelectedRoom = availableRooms.some((room) => room.id === allocationForm.roomId);
    if (!hasSelectedRoom) {
      setAllocationForm((current) => ({ ...current, roomId: availableRooms[0]?.id || '' }));
    }
  }, [allocationForm.roomId, availableRooms]);

  const filteredRooms = useMemo(() => {
    const searchTerm = roomQuery.trim().toLowerCase();
    if (!searchTerm) {
      return rooms;
    }

    return rooms.filter((room) =>
      [room.block, room.roomName, room.roomCode, room.gender].some((value) => matchesSearch(value, searchTerm))
    );
  }, [roomQuery, rooms]);

  const filteredAllocations = useMemo(() => {
    const searchTerm = allocationQuery.trim().toLowerCase();
    if (!searchTerm) {
      return allocations;
    }

    return allocations.filter((allocation) =>
      [
        allocation.studentName,
        allocation.studentRef,
        allocation.classGroup,
        allocation.roomLabel,
        allocation.status,
      ].some((value) => matchesSearch(value, searchTerm))
    );
  }, [allocationQuery, allocations]);

  const handleRoomSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingRoom(true);

    try {
      const payload = await createSchoolHostelRoom({
        block: roomForm.block,
        roomName: roomForm.roomName,
        roomCode: roomForm.roomCode,
        gender: roomForm.gender,
        capacity: Number(roomForm.capacity) || 1,
      });

      setSummary(payload.summary);
      setRooms(payload.rooms);
      setAllocations(payload.allocations);
      setRoomForm(createRoomForm());
      setNotice('Hostel room added.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save the hostel room.');
    } finally {
      setSavingRoom(false);
    }
  };

  const handleAllocationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingAllocation(true);

    try {
      const payload = await assignSchoolHostelStudent({
        roomId: allocationForm.roomId,
        studentName: allocationForm.studentName,
        studentRef: allocationForm.studentRef,
        classGroup: allocationForm.classGroup,
      });

      setSummary(payload.summary);
      setRooms(payload.rooms);
      setAllocations(payload.allocations);
      setAllocationForm(createAllocationForm(payload.rooms.find((room) => room.availableSpaces > 0)?.id || ''));
      setNotice('Student assigned to hostel room.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not assign the student.');
    } finally {
      setSavingAllocation(false);
    }
  };

  const handleRelease = async (allocationId: string) => {
    setActiveAllocationId(allocationId);

    try {
      const payload = await releaseSchoolHostelAllocation(allocationId);
      setSummary(payload.summary);
      setRooms(payload.rooms);
      setAllocations(payload.allocations);
      setNotice('Hostel allocation released.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not release the hostel allocation.');
    } finally {
      setActiveAllocationId(null);
    }
  };

  if (!hostelEnabled) {
    return (
      <div className="min-h-screen bg-slate-100 pb-20">
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
            <button
              type="button"
              onClick={() => navigate('/school-dashboard')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to dashboard
            </button>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
              Hostel Management
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">Hostel access is turned off</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              This school has not enabled hostel operations yet. Turn on
              <span className="font-semibold text-slate-800"> School operates a hostel </span>
              in settings if you need room allocation and occupancy tracking.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="rounded-full bg-[#3D08BA] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2f0693]"
              >
                Open school settings
              </button>
            </div>
          </div>
        </main>
        <NavBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="bg-[linear-gradient(135deg,rgba(61,8,186,0.08),rgba(255,255,255,0.98)_50%,rgba(14,165,233,0.08))] px-6 py-7 sm:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <button
                  type="button"
                  onClick={() => navigate('/school-dashboard')}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Back to dashboard
                </button>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                  Hostel Management
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900">Rooms, spaces, and occupancy</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  Keep boarding operations clear. Register rooms, assign students, and see which hostel spaces are full
                  or vacant from one place.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('hostel-room-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="rounded-full bg-[#3D08BA] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2f0693]"
                >
                  Register room
                </button>
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('hostel-allocation-form')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  }}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Assign student
                </button>
                <button
                  type="button"
                  onClick={() => void loadOverview('Hostel records refreshed.')}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {notice ? (
            <div className="border-t border-blue-100 bg-blue-50 px-6 py-3 text-sm text-blue-700 sm:px-8">{notice}</div>
          ) : null}

          <div className="px-6 py-6 sm:px-8">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
                        <p className="mt-3 text-3xl font-semibold text-slate-900">{summary[card.key]}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{card.description}</p>
                      </div>
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.accentClassName}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.95fr)]">
              <section className="grid gap-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">Room register</p>
                      <h2 className="mt-2 text-xl font-semibold text-slate-900">Hostel rooms</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Review capacity, see room pressure, and identify where spaces are still open.
                      </p>
                    </div>
                    <label className="relative block w-full max-w-sm">
                      <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={roomQuery}
                        onChange={(event) => setRoomQuery(event.target.value)}
                        placeholder="Search block, room, code, or gender"
                        className="w-full rounded-full border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA] focus:bg-white"
                      />
                    </label>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {loading ? (
                      <p className="text-sm text-slate-500">Loading hostel rooms...</p>
                    ) : filteredRooms.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                        No hostel rooms yet. Register the first room to start assigning students.
                      </div>
                    ) : (
                      filteredRooms.map((room) => {
                        const occupancyRatio = room.capacity > 0 ? Math.round((room.occupiedSpaces / room.capacity) * 100) : 0;
                        return (
                          <article key={room.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3D08BA]">{room.block}</p>
                                <h3 className="mt-2 text-lg font-semibold text-slate-900">{room.roomName}</h3>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {room.roomCode ? (
                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                                      {room.roomCode}
                                    </span>
                                  ) : null}
                                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium capitalize text-slate-600">
                                    {room.gender}
                                  </span>
                                </div>
                              </div>
                              <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Capacity</p>
                                <p className="mt-1 text-lg font-semibold text-slate-900">{room.capacity}</p>
                              </div>
                            </div>

                            <div className="mt-5">
                              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                                <span>Occupancy</span>
                                <span>{room.occupiedSpaces}/{room.capacity} filled</span>
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-slate-200">
                                <div
                                  className={`h-2 rounded-full ${getOccupancyBarClassName(room)}`}
                                  style={{ width: `${Math.max(6, occupancyRatio)}%` }}
                                />
                              </div>
                            </div>

                            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                              <div className="rounded-2xl bg-white px-3 py-3 text-center shadow-sm">
                                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Occupied</p>
                                <p className="mt-2 font-semibold text-slate-900">{room.occupiedSpaces}</p>
                              </div>
                              <div className="rounded-2xl bg-white px-3 py-3 text-center shadow-sm">
                                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vacant</p>
                                <p className="mt-2 font-semibold text-emerald-700">{room.availableSpaces}</p>
                              </div>
                              <div className="rounded-2xl bg-white px-3 py-3 text-center shadow-sm">
                                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Students</p>
                                <p className="mt-2 font-semibold text-slate-900">{room.occupants}</p>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                        Allocation activity
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-slate-900">Student room assignments</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        See current hostel placements and release students when they vacate a room.
                      </p>
                    </div>
                    <label className="relative block w-full max-w-sm">
                      <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={allocationQuery}
                        onChange={(event) => setAllocationQuery(event.target.value)}
                        placeholder="Search student, room, class, or status"
                        className="w-full rounded-full border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA] focus:bg-white"
                      />
                    </label>
                  </div>

                  <div className="mt-5 grid gap-4">
                    {loading ? (
                      <p className="text-sm text-slate-500">Loading hostel allocations...</p>
                    ) : filteredAllocations.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                        No student allocation recorded yet.
                      </div>
                    ) : (
                      filteredAllocations.map((allocation) => (
                        <article
                          key={allocation.id}
                          className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-semibold text-slate-900">{allocation.studentName}</h3>
                                <span
                                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getAllocationStatusClassName(
                                    allocation.status
                                  )}`}
                                >
                                  {allocation.status}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-slate-600">{allocation.roomLabel}</p>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                                {allocation.studentRef ? (
                                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                                    Ref: {allocation.studentRef}
                                  </span>
                                ) : null}
                                {allocation.classGroup ? (
                                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                                    Class: {allocation.classGroup}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="rounded-2xl bg-white px-4 py-3 text-sm shadow-sm">
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Assigned</p>
                              <p className="mt-1 font-medium text-slate-700">{formatDateTime(allocation.assignedAt)}</p>
                              {allocation.releasedAt ? (
                                <>
                                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">Released</p>
                                  <p className="mt-1 font-medium text-slate-700">{formatDateTime(allocation.releasedAt)}</p>
                                </>
                              ) : null}
                            </div>
                          </div>

                          {allocation.status === 'active' ? (
                            <div className="mt-4 flex justify-end">
                              <button
                                type="button"
                                onClick={() => void handleRelease(allocation.id)}
                                disabled={activeAllocationId === allocation.id}
                                className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {activeAllocationId === allocation.id ? 'Releasing...' : 'Release room'}
                              </button>
                            </div>
                          ) : null}
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </section>

              <aside className="grid gap-6">
                <form
                  id="hostel-room-form"
                  onSubmit={handleRoomSubmit}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">Register room</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">Add a hostel room</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Create the room first, then assign students into the available spaces.
                  </p>

                  <div className="mt-5 grid gap-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">Block</span>
                      <input
                        type="text"
                        value={roomForm.block}
                        onChange={(event) => setRoomForm((current) => ({ ...current, block: event.target.value }))}
                        placeholder="Rose Block"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">Room name</span>
                      <input
                        type="text"
                        value={roomForm.roomName}
                        onChange={(event) => setRoomForm((current) => ({ ...current, roomName: event.target.value }))}
                        placeholder="Room A1"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">Reference code</span>
                      <input
                        type="text"
                        value={roomForm.roomCode}
                        onChange={(event) => setRoomForm((current) => ({ ...current, roomCode: event.target.value }))}
                        placeholder="HB-A1"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">Room type</span>
                      <select
                        value={roomForm.gender}
                        onChange={(event) =>
                          setRoomForm((current) => ({
                            ...current,
                            gender: event.target.value as SchoolHostelRoom['gender'],
                          }))
                        }
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                      >
                        <option value="mixed">Mixed</option>
                        <option value="boys">Boys</option>
                        <option value="girls">Girls</option>
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">Capacity</span>
                      <input
                        type="number"
                        min="1"
                        value={roomForm.capacity}
                        onChange={(event) => setRoomForm((current) => ({ ...current, capacity: event.target.value }))}
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={savingRoom}
                    className="mt-5 w-full rounded-full bg-[#3D08BA] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2f0693] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingRoom ? 'Saving room...' : 'Save hostel room'}
                  </button>
                </form>

                <form
                  id="hostel-allocation-form"
                  onSubmit={handleAllocationSubmit}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">Assign student</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">Allocate a room space</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Pick any room with vacancy and assign the student into the next available space.
                  </p>

                  <div className="mt-5 grid gap-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">Available room</span>
                      <select
                        value={allocationForm.roomId}
                        onChange={(event) =>
                          setAllocationForm((current) => ({ ...current, roomId: event.target.value }))
                        }
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                      >
                        {availableRooms.length === 0 ? (
                          <option value="">No room with vacancy yet</option>
                        ) : (
                          availableRooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.block} • {room.roomName} ({room.availableSpaces} space
                              {room.availableSpaces === 1 ? '' : 's'} left)
                            </option>
                          ))
                        )}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">Student name</span>
                      <input
                        type="text"
                        value={allocationForm.studentName}
                        onChange={(event) =>
                          setAllocationForm((current) => ({ ...current, studentName: event.target.value }))
                        }
                        placeholder="Amina Yusuf"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">Student ID / admission no.</span>
                      <input
                        type="text"
                        value={allocationForm.studentRef}
                        onChange={(event) =>
                          setAllocationForm((current) => ({ ...current, studentRef: event.target.value }))
                        }
                        placeholder="STD-2041"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">Class / level</span>
                      <input
                        type="text"
                        value={allocationForm.classGroup}
                        onChange={(event) =>
                          setAllocationForm((current) => ({ ...current, classGroup: event.target.value }))
                        }
                        placeholder="JSS 2 Blue"
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={savingAllocation || availableRooms.length === 0}
                    className="mt-5 w-full rounded-full bg-[#3D08BA] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2f0693] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingAllocation ? 'Assigning student...' : 'Assign to hostel room'}
                  </button>
                </form>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <NavBar />
    </div>
  );
};

export default SchoolHostel;
