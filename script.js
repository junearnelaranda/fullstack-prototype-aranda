const STORAGE_KEY = 'ipt_demo_v1';

const pages = document.querySelectorAll('.page');
const roleAdminElements = document.querySelectorAll('.role-admin');

// Route path -> page section ID
const ROUTES = {
  '/': 'home',
  '/home': 'home',
  '/register': 'register',
  '/verify-email': 'verify-email',
  '/login': 'login',
  '/profile': 'profile',
  '/requests': 'requests',
  '/employees': 'employees',
  '/accounts': 'accounts',
  '/departments': 'departments'
};

// Pages that require a logged-in user
const PROTECTED_ROUTES = new Set(['/profile', '/requests', '/employees', '/accounts', '/departments']);
// Pages that require admin role
const ADMIN_ROUTES = new Set(['/employees', '/accounts', '/departments']);

let currentUser = null;
let editingAccountId = null;
let editingEmployeeId = null;

// Auth + common elements
const registerForm = document.getElementById('form-register');
const loginForm = document.getElementById('form-login');
const simulateButton = document.getElementById('btn-simulate');
const logoutButton = document.getElementById('btnLogout');
const editProfileButton = document.getElementById('btnEditProfile');

const sentMessage = document.getElementById('msg-sent');
const verifiedMessage = document.getElementById('msg-verified');
const loginMessage = document.getElementById('login-message');

const loggedOutLinks = document.querySelector('.role-logged-out');
const loggedInMenu = document.querySelector('.role-logged-in');
const userMenuButton = document.getElementById('userMenuButton');

const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profileRole = document.getElementById('profile-role');

// Accounts elements
const accountsTbody = document.getElementById('accounts-tbody');
const addAccountButton = document.getElementById('btnAddAccount');
const accountForm = document.getElementById('form-account');
const accFirstNameInput = document.getElementById('accFirstName');
const accLastNameInput = document.getElementById('accLastName');
const accEmailInput = document.getElementById('accEmail');
const accPasswordInput = document.getElementById('accPassword');
const accRoleSelect = document.getElementById('accRole');
const accVerifiedCheckbox = document.getElementById('verifiedCheck');

// Departments elements
const departmentsTbody = document.getElementById('departments-tbody');
const addDepartmentButton = document.getElementById('btnAddDepartment');

// Employees elements
const employeesTbody = document.getElementById('employees-tbody');
const addEmployeeButton = document.getElementById('btnAddEmployee');
const employeeForm = document.getElementById('form-employee');
const empCodeInput = document.getElementById('empId');
const empEmailInput = document.getElementById('empEmail');
const empPositionInput = document.getElementById('empPosition');
const empDeptSelect = document.getElementById('empDept');
const empHireDateInput = document.getElementById('empHireDate');

// Requests elements
const requestsEmpty = document.getElementById('requests-empty');
const requestsList = document.getElementById('requests-list');
const requestsTbody = document.getElementById('requests-tbody');
const newRequestButton = document.getElementById('btnNewRequest');
const createOneButton = document.getElementById('btnCreateOne');
const submitRequestButton = document.getElementById('btnSubmitRequest');
const addRequestItemButton = document.getElementById('btnAddRequestItem');
const requestTypeSelect = document.getElementById('reqType');
const requestItemsContainer = document.getElementById('request-items');
const requestModalElement = document.getElementById('requestModal');
const toastContainer = document.getElementById('toastContainer');
const registerSubmitButton = registerForm ? registerForm.querySelector('button[type="submit"]') : null;
const loginSubmitButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
const accountSaveButton = accountForm ? accountForm.querySelector('button[type="submit"]') : null;
const employeeSaveButton = employeeForm ? employeeForm.querySelector('button[type="submit"]') : null;

