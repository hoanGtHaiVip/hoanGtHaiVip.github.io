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
    el.innerHTML = msg;
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
        if (data && data.idToken && data.uid) {
          this.session = { ...this.session, ...data };
          this.isDemo = false;
          this.updateAuthUI();
          this.fetchMyProfile();
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

  openLoginModal() {
    document.getElementById("loginModal").classList.add("open");
  }

  closeLoginModal() {
    document.getElementById("loginModal").classList.remove("open");
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

  async getValidToken() {
    if (this.isDemo) return "DEMO_TOKEN";
    if (!this.session.idToken) throw new Error("Chưa đăng nhập!");

    if (Date.now() >= (this.session.expiresAt - 60000) && this.session.refreshToken) {
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
      if (res.ok && data.id_token) {
        this.session.idToken = data.id_token;
        this.session.refreshToken = data.refresh_token || this.session.refreshToken;
        this.session.uid = data.user_id || this.session.uid;
        this.session.expiresAt = Date.now() + parseInt(data.expires_in || "3600", 10) * 1000;
        this.saveSession();
      }
    }
    return this.session.idToken;
  }

  async postLocketApi(endpoint, payload = {}) {
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
    const json = await res.json();
    return json.result || json;
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

  loadMediaFile(file) {
    if (this.videoAnimFrame) {
      cancelAnimationFrame(this.videoAnimFrame);
      this.videoAnimFrame = null;
    }
    const videoEl = document.getElementById("previewVideo");
    videoEl.pause();

    if (file.type.startsWith("video/")) {
      this.mediaType = "video";
      this.currentVideoFile = file;
      const url = URL.createObjectURL(file);
      videoEl.src = url;
      videoEl.play().catch(() => {});
      const loopRender = () => {
        if (this.mediaType === "video" && !videoEl.paused && !videoEl.ended) {
          this.renderCanvasFrame(videoEl, videoEl.videoWidth || 1080, videoEl.videoHeight || 1080);
        }
        if (this.mediaType === "video") {
          this.videoAnimFrame = requestAnimationFrame(loopRender);
        }
      };
      videoEl.onloadeddata = () => {
        document.getElementById("mediaDimInfo").textContent = `🎬 Video ${videoEl.videoWidth}×${videoEl.videoHeight} ➔ 1080×1080`;
        this.renderCanvasFrame(videoEl, videoEl.videoWidth || 1080, videoEl.videoHeight || 1080);
        loopRender();
      };
      this.updatePreview();
      this.toast(`🎬 Đã nạp video: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      this.mediaType = "image";
      this.currentVideoFile = null;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
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
    if (this.videoAnimFrame) {
      cancelAnimationFrame(this.videoAnimFrame);
      this.videoAnimFrame = null;
    }
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
        "x-goog-upload-protocol": "resumable",
        "x-goog-upload-command": "start",
        "x-goog-upload-content-type": mime,
        "x-goog-upload-content-length": String(blobOrFile.size),
        "x-firebase-storage-version": "ios/12.12.1",
        "x-firebase-gmpid": FIREBASE_APP_ID
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
        "x-goog-upload-protocol": "resumable",
        "x-goog-upload-command": "upload, finalize",
        "x-goog-upload-offset": "0",
        "x-goog-upload-content-length": String(blobOrFile.size)
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
        sent_to_all: !isPrivate,
        recipients: [],
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
   * TABS: FRIENDS FEED & POSTED HISTORY
   * ========================================================================= */
  switchTab(tab) {
    ["Studio", "Feed", "History"].forEach((t) => {
      const lower = t.toLowerCase();
      document.getElementById(`tabBtn${t}`).classList.toggle("active", lower === tab);
      document.getElementById(`tab${t}`).style.display = lower === tab ? "block" : "none";
    });
    if (tab === "feed") this.loadFriendsFeed();
    if (tab === "history") this.renderHistory();
  }

  async loadFriendsFeed() {
    const container = document.getElementById("feedContainer");
    container.innerHTML = `<div class="empty-state">⏳ Đang tải khoảnh khắc từ bạn bè...</div>`;

    if (this.isDemo) {
      container.innerHTML = "";
      this.demoFeed.forEach((m) => {
        const el = document.createElement("div");
        el.className = "feed-item";
        el.innerHTML = `
          <div class="feed-thumb feed-thumb-placeholder">📸</div>
          <div class="feed-info">
            <div class="feed-author">${m.user_name} <span class="feed-time">• ${m.created_at}</span></div>
            <div class="feed-caption">${m.caption}</div>
            <div class="reaction-bar">
              <button class="react-btn" onclick="app.sendReaction('${m.moment_uid}','❤️')">❤️</button>
              <button class="react-btn" onclick="app.sendReaction('${m.moment_uid}','🔥')">🔥</button>
              <button class="react-btn" onclick="app.sendReaction('${m.moment_uid}','😍')">😍</button>
              <button class="react-btn" onclick="app.sendReaction('${m.moment_uid}','😂')">😂</button>
            </div>
          </div>
        `;
        container.appendChild(el);
      });
      return;
    }

    try {
      const res = await this.postLocketApi("getLatestMomentV2", {
        should_count_missed_moments: true,
        include_group_moments: true
      });
      const list = res.data || [];
      if (!list.length) {
        container.innerHTML = `<div class="empty-state">ℹ️ Chưa có khoảnh khắc mới trên feed.</div>`;
        return;
      }
      container.innerHTML = "";
      list.slice(0, 15).forEach((m) => {
        const mid = m.canonical_uid || m.id || "";
        const cap = m.caption || m.overlays?.[0]?.alt_text || "(Không có caption)";
        const thumb = m.thumbnail_url || "";
        const el = document.createElement("div");
        el.className = "feed-item";
        el.innerHTML = `
          <img class="feed-thumb" src="${thumb}" alt="moment" onerror="this.style.background='#222'" />
          <div class="feed-info">
            <div class="feed-author">UID: <code>${(m.user || "").slice(0, 10)}...</code></div>
            <div class="feed-caption">${cap}</div>
            <div class="reaction-bar">
              <button class="react-btn" onclick="app.sendReaction('${mid}','❤️')">❤️</button>
              <button class="react-btn" onclick="app.sendReaction('${mid}','🔥')">🔥</button>
              <button class="react-btn" onclick="app.sendReaction('${mid}','😍')">😍</button>
              <button class="react-btn" onclick="app.sendReaction('${mid}','😂')">😂</button>
            </div>
          </div>
        `;
        container.appendChild(el);
      });
    } catch (e) {
      container.innerHTML = `<div class="empty-state">❌ Lỗi tải feed: ${e.message}</div>`;
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
    const list = JSON.parse(localStorage.getItem("locket_web_history") || "[]");
    if (!list.length) {
      container.innerHTML = `<div class="empty-state">Chưa có khoảnh khắc nào được đăng trong phiên trình duyệt này.</div>`;
      return;
    }
    container.innerHTML = "";
    list.forEach((item) => {
      const el = document.createElement("div");
      el.className = "feed-item";
      el.innerHTML = `
        <img class="feed-thumb" src="${item.thumb || ""}" alt="thumb" />
        <div class="feed-info">
          <div class="feed-author">
            <span class="gold-badge">${item.mode}</span>
            ID: <code>${item.moment_uid}</code>
          </div>
          <div class="feed-caption">${item.caption}</div>
          <div class="feed-time">🕒 Lúc: ${item.created_at}</div>
        </div>
      `;
      container.appendChild(el);
    });
  }

  clearHistory() {
    localStorage.removeItem("locket_web_history");
    this.renderHistory();
    this.toast("🗑️ Đã xóa lịch sử lưu tạm trên trình duyệt.");
  }
}

window.app = new LocketWebApp();
