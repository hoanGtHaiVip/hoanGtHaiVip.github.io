/**
 * Locket Gold Studio Web — Pure Client-Side SDK & Interactive Studio
 * Ready for GitHub Pages (*.github.io) deployment without any backend server.
 */

const FIREBASE_API_KEY = "AIzaSyCQngaaXQIfJaH0aS2l7REgIjD7nL431So";
const FIREBASE_AUTH_URL = "https://identitytoolkit.googleapis.com/v1/accounts";
const FIREBASE_TOKEN_URL = "https://securetoken.googleapis.com/v1/token";
const FIREBASE_APP_ID = "1:641029076083:ios:cc8eb46290d69b234fa606";
const LOCKET_API_BASE = "https://api.locketcamera.com";
const STORAGE_IMG_URL = "https://firebasestorage.googleapis.com/v0/b/locket-img/o";
const STORAGE_VIDEO_URL = "https://firebasestorage.googleapis.com/v0/b/locket-video/o";

class LocketWebApp {
  constructor() {
    this.session = {
      uid: null,
      email: null,
      idToken: null,
      refreshToken: null,
      expiresAt: 0,
      firstName: "",
      lastName: "",
      installationId: this.randomHex(22)
    };
    this.isDemo = true;
    this.frameMode = "blur"; // 'blur' | 'fit' | 'crop'
    this.overlayMode = "standard"; // 'standard' | 'streak' | 'time' | 'weather' | 'location' | 'music' | 'colors' | 'preset'
    this.selectedPresetKey = "in_love_longing";
    this.mediaType = "image"; // 'image' | 'video'
    this.currentImage = null;
    this.currentVideoFile = null;
    this.videoAnimFrame = null;
    this.videoObjectUrl = null;
    this.mediaLoadId = 0;
    this.feedLoadId = 0;
    this.lastFocusedElement = null;

    this.demoFeed = [
      {
        moment_uid: "demo_moment_01",
        user_name: "Minh Anh 💛",
        caption: "🔥 100 Days · Đi cháy phố đêm Sài Gòn!",
        thumbnail_url: "",
        sample_theme: "cyber",
        created_at: "Vừa xong"
      },
      {
        moment_uid: "demo_moment_02",
        user_name: "Hoàng Thái ✨",
        caption: "⛅ 22°C Đà Lạt · Săn mây buổi sớm",
        thumbnail_url: "",
        sample_theme: "sunset",
        created_at: "15 phút trước"
      },
      {
        moment_uid: "demo_moment_03",
        user_name: "Bảo Ngọc ☕",
        caption: "🎵 Chúng Ta Của Tương Lai 🎶 Chill nhẹ",
        thumbnail_url: "",
        sample_theme: "coffee",
        created_at: "1 giờ trước"
      }
    ];

    this.init();
  }

  init() {
    this.loadSavedSession();
    this.initPresetsExplorer();
    this.setupDragAndDrop();
    this.setupLoginModal();
    this.loadSampleImage("sunset");
    this.renderHistory();
    this.loadFriendsFeed();
  }

  randomId(len = 20) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let out = "";
    for (let i = 0; i < len; i++) {
      out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
  }