// Create a quick unique ID
function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Show top-right Bootstrap toast message
function showToast(message, type = 'info') {
  if (!toastContainer || !window.bootstrap) return;

  const typeClass =
    type === 'success' ? 'bg-success text-white' :
    type === 'danger' ? 'bg-danger text-white' :
    type === 'warning' ? 'bg-warning text-dark' :
    'bg-secondary text-white';

  const toast = document.createElement('div');
  toast.className = `toast align-items-center border-0 ${typeClass}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  toastContainer.appendChild(toast);
  const instance = new window.bootstrap.Toast(toast, { delay: 2500 });
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
  instance.show();
}

// Optional UX: simple loading state for buttons
function setButtonLoading(button, isLoading, loadingText = 'Working...') {
  if (!button) return;

  if (isLoading) {
    if (!button.dataset.originalHtml) {
      button.dataset.originalHtml = button.innerHTML;
    }
    button.disabled = true;
    button.innerHTML = `
      <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
      ${loadingText}
    `;
    return;
  }

  button.disabled = false;
  if (button.dataset.originalHtml) {
    button.innerHTML = button.dataset.originalHtml;
    delete button.dataset.originalHtml;
  }
}

// Remove old red validation states/messages
function clearValidation(form) {
  form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  form.querySelectorAll('.invalid-feedback.dynamic-feedback').forEach((el) => el.remove());
}

// Mark one field as invalid and show a small message under it
function setFieldError(input, message) {
  input.classList.add('is-invalid');
  let feedback = input.parentElement.querySelector('.invalid-feedback.dynamic-feedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.className = 'invalid-feedback dynamic-feedback';
    input.parentElement.appendChild(feedback);
  }
  feedback.textContent = message;
}

// Helper: show both inline field error + toast popup
function setFieldErrorAndToast(input, message) {
  setFieldError(input, message);
  showToast(message, 'danger');
}

// Map API user into the shape used by this UI
function mapApiUser(apiUser) {
  const username = apiUser && apiUser.username ? String(apiUser.username) : '';
  const role = apiUser && apiUser.role ? String(apiUser.role) : 'user';
  return {
    id: apiUser && apiUser.id ? apiUser.id : null,
    username,
    role,
    firstName: username,
    lastName: '',
    email: username
  };
}

function showDashboard(apiUser, options = {}) {
  const { showToastMessage = true, navigate = true } = options;
  const mappedUser = mapApiUser(apiUser);
  loginMessage.innerHTML = '';
  setAuthState(true, mappedUser);
  if (showToastMessage) {
    showToast('Login successful. Welcome back!', 'success');
  }
  if (navigate) {
    navigateTo('/profile');
  }
}

// Login with API 
async function login(username, password) {
  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      sessionStorage.setItem('authToken', data.token);
      sessionStorage.setItem('user', JSON.stringify(data.user));
      showDashboard(data.user);
    } else {
      showToast(`Login failed: ${data.error || 'Unknown error'}`, 'danger');
    }
  } catch (err) {
    showToast('Network error', 'danger');
  }
}

function getAuthHeader() {
  const token = sessionStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function loadAdminDashboard() {
  const content = document.getElementById('content');

  try {
    const res = await fetch('http://localhost:3000/api/admin/dashboard', {
      headers: getAuthHeader()
    });

    if (res.ok) {
      const data = await res.json();
      content.innerText = data.message;
    } else {
     document.getElementById('content').innerText = 'Access Denied!';
    }
  } catch (err) {
    document.getElementById('content').innerText = 'Error loading data.';
  }
}


function restoreSession() {
  const token = sessionStorage.getItem('authToken');
  const rawUser = sessionStorage.getItem('user');

  if (!token || !rawUser) {
    setAuthState(false);
    return;
  }

  try {
    const user = JSON.parse(rawUser);
    showDashboard(user, { showToastMessage: false, navigate: false });
  } catch {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    setAuthState(false);
  }
}

// First-time default data when storage is empty/corrupt
function seedDb() {
  return {
    accounts: [
      {
        id: makeId('acc'),
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: 'Password123!',
        role: 'Admin',
        verified: true
      }
    ],
    departments: [
      { id: makeId('dept'), name: 'Engineering', description: 'Software team' },
      { id: makeId('dept'), name: 'HR', description: 'Human Resources' }
    ],
    employees: [],
    requests: []
  };
}

// Save all app data to localStorage
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

// Load app data from localStorage
function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);

  // Try reading saved data. If invalid, create default data.
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    const valid = parsed && Array.isArray(parsed.accounts) && Array.isArray(parsed.departments);
    window.db = valid ? parsed : seedDb();
  } catch {
    window.db = seedDb();
  }

  if (!Array.isArray(window.db.employees)) {
    window.db.employees = [];
  }
  if (!Array.isArray(window.db.requests)) {
    window.db.requests = [];
  }

  // Normalize older records so required fields always exist.
  window.db.accounts.forEach((a) => {
    if (!a.id) a.id = makeId('acc');
    a.email = String(a.email || '').toLowerCase();
    if (a.email === 'admin@example.com') a.role = 'Admin';
  });
  window.db.departments.forEach((d) => {
    if (!d.id) d.id = makeId('dept');
  });
  window.db.employees.forEach((e) => {
    if (!e.id) e.id = makeId('emp');
  });
  window.db.requests.forEach((r) => {
    if (!Array.isArray(r.items)) r.items = [];
    if (!r.status) r.status = 'Pending';
  });

  saveToStorage();
}

// Find helpers
function findAccountByEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  return window.db.accounts.find((a) => a.email === value) || null;
}

function findAccountById(id) {
  return window.db.accounts.find((a) => a.id === id) || null;
}

function findDepartmentById(id) {
  return window.db.departments.find((d) => d.id === id) || null;
}

function findEmployeeById(id) {
  return window.db.employees.find((e) => e.id === id) || null;
}

function isAdmin(user) {
  return Boolean(user && String(user.role).toLowerCase() === 'admin');
}

// Turn    state ON/OFF and update navbar/body classes
function setAuthState(isAuth, user = null) {
  // If logged in, keep user object. If logged out, clear it.
  if (isAuth) {
    currentUser = user;
  } else {
    currentUser = null;
  }

  // These classes control what user can see.
  document.body.classList.toggle('authenticated', !!currentUser);
  document.body.classList.toggle('not-authenticated', !currentUser);
  document.body.classList.toggle('is-admin', isAdmin(currentUser));

  // Show correct navbar area based on auth state.
  if (currentUser !== null) {
    loggedOutLinks.classList.add('d-none');
    loggedInMenu.classList.remove('d-none');

    // Show "Admin" for admin users, or full name for normal users.
    userMenuButton.textContent = isAdmin(currentUser)
      ? 'Admin'
      : `${currentUser.firstName} ${currentUser.lastName}`.trim();
  } else {
    loggedOutLinks.classList.remove('d-none');
    loggedInMenu.classList.add('d-none');
    userMenuButton.textContent = 'User';
  }

  roleAdminElements.forEach((el) => {
    el.classList.toggle('d-none', !isAdmin(currentUser));
  });
}

// Fill the profile page with current user info
function renderProfile() {
  if (!currentUser) {
    profileName.textContent = 'User';
    profileEmail.textContent = '';
    profileRole.textContent = '';
    return;
  }

  profileName.textContent = `${currentUser.firstName} ${currentUser.lastName}`.trim();
  profileEmail.textContent = currentUser.email;
  profileRole.textContent = currentUser.role;
}

// Render Accounts table for admin
function renderAccountsList() {
  if (!accountsTbody) return;

  if (!window.db.accounts.length) {
    accountsTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No accounts.</td></tr>';
    return;
  }

  accountsTbody.innerHTML = window.db.accounts
    .map((a) => {
      const name = `${a.firstName} ${a.lastName}`.trim();
      const verified = a.verified ? '&#10003;' : '&mdash;';
      return `
        <tr>
          <td>${name}</td>
          <td>${a.email}</td>
          <td>${a.role}</td>
          <td>${verified}</td>
          <td>
            <button type="button" class="btn btn-outline-primary btn-sm" data-action="edit-account" data-id="${a.id}">Edit</button>
            <button type="button" class="btn btn-outline-warning btn-sm" data-action="reset-password" data-id="${a.id}">Reset PW</button>
            <button type="button" class="btn btn-outline-danger btn-sm" data-action="delete-account" data-id="${a.id}">Delete</button>
          </td>
        </tr>
      `;
    })
    .join('');
}

// Render Departments table for admin
function renderDepartmentsList() {
  if (!departmentsTbody) return;

  if (!window.db.departments.length) {
    departmentsTbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No departments.</td></tr>';
    return;
  }

  departmentsTbody.innerHTML = window.db.departments
    .map(
      (d) => `
        <tr>
          <td>${d.name}</td>
          <td>${d.description || ''}</td>
          <td>
            <button type="button" class="btn btn-outline-primary btn-sm">Edit</button>
            <button type="button" class="btn btn-outline-danger btn-sm">Delete</button>
          </td>
        </tr>
      `
    )
    .join('');
}

// Fill employee department dropdown from departments list
function populateDepartmentDropdown(selectedId = '') {
  if (!empDeptSelect) return;

  if (!window.db.departments.length) {
    empDeptSelect.innerHTML = '<option value="">No departments available</option>';
    return;
  }

  empDeptSelect.innerHTML = window.db.departments
    .map((d) => `<option value="${d.id}" ${d.id === selectedId ? 'selected' : ''}>${d.name}</option>`)
    .join('');
}

// Render Employees table for admin
function renderEmployeesTable() {
  if (!employeesTbody) return;

  if (!window.db.employees.length) {
    employeesTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No employees.</td></tr>';
    return;
  }

  employeesTbody.innerHTML = window.db.employees
    .map((e) => {
      const account = findAccountById(e.userId);
      const dept = findDepartmentById(e.departmentId);

      return `
        <tr>
          <td>${e.employeeCode}</td>
          <td>${account ? account.email : '(missing user)'}</td>
          <td>${e.position}</td>
          <td>${dept ? dept.name : '(missing dept)'}</td>
          <td>
            <button type="button" class="btn btn-outline-primary btn-sm" data-action="edit-employee" data-id="${e.id}">Edit</button>
            <button type="button" class="btn btn-outline-danger btn-sm" data-action="delete-employee" data-id="${e.id}">Delete</button>
          </td>
        </tr>
      `;
    })
    .join('');
}

// Render all admin lists at once
function renderAdminTables() {
  renderAccountsList();
  renderDepartmentsList();
  populateDepartmentDropdown();
  renderEmployeesTable();
}

// Create one request item row HTML (name + quantity + remove button)
function createRequestItemRow(name = '', qty = 1) {
  return `
    <div class="input-group input-group-sm mb-2 request-item-row">
      <input type="text" class="form-control req-item-name" placeholder="Item name" value="${name}">
      <input type="number" class="form-control req-item-qty" value="${qty}" min="1" style="max-width:90px;">
      <button class="btn btn-outline-danger btn-remove-request-item" type="button">x</button>
    </div>
  `;
}

// Reset request modal to default values
function resetRequestForm() {
  if (!requestTypeSelect || !requestItemsContainer) return;
  requestTypeSelect.value = 'Equipment';
  requestItemsContainer.innerHTML = createRequestItemRow();
}

function addRequestItemRow() {
  if (!requestItemsContainer) return;
  requestItemsContainer.insertAdjacentHTML('beforeend', createRequestItemRow());
}

// Convert text status to colored badge
function getRequestStatusBadge(status) {
  if (status === 'Approved') return '<span class="badge bg-success">Approved</span>';
  if (status === 'Rejected') return '<span class="badge bg-danger">Rejected</span>';
  return '<span class="badge bg-warning text-dark">Pending</span>';
}

// Show only requests that belong to the logged-in user
function renderMyRequests() {
  if (!requestsTbody || !requestsEmpty || !requestsList || !currentUser) return;

  const mine = window.db.requests.filter((r) => r.employeeEmail === currentUser.email);

  if (!mine.length) {
    requestsEmpty.classList.remove('d-none');
    requestsList.classList.add('d-none');
    requestsTbody.innerHTML = '';
    return;
  }

  requestsEmpty.classList.add('d-none');
  requestsList.classList.remove('d-none');

  requestsTbody.innerHTML = mine
    .map((r) => {
      const itemsText = r.items.map((item) => `${item.name} (${item.qty})`).join(', ');
      return `
        <tr>
          <td>${r.type}</td>
          <td>${itemsText}</td>
          <td>${getRequestStatusBadge(r.status)}</td>
          <td>${r.date}</td>
        </tr>
      `;
    })
    .join('');
}

function resetAccountForm() {
  editingAccountId = null;
  accountForm.reset();
  accRoleSelect.value = 'User';
  accVerifiedCheckbox.checked = false;
}

function resetEmployeeForm() {
  editingEmployeeId = null;
  employeeForm.reset();
  populateDepartmentDropdown();
}

// Convert hash like "#login" to "/login"
function normalizeHash(hashInput) {
  const raw = String(hashInput || '').trim();
  if (!raw || raw === '#') return '/';

  let route = raw.startsWith('#') ? raw.slice(1) : raw;
  route = route.trim();

  if (!route) return '/';
  if (!route.startsWith('/')) route = `/${route}`;
  return route;
}

// Change URL hash route
function navigateTo(hash) {
  const nextHash = `#${normalizeHash(hash)}`;
  if (window.location.hash === nextHash) {
    handleRouting();
    return;
  }
  window.location.hash = nextHash;
  setTimeout(handleRouting, 0);
}

