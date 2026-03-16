import { SchoolScheduleController } from '../src/school-schedule/school-schedule.controller';
import { SchoolScheduleService } from '../src/school-schedule/school-schedule.service';

describe('SchoolScheduleController (route contract)', () => {
  let controller: SchoolScheduleController;

  const schoolScheduleServiceMock = {
    listSessionsForAuthUser: jest.fn(),
    createSessionForAuthUser: jest.fn(),
    deleteSessionForAuthUser: jest.fn(),
  };

  beforeAll(() => {
    controller = new SchoolScheduleController(
      schoolScheduleServiceMock as unknown as SchoolScheduleService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists sessions with parsed auth context and query filters', async () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      school: {
        userId: '12',
        email: 'school@edamaa.dev',
        name: 'Edamaa School',
      },
      sessions: [],
    };
    schoolScheduleServiceMock.listSessionsForAuthUser.mockResolvedValue(payload);

    const request = {
      user: {
        id: 'school-auth-1',
        email: 'school@edamaa.dev',
        app_metadata: { role: 'school' },
        user_metadata: { full_name: 'School Admin' },
      },
    } as any;

    const response = await controller.listMySchoolSessions(
      request,
      'math',
      'upcoming',
      '2026-03-01',
      '2026-03-30',
      undefined
    );

    expect(response).toEqual(payload);
    expect(schoolScheduleServiceMock.listSessionsForAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'school-auth-1',
        email: 'school@edamaa.dev',
        role: 'school',
        name: 'School Admin',
      }),
      expect.objectContaining({
        search: 'math',
        status: 'upcoming',
        dateFrom: '2026-03-01',
        dateTo: '2026-03-30',
      })
    );
  });

  it('creates a school schedule session', async () => {
    const payload = {
      session: {
        id: 'SCH-0001',
        title: 'SS2 Biology',
      },
      message: 'Class session scheduled successfully.',
    };
    schoolScheduleServiceMock.createSessionForAuthUser.mockResolvedValue(payload);

    const request = {
      user: {
        id: 'school-auth-2',
        email: 'school2@edamaa.dev',
        role: 'school',
        user_metadata: {},
      },
    } as any;

    const response = await controller.createSchoolSession(request, {
      title: 'SS2 Biology',
      subject: 'Biology',
      instructor: 'Mrs. Lara',
      startAt: new Date().toISOString(),
      durationMinutes: 60,
      expectedStudents: 28,
      roomCode: 'ROOM-BIO-1',
      notes: 'Practical session',
    });

    expect(response).toEqual(payload);
    expect(schoolScheduleServiceMock.createSessionForAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'school2@edamaa.dev',
      }),
      expect.objectContaining({
        title: 'SS2 Biology',
        subject: 'Biology',
        instructor: 'Mrs. Lara',
        durationMinutes: 60,
        expectedStudents: 28,
        roomCode: 'ROOM-BIO-1',
      })
    );
  });

  it('deletes a school schedule session', async () => {
    const payload = {
      sessionId: 'SCH-0009',
      message: 'Class session removed from schedule.',
    };
    schoolScheduleServiceMock.deleteSessionForAuthUser.mockResolvedValue(payload);

    const request = {
      user: {
        id: 'school-auth-3',
        email: 'school3@edamaa.dev',
        role: 'school',
      },
    } as any;

    const response = await controller.deleteSchoolSession(request, 'SCH-0009', undefined);

    expect(response).toEqual(payload);
    expect(schoolScheduleServiceMock.deleteSessionForAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'school3@edamaa.dev',
        role: 'school',
      }),
      'SCH-0009',
      expect.any(Object)
    );
  });
});
