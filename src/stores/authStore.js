import { create } from 'zustand';

// Immediately purge any legacy login credentials from storage
try {
  localStorage.removeItem('nsk_employee_id');
  localStorage.removeItem('nsk_department');
  sessionStorage.removeItem('nsk_employee_id');
  sessionStorage.removeItem('nsk_department');
} catch (e) {
  // Ignore in environments where storage might be restricted
}

/**
 * Auth store — strictly in-memory session.
 * Zero login persistence: every time the app opens or reloads,
 * the user starts completely fresh and must enter their login details.
 */
const useAuthStore = create((set) => ({
  employeeId: '',
  department: '',
  isLoggedIn: false,

  login: (employeeId, department) => {
    // Pure in-memory session only — NO localStorage persistence
    set({ employeeId, department, isLoggedIn: true });
  },

  logout: () => {
    try {
      localStorage.removeItem('nsk_employee_id');
      localStorage.removeItem('nsk_department');
      sessionStorage.removeItem('nsk_employee_id');
      sessionStorage.removeItem('nsk_department');
    } catch (e) {}
    set({ employeeId: '', department: '', isLoggedIn: false });
  },
}));

export default useAuthStore;