// Show one page section and run page-specific render
function showPage(route) {
  const pageId = ROUTES[route] || 'home';

  pages.forEach((page) => {
    page.classList.toggle('active', page.id === pageId);
  });

  if (route === '/verify-email') {
    const pending = localStorage.getItem('unverified_email') || 'your account';
    sentMessage.textContent = `Verification sent to ${pending}.`;
    verifiedMessage.classList.add('d-none');
  }

  if (route === '/profile') {
    renderProfile();
  }

  if (route === '/requests') {
    renderMyRequests();
  }

  if (route === '/accounts' || route === '/employees' || route === '/departments') {
    renderAdminTables();
  }
}

// Main route guard logic (auth/admin checks)
function handleRouting() {
  if (!window.location.hash) {
    navigateTo('/');
    return;
  }

  const route = normalizeHash(window.location.hash);
  const pageId = ROUTES[route];

  if (!pageId) {
    navigateTo('/');
    return;
  }

  if (PROTECTED_ROUTES.has(route) && !currentUser) {
    showToast('Please log in to continue.', 'warning');
    navigateTo('/login');
    return;
  }

  if (ADMIN_ROUTES.has(route) && !isAdmin(currentUser)) {
    showToast('Access denied. Admin only page.', 'warning');
    navigateTo('/');
    return;
  }

  showPage(route);
}

