import { loadPersistedAuthEmail } from '../../../utils/schoolBranding';
import { loadSchoolWorkspaceKey } from '../../../utils/schoolBranding';

export type SchoolHostelRoom = {
  id: string;
  block: string;
  roomName: string;
  roomCode: string;
  gender: 'mixed' | 'boys' | 'girls';
  capacity: number;
  occupiedSpaces: number;
  availableSpaces: number;
  occupants: number;
  createdAt: string;
  updatedAt: string;
};

export type SchoolHostelAllocation = {
  id: string;
  roomId: string;
  roomLabel: string;
  studentName: string;
  studentRef: string;
  classGroup: string;
  assignedAt: string;
  status: 'active' | 'released';
  releasedAt: string | null;
};

export type SchoolHostelSummary = {
  totalRooms: number;
  totalCapacity: number;
  occupiedSpaces: number;
  availableSpaces: number;
  occupiedRooms: number;
};

type SchoolHostelWorkspace = {
  rooms: SchoolHostelRoom[];
  allocations: SchoolHostelAllocation[];
};

const STORAGE_KEY = 'edamaa_school_hostel_workspace_v1';

const createEmptySummary = (): SchoolHostelSummary => ({
  totalRooms: 0,
  totalCapacity: 0,
  occupiedSpaces: 0,
  availableSpaces: 0,
  occupiedRooms: 0,
});

const createEmptyWorkspace = (): SchoolHostelWorkspace => ({
  rooms: [],
  allocations: [],
});

const readStore = (): Record<string, SchoolHostelWorkspace> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, SchoolHostelWorkspace>) : {};
  } catch {
    return {};
  }
};

const writeStore = (value: Record<string, SchoolHostelWorkspace>) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage errors in MVP local mode.
  }
};

const normalizeKeyPart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const resolveWorkspaceKey = () => {
  const workspaceKey = normalizeKeyPart(loadSchoolWorkspaceKey());
  if (workspaceKey) {
    return workspaceKey;
  }

  const authEmail = loadPersistedAuthEmail().split('@')[0] || '';
  const emailKey = normalizeKeyPart(authEmail);
  return emailKey || 'school-workspace';
};

const cloneWorkspace = (workspace: SchoolHostelWorkspace): SchoolHostelWorkspace => ({
  rooms: workspace.rooms.map((room) => ({ ...room })),
  allocations: workspace.allocations.map((allocation) => ({ ...allocation })),
});

const getWorkspace = () => {
  const store = readStore();
  const workspaceKey = resolveWorkspaceKey();
  const existing = store[workspaceKey];
  return {
    store,
    workspaceKey,
    workspace: existing ? cloneWorkspace(existing) : createEmptyWorkspace(),
  };
};

const saveWorkspace = (
  store: Record<string, SchoolHostelWorkspace>,
  workspaceKey: string,
  workspace: SchoolHostelWorkspace
) => {
  store[workspaceKey] = cloneWorkspace(workspace);
  writeStore(store);
};

const refreshRoomOccupancy = (workspace: SchoolHostelWorkspace) => {
  const activeAllocationsByRoom = workspace.allocations.reduce<Record<string, number>>((accumulator, allocation) => {
    if (allocation.status === 'active') {
      accumulator[allocation.roomId] = (accumulator[allocation.roomId] || 0) + 1;
    }
    return accumulator;
  }, {});

  workspace.rooms = workspace.rooms.map((room) => {
    const occupiedSpaces = activeAllocationsByRoom[room.id] || 0;
    const capacity = Math.max(1, Number(room.capacity) || 1);
    return {
      ...room,
      capacity,
      occupants: occupiedSpaces,
      occupiedSpaces,
      availableSpaces: Math.max(0, capacity - occupiedSpaces),
      updatedAt: new Date().toISOString(),
    };
  });
};

const buildSummary = (workspace: SchoolHostelWorkspace): SchoolHostelSummary =>
  workspace.rooms.reduce<SchoolHostelSummary>(
    (summary, room) => {
      summary.totalRooms += 1;
      summary.totalCapacity += room.capacity;
      summary.occupiedSpaces += room.occupiedSpaces;
      summary.availableSpaces += room.availableSpaces;
      if (room.occupiedSpaces > 0) {
        summary.occupiedRooms += 1;
      }
      return summary;
    },
    createEmptySummary()
  );

