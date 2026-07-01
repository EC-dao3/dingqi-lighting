// ============================================
// DINGQI - Authentication Module
// ============================================
// Handles: register, login, logout, OAuth, nav UI
// ============================================

const Auth = {
  _session: null,
  _user: null,
  _listeners: [],

  _notConfigured() {
    return { error: 'Supabase not configured. Replace SUPABASE_URL and SUPABASE_ANON_KEY in js/supabase-client.js' };
  },

  // ── Init: restore session & listen for changes ──
  async init() {
    const db = getSupabase();
    if (!db) return;

    // restore existing session
    const { data: { session } } = await db.auth.getSession();
    this._session = session;
    this._user = session?.user ?? null;

    // listen for auth state changes
    db.auth.onAuthStateChange((event, session) => {
      this._session = session;
      this._user = session?.user ?? null;
      this._notify(event);
      this.updateNavUI();
    });

    this.updateNavUI();
  },

  // ── Listeners ──
  onChange(fn) { this._listeners.push(fn); },
  _notify(event) { this._listeners.forEach(fn => fn(event, this._user)); },

  // ── Getters ──
  get user() { return this._user; },
  get session() { return this._session; },
  get isLoggedIn() { return !!this._user; },
  get isAdmin() {
    const name = this._user?.user_metadata?.full_name || '';
    return /^admin\d*-dingqi\d*$/i.test(name);
  },
  get adminName() {
    return this._user?.user_metadata?.full_name || '';
  },

  // ═══════════════════════════════════
  //  Admin Limit Check (max 3)
  // ═══════════════════════════════════

  // Check if a full_name matches the admin pattern
  isAdminName(name) {
    return /^admin\d*-dingqi\d*$/i.test(name || '');
  },

  // Count how many admins exist (via DB rpc, falls back to 0 if table missing)
  async adminCount() {
    const db = getSupabase();
    if (!db) return 0;
    try {
      const { data, error } = await db.rpc('count_admins');
      if (error) {
        console.warn('count_admins rpc failed (table may not exist):', error.message);
        return 0;
      }
      return typeof data === 'number' ? data : parseInt(data) || 0;
    } catch (e) {
      console.warn('adminCount error:', e);
      return 0;
    }
  },

  // Check if a new admin can be registered (returns { ok, error })
  async canRegisterAdmin(name) {
    if (!this.isAdminName(name)) return { ok: true };
    const count = await this.adminCount();
    if (count >= 3) {
      return { ok: false, error: '管理员账号已达上限（最多3个），无法注册更多管理员。' };
    }
    return { ok: true };
  },

  // ═══════════════════════════════════
  //  Email + Password
  // ═══════════════════════════════════

  async register(email, password, name) {
    const db = getSupabase();
    if (!db) return this._notConfigured();

    // Enforce admin limit
    if (this.isAdminName(name)) {
      const canReg = await this.canRegisterAdmin(name);
      if (!canReg.ok) return { error: canReg.error };
    }

    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    });

    if (error) return { error: error.message };
    return { data, msg: data.user?.identities?.length === 0
      ? 'This email is already registered.'
      : 'Check your email for a confirmation link.' };
  },

  async login(email, password) {
    const db = getSupabase();
    if (!db) return this._notConfigured();

    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { data };
  },

  // ═══════════════════════════════════
  //  Email Verification (via Edge Function + SMTP)
  // ═══════════════════════════════════

  async sendVerificationCode(email) {
    if (SUPABASE_URL.includes('YOUR-PROJECT-ID')) return this._notConfigured();

    try {
      const resp = await fetch(getFunctionUrl('send-verification-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const result = await resp.json();
      if (!resp.ok) return { error: result.error || 'Failed to send verification code.' };
      return result;
    } catch {
      return { error: 'Network error. Please check your connection.' };
    }
  },

  async verifyCode(email, token) {
    if (SUPABASE_URL.includes('YOUR-PROJECT-ID')) return this._notConfigured();

    try {
      const resp = await fetch(getFunctionUrl('verify-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: token })
      });
      const result = await resp.json();
      return result.ok || result.success ? { success: true, email } : { error: result.error || 'Verification failed.' };
    } catch {
      return { error: 'Network error. Please check your connection.' };
    }
  },

  async completeRegistration(email, password, name) {
    const db = getSupabase();
    if (!db) return this._notConfigured();

    // Enforce admin limit
    if (this.isAdminName(name)) {
      const canReg = await this.canRegisterAdmin(name);
      if (!canReg.ok) return { error: canReg.error };
    }

    // Create user via Supabase (email confirmations must be OFF in Supabase settings)
    const { data, error } = await db.auth.signUp({ email, password });

    if (error) return { error: error.message };

    // Save display name
    await db.auth.updateUser({ data: { full_name: name } });

    // Update local state
    this._session = data.session;
    this._user = data.user;
    this._notify('SIGNED_IN');
    this.updateNavUI();

    return { data };
  },

  // ═══════════════════════════════════
  //  OAuth: GitHub / WeChat / QQ
  // ═══════════════════════════════════

  async loginWithGitHub() {
    const db = getSupabase();
    if (!db) return this._notConfigured();

    const { data, error } = await db.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin + '/pages/login.html' }
    });
    if (error) return { error: error.message };
    return { data };
  },

  async loginWithWeChat() {
    const db = getSupabase();
    if (!db) return this._notConfigured();

    // Uses custom OAuth provider configured in Supabase dashboard
    // See SETUP.md for configuration details
    const { data, error } = await db.auth.signInWithOAuth({
      provider: 'wechat',
      options: {
        redirectTo: window.location.origin + '/pages/login.html',
        scopes: 'snsapi_login'
      }
    });
    if (error) {
      // Fallback: if custom provider not configured, use Edge Function
      if (error.message?.includes('provider') || error.message?.includes('not enabled')) {
        window.location.href = SUPABASE_URL + '/functions/v1/wechat-auth?redirect_to=' +
          encodeURIComponent(window.location.origin + '/pages/login.html');
        return { data: null };
      }
      return { error: error.message };
    }
    return { data };
  },

  async loginWithQQ() {
    const db = getSupabase();
    if (!db) return this._notConfigured();

    const { data, error } = await db.auth.signInWithOAuth({
      provider: 'qq',
      options: {
        redirectTo: window.location.origin + '/pages/login.html',
        scopes: 'get_user_info'
      }
    });
    if (error) {
      if (error.message?.includes('provider') || error.message?.includes('not enabled')) {
        window.location.href = SUPABASE_URL + '/functions/v1/qq-auth?redirect_to=' +
          encodeURIComponent(window.location.origin + '/pages/login.html');
        return { data: null };
      }
      return { error: error.message };
    }
    return { data };
  },

  // ═══════════════════════════════════
  //  Logout
  // ═══════════════════════════════════

  async logout() {
    const db = getSupabase();
    if (!db) return;
    await db.auth.signOut();
    window.location.href = '/index.html';
  },

  // ═══════════════════════════════════
  //  Nav UI
  // ═══════════════════════════════════

  updateNavUI() {
    const containers = document.querySelectorAll('.nav__auth');
    const isSubPage = window.location.pathname.includes('/pages/');
    const consolePath = isSubPage ? 'admin-console.html' : 'pages/admin-console.html';
    const loginPath = isSubPage ? 'login.html' : 'pages/login.html';
    containers.forEach(el => {
      if (this.isLoggedIn) {
        const name = this._user?.user_metadata?.full_name || this._user?.email || 'User';
        const adminBadge = this.isAdmin ? '<span class="nav__admin-badge">管理员</span>' : '';
        const dbPath = isSubPage ? 'database-viewer.html' : 'pages/database-viewer.html';
        const consoleLink = this.isAdmin ? '<a href="' + consolePath + '">控制台</a><a href="' + dbPath + '">数据库</a>' : '';
        el.innerHTML = `
          <div class="nav__user-menu">
            <button class="nav__user-btn" title="${name}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"/>
              </svg>
              <span class="nav__user-name">${name.split(' ')[0]}</span>
              ${adminBadge}
            </button>
            <div class="nav__user-dropdown">
              ${consoleLink}
              <a href="${loginPath}" onclick="event.preventDefault();Auth.logout()">退出登录</a>
            </div>
          </div>`;
      } else {
        el.innerHTML = '<a href="' + loginPath + '" class="nav__login-btn">登录</a>';
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => Auth.init());
