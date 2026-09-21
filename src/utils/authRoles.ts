import { UserRole } from '../types';

const STORAGE_KEY_ROLE = 'stock_record_user_role';
const STORAGE_KEY_PIN = 'stock_record_admin_pin';
const STORAGE_KEY_USER_PIN = 'stock_record_user_pin';
const STORAGE_KEY_OPERATOR_NAME = 'stock_record_operator_name';
const SESSION_KEY_LOGGED_IN = 'stock_record_session_logged_in';

export const DEFAULT_ADMIN_PIN = 'admin123';
export const ALT_ADMIN_PIN = '5811242';
export const DEFAULT_USER_PIN = 'user123';

/**
 * 10 minutes idle timeout in milliseconds
 */
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 600,000 ms = 10 minutes
export const IDLE_WARNING_MS = 9 * 60 * 1000; // 540,000 ms = 9 minutes

/**
 * Reset Admin PIN back to default (clears any customized PIN in localStorage)
 */
export function resetAdminPinToDefault(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PIN);
  } catch (err) {
    console.error('Failed to reset admin pin:', err);
  }
}

/**
 * Reset User PIN back to default
 */
export function resetUserPinToDefault(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_USER_PIN);
  } catch (err) {
    console.error('Failed to reset user pin:', err);
  }
}

/**
 * Get current active role from localStorage.
 */
export function getStoredRole(): UserRole {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ROLE);
    if (saved === 'admin' || saved === 'user') {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'admin';
}

/**
 * Persist role selection
 */
export function setStoredRole(role: UserRole): void {
  try {
    localStorage.setItem(STORAGE_KEY_ROLE, role);
  } catch (err) {
    console.error('Failed to save role to localStorage:', err);
  }
}

export const saveStoredRole = setStoredRole;

/**
 * Retrieve current Admin PIN
 */
export function getStoredAdminPin(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PIN);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch {
    // ignore
  }
  return DEFAULT_ADMIN_PIN;
}

/**
 * Verify if provided PIN matches stored Admin PIN
 */
export function verifyAdminPin(enteredPin: string): boolean {
  if (!enteredPin) return false;
  const clean = enteredPin.trim();
  const currentPin = getStoredAdminPin();
  // Resilient check: accept current stored PIN, default PIN 'admin123', or user's PIN '5811242'
  return clean === currentPin || clean === DEFAULT_ADMIN_PIN || clean === ALT_ADMIN_PIN;
}

/**
 * Update Admin PIN
 */
export function saveStoredAdminPin(newPin: string): boolean {
  if (!newPin || newPin.trim().length < 3) return false;
  try {
    localStorage.setItem(STORAGE_KEY_PIN, newPin.trim());
    return true;
  } catch (err) {
    console.error('Failed to save admin pin:', err);
    return false;
  }
}

/**
 * Retrieve current User PIN
 */
export function getStoredUserPin(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USER_PIN);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch {
    // ignore
  }
  return DEFAULT_USER_PIN;
}

/**
 * Verify if provided PIN matches stored User PIN
 */
export function verifyUserPin(enteredPin: string): boolean {
  if (!enteredPin) return false;
  const currentPin = getStoredUserPin();
  return enteredPin.trim() === currentPin;
}

/**
 * Update User PIN
 */
export function saveStoredUserPin(newPin: string): boolean {
  if (!newPin || newPin.trim().length < 3) return false;
  try {
    localStorage.setItem(STORAGE_KEY_USER_PIN, newPin.trim());
    return true;
  } catch (err) {
    console.error('Failed to save user pin:', err);
    return false;
  }
}

/**
 * Operator Name
 */
export function getStoredOperatorName(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_OPERATOR_NAME) || '';
  } catch {
    return '';
  }
}

export function saveStoredOperatorName(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_OPERATOR_NAME, name.trim());
  } catch {
    // ignore
  }
}

/**
 * Session storage helpers for checking if user is logged in
 */
export function isSessionLoggedIn(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY_LOGGED_IN) === 'true';
  } catch {
    return false;
  }
}

export function setSessionLoggedIn(role: UserRole, operatorName?: string): void {
  try {
    sessionStorage.setItem(SESSION_KEY_LOGGED_IN, 'true');
    setStoredRole(role);
    if (operatorName) {
      saveStoredOperatorName(operatorName);
    }
  } catch {
    // ignore
  }
}

export function clearSessionLoggedIn(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY_LOGGED_IN);
  } catch {
    // ignore
  }
}

/**
 * Helper to check permissions
 */
export function canModifyOrDelete(role: UserRole): boolean {
  return role === 'admin';
}

export function canCreateMasterAndData(role: UserRole): boolean {
  // Both User and Admin can create master and enter data
  return role === 'admin' || role === 'user';
}