// Route ASAP even if later code throws
window.addEventListener('hashchange', handleRouting);
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', handleRouting);
} else {
  handleRouting();
}


// REGISTRATION
registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearValidation(registerForm);
  setButtonLoading(registerSubmitButton, true, 'Signing up...');

  try {

  const firstNameInput = document.getElementById('regFirstName');
  const lastNameInput = document.getElementById('regLastName');
  const emailInput = document.getElementById('regEmail');
  const passwordInput = document.getElementById('regPassword');

  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  // Basic field validation
  if (!firstName) {
    setFieldErrorAndToast(firstNameInput, 'First name is required.');
    return;
  }
  if (firstName.length < 6) {
    setFieldErrorAndToast(firstNameInput, 'First name must be at least 6 characters.');
    return;
  }
  if (!lastName) {
    setFieldErrorAndToast(lastNameInput, 'Last name is required.');
    return;
  }
  if (lastName.length < 6) {
    setFieldErrorAndToast(lastNameInput, 'Last name must be at least 6 characters.');
    return;
  }
  if (!email) {
    setFieldErrorAndToast(emailInput, 'Email is required.');
    return;
  }
  if (password.length < 6) {
    setFieldErrorAndToast(passwordInput, 'Password must be at least 6 characters.');
    return;
  }

  // Email must not already exist
  if (findAccountByEmail(email)) {
    setFieldErrorAndToast(emailInput, 'Email already exists.');
    return;
  }

  // Register with backend so login will work
  try {
    const res = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(`Registration failed: ${data.error || 'Unknown error'}`, 'danger');
      return;
    }
  } catch {
    showToast('Network error while registering.', 'danger');
    return;
  }

  // Save new account locally (starts as unverified)
  window.db.accounts.push({
    id: makeId('acc'),
    firstName,
    lastName,
    email,
    password,
    role: email === 'admin@example.com' ? 'Admin' : 'User',
    verified: false
  });

  // pending email and go to verify page
  saveToStorage();
  localStorage.setItem('unverified_email', email);
  showToast('Account created. Please verify your email first.', 'success');
  navigateTo('/verify-email');
  } finally {
    setButtonLoading(registerSubmitButton, false);
  }
});