  randomHex(len = 22) {
    const chars = "0123456789abcdef";
    let out = "";
    for (let i = 0; i < len; i++) {
      out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
  }

  toast(msg) {
    const container = document.getElementById("toastContainer");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = String(msg);
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 300);
    }, 3600);
  }

  /* =========================================================================
   * AUTH & SESSION MANAGEMENT
   * ========================================================================= */
  loadSavedSession() {
    try {
      const raw = localStorage.getItem("locket_web_session");
      if (raw) {
        const data = JSON.parse(raw);
        if (data && (data.idToken || data.refreshToken)) {
          this.session = { ...this.session, ...data };
          this.isDemo = false;
          this.updateAuthUI();
          if (this.session.uid) this.fetchMyProfile();
          return;
        }
      }
    } catch (e) {
      console.warn("Session load error:", e);
    }
    this.activateDemoMode(true);
  }

  saveSession() {
    localStorage.setItem("locket_web_session", JSON.stringify(this.session));
  }

  updateAuthUI() {
    const dot = document.getElementById("statusDot");
    const txt = document.getElementById("statusText");
    const btnLogin = document.getElementById("btnOpenLogin");
    const banner = document.getElementById("topBanner");
    const userNameEl = document.getElementById("widgetUserName");
    const avatarEl = document.getElementById("widgetAvatarText");

    if (this.isDemo) {
      dot.className = "status-dot demo";
      txt.textContent = "Chế độ Demo (Dùng thử)";
      btnLogin.textContent = "🔑 Đăng nhập Locket";
      banner.style.display = "flex";
      userNameEl.textContent = "Bạn (Demo Mode)";
      avatarEl.textContent = "LO";
    } else {
      dot.className = "status-dot online";
      const label = this.session.firstName
        ? `${this.session.firstName} ${this.session.lastName || ""}`.trim()
        : (this.session.email || this.session.uid.slice(0, 8));
      txt.textContent = `🟢 Online: ${label}`;
      btnLogin.textContent = "⚙️ Tài khoản";
      banner.style.display = "none";
      userNameEl.textContent = label;
      avatarEl.textContent = (label[0] || "L").toUpperCase();
    }
  }

  activateDemoMode(silent = false) {
    this.isDemo = true;
    this.updateAuthUI();
    if (!silent) {
      this.toast("✨ Đã bật Chế độ Demo! Bạn có thể thoải mái thử mọi tính năng.");
    }
  }

  setupLoginModal() {
    const modal = document.getElementById("loginModal");
    modal.addEventListener("click", (event) => {
      if (event.target === modal) this.closeLoginModal();
    });
    document.addEventListener("keydown", (event) => {
      if (!modal.classList.contains("open")) return;
      if (event.key === "Escape") return this.closeLoginModal();
      if (event.key !== "Tab") return;
      const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  openLoginModal() {
    const modal = document.getElementById("loginModal");
    this.lastFocusedElement = document.activeElement;
    document.querySelectorAll("body > :not(#loginModal):not(#toastContainer)").forEach((element) => { element.inert = true; });
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => document.getElementById("loginEmail").focus());
  }

  closeLoginModal() {
    const modal = document.getElementById("loginModal");
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.querySelectorAll("body > [inert]").forEach((element) => { element.inert = false; });
    this.lastFocusedElement?.focus();
  }

  switchLoginTab(tab) {
    document.getElementById("loginTabEmail").classList.toggle("active", tab === "email");
    document.getElementById("loginTabJson").classList.toggle("active", tab === "json");
    document.getElementById("loginFormEmail").style.display = tab === "email" ? "block" : "none";
    document.getElementById("loginFormJson").style.display = tab === "json" ? "block" : "none";
  }

  async loginWithEmail() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    if (!email || !password) {
      return this.toast("⚠️ Vui lòng nhập đầy đủ Email và Mật khẩu Locket!");
    }

    const btn = document.getElementById("btnDoLogin");
    btn.disabled = true;
    btn.textContent = "⏳ Đang xác thực với Firebase...";

    try {
      const url = `${FIREBASE_AUTH_URL}:signInWithPassword?key=${FIREBASE_API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Ios-Bundle-Identifier": "com.locket.Locket"
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        })
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.message || "Đăng nhập thất bại";
        throw new Error(msg);
      }

      this.session.uid = data.localId;
      this.session.email = data.email;
      this.session.idToken = data.idToken;
      this.session.refreshToken = data.refreshToken;
      this.session.expiresAt = Date.now() + parseInt(data.expiresIn || "3600", 10) * 1000;
      this.isDemo = false;
      this.saveSession();
      this.updateAuthUI();
      this.closeLoginModal();
      this.toast(`✅ Đăng nhập Locket thành công (${email})!`);
      await this.fetchMyProfile();
      await this.loadFriendsFeed();
    } catch (e) {
      this.toast(`❌ Lỗi đăng nhập: ${e.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = "🚀 Đăng Nhập Trực Tiếp (Firebase Auth)";
    }
  }

  async loginWithSessionJson() {
    const raw = document.getElementById("sessionJsonInput").value.trim();
    if (!raw) return this.toast("⚠️ Vui lòng dán nội dung JSON!");
    try {
      const data = JSON.parse(raw);
      if (!data.idToken && !data.refreshToken) {
        throw new Error("JSON thiếu idToken hoặc refreshToken");
      }
      this.session.uid = data.uid || data.localId || "";
      this.session.email = data.email || "";
      this.session.idToken = data.idToken || "";
      this.session.refreshToken = data.refreshToken || "";
      this.session.expiresAt = data.expiresAt || 0;
      this.isDemo = false;
      await this.getValidToken();
      this.saveSession();
      this.updateAuthUI();
      this.closeLoginModal();
      this.toast("✅ Đã nạp phiên làm việc Locket thành công!");
      await this.fetchMyProfile();
      await this.loadFriendsFeed();
    } catch (e) {
      this.toast(`❌ JSON không hợp lệ: ${e.message}`);
    }
  }

  logout() {
    localStorage.removeItem("locket_web_session");
    this.session = { uid: null, email: null, idToken: null, refreshToken: null, expiresAt: 0 };
    this.activateDemoMode();
    this.closeLoginModal();
  }

  async getValidToken(forceRefresh = false) {
    if (this.isDemo) return "DEMO_TOKEN";
    if (!this.session.idToken && !this.session.refreshToken) throw new Error("Chưa đăng nhập!");

    if ((forceRefresh || !this.session.idToken || Date.now() >= (this.session.expiresAt - 60000)) && this.session.refreshToken) {
      const url = `${FIREBASE_TOKEN_URL}?key=${FIREBASE_API_KEY}`;
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.session.refreshToken
      });
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Ios-Bundle-Identifier": "com.locket.Locket"
        },
        body
      });
      const data = await res.json();
      if (!res.ok || !data.id_token) {
        throw new Error(data?.error?.message || "Không thể làm mới phiên đăng nhập");
      }
      this.session.idToken = data.id_token;
      this.session.refreshToken = data.refresh_token || this.session.refreshToken;
      this.session.uid = data.user_id || this.session.uid;
      this.session.expiresAt = Date.now() + parseInt(data.expires_in || "3600", 10) * 1000;
      this.saveSession();
    }
    return this.session.idToken;
  }

  async postLocketApi(endpoint, payload = {}, diagnostics = false) {
    const token = await this.getValidToken();
    const res = await fetch(`${LOCKET_API_BASE}/${endpoint}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
        "x-ios-bundle-identifier": "com.locket.Locket"
      },
      body: JSON.stringify({
        data: {
          ...payload,
          analytics: {
            ios_version: "2.68.0.2523",
            experiments: {
              flag_18: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "1203" },
              flag_7: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "800" },
              flag_10: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "505" }
            },
            installation_id: this.session.installationId || "a1b2c3d4e5f60718293a4b",
            platform: "ios"
          }
        }
      })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) {
      const message = json.error?.message || json.message || `Locket API lỗi ${res.status}`;
      const error = new Error(message);
      error.status = res.status;
      error.code = json.error?.status || json.error?.code || json.code || "";
      throw error;
    }
    const result = json.result || json;
    return diagnostics ? { result, status: res.status, keys: Object.keys(json) } : result;
  }

  requireLiveSession() {
    if (this.isDemo || !this.session.uid) {
      this.toast("ℹ️ Chức năng này cần đăng nhập tài khoản Locket thật.");
      return false;
    }
    return true;
  }

  async fetchMyProfile() {
    if (this.isDemo || !this.session.uid) return;
    try {
      const res = await this.postLocketApi("fetchUserV2", { user_uid: this.session.uid });
      const p = res.data || res;
      if (p && (p.first_name || p.firstName)) {
        this.session.firstName = p.first_name || p.firstName || "";
        this.session.lastName = p.last_name || p.lastName || "";
        this.saveSession();
        this.updateAuthUI();
      }
    } catch (e) {
      console.warn("Profile fetch failed:", e);
    }
  }

  /* =========================================================================
   * STUDIO MEDIA & ANTI-CROP CANVAS ENGINE
   * ========================================================================= */
  setupDragAndDrop() {
    const dz = document.getElementById("dropzone");
    dz.addEventListener("dragover", (e) => {
      e.preventDefault();
      dz.classList.add("dragover");
    });
    dz.addEventListener("dragleave", () => dz.classList.remove("dragover"));
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      dz.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.loadMediaFile(e.dataTransfer.files[0]);
      }
    });
  }

  handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (file) this.loadMediaFile(file);
  }

  clearVideoPreview() {
    if (this.videoAnimFrame) {
      cancelAnimationFrame(this.videoAnimFrame);
      this.videoAnimFrame = null;
    }
    const videoEl = document.getElementById("previewVideo");
    videoEl.pause();
    videoEl.onloadedmetadata = null;
    videoEl.onseeked = null;
    videoEl.onerror = null;
    videoEl.removeAttribute("src");
    videoEl.load();
    if (this.videoObjectUrl) {
      URL.revokeObjectURL(this.videoObjectUrl);
      this.videoObjectUrl = null;
    }
  }

  async loadMediaFile(file) {
    const loadId = ++this.mediaLoadId;
    const isMp4Name = file.name.toLowerCase().endsWith(".mp4");
    const isVideo = file.type.startsWith("video/") || (!file.type && isMp4Name);
    const isImage = file.type.startsWith("image/");
    const maxSize = isVideo ? 6291455 : 20 * 1024 * 1024;
    if (!isVideo && !isImage) return this.toast("⚠️ Chỉ hỗ trợ tệp ảnh hoặc video MP4.");
    if (file.size > maxSize) return this.toast(`⚠️ ${isVideo ? "Video" : "Ảnh"} vượt quá ${isVideo ? "6 MB" : "20 MB"}.`);

    if (isVideo) {
      let brand;
      try {
        const signature = new Uint8Array(await file.slice(4, 12).arrayBuffer());
        brand = String.fromCharCode(...signature.slice(0, 4));
      } catch {
        return this.toast("⚠️ Không đọc được video này. Hãy thử chọn lại tệp.");
      }
      if (loadId !== this.mediaLoadId) return;
      if ((file.type && file.type !== "video/mp4") || !isMp4Name || brand !== "ftyp") {
        return this.toast("⚠️ Website chỉ đăng video MP4. Hãy chuyển video sang MP4 trước khi chọn.");
      }
    }

    if (loadId !== this.mediaLoadId) return;
    this.clearVideoPreview();
    const videoEl = document.getElementById("previewVideo");

    if (isVideo) {
      this.mediaType = "video";
      this.currentVideoFile = file;
      this.videoObjectUrl = URL.createObjectURL(file);
      videoEl.src = this.videoObjectUrl;
      videoEl.play().catch(() => {});
      const loopRender = () => {
        if (this.mediaType === "video" && !videoEl.paused && !videoEl.ended) {
          this.renderCanvasFrame(videoEl, videoEl.videoWidth || 1080, videoEl.videoHeight || 1080);
        }
        if (this.mediaType === "video") {
          this.videoAnimFrame = requestAnimationFrame(loopRender);
        }
      };
      videoEl.onloadedmetadata = () => {
        if (!Number.isFinite(videoEl.duration) || videoEl.duration <= 0) {
          this.clearVideoPreview();
          this.mediaType = "image";
          this.currentVideoFile = null;
          return this.toast("⚠️ Không đọc được video này. Hãy thử một tệp MP4 khác.");
        }
        const duration = `${videoEl.duration.toFixed(1)} giây`;
        document.getElementById("mediaDimInfo").textContent = `🎬 ${videoEl.videoWidth}×${videoEl.videoHeight} • ${duration} • ${(file.size / 1024 / 1024).toFixed(2)} MB`;
        videoEl.currentTime = Math.min(1, videoEl.duration / 2);
      };
      videoEl.onseeked = () => {
        this.renderCanvasFrame(videoEl, videoEl.videoWidth || 1080, videoEl.videoHeight || 1080);
        videoEl.play().catch(() => {});
        if (!this.videoAnimFrame) loopRender();
      };
      videoEl.onerror = () => {
        this.clearVideoPreview();
        this.mediaType = "image";
        this.currentVideoFile = null;
        this.toast("⚠️ Trình duyệt không phát được video MP4 này. Nên dùng video H.264/AAC.");
      };
      this.updatePreview();
      this.toast(`🎬 Đang xử lý video: ${file.name}`);
    } else {
      this.mediaType = "image";
      this.currentVideoFile = null;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (loadId !== this.mediaLoadId) return;
        const img = new Image();
        img.onload = () => {
          if (loadId !== this.mediaLoadId) return;
          this.currentImage = img;
          document.getElementById("mediaDimInfo").textContent = `🖼️ Ảnh ${img.width}×${img.height} ➔ 1:1 Chuẩn`;
          this.renderCanvasFrame(img, img.width, img.height);
          this.updatePreview();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
      this.toast(`🖼️ Đã nạp ảnh: ${file.name}`);
    }
  }

  /**
   * Generates procedural high-res sample artwork so the demo works 100% offline/instantly
   */
  loadSampleImage(theme) {
    this.clearVideoPreview();
    this.mediaType = "image";
    this.currentVideoFile = null;

    const off = document.createElement("canvas");
    // Use portrait 9:16 dimensions so user immediately sees how Blur Padding saves non-square photos!
    off.width = 900;
    off.height = 1440;
    const ctx = off.getContext("2d");

    const palettes = {
      sunset: ["#1a0933", "#7b1fa2", "#ff5722", "#ffc107"],
      cyber: ["#050716", "#0d254c", "#7928ca", "#ff0080"],
      coffee: ["#1b120c", "#4e342e", "#8d6e63", "#ffcc80"],
      portrait: ["#0f2027", "#203a43", "#2c5364", "#ffb800"]
    };
    const cols = palettes[theme] || palettes.sunset;

    const grad = ctx.createLinearGradient(0, 0, off.width, off.height);
    grad.addColorStop(0, cols[0]);
    grad.addColorStop(0.4, cols[1]);
    grad.addColorStop(0.78, cols[2]);
    grad.addColorStop(1, cols[3]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, off.width, off.height);

    // Sun / Neon glow circles
    ctx.save();
    ctx.fillStyle = "rgba(255, 230, 128, 0.25)";
    ctx.beginPath();
    ctx.arc(off.width * 0.5, off.height * 0.38, 220, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(off.width * 0.5, off.height * 0.38, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Silhouette mountains / skyline
    ctx.fillStyle = "rgba(10, 12, 18, 0.78)";
    ctx.beginPath();
    ctx.moveTo(0, off.height);
    ctx.lineTo(0, off.height * 0.65);
    ctx.lineTo(off.width * 0.28, off.height * 0.52);
    ctx.lineTo(off.width * 0.55, off.height * 0.62);
    ctx.lineTo(off.width * 0.82, off.height * 0.48);
    ctx.lineTo(off.width, off.height * 0.58);
    ctx.lineTo(off.width, off.height);
    ctx.closePath();
    ctx.fill();

    // Decorative badge label inside sample photo
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    const titles = {
      sunset: "🌅 ĐÀ LẠT HOÀNG HÔN (9:16)",
      cyber: "🌃 SAIGON NIGHT VIBES (9:16)",
      coffee: "☕ MORNING COFFEE (9:16)",
      portrait: "📸 KHUNG DỌC 9:16 CHỐNG CẮT"
    };
    ctx.fillText(titles[theme] || titles.sunset, off.width / 2, off.height * 0.82);
    ctx.font = "26px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.68)";
    ctx.fillText("Viền mờ Blur 2 bên giúp ảnh không bị Locket cắt mất đầu/chân", off.width / 2, off.height * 0.86);

    const img = new Image();
    img.onload = () => {
      this.currentImage = img;
      document.getElementById("mediaDimInfo").textContent = `🖼️ Ảnh dọc ${img.width}×${img.height} ➔ 1080×1080 (Blur 1:1)`;
      this.renderCanvasFrame(img, img.width, img.height);
      this.updatePreview();
    };
    img.src = off.toDataURL("image/jpeg", 0.92);
  }

  setFrameMode(mode) {
    this.frameMode = mode;
    ["Blur", "Fit", "Crop"].forEach((m) => {
      document.getElementById(`frame${m}`).classList.toggle("active", mode === m.toLowerCase());
    });
    if (this.mediaType === "image" && this.currentImage) {
      this.renderCanvasFrame(this.currentImage, this.currentImage.width, this.currentImage.height);
    } else if (this.mediaType === "video") {
      const v = document.getElementById("previewVideo");
      this.renderCanvasFrame(v, v.videoWidth || 1080, v.videoHeight || 1080);
    }
    this.updatePreview();
  }

  renderCanvasFrame(sourceEl, srcW, srcH) {
    const canvas = document.getElementById("previewCanvas");
    const size = 1080;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, size, size);

    if (this.frameMode === "crop") {
      const scale = Math.max(size / srcW, size / srcH);
      const drawW = srcW * scale;
      const drawH = srcH * scale;
      const dx = (size - drawW) / 2;
      const dy = (size - drawH) / 2;
      ctx.drawImage(sourceEl, dx, dy, drawW, drawH);
      return;
    }

    if (this.frameMode === "fit") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, size, size);
    } else {
      // Universal Cross-Platform Blur Padding (works 100% on iOS Safari, Android & Desktop)
      if (!this._blurCanvas1) {
        this._blurCanvas1 = document.createElement("canvas");
        this._blurCanvas1.width = 64;
        this._blurCanvas1.height = 64;
        this._blurCanvas2 = document.createElement("canvas");
        this._blurCanvas2.width = 28;
        this._blurCanvas2.height = 28;
      }
      const bCtx1 = this._blurCanvas1.getContext("2d");
      const bCtx2 = this._blurCanvas2.getContext("2d");
      bCtx1.imageSmoothingEnabled = true;
      bCtx2.imageSmoothingEnabled = true;

      // Multi-pass downscale + upscale creates creamy Gaussian blur even on iOS WebKit
      bCtx1.drawImage(sourceEl, 0, 0, 64, 64);
      bCtx2.drawImage(this._blurCanvas1, 0, 0, 64, 64, 0, 0, 28, 28);
      bCtx1.drawImage(this._blurCanvas2, 0, 0, 28, 28, 0, 0, 64, 64);

      ctx.save();
      if ("filter" in ctx) {
        ctx.filter = "blur(28px) brightness(0.78)";
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const bgScale = Math.max(size / srcW, size / srcH) * 1.12;
      const bgW = srcW * bgScale;
      const bgH = srcH * bgScale;
      ctx.drawImage(this._blurCanvas1, (size - bgW) / 2, (size - bgH) / 2, bgW, bgH);
      ctx.restore();

      // Subtle dark vignette for contrast
      ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
      ctx.fillRect(0, 0, size, size);
    }

    const scale = Math.min(size / srcW, size / srcH);
    const drawW = srcW * scale;
    const drawH = srcH * scale;
    const dx = (size - drawW) / 2;
    const dy = (size - drawH) / 2;
    ctx.drawImage(sourceEl, dx, dy, drawW, drawH);
  }

  /* =========================================================================
   * OVERLAYS & 158+ PRESETS ENGINE
   * ========================================================================= */
  initPresetsExplorer() {
    const presets = window.LOCKET_PRESETS || {};
    const sections = new Set();
    Object.values(presets).forEach((p) => {
      if (p.section) sections.add(p.section);
    });
    const sel = document.getElementById("presetCategorySelect");
    sections.forEach((sec) => {
      const opt = document.createElement("option");
      opt.value = sec;
      opt.textContent = sec;
      sel.appendChild(opt);
    });
    this.renderPresetsList();
  }

  renderPresetsList() {
    const presets = window.LOCKET_PRESETS || {};
    const q = (document.getElementById("presetSearchInput")?.value || "").toLowerCase().trim();
    const cat = document.getElementById("presetCategorySelect")?.value || "ALL";
    const grid = document.getElementById("presetsGrid");
    grid.innerHTML = "";

    Object.entries(presets).forEach(([key, p]) => {
      if (key === "standard") return;
      if (cat !== "ALL" && p.section !== cat) return;
      const text = p.text || key;
      if (q && !key.toLowerCase().includes(q) && !text.toLowerCase().includes(q)) return;

      const btn = document.createElement("div");
      btn.className = "preset-item" + (this.selectedPresetKey === key ? " selected" : "");
      const c1 = p.colors?.[0] || "#252736";
      const c2 = p.colors?.[1] || c1;
      btn.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
      btn.style.color = p.text_color || "#FFFFFF";
      btn.innerHTML = `<span>${p.icon || "🏷️"}</span><span>${text}</span>`;
      btn.title = `[${key}] — ${text}`;
      btn.onclick = () => {
        this.selectedPresetKey = key;
        document.getElementById("captionInput").value = p.text || "";
        this.renderPresetsList();
        this.updatePreview();
      };
      grid.appendChild(btn);
    });
  }

  setOverlayMode(mode) {
    this.overlayMode = mode;
    ["standard", "streak", "time", "weather", "location", "music", "colors", "preset"].forEach((m) => {
      document.getElementById(`ov_${m}`)?.classList.toggle("active", m === mode);
      const cfg = document.getElementById(`cfg_${m}`);
      if (cfg) cfg.style.display = m === mode ? "block" : "none";
    });
    if (mode === "time" && !document.getElementById("timeValInput").value) {
      this.fillCurrentTime();
    }
    this.updatePreview();
  }

  setQuickStreak(val) {
    document.getElementById("streakValInput").value = val;
    this.updatePreview();
  }

  fillCurrentTime() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    document.getElementById("timeValInput").value = `${hh}:${mm}`;
    this.updatePreview();
  }

  async fetchLiveWeather(city) {
    try {
      this.toast(`⛅ Đang lấy thời tiết thực tế tại ${city.replace("_", " ")}...`);
      const res = await fetch(`https://wttr.in/${city}?format=j1`);
      const data = await res.json();
      const cur = data.current_condition[0];
      const temp = cur.temp_C;
      const desc = cur.weatherDesc[0].value;
      const cityLabel = city === "Ho_Chi_Minh" ? "Sài Gòn" : city === "Hanoi" ? "Hà Nội" : "Đà Lạt";
      document.getElementById("weatherValInput").value = `${temp}°C ${cityLabel} · ${desc}`;
      this.updatePreview();
    } catch (e) {
      document.getElementById("weatherValInput").value = "28°C Trời đẹp";
      this.updatePreview();
    }
  }

  /**
   * Builds the authentic Locket overlay object & updates the iPhone live widget preview
   */
  buildOverlayData() {
    const rawCaption = document.getElementById("captionInput").value.trim();
    const presets = window.LOCKET_PRESETS || {};

    let finalText = rawCaption;
    let icon = null;
    let colors = [];
    let textColor = "#FFFFFFE6";
    let overlayId = "caption:standard";
    let dataType = "standard";
    let syntaxHint = "";

    if (this.overlayMode === "streak") {
      const sVal = document.getElementById("streakValInput").value.trim() || "100 Days";
      finalText = rawCaption ? `${sVal} · ${rawCaption}` : sVal;
      icon = "🔥";
      colors = ["#FF512F", "#F09819"];
      textColor = "#FFFFFF";
      overlayId = "caption:streak";
      dataType = "streak";
      syntaxHint = `[streak: ${sVal}] ${rawCaption}`;
    } else if (this.overlayMode === "time") {
      const tVal = document.getElementById("timeValInput").value.trim() || "22:00";
      finalText = rawCaption ? `${tVal} - ${rawCaption}` : tVal;
      icon = "🕒";
      overlayId = "caption:time";
      dataType = "time";
      syntaxHint = `[time: ${tVal}] ${rawCaption}`;
    } else if (this.overlayMode === "weather") {
      const wVal = document.getElementById("weatherValInput").value.trim() || "27°C Chill";
      finalText = rawCaption ? `${wVal} · ${rawCaption}` : wVal;
      icon = "⛅";
      colors = ["#2193b0", "#6dd5ed"];
      overlayId = "caption:weather";
      dataType = "weather";
      syntaxHint = `[weather: ${wVal}] ${rawCaption}`;
    } else if (this.overlayMode === "location") {
      const lVal = document.getElementById("locationValInput").value.trim() || "Sài Gòn";
      finalText = rawCaption ? `${lVal} · ${rawCaption}` : lVal;
      icon = "📍";
      overlayId = "caption:location";
      dataType = "location";
      syntaxHint = `[location: ${lVal}] ${rawCaption}`;
    } else if (this.overlayMode === "music") {
      const mVal = document.getElementById("musicValInput").value.trim() || "Music";
      finalText = rawCaption ? `${mVal} 🎶 ${rawCaption}` : mVal;
      icon = "🎵";
      colors = ["#1DB954", "#191414"];
      overlayId = "caption:music";
      dataType = "music";
      syntaxHint = `[music: ${mVal}] ${rawCaption}`;
    } else if (this.overlayMode === "colors") {
      const c1 = document.getElementById("gradColor1").value;
      const c2 = document.getElementById("gradColor2").value;
      const tc = document.getElementById("gradTextColor").value;
      const em = document.getElementById("customEmojiInput").value.trim();
      colors = [c1, c2];
      textColor = tc;
      icon = em || null;
      overlayId = "caption:standard";
      dataType = "standard";
      syntaxHint = `[colors: ${c1}, ${c2}] ${rawCaption}`;
    } else if (this.overlayMode === "preset") {
      const p = presets[this.selectedPresetKey];
      if (p) {
        finalText = rawCaption || p.text || this.selectedPresetKey;
        icon = p.icon || null;
        colors = p.colors || [];
        textColor = p.text_color || "#FFFFFF";
        overlayId = p.overlay_id || `caption:${this.selectedPresetKey}`;
        dataType = p.type || "static_content";
        syntaxHint = `[${this.selectedPresetKey}] ${finalText}`;
      }
    }

    const overlayPayload = {
      overlay_type: "caption",
      overlay_id: overlayId,
      alt_text: icon ? `${icon} ${finalText}` : finalText,
      data: {
        text: finalText,
        type: dataType,
        text_color: textColor,
        max_lines: {
          value: "4",
          "@type": "type.googleapis.com/google.protobuf.Int64Value"
        },
        background: {
          material_blur: colors.length ? "regular" : "ultra_thin",
          colors: colors
        }
      }
    };
    if (icon) {
      overlayPayload.data.icon = { data: icon, type: "emoji" };
    }

    return { finalText, icon, colors, textColor, overlayPayload, syntaxHint };
  }

  updatePreview() {
    const { finalText, icon, colors, textColor, syntaxHint } = this.buildOverlayData();
    const wrap = document.getElementById("widgetCaptionWrap");
    const pill = document.getElementById("widgetOverlayPill");
    const iconEl = document.getElementById("widgetOverlayIcon");
    const textEl = document.getElementById("widgetOverlayText");
    const badgeEl = document.getElementById("widgetMediaTypeBadge");
    const hintEl = document.getElementById("smartSyntaxHint");

    hintEl.textContent = syntaxHint ? `Cú pháp Bot: ${syntaxHint}` : "";
    badgeEl.textContent = `${this.mediaType === "video" ? "🎬 VIDEO" : "📸 ẢNH"} 1:1 ${this.frameMode.toUpperCase()}`;

    if (!finalText && !icon) {
      wrap.style.display = "none";
      return;
    }
    wrap.style.display = "flex";
    iconEl.textContent = icon || "";
    textEl.textContent = finalText;
    pill.style.color = textColor || "#FFFFFF";

    if (colors && colors.length >= 2) {
      pill.style.background = `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
    } else if (colors && colors.length === 1) {
      pill.style.background = colors[0];
    } else {
      pill.style.background = "rgba(25, 25, 28, 0.65)";
    }
  }

  /* =========================================================================
   * FIREBASE STORAGE UPLOAD & POST MOMENT V2
   * ========================================================================= */
  async canvasToBlob(mime = "image/webp", quality = 0.92) {
    const canvas = document.getElementById("previewCanvas");
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          resolve(blob);
        } else {
          // Fallback to JPEG on older iOS WebKit if WebP canvas encoding is unsupported
          canvas.toBlob((jpgBlob) => resolve(jpgBlob), "image/jpeg", quality);
        }
      }, mime, quality);
    });
  }

  async uploadToFirebaseStorage(blobOrFile, isVideo = false) {
    const token = await this.getValidToken();
    const uid = this.session.uid;
    const ext = isVideo ? "mp4" : "webp";
    const mime = isVideo ? "video/mp4" : "image/webp";
    const folder = isVideo ? "videos" : "thumbnails";
    const baseUrl = isVideo ? STORAGE_VIDEO_URL : STORAGE_IMG_URL;

    // Must be 20-char alphanumeric to pass Locket Firebase Storage security rule
    const filename = `${this.randomId(20)}.${ext}`;
    const objectPath = `users/${uid}/moments/${folder}/${filename}`;
    const encodedName = encodeURIComponent(objectPath);
    const initUrl = `${baseUrl}/${encodedName}?uploadType=resumable&name=${encodedName}`;

    const metadata = {
      bucket: "",
      contentType: mime,
      name: objectPath,
      metadata: { visibility: "private", creator: uid },
      cacheControl: "public, max-age=604800"
    };

    const initRes = await fetch(initUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "Authorization": `Firebase ${token}`,
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Type": mime,
        "X-Goog-Upload-Header-Content-Length": String(blobOrFile.size),
        "X-Firebase-Storage-Version": "ios/12.12.1",
        "X-Firebase-GMPID": FIREBASE_APP_ID
      },
      body: JSON.stringify(metadata)
    });

    if (!initRes.ok) {
      const errText = await initRes.text();
      throw new Error(`Storage init failed (${initRes.status}): ${errText}`);
    }

    const uploadUrl = initRes.headers.get("x-goog-upload-url");
    if (!uploadUrl) {
      throw new Error("Không lấy được x-goog-upload-url từ Firebase Storage");
    }

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Goog-Upload-Command": "upload, finalize",
        "X-Goog-Upload-Offset": "0"
      },
      body: blobOrFile
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      throw new Error(`Storage upload failed (${putRes.status}): ${errText}`);
    }

    const resJson = await putRes.json();
    const dlToken = (resJson.downloadTokens || "").split(",")[0];
    return `${baseUrl}/${encodedName}?alt=media&token=${dlToken}`;
  }

  async submitMoment() {
    const btn = document.getElementById("btnPostMoment");
    btn.disabled = true;
    const origLabel = btn.innerHTML;

    try {
      const { finalText, overlayPayload } = this.buildOverlayData();
      const isPrivate = document.getElementById("privateCheck").checked;
      const recipients = document.getElementById("recipientInput").value
        .split(",")
        .map((uid) => uid.trim())
        .filter(Boolean);
      if (recipients.some((uid) => !/^[A-Za-z0-9_-]{8,128}$/.test(uid))) {
        throw new Error("UID người nhận không hợp lệ.");
      }
      const canvas = document.getElementById("previewCanvas");
      const previewDataUrl = canvas.toDataURL("image/jpeg", 0.85);

      if (this.isDemo) {
        btn.innerHTML = "⏳ Đang mô phỏng đẩy lên Widget...";
        await new Promise((r) => setTimeout(r, 900));
        const mockId = "DEMO_" + this.randomId(14);
        this.saveToHistory({
          moment_uid: mockId,
          caption: overlayPayload.alt_text || finalText || "(Không có caption)",
          thumb: previewDataUrl,
          created_at: new Date().toLocaleTimeString("vi-VN"),
          mode: "DEMO"
        });
        this.toast(`🎉 [Demo] Đã đăng thành công! ID: ${mockId}. Hãy đăng nhập tài khoản thật để gửi tới Widget bạn bè!`);
        return;
      }

      btn.innerHTML = "⏳ Đang nén ảnh 1:1 WebP & tải lên Firebase...";
      const webpBlob = await this.canvasToBlob("image/webp", 0.92);
      const thumbUrl = await this.uploadToFirebaseStorage(webpBlob, false);

      let videoUrl = null;
      if (this.mediaType === "video" && this.currentVideoFile) {
        if (this.currentVideoFile.size > 6291455) {
          throw new Error("Video trên trình duyệt cần nhỏ hơn 6MB (hoặc dùng Bot Telegram để nén tự động HEVC 5-10 phút).");
        }
        btn.innerHTML = "⏳ Đang tải Video lên Locket Storage...";
        videoUrl = await this.uploadToFirebaseStorage(this.currentVideoFile, true);
      }

      btn.innerHTML = "🚀 Đang phát sóng lên Widget Locket...";
      const overlays = (finalText || this.overlayMode !== "standard") ? [overlayPayload] : [];
      const payload = {
        thumbnail_url: thumbUrl,
        overlays,
        sent_to_self_only: isPrivate,
        sent_to_all: !isPrivate && recipients.length === 0,
        recipients: isPrivate ? [] : recipients,
        md5: `${this.randomHex(32)}_${Math.floor(Date.now() / 1000)}`
      };
      if (finalText || overlayPayload.alt_text) {
        payload.caption = finalText || overlayPayload.alt_text;
      }
      if (videoUrl) {
        payload.video_url = videoUrl;
      }

      const res = await this.postLocketApi("postMomentV2", payload);
      const dataRes = res.data || res;
      const momentId = dataRes.canonical_uid || dataRes.id || "OK";

      this.saveToHistory({
        moment_uid: momentId,
        caption: overlayPayload.alt_text || finalText || "(Không có caption)",
        thumb: previewDataUrl,
        created_at: new Date().toLocaleTimeString("vi-VN"),
        mode: "LIVE"
      });

      this.toast(`✅ Đã lên sóng Locket Widget thành công! ID: ${momentId}`);
    } catch (e) {
      this.toast(`❌ Lỗi khi đăng: ${e.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = origLabel;
    }
  }

  downloadProcessedImage() {
    const canvas = document.getElementById("previewCanvas");
    const link = document.createElement("a");
    link.download = `locket_1x1_${this.frameMode}_${Date.now()}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
    this.toast("💾 Đã tải ảnh 1:1 chống cắt về máy!");
  }

  /* =========================================================================
   * TABS & SOCIAL FEATURES
   * ========================================================================= */
  switchTab(tab) {
    ["Studio", "Feed", "Friends", "History", "Profile"].forEach((t) => {
      const lower = t.toLowerCase();
      const active = lower === tab;
      const button = document.getElementById(`tabBtn${t}`);
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      document.getElementById(`tab${t}`).style.display = active ? "block" : "none";
    });
    if (tab === "feed") this.loadFriendsFeed();
    if (tab === "friends") this.loadFriends();
    if (tab === "history") this.renderHistory();
    if (tab === "profile") this.loadProfileForm();
  }

  updateAudienceControls() {
    const isPrivate = document.getElementById("privateCheck").checked;
    const input = document.getElementById("recipientInput");
    input.disabled = isPrivate;
    if (isPrivate) input.value = "";
  }

  normalizeUsers(value) {
    const candidates = Array.isArray(value) ? value : [];
    return candidates.map((item) => item?.user || item?.profile || item).filter(Boolean);
  }

  async listFirestoreUserIds(collection) {
    const token = await this.getValidToken();
    const uid = encodeURIComponent(this.session.uid);
    const url = `https://firestore.googleapis.com/v1/projects/locket-4252a/databases/(default)/documents/users/${uid}/${collection}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || `Firestore lỗi ${response.status}`);
    return (data.documents || []).map((document) => document.name?.split("/").pop()).filter(Boolean);
  }

  async fetchUsersByIds(ids) {
    return Promise.all(ids.map(async (uid) => {
      try {
        const response = await this.postLocketApi("fetchUserV2", { user_uid: uid });
        return { uid, ...(response.data || response) };
      } catch {
        return { uid };
      }
    }));
  }

  createUserItem(user, actions = []) {
    const item = document.createElement("div");
    item.className = "management-item";
    const info = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = [user.first_name || user.firstName, user.last_name || user.lastName].filter(Boolean).join(" ") || user.username || "Người dùng Locket";
    const uid = document.createElement("span");
    uid.className = "muted-id";
    uid.textContent = String(user.uid || user.user_uid || user.id || "Không có UID");
    info.append(name, uid);
    item.appendChild(info);
    if (actions.length) {
      const controls = document.createElement("div");
      controls.className = "management-actions";
      actions.forEach(({ label, action, danger = false }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `btn btn-sm${danger ? " btn-danger" : ""}`;
        button.textContent = label;
        button.addEventListener("click", () => action(button));
        controls.appendChild(button);
      });
      item.appendChild(controls);
    }
    return item;
  }

  async loadFriends() {
    const container = document.getElementById("friendsContainer");
    if (!this.requireLiveSession()) return this.setEmptyState(container, "Đăng nhập để quản lý bạn bè.");
    this.setEmptyState(container, "⏳ Đang tải danh sách bạn bè...");
    try {
      const [friendIds, requestIds] = await Promise.all([
        this.listFirestoreUserIds("friends"),
        this.listFirestoreUserIds("incoming_friend_requests")
      ]);
      const [friends, requests] = await Promise.all([
        this.fetchUsersByIds(friendIds),
        this.fetchUsersByIds(requestIds)
      ]);
      const nodes = [];
      requests.forEach((user, index) => {
        const uid = user.uid || user.user_uid || user.id || requestIds[index];
        nodes.push(this.createUserItem(user, [{ label: "Chấp nhận", action: () => this.acceptFriendRequest(uid) }]));
      });
      friends.forEach((user, index) => {
        const uid = user.uid || user.user_uid || user.id || friendIds[index];
        nodes.push(this.createUserItem(user, [
          { label: "Nhắn tin", action: () => {
            document.getElementById("chatReceiverInput").value = uid;
            document.getElementById("chatMessageInput").focus();
          } },
          { label: "Xóa bạn", danger: true, action: (button) => this.removeFriend(uid, button) }
        ]));
      });
      if (!nodes.length) return this.setEmptyState(container, "Bạn chưa có bạn bè hoặc lời mời mới.");
      container.replaceChildren(...nodes);
    } catch (error) {
      this.setEmptyState(container, `❌ Không tải được bạn bè: ${error.message}`);
    }
  }

  async sendFriendRequest() {
    if (!this.requireLiveSession()) return;
    const input = document.getElementById("friendUidInput");
    const uid = input.value.trim();
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(uid)) return this.toast("❌ UID người dùng không hợp lệ.");
    const payload = {
      user_uid: uid,
      source: "inviteCardPopup",
      platform: "iOS",
      create_ofr_for_temp_users: false,
      share_history_eligible: true,
      get_reengagement_status: false,
      prompted_reengagement: false,
      rollcall: false,
      invite_variant: {
        value: "1002",
        "@type": "type.googleapis.com/google.protobuf.Int64Value"
      }
    };
    try {
      try {
        await this.postLocketApi("sendFriendRequest", payload);
      } catch (error) {
        if (error.status !== 401 || !this.session.refreshToken) throw error;
        await this.getValidToken(true);
        await this.postLocketApi("sendFriendRequest", payload);
      }
      input.value = "";
      this.toast("✅ Đã gửi lời mời kết bạn.");
    } catch (error) {
      console.warn("[DEBUG-friend-request-7c31]", {
        endpoint: "sendFriendRequest",
        status: error.status || 0,
        code: error.code || "",
        message: error.message
      });
      this.toast(`❌ Không gửi được lời mời: ${error.message}`);
    }
  }

  async acceptFriendRequest(uid) {
    if (!uid || !this.requireLiveSession()) return;
    try {
      await this.postLocketApi("acceptFriendRequest", { user_uid: uid, during_signup: false, ios_version: "2.68.0.2523" });
      this.toast("✅ Đã chấp nhận lời mời.");
      await this.loadFriends();
    } catch (error) {
      this.toast(`❌ Không thể chấp nhận: ${error.message}`);
    }
  }

  async removeFriend(uid, button) {
    if (!uid || !this.requireLiveSession() || !confirm("Xóa người này khỏi danh sách bạn bè?")) return;
    button.disabled = true;
    try {
      await this.postLocketApi("removeFriend", { user_uid: uid });
      this.toast("✅ Đã xóa bạn.");
      await this.loadFriends();
    } catch (error) {
      button.disabled = false;
      this.toast(`❌ Không thể xóa bạn: ${error.message}`);
    }
  }

  async sendChatMessage() {
    if (!this.requireLiveSession()) return;
    const receiver = document.getElementById("chatReceiverInput").value.trim();
    const messageInput = document.getElementById("chatMessageInput");
    const message = messageInput.value.trim();
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(receiver)) return this.toast("❌ UID người nhận không hợp lệ.");
    if (!message) return this.toast("❌ Tin nhắn đang trống.");
    try {
      await this.postLocketApi("sendChatMessageV2", { receiver_uid: receiver, msg: message, moment_uid: null, from_memory: false, intensity: 0, client_token: crypto.randomUUID().toUpperCase() });
      messageInput.value = "";
      this.toast("✅ Đã gửi tin nhắn.");
    } catch (error) {
      this.toast(`❌ Không gửi được tin nhắn: ${error.message}`);
    }
  }

  loadProfileForm() {
    document.getElementById("profileFirstName").value = this.session.firstName || "";
    document.getElementById("profileLastName").value = this.session.lastName || "";
  }

  async saveProfile() {
    if (!this.requireLiveSession()) return;
    const firstName = document.getElementById("profileFirstName").value.trim();
    const lastName = document.getElementById("profileLastName").value.trim();
    const birthdate = document.getElementById("profileBirthdate").value;
    if (!firstName) return this.toast("❌ Tên không được để trống.");
    const button = document.getElementById("btnSaveProfile");
    button.disabled = true;
    try {
      const payload = { first_name: firstName, last_name: lastName };
      if (birthdate) payload.birthdate = birthdate;
      await this.postLocketApi("changeProfileInfo", payload);
      this.session.firstName = firstName;
      this.session.lastName = lastName;
      this.saveSession();
      this.updateAuthUI();
      this.toast("✅ Đã cập nhật hồ sơ.");
    } catch (error) {
      this.toast(`❌ Không lưu được hồ sơ: ${error.message}`);
    } finally {
      button.disabled = false;
    }
  }

  setEmptyState(container, message) {
    container.replaceChildren();
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = message;
    container.appendChild(empty);
  }

  createFeedItem({ author, caption, time = "", thumb = "", momentUid = "", mode = "" }) {
    const el = document.createElement("div");
    el.className = "feed-item";

    const media = thumb ? document.createElement("img") : document.createElement("div");
    media.className = `feed-thumb${thumb ? "" : " feed-thumb-placeholder"}`;
    if (thumb) {
      media.src = thumb;
      media.alt = "Ảnh khoảnh khắc";
      media.loading = "lazy";
    } else {
      media.textContent = "📸";
    }

    const info = document.createElement("div");
    info.className = "feed-info";
    const authorEl = document.createElement("div");
    authorEl.className = "feed-author";
    authorEl.textContent = author;
    if (mode) {
      const badge = document.createElement("span");
      badge.className = "gold-badge";
      badge.textContent = mode;
      authorEl.prepend(badge, " ");
    }
    if (time) {
      const timeEl = document.createElement("span");
      timeEl.className = "feed-time";
      timeEl.textContent = ` • ${time}`;
      authorEl.appendChild(timeEl);
    }
    const captionEl = document.createElement("div");
    captionEl.className = "feed-caption";
    captionEl.textContent = caption;
    info.append(authorEl, captionEl);

    if (momentUid) {
      const reactions = document.createElement("div");
      reactions.className = "reaction-bar";
      ["❤️", "🔥", "😍", "😂"].forEach((emoji) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "react-btn";
        button.textContent = emoji;
        button.setAttribute("aria-label", `Thả cảm xúc ${emoji}`);
        button.addEventListener("click", () => this.sendReaction(momentUid, emoji));
        reactions.appendChild(button);
      });
      info.appendChild(reactions);
    }
    el.append(media, info);
    return el;
  }

  async loadFriendsFeed() {
    const container = document.getElementById("feedContainer");
    const loadId = ++this.feedLoadId;
    this.setEmptyState(container, "⏳ Đang tải khoảnh khắc từ bạn bè...");

    if (this.isDemo) {
      container.replaceChildren(...this.demoFeed.map((m) => this.createFeedItem({
        author: m.user_name,
        caption: m.caption,
        time: m.created_at,
        momentUid: m.moment_uid
      })));
      return;
    }

    try {
      const moments = [];
      const seen = new Set();
      let syncToken = null;
      // ponytail: Giới hạn 10 trang/150 bài; chuyển sang nút tải thêm khi API hoặc UX cần lịch sử lớn hơn.
      for (let page = 0; page < 10 && moments.length < 150; page += 1) {
        const payload = {
          should_count_missed_moments: page === 0,
          include_group_moments: true
        };
        if (syncToken) payload.sync_token = syncToken;
        const diagnostic = await this.postLocketApi("getLatestMomentV2", payload, true);
        if (loadId !== this.feedLoadId) return;
        const response = diagnostic.result;
        const pageItems = Array.isArray(response.data) ? response.data : Array.isArray(response) ? response : [];
        const entry = {
          page: page + 1,
          status: diagnostic.status,
          responseKeys: diagnostic.keys,
          resultKeys: response && !Array.isArray(response) && typeof response === "object" ? Object.keys(response) : [],
          items: pageItems.length,
          requestedToken: Boolean(syncToken),
          hasCanonicalUid: pageItems.some((item) => Boolean(item?.canonical_uid))
        };
        console.info("[DEBUG-feed-a4f2]", entry);
        if (!pageItems.length) {
          console.info("[DEBUG-feed-a4f2]", { stop: "empty-page", pagesLoaded: page + 1, totalItems: moments.length });
          break;
        }
        let added = 0;
        for (const moment of pageItems) {
          const key = moment.canonical_uid || moment.id;
          if (!key || seen.has(key)) continue;
          seen.add(key);
          moments.push(moment);
          added += 1;
        }
        const nextToken = pageItems.at(-1)?.canonical_uid;
        if (!added || !nextToken || nextToken === syncToken) {
          const stop = !added ? "no-new-items" : !nextToken ? "missing-next-token" : "unchanged-token";
          console.info("[DEBUG-feed-a4f2]", { stop, pagesLoaded: page + 1, totalItems: moments.length });
          break;
        }
        syncToken = nextToken;
      }
      if (!moments.length) return this.setEmptyState(container, "ℹ️ Chưa có khoảnh khắc mới trên feed.");
      container.replaceChildren(...moments.map((m) => this.createFeedItem({
        author: `UID: ${String(m.user || "").slice(0, 10)}...`,
        caption: m.caption || m.overlays?.[0]?.alt_text || "(Không có caption)",
        thumb: m.thumbnail_url || "",
        momentUid: m.canonical_uid || m.id || ""
      })));
    } catch (e) {
      if (loadId === this.feedLoadId) this.setEmptyState(container, `❌ Lỗi tải feed: ${e.message}`);
    }
  }

  async sendReaction(momentUid, emoji) {
    if (this.isDemo) {
      return this.toast(`✨ [Demo] Đã thả cảm xúc ${emoji} vào khoảnh khắc!`);
    }
    try {
      await this.postLocketApi("reactToMoment", {
        moment_uid: momentUid,
        reaction: emoji,
        from_memory: false,
        intensity: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "0" }
      });
      this.toast(`✅ Đã thả ${emoji} thành công!`);
    } catch (e) {
      this.toast(`❌ Lỗi thả cảm xúc: ${e.message}`);
    }
  }

  saveToHistory(item) {
    try {
      const list = JSON.parse(localStorage.getItem("locket_web_history") || "[]");
      list.unshift(item);
      localStorage.setItem("locket_web_history", JSON.stringify(list.slice(0, 20)));
      this.renderHistory();
    } catch (e) {}
  }

  renderHistory() {
    const container = document.getElementById("historyContainer");
    if (!container) return;
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem("locket_web_history") || "[]");
      if (!Array.isArray(list)) list = [];
    } catch (error) {
      console.warn("History load error:", error);
    }
    if (!list.length) {
      this.setEmptyState(container, "Chưa có khoảnh khắc nào được đăng trong phiên trình duyệt này.");
      return;
    }
    container.replaceChildren(...list.map((item) => this.createFeedItem({
      author: `ID: ${String(item.moment_uid || "")}`,
      caption: String(item.caption || ""),
      time: `🕒 Lúc: ${String(item.created_at || "")}`,
      thumb: String(item.thumb || ""),
      mode: String(item.mode || "")
    })));
  }

  clearHistory() {
    localStorage.removeItem("locket_web_history");
    this.renderHistory();
    this.toast("🗑️ Đã xóa lịch sử lưu tạm trên trình duyệt.");
  }
}

window.app = new LocketWebApp();
