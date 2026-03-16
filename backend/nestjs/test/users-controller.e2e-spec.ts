import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';

describe('UsersController (route contract)', () => {
  let controller: UsersController;

  const usersServiceMock = {
    findAllForAuthUser: jest.fn(),
    listTutorDirectoryForAuthUser: jest.fn(),
    create: jest.fn(),
  };

  beforeAll(() => {
    controller = new UsersController(usersServiceMock as unknown as UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists tutors for school/admin auth users', async () => {
    const payload = {
      tutors: [
        {
          id: '7',
          email: 'tutor@edamaa.dev',
          name: 'Tutor One',
          role: 'tutor',
          joinedAt: new Date().toISOString(),
          activeRoles: ['tutor'],
        },
      ],
    };
    usersServiceMock.listTutorDirectoryForAuthUser.mockResolvedValue(payload);

    const request = {
      user: {
        id: 'school-user-1',
        email: 'school@edamaa.dev',
        app_metadata: { role: 'school' },
        user_metadata: { full_name: 'School Admin' },
      },
    } as any;

    const response = await controller.listTutorDirectory(request, 'math');

    expect(response).toEqual(payload);
    expect(usersServiceMock.listTutorDirectoryForAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'school-user-1',
        email: 'school@edamaa.dev',
        role: 'school',
        name: 'School Admin',
      }),
      expect.objectContaining({
        search: 'math',
      })
    );
  });
});