// EMAIL VERIFICATION (SIMULATED)
simulateButton.addEventListener('click', () => {
  setButtonLoading(simulateButton, true, 'Verifying...');
  try {
  const pending = localStorage.getItem('unverified_email');

  // No pending email to verify
  if (!pending) {
    sentMessage.textContent = 'No pending verification found. Please register first.';
    showToast('No pending verification found.', 'warning');
    return;
  }

  // Find account for that email
  const account = findAccountByEmail(pending);
  if (!account) {
    sentMessage.textContent = 'Account not found. Please register again.';
    showToast('Account not found.', 'danger');
    return;
  }

  // Mark as verified and save
  account.verified = true;
  saveToStorage();
  localStorage.removeItem('unverified_email');

  // Show success then go to login
  verifiedMessage.classList.remove('d-none');
  showToast('Email verified successfully. You can now log in.', 'success');
  setTimeout(() => navigateTo('/login'), 700);
  } finally {
    setButtonLoading(simulateButton, false);
  }
});


// LOGIN
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearValidation(loginForm);
  setButtonLoading(loginSubmitButton, true, 'Logging in...');

  try {

  const loginEmailInput = document.getElementById('loginEmail');
  const loginPasswordInput = document.getElementById('loginPassword');

  const email = loginEmailInput.value.trim().toLowerCase();
  const password = loginPasswordInput.value;

  if (!email) {
    setFieldErrorAndToast(loginEmailInput, 'Email is required.');
    return;
  }
  if (!password) {
    setFieldErrorAndToast(loginPasswordInput, 'Password is required.');
    return;
  }

  // Call backend API login (replaces old localStorage login)
  await login(email, password);
  } finally {
    setButtonLoading(loginSubmitButton, false);
  }
});