export const fetchSchoolHostelOverview = async () => {
  const { workspace } = getWorkspace();
  refreshRoomOccupancy(workspace);

  return {
    summary: buildSummary(workspace),
    rooms: workspace.rooms,
    allocations: workspace.allocations
      .slice()
      .sort((left, right) => new Date(right.assignedAt).getTime() - new Date(left.assignedAt).getTime()),
  };
};

export const createSchoolHostelRoom = async (payload: {
  block: string;
  roomName: string;
  roomCode?: string;
  gender: SchoolHostelRoom['gender'];
  capacity: number;
}) => {
  const block = String(payload.block || '').trim();
  const roomName = String(payload.roomName || '').trim();
  const roomCode = String(payload.roomCode || '').trim();
  const capacity = Math.max(1, Number(payload.capacity) || 1);

  if (!block || !roomName) {
    throw new Error('Block and room name are required.');
  }

  const { store, workspaceKey, workspace } = getWorkspace();
  const normalizedRoomKey = `${block.toLowerCase()}::${roomName.toLowerCase()}`;
  const duplicate = workspace.rooms.some(
    (room) => `${room.block.toLowerCase()}::${room.roomName.toLowerCase()}` === normalizedRoomKey
  );

  if (duplicate) {
    throw new Error('This room already exists in the hostel register.');
  }

  const now = new Date().toISOString();
  workspace.rooms.unshift({
    id: `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    block,
    roomName,
    roomCode,
    gender: payload.gender || 'mixed',
    capacity,
    occupiedSpaces: 0,
    availableSpaces: capacity,
    occupants: 0,
    createdAt: now,
    updatedAt: now,
  });

  refreshRoomOccupancy(workspace);
  saveWorkspace(store, workspaceKey, workspace);

  return {
    summary: buildSummary(workspace),
    rooms: workspace.rooms,
    allocations: workspace.allocations,
  };
};

export const assignSchoolHostelStudent = async (payload: {
  roomId: string;
  studentName: string;
  studentRef?: string;
  classGroup?: string;
}) => {
  const roomId = String(payload.roomId || '').trim();
  const studentName = String(payload.studentName || '').trim();
  const studentRef = String(payload.studentRef || '').trim();
  const classGroup = String(payload.classGroup || '').trim();

  if (!roomId || !studentName) {
    throw new Error('Select a room and enter the student name.');
  }

  const { store, workspaceKey, workspace } = getWorkspace();
  refreshRoomOccupancy(workspace);

  const room = workspace.rooms.find((entry) => entry.id === roomId) || null;
  if (!room) {
    throw new Error('The selected room could not be found.');
  }

  if (room.availableSpaces <= 0) {
    throw new Error('This room is already full.');
  }

  const duplicateActiveAllocation = workspace.allocations.some(
    (allocation) =>
      allocation.status === 'active' &&
      allocation.studentName.toLowerCase() === studentName.toLowerCase() &&
      allocation.roomId === roomId
  );
  if (duplicateActiveAllocation) {
    throw new Error('This student is already assigned to the selected room.');
  }

  workspace.allocations.unshift({
    id: `alloc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    roomId: room.id,
    roomLabel: `${room.block} • ${room.roomName}`,
    studentName,
    studentRef,
    classGroup,
    assignedAt: new Date().toISOString(),
    status: 'active',
    releasedAt: null,
  });

  refreshRoomOccupancy(workspace);
  saveWorkspace(store, workspaceKey, workspace);

  return {
    summary: buildSummary(workspace),
    rooms: workspace.rooms,
    allocations: workspace.allocations,
  };
};

export const releaseSchoolHostelAllocation = async (allocationId: string) => {
  const normalizedId = String(allocationId || '').trim();
  if (!normalizedId) {
    throw new Error('Select an allocation to release.');
  }

  const { store, workspaceKey, workspace } = getWorkspace();
  const allocation = workspace.allocations.find((entry) => entry.id === normalizedId) || null;

  if (!allocation) {
    throw new Error('The hostel allocation could not be found.');
  }

  if (allocation.status === 'released') {
    return {
      summary: buildSummary(workspace),
      rooms: workspace.rooms,
      allocations: workspace.allocations,
    };
  }

  allocation.status = 'released';
  allocation.releasedAt = new Date().toISOString();

  refreshRoomOccupancy(workspace);
  saveWorkspace(store, workspaceKey, workspace);

  return {
    summary: buildSummary(workspace),
    rooms: workspace.rooms,
    allocations: workspace.allocations,
  };
};
