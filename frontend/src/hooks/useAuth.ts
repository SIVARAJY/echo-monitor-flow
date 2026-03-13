import { authenticate, User, UserRole } from '@/lib/sepsisEngine';

/**
 * Authenticate a staff member against the MySQL `staff_users` table
 * via the Express API. Falls back to local hardcoded auth if the API is unreachable.
 */
export async function loginWithDB(
  staffId: string,
  accessKey: string
): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId, accessKey }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        role: data.role as UserRole,
        staffId: data.staffId,
      };
    }

    if (res.status === 401) {
      return null;
    }

    return authenticate(staffId, accessKey);
  } catch {
    return authenticate(staffId, accessKey);
  }
}

/**
 * Register a new staff member in the MySQL database.
 */
export async function registerStaff(data: {
  staffId: string;
  name: string;
  role: UserRole;
  accessKey: string;
  email?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (res.ok) {
      return { success: true };
    }

    return { success: false, error: json.error || 'Registration failed' };
  } catch {
    return { success: false, error: 'Server unreachable. Please try again.' };
  }
}