// LOGOUT
logoutButton.addEventListener('click', (event) => {
  event.preventDefault();
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('user');
  setAuthState(false);
  showToast('You have been logged out.', 'success');
  navigateTo('/');
});

if (editProfileButton) {
  editProfileButton.addEventListener('click', () => {
    showToast('Edit Profile is not implemented yet.', 'warning');
    alert('Edit Profile is not implemented yet.');
  });
}

// =========================================================
// REQUESTS
// =========================================================
if (newRequestButton) {
  newRequestButton.addEventListener('click', () => {
    resetRequestForm();
    showToast('Create your new request below.', 'info');
  });
}

if (createOneButton) {
  createOneButton.addEventListener('click', () => {
    resetRequestForm();
    showToast('Create your first request below.', 'info');
  });
}

if (addRequestItemButton) {
  addRequestItemButton.addEventListener('click', addRequestItemRow);
}

if (requestItemsContainer) {
  requestItemsContainer.addEventListener('click', (event) => {
    const removeButton = event.target.closest('.btn-remove-request-item');
    if (!removeButton) return;

    const rows = requestItemsContainer.querySelectorAll('.request-item-row');
    if (rows.length <= 1) {
      return;
    }

    removeButton.closest('.request-item-row').remove();
  });
}

if (submitRequestButton) {
  submitRequestButton.addEventListener('click', () => {
    setButtonLoading(submitRequestButton, true, 'Submitting...');
    try {
    if (!currentUser) return;

    const rows = Array.from(requestItemsContainer.querySelectorAll('.request-item-row'));
    const items = rows
      .map((row) => {
        const name = row.querySelector('.req-item-name').value.trim();
        const qtyRaw = row.querySelector('.req-item-qty').value;
        const qty = Number.parseInt(qtyRaw, 10);
        return { name, qty: Number.isNaN(qty) || qty < 1 ? 1 : qty };
      })
      .filter((item) => item.name);

    if (!items.length) {
      showToast('Please add at least one item.', 'danger');
      return;
    }

    window.db.requests.push({
      type: requestTypeSelect.value,
      items,
      status: 'Pending',
      date: new Date().toLocaleDateString(),
      employeeEmail: currentUser.email
    });

    saveToStorage();
    renderMyRequests();
    resetRequestForm();
    showToast('Request submitted successfully.', 'success');

    if (window.bootstrap && requestModalElement) {
      const modal = window.bootstrap.Modal.getInstance(requestModalElement);
      if (modal) modal.hide();
    }
    } finally {
      setButtonLoading(submitRequestButton, false);
    }
  });
}

