import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deactivateAccountRole,
  fetchMyAccountRoles,
  requestAccountRoleChange,
  switchDefaultAccountRole,
  type AccountRoleStateResponse,
} from './utils/accountRolesApi';
import {
  getDefaultHomeRouteForRole,
  loadPersistedLocalDevAuthSession,
  persistAccountRoleState,
  persistLocalDevAuthSession,
  type AppAccountRole,
} from '../../utils/authSession';

const requestableRoleLabels: Record<'tutor' | 'school', string> = {
  tutor: 'Tutor',
  school: 'School',
};

const AccountRoles = () => {
  const navigate = useNavigate();
  const [roleState, setRoleState] = useState<AccountRoleStateResponse | null>(null);
  const [selectedRequestRole, setSelectedRequestRole] = useState<'tutor' | 'school'>('tutor');
  const [requestNote, setRequestNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');

  const activeRoles = roleState?.activeRoles || [];
  const defaultRole = roleState?.user.defaultRole || 'student';

  const requestableRoles = useMemo(() => {
    if (!roleState) {
      return ['tutor', 'school'] as Array<'tutor' | 'school'>;
    }

    return roleState.canRequestRoles.filter(
      (role): role is 'tutor' | 'school' => role === 'tutor' || role === 'school'
    );
  }, [roleState]);

  const applyRoleState = (nextState: AccountRoleStateResponse) => {
    setRoleState(nextState);
    persistAccountRoleState({
      defaultRole: nextState.user.defaultRole,
      activeRoles: nextState.activeRoles,
      source: 'backend',
    });

    const localDev = loadPersistedLocalDevAuthSession();
    if (localDev?.email) {
      persistLocalDevAuthSession(localDev.email, nextState.user.defaultRole, {
        defaultRole: nextState.user.defaultRole,
        activeRoles: nextState.activeRoles,
      });
    }
  };

  const loadRoleState = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const payload = await fetchMyAccountRoles();
      applyRoleState(payload);
      if (payload.canRequestRoles.includes(selectedRequestRole)) {
        setSelectedRequestRole(selectedRequestRole);
      } else if (payload.canRequestRoles.includes('tutor')) {
        setSelectedRequestRole('tutor');
      } else if (payload.canRequestRoles.includes('school')) {
        setSelectedRequestRole('school');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load account role settings.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRoleState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwitchRole = async (role: AppAccountRole) => {
    setIsSubmitting(true);
    setErrorMessage('');
    setNotice('');

    try {
      const payload = await switchDefaultAccountRole(role);
      applyRoleState(payload.roleState);
      setNotice(payload.message);
      navigate(getDefaultHomeRouteForRole(payload.roleState.user.defaultRole), { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to switch role right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateRole = async (role: AppAccountRole) => {
    setIsSubmitting(true);
    setErrorMessage('');
    setNotice('');

    try {
      const payload = await deactivateAccountRole(role);
      applyRoleState(payload.roleState);
      setNotice(payload.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to deactivate this role right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRole = async () => {
    if (!requestableRoles.includes(selectedRequestRole)) {
      setErrorMessage('This role is already active or already pending review.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setNotice('');

    try {
      const payload = await requestAccountRoleChange({
        targetRole: selectedRequestRole,
        note: requestNote,
      });
      applyRoleState(payload.roleState);
      setNotice(payload.message);
      setRequestNote('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to submit your role upgrade request right now.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Account Roles</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage how you enter Edamaa: student, tutor, or school dashboard.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(getDefaultHomeRouteForRole(defaultRole))}
              className="rounded-xl border border-[#3D08BA] px-4 py-2 text-sm font-medium text-[#3D08BA] hover:bg-[#f7f2ff]"
            >
              Back to Dashboard
            </button>
          </div>

          {errorMessage && (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          )}

          {notice && (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {notice}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Active Roles</h2>

          {isLoading && <p className="mt-3 text-sm text-gray-600">Loading role state...</p>}

          {!isLoading && roleState && (
            <div className="mt-4 space-y-3">
              {roleState.roles.map((role) => {
                const isActive = role.status === 'active';
                const isDefault = role.isDefault;

                return (
                  <div
                    key={role.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {role.role.charAt(0).toUpperCase() + role.role.slice(1)}
                        {isDefault ? ' (Default)' : ''}
                      </p>
                      <p className="text-xs text-gray-500">
                        Status: {role.status} {isActive && role.activatedAt ? `• Activated ${new Date(role.activatedAt).toLocaleString()}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isActive && !isDefault && (
                        <button
                          type="button"
                          onClick={() => void handleSwitchRole(role.role)}
                          disabled={isSubmitting}
                          className="rounded-lg border border-[#3D08BA] px-3 py-1.5 text-xs font-semibold text-[#3D08BA] hover:bg-[#f7f2ff] disabled:opacity-60"
                        >
                          Switch To This
                        </button>
                      )}

                      {isActive && activeRoles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => void handleDeactivateRole(role.role)}
                          disabled={isSubmitting}
                          className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Request New Role</h2>
          <p className="mt-1 text-sm text-gray-600">
            If you are now certified, request tutor or school access for admin review.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              Role to request
              <select
                value={selectedRequestRole}
                onChange={(event) => setSelectedRequestRole(event.target.value as 'tutor' | 'school')}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#3D08BA]"
              >
                {(['tutor', 'school'] as const).map((role) => (
                  <option key={role} value={role} disabled={!requestableRoles.includes(role)}>
                    {requestableRoleLabels[role]}
                    {!requestableRoles.includes(role) ? ' (Unavailable)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 block text-sm font-medium text-gray-700">
            Note for admin review (optional)
            <textarea
              value={requestNote}
              onChange={(event) => setRequestNote(event.target.value)}
              rows={4}
              placeholder="Add short details about your certification or school credentials."
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#3D08BA]"
            />
          </label>

          <button
            type="button"
            onClick={() => void handleRequestRole()}
            disabled={isSubmitting || requestableRoles.length === 0}
            className="mt-4 rounded-xl bg-[#3D08BA] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Submit Role Request
          </button>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Pending Requests</h2>
          <div className="mt-3 space-y-3">
            {(roleState?.pendingRequests || []).map((request) => (
              <div key={request.id} className="rounded-xl border border-gray-200 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">
                  {request.targetRole.charAt(0).toUpperCase() + request.targetRole.slice(1)} request
                </p>
                <p className="text-xs text-gray-500">
                  Status: {request.status} • Submitted {new Date(request.createdAt).toLocaleString()}
                </p>
                {request.note && <p className="mt-2 text-sm text-gray-700">{request.note}</p>}
                {request.rejectionReason && (
                  <p className="mt-2 text-sm text-rose-700">Reason: {request.rejectionReason}</p>
                )}
              </div>
            ))}
            {!roleState?.pendingRequests?.length && (
              <p className="text-sm text-gray-600">No pending role requests.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountRoles;