// =========================================================
// ACCOUNTS CRUD (Admin)
// =========================================================
if (addAccountButton) {
  addAccountButton.addEventListener('click', () => {
    resetAccountForm();
    showToast('Ready to add a new account.', 'info');
  });
}

if (accountForm) {
  accountForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearValidation(accountForm);
    setButtonLoading(accountSaveButton, true, 'Saving...');

    try {

    const firstName = accFirstNameInput.value.trim();
    const lastName = accLastNameInput.value.trim();
    const email = accEmailInput.value.trim().toLowerCase();
    const password = accPasswordInput.value;
    const role = accRoleSelect.value;
    const verified = accVerifiedCheckbox.checked;

    if (!firstName || !lastName || !email) {
      if (!firstName) setFieldErrorAndToast(accFirstNameInput, 'First name is required.');
      if (!lastName) setFieldErrorAndToast(accLastNameInput, 'Last name is required.');
      if (!email) setFieldErrorAndToast(accEmailInput, 'Email is required.');
      return;
    }

    const duplicate = findAccountByEmail(email);
    if (duplicate && duplicate.id !== editingAccountId) {
      setFieldErrorAndToast(accEmailInput, 'Email already exists.');
      return;
    }

    if (editingAccountId) {
      const account = findAccountById(editingAccountId);
      if (!account) return;

      account.firstName = firstName;
      account.lastName = lastName;
      account.email = email;
      account.role = email === 'admin@example.com' ? 'Admin' : role;
      account.verified = verified;

      if (password) {
        if (password.length < 6) {
          setFieldErrorAndToast(accPasswordInput, 'Password must be at least 6 characters.');
          return;
        }
        account.password = password;
      }

      if (currentUser && currentUser.id === account.id) {
        setAuthState(true, account);
      }
    } else {
      if (password.length < 6) {
        setFieldErrorAndToast(accPasswordInput, 'Password must be at least 6 characters.');
        return;
      }

      window.db.accounts.push({
        id: makeId('acc'),
        firstName,
        lastName,
        email,
        password,
        role: email === 'admin@example.com' ? 'Admin' : role,
        verified
      });
    }

    saveToStorage();
    renderAccountsList();
    renderEmployeesTable();
    resetAccountForm();
    showToast('Account saved successfully.', 'success');
    } finally {
      setButtonLoading(accountSaveButton, false);
    }
  });
}

if (accountsTbody) {
  accountsTbody.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const account = findAccountById(button.dataset.id);
    if (!account) return;

    if (button.dataset.action === 'edit-account') {
      editingAccountId = account.id;
      accFirstNameInput.value = account.firstName;
      accLastNameInput.value = account.lastName;
      accEmailInput.value = account.email;
      accPasswordInput.value = '';
      accRoleSelect.value = account.role;
      accVerifiedCheckbox.checked = account.verified;
      showToast('Editing account details.', 'info');
      return;
    }

    if (button.dataset.action === 'reset-password') {
      const next = prompt('Enter new password (min 6 chars):', '');
      if (next === null) return;
      if (next.length < 6) {
        showToast('Password must be at least 6 characters.', 'danger');
        return;
      }
      account.password = next;
      saveToStorage();
      showToast('Password updated successfully.', 'success');
      return;
    }

    if (button.dataset.action === 'delete-account') {
      if (currentUser && account.id === currentUser.id) {
        showToast('You cannot delete your own account while logged in.', 'warning');
        return;
      }

      if (!confirm(`Delete account ${account.email}?`)) return;

      window.db.accounts = window.db.accounts.filter((a) => a.id !== account.id);
      window.db.employees = window.db.employees.filter((e) => e.userId !== account.id);
      saveToStorage();
      renderAccountsList();
      renderEmployeesTable();
      showToast('Account deleted successfully.', 'success');
    }
  });
}


// DEPARTMENTS (Admin)
if (addDepartmentButton) {
  addDepartmentButton.addEventListener('click', () => {
    alert('Not implemented');
  });
}

if (departmentsTbody) {
  departmentsTbody.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    showToast('Department edit/delete is not implemented yet.', 'warning');
  });
}


// EMPLOYEES CRUD (Admin)
if (addEmployeeButton) {
  addEmployeeButton.addEventListener('click', () => {
    resetEmployeeForm();
    showToast('Ready to add a new employee.', 'info');
  });
}

if (employeeForm) {
  employeeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearValidation(employeeForm);
    setButtonLoading(employeeSaveButton, true, 'Saving...');

    try {

    const employeeCode = empCodeInput.value.trim();
    const userEmail = empEmailInput.value.trim().toLowerCase();
    const position = empPositionInput.value.trim();
    const departmentId = empDeptSelect.value;
    const hireDate = empHireDateInput.value;

    if (!employeeCode || !userEmail || !position || !departmentId || !hireDate) {
      if (!employeeCode) setFieldErrorAndToast(empCodeInput, 'Employee ID is required.');
      if (!userEmail) setFieldErrorAndToast(empEmailInput, 'User email is required.');
      if (!position) setFieldErrorAndToast(empPositionInput, 'Position is required.');
      if (!departmentId) setFieldErrorAndToast(empDeptSelect, 'Department is required.');
      if (!hireDate) setFieldErrorAndToast(empHireDateInput, 'Hire date is required.');
      return;
    }

    const account = findAccountByEmail(userEmail);
    if (!account) {
      setFieldErrorAndToast(empEmailInput, 'User email must match an existing account.');
      return;
    }

    const duplicateCode = window.db.employees.find(
      (e) => e.employeeCode === employeeCode && e.id !== editingEmployeeId
    );
    if (duplicateCode) {
      setFieldErrorAndToast(empCodeInput, 'Employee ID already exists.');
      return;
    }

    if (editingEmployeeId) {
      const employee = findEmployeeById(editingEmployeeId);
      if (!employee) return;

      employee.employeeCode = employeeCode;
      employee.userId = account.id;
      employee.position = position;
      employee.departmentId = departmentId;
      employee.hireDate = hireDate;
    } else {
      window.db.employees.push({
        id: makeId('emp'),
        employeeCode,
        userId: account.id,
        position,
        departmentId,
        hireDate
      });
    }

    saveToStorage();
    renderEmployeesTable();
    resetEmployeeForm();
    showToast('Employee saved successfully.', 'success');
    } finally {
      setButtonLoading(employeeSaveButton, false);
    }
  });
}

if (employeesTbody) {
  employeesTbody.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const employee = findEmployeeById(button.dataset.id);
    if (!employee) return;

    if (button.dataset.action === 'edit-employee') {
      editingEmployeeId = employee.id;
      const account = findAccountById(employee.userId);

      empCodeInput.value = employee.employeeCode;
      empEmailInput.value = account ? account.email : '';
      empPositionInput.value = employee.position;
      populateDepartmentDropdown(employee.departmentId);
      empHireDateInput.value = employee.hireDate;
      showToast('Editing employee details.', 'info');
      return;
    }

    if (button.dataset.action === 'delete-employee') {
      if (!confirm(`Delete employee ${employee.employeeCode}?`)) return;

      window.db.employees = window.db.employees.filter((e) => e.id !== employee.id);
      saveToStorage();
      renderEmployeesTable();
      showToast('Employee deleted successfully.', 'success');
    }
  });
}

// Start
loadFromStorage();
restoreSession();
refreshRoleUI();

renderAdminTables();
resetRequestForm();
resetAccountForm();
resetEmployeeForm();

// Ensure hash navigation always triggers routing (even if hash doesn't change)
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  event.preventDefault();
  navigateTo(link.getAttribute('href'));
});
