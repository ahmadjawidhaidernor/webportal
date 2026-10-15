const SUPABASE_URL = 'https://bqnhimiskwqnhrstsxld.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbmhpbWlza3dxbmhyc3RzeGxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5ODIxNzksImV4cCI6MjEwNzU1ODE3OX0.twH1OA1LzRWbTW3oKXRnI6ABMrWTZVXN8LdRMXU7dBk';

const supabaseClient =
  window.supabase && typeof window.supabase.createClient === "function"
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const pageShell = document.querySelector(".page-shell");
const authContainer = document.getElementById("authContainer");
const lessonsContainer = document.getElementById("lessonsContainer");
const recordedLessonsContainer = document.getElementById("recordedLessonsContainer");
const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authToggleLink = document.getElementById("authToggleLink");
const authMessage = document.getElementById("authMessage");
const approvalState = document.getElementById("approvalState");
const approvalTitle = document.getElementById("approvalTitle");
const approvalMessage = document.getElementById("approvalMessage");
const approvalBackBtn = document.getElementById("approvalBackBtn");
const fullNameGroup = document.getElementById("fullNameGroup");
const confirmPasswordGroup = document.getElementById("confirmPasswordGroup");
const fullNameInput = document.getElementById("fullNameInput");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const confirmPasswordInput = document.getElementById("confirmPasswordInput");
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const forgotPasswordEmailInput = document.getElementById("forgotPasswordEmailInput");
const forgotPasswordSubmitBtn = document.getElementById("forgotPasswordSubmitBtn");
const forgotMessage = document.getElementById("forgotMessage");
const backToLoginLink = document.getElementById("backToLoginLink");
const logoutButton = document.getElementById("logoutBtn");
const lessonSearchInput = document.getElementById("lessonSearchInput");
const studentName = document.getElementById("student-name");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const lessonFilters = document.getElementById("lessonFilters");
const placeholderContent = document.getElementById("placeholderContent");
const lessonsSection = document.getElementById("lessonsSection");
const recordedLessonsSection = document.getElementById("recordedLessonsSection");
const previewModal = document.getElementById("previewModal");
const previewModalTitle = document.getElementById("previewModalTitle");
const previewModalBody = document.getElementById("previewModalBody");
const previewOpenButton = document.getElementById("previewOpenButton");
const previewDownloadButton = document.getElementById("previewDownloadButton");
const portalToast = document.getElementById("portalToast");
const closePreviewModal = document.getElementById("closePreviewModal");
const closePreviewButton = document.getElementById("closePreviewButton");
const studentStatusSection = document.getElementById("studentStatusSection");
const lessonProgressCard = document.getElementById("lessonProgressCard");
const progressSummary = document.getElementById("progressSummary");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const studentAnnouncements = document.getElementById("studentAnnouncements");
const portalTabs = Array.from(document.querySelectorAll(".portal-tab"));

const STORAGE_THEME_KEY = "jsPortalTheme";
const STORAGE_DOWNLOADED_KEY = "jsPortalDownloadedFiles";
const STORAGE_DISMISSED_ANNOUNCEMENTS_KEY = "jsPortalDismissedAnnouncements";
let authMode = "login";
let currentStudentId = null;
let allLessons = [];
let allLessonVideos = [];
let activeCategory = "All";
let activeTab = "lessons";
let downloadedFiles = new Set(JSON.parse(localStorage.getItem(STORAGE_DOWNLOADED_KEY) || "[]"));
let dismissedAnnouncements = new Set(JSON.parse(localStorage.getItem(STORAGE_DISMISSED_ANNOUNCEMENTS_KEY) || "[]"));
let pendingApprovalMessage = "";
let portalToastTimeout = null;

const fallbackLessons = [
  {
    title: "HTML and CSS foundations",
    lesson_number: 1,
    description: "An introduction to HTML structure, CSS styling, and responsive layouts.",
    file_url: [
      {
        name: "lesson-01.pdf",
        url: "https://example.com/lesson-01.pdf"
      }
    ],
    created_at: "2026-07-10T08:00:00.000Z"
  }
];

function formatDisplayDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function formatRelativeTime(value) {
  if (!value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;

  const diffYears = Math.round(diffMonths / 12);
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getFileExtension(fileName) {
  const filePart = String(fileName || "")
    .split(/[?#]/, 1)[0]
    .split(/[\\/]/)
    .pop()
    .replace(/[^a-zA-Z0-9._-]+$/, "");
  return filePart.split(".").pop().toLowerCase();
}

function getFileNameFromUrlOrPath(value) {
  const filePart = String(value || "").split(/[?#]/, 1)[0].split(/[\\/]/).pop();
  return filePart || "download";
}

function parseStoredLessonValue(value) {
  if (typeof value !== "string") return value;

  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  try {
    return JSON.parse(trimmedValue);
  } catch {
    return trimmedValue;
  }
}

function getFileIcon(fileName) {
  const extension = getFileExtension(fileName);
  if (["png", "jpg", "jpeg", "svg", "gif", "bmp", "webp"].includes(extension)) return "🖼️";
  if (["html", "css", "js", "json", "jsx", "ts", "tsx", "md", "py", "java", "c", "cpp", "cs", "rb", "php"].includes(extension)) return "🌐";
  if (["zip", "rar", "tar", "gz", "7z", "bz2"].includes(extension)) return "📦";
  if (extension === "pdf") return "📕";
  return "📄";
}

function normalizeLessonFiles(fileData, storagePathData) {
  const parsedFileData = parseStoredLessonValue(fileData);
  const parsedStoragePaths = parseStoredLessonValue(storagePathData);

  const normalizeEntry = (item) => {
    if (typeof item === "string") {
      const url = item.trim();
      return url ? { url, name: getFileNameFromUrlOrPath(url) } : null;
    }
    if (!item || typeof item !== "object") return null;

    const url = String(item.url || item.name || "").trim();
    if (!url) return null;
    return {
      url,
      name: String(item.name || getFileNameFromUrlOrPath(url))
    };
  };

  const fileEntries = Array.isArray(parsedFileData)
    ? parsedFileData.map(normalizeEntry).filter(Boolean)
    : [normalizeEntry(parsedFileData)].filter(Boolean);
  if (fileEntries.length) return fileEntries;

  const storageEntries = Array.isArray(parsedStoragePaths) ? parsedStoragePaths : [parsedStoragePaths];
  return storageEntries.map(normalizeEntry).filter(Boolean);
}

function isFullUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

async function resolveLessonFileUrl(urlOrPath) {
  if (!supabaseClient) {
    throw new Error("Supabase client unavailable.");
  }

  const value = String(urlOrPath || "").trim();
  if (!value) {
    throw new Error("No file URL provided.");
  }

  if (isFullUrl(value)) {
    return value;
  }

  const storagePath = value.replace(/^\/?(?:public\/)?lessons\//, "");
  const { data, error } = await supabaseClient.storage.from("lessons").getPublicUrl(storagePath);
  if (error || !data?.publicUrl) {
    console.error("Unable to resolve public URL from stored path:", storagePath, error);
    throw error || new Error("Unable to resolve public file URL.");
  }

  return data.publicUrl;
}

async function logActivityEvent(studentId, lessonId, actionType) {
  if (!supabaseClient || !studentId || !["login", "view", "download", "video_view"].includes(actionType)) {
    return;
  }

  try {
    const { error } = await supabaseClient.from("activity_log").insert([
      {
        student_id: studentId,
        lesson_id: lessonId || null,
        action_type: actionType
      }
    ]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn(`Activity logging failed for ${actionType}:`, error);
  }
}

function getYouTubeVideoId(videoUrl) {
  try {
    const url = new URL(String(videoUrl || '').trim());
    let videoId = '';

    if (url.hostname === 'youtu.be' || url.hostname === 'www.youtu.be') {
      videoId = url.pathname.slice(1);
    } else if (url.hostname === 'youtube.com' || url.hostname === 'www.youtube.com' || url.hostname === 'm.youtube.com') {
      videoId = url.searchParams.get('v') || url.pathname.match(/^\/embed\/([^/]+)/)?.[1] || '';
    }

    return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

async function downloadLesson(fileUrl, fileName) {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "lesson-file";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Lesson download failed:", error);
    showAuthMessage("Unable to download the lesson file. Please try again.", true);
  }
}

function createFileList(lesson) {
  const files = normalizeLessonFiles(lesson.file_url, lesson.storage_path);

  if (!files.length) {
    return `
      <div class="lesson-card__file-list">
        <div class="lesson-card__file-item lesson-card__file-item--empty">
          <span class="lesson-card__file-meta">
            <span class="lesson-card__file-icon">📄</span>
            <span class="lesson-card__file-name">No downloadable files</span>
          </span>
        </div>
      </div>
    `;
  }

  return `
    <div class="lesson-card__file-list">
      ${files
        .map(
          ({ url, name }) => {
            const safeUrl = escapeHtml(url);
            const safeName = escapeHtml(name);
            return `
              <div class="lesson-card__file-item">
                <div class="lesson-card__file-meta">
                  <span class="lesson-card__file-icon">${getFileIcon(name)}</span>
                  <span class="lesson-card__file-name" title="${safeName}">${safeName}</span>
                </div>
                <div class="lesson-card__file-actions">
                  <button
                    class="lesson-card__preview-btn"
                    type="button"
                    data-lesson-id="${lesson.id ?? ""}"
                    data-preview-url="${safeUrl}"
                    data-preview-name="${safeName}"
                  >
                    Preview
                  </button>
                  <button
                    class="lesson-card__download-btn"
                    type="button"
                    data-lesson-id="${lesson.id ?? ""}"
                    data-download-url="${safeUrl}"
                    data-download-name="${safeName}"
                  >
                    Download
                  </button>
                </div>
              </div>
            `;
          }
        )
        .join("")}
    </div>
  `;
}

function createLessonCard(lesson) {
  const title = lesson.title || "Untitled lesson";
  const description = lesson.description || "No description available.";
  const lessonNumber = lesson.lesson_number
    ? `Lesson ${String(lesson.lesson_number).padStart(2, "0")}`
    : "Lesson 01";
  const category = lesson.category || "General";
  const createdAt = formatDisplayDate(lesson.created_at);
  const fileListHtml = createFileList(lesson);
  return `
    <article class="lesson-card">
      <div class="lesson-card__header">
        <span class="lesson-card__badge">${lessonNumber}</span>
        <h3 class="lesson-card__title">${title}</h3>
      </div>
      <div class="lesson-card__meta">
        <div class="lesson-card__meta-row">
          <div class="lesson-card__date">Uploaded: ${createdAt}</div>
          <span class="lesson-card__category">${category}</span>
        </div>
        <p class="lesson-card__description">${description}</p>
      </div>
      <div class="lesson-card__footer">
        ${fileListHtml}
      </div>
    </article>
  `;
}

function renderRecordedLessons(videos) {
  if (!recordedLessonsContainer) return;
  const groupedVideos = new Map();
  (videos || []).forEach((video) => {
    const lesson = allLessons.find((item) => item.id === video.lesson_id);
    if (!lesson) return;
    const group = groupedVideos.get(lesson.id) || { lesson, videos: [] };
    group.videos.push(video);
    groupedVideos.set(lesson.id, group);
  });

  if (!groupedVideos.size) {
    recordedLessonsContainer.innerHTML = '<div class="empty-state">No recorded lessons available yet.</div>';
    return;
  }

  recordedLessonsContainer.innerHTML = Array.from(groupedVideos.values()).map(({ lesson, videos: lessonVideos }) => `
    <article class="lesson-card recorded-lesson-card">
      <div class="lesson-card__header">
        <span class="lesson-card__badge">${escapeHtml(lesson.lesson_number ? `Lesson ${String(lesson.lesson_number).padStart(2, "0")}` : "Lesson")}</span>
        <h3 class="lesson-card__title">${escapeHtml(lesson.title || "Untitled lesson")}</h3>
      </div>
      <div class="lesson-video-list">
        ${lessonVideos.map((video) => `<div class="lesson-video-item"><span>${escapeHtml(video.title)}</span><button class="lesson-card__video-btn" type="button" data-video-url="${escapeHtml(video.video_url)}" data-video-id="${video.id}" data-lesson-id="${lesson.id}">🎬 Watch</button></div>`).join("")}
      </div>
    </article>
  `).join("");
}

function renderLessons(lessons) {
  const visibleLessons = (lessons || []).slice().sort((a, b) => {
    const lessonNumberA = Number(a.lesson_number ?? 0);
    const lessonNumberB = Number(b.lesson_number ?? 0);
    return lessonNumberA - lessonNumberB;
  });

  if (!visibleLessons.length) {
    lessonsContainer.innerHTML = '<div class="empty-state">No lessons found.</div>';
    return;
  }

  lessonsContainer.innerHTML = visibleLessons.map(createLessonCard).join("");
}

function filterLessons(searchTerm) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (!normalizedSearch) {
    renderLessons(allLessons);
    return;
  }

  const filteredLessons = (allLessons || []).filter((lesson) => {
    const title = (lesson.title || "").toLowerCase();
    return title.includes(normalizedSearch);
  });

  renderLessons(filteredLessons);
}

function clearAuthMessage() {
  if (authMessage) {
    authMessage.textContent = "";
    authMessage.className = "auth-form__message";
    authMessage.hidden = false;
  }
}

function clearForgotMessage() {
  if (forgotMessage) {
    forgotMessage.textContent = "";
    forgotMessage.className = "auth-form__message";
    forgotMessage.hidden = false;
  }
}

function showForgotMessage(message, isError = false) {
  if (!forgotMessage) return;

  forgotMessage.textContent = message;
  forgotMessage.className = `auth-form__message${isError ? " auth-form__message--error" : " auth-form__message--success"}`;
}

function showLoginForm() {
  if (authForm) authForm.hidden = false;
  if (forgotPasswordForm) forgotPasswordForm.hidden = true;
  if (authMessage) authMessage.hidden = false;
  if (forgotMessage) forgotMessage.hidden = true;
  clearAuthMessage();
  clearForgotMessage();
}

function showForgotPasswordScreen() {
  if (authForm) authForm.hidden = true;
  if (forgotPasswordForm) forgotPasswordForm.hidden = false;
  if (authMessage) authMessage.hidden = true;
  if (approvalState) approvalState.hidden = true;
  clearForgotMessage();
  if (forgotPasswordForm) forgotPasswordForm.reset();
}

function toggleApprovalState(show) {
  if (approvalState) {
    approvalState.hidden = !show;
  }

  if (authForm) {
    authForm.hidden = show;
  }

  if (authMessage) {
    authMessage.hidden = show;
  }
}

function showApprovalState(message, title = "Registration received") {
  if (approvalTitle) {
    approvalTitle.textContent = title;
  }

  if (approvalMessage) {
    approvalMessage.textContent = message;
  }

  toggleApprovalState(true);
}

function hideApprovalState() {
  toggleApprovalState(false);
}

function showAuthMessage(message, isError = false) {
  if (!authMessage) return;

  authMessage.textContent = message;
  authMessage.className = `auth-form__message${isError ? " auth-form__message--error" : " auth-form__message--success"}`;
}

function showPortalToast(message) {
  if (!portalToast) return;

  portalToast.textContent = message;
  portalToast.hidden = false;
  portalToast.classList.add("toast-visible");
  portalToast.classList.remove("toast-hidden");

  if (portalToastTimeout) {
    window.clearTimeout(portalToastTimeout);
  }

  portalToastTimeout = window.setTimeout(() => {
    if (!portalToast) return;
    portalToast.classList.remove("toast-visible");
    portalToast.classList.add("toast-hidden");
    window.setTimeout(() => {
      if (portalToast) portalToast.hidden = true;
    }, 250);
  }, 3000);
}

function getAuthErrorMessage(error) {
  const message = error?.message || "";

  if (/invalid login|invalid_credentials|email or password/i.test(message)) {
    return "The email or password is incorrect.";
  }

  if (/already registered|user already/i.test(message)) {
    return "This email is already registered.";
  }

  if (/email.*confirm|confirm your email|email_not_confirmed/i.test(message)) {
    return "Please confirm your email before signing in.";
  }

  if (/password/i.test(message)) {
    return "The password must be at least 6 characters long.";
  }

  if (/network|fetch|failed/i.test(message)) {
    return "The connection to the server failed. Please try again.";
  }

  return "An error occurred while signing in or signing up.";
}

function setAuthMode(mode) {
  authMode = mode;

  if (fullNameGroup) {
    fullNameGroup.classList.toggle("auth-form__field--hidden", mode !== "signup");
  }

  if (confirmPasswordGroup) {
    confirmPasswordGroup.classList.toggle("auth-form__field--hidden", mode !== "signup");
  }

  if (authTitle) {
    authTitle.textContent = mode === "signup" ? "Create an account" : "Sign in";
  }

  if (authSubmitBtn) {
    authSubmitBtn.textContent = mode === "signup" ? "Sign up" : "Sign in";
  }

  if (authToggleLink) {
    authToggleLink.textContent = mode === "signup"
      ? "Already have an account? Sign in"
      : "Need an account? Sign up";
    authToggleLink.hidden = false;
  }

  if (forgotPasswordLink) {
    forgotPasswordLink.hidden = mode !== "login";
  }

  clearAuthMessage();
  clearForgotMessage();
  if (authForm) {
    authForm.reset();
    authForm.hidden = false;
  }

  if (forgotPasswordForm) {
    forgotPasswordForm.hidden = true;
  }
}

function setStudentName(fullName) {
  if (!studentName) return;
  studentName.textContent = fullName || "...";
}

function showAuthScreen() {
  if (pageShell) pageShell.hidden = true;
  if (authContainer) authContainer.hidden = false;
  if (logoutButton) logoutButton.hidden = true;
  lessonsContainer.innerHTML = "";
  if (recordedLessonsContainer) recordedLessonsContainer.innerHTML = "";
  hideApprovalState();
  showLoginForm();
  setStudentName("...");
}

function showPortalScreen() {
  if (pageShell) pageShell.hidden = false;
  if (authContainer) authContainer.hidden = true;
  if (logoutButton) logoutButton.hidden = false;
  if (studentStatusSection) studentStatusSection.hidden = true;
  lessonsContainer.innerHTML = '<div class="empty-state">Loading lessons...</div>';
  if (recordedLessonsContainer) recordedLessonsContainer.innerHTML = '<div class="empty-state">Loading recorded lessons...</div>';
  hideApprovalState();
}

function renderLessonProgress(viewedCount, totalLessons) {
  if (!progressSummary || !progressText || !progressFill || !studentStatusSection) return;

  const safeTotal = Number.isFinite(totalLessons) ? Math.max(totalLessons, 0) : 0;
  const safeViewed = Number.isFinite(viewedCount) ? Math.max(viewedCount, 0) : 0;
  const percentage = safeTotal > 0 ? Math.min((safeViewed / safeTotal) * 100, 100) : 0;

  progressSummary.textContent = `${safeViewed} of ${safeTotal} lessons`;
  progressFill.style.width = `${percentage}%`;

  if (safeTotal === 0) {
    progressText.textContent = "No lessons are available yet.";
    studentStatusSection.hidden = true;
    return;
  }

  if (safeViewed === 0) {
    progressText.textContent = "You have not started yet.";
  } else {
    progressText.textContent = `You've completed ${safeViewed} of ${safeTotal} lessons`;
  }

  studentStatusSection.hidden = false;
}

async function fetchStudentLessonProgress() {
  if (!supabaseClient || !currentStudentId) {
    renderLessonProgress(0, 0);
    return;
  }

  try {
    const { data: viewedRows, error: viewedError } = await supabaseClient
      .from("activity_log")
      .select("lesson_id")
      .eq("student_id", currentStudentId)
      .eq("action_type", "view");

    if (viewedError) throw viewedError;

    const { count, error: totalError } = await supabaseClient
      .from("lessons")
      .select("id", { count: "exact" });

    if (totalError) throw totalError;

    const uniqueLessonIds = new Set(
      (viewedRows || [])
        .map((row) => row.lesson_id)
        .filter((lessonId) => lessonId !== null && lessonId !== undefined)
    );

    renderLessonProgress(uniqueLessonIds.size, count ?? 0);
  } catch (error) {
    console.error("Failed to fetch lesson progress:", error);
    renderLessonProgress(0, 0);
  }
}

function persistDismissedAnnouncements() {
  localStorage.setItem(STORAGE_DISMISSED_ANNOUNCEMENTS_KEY, JSON.stringify(Array.from(dismissedAnnouncements)));
}

function renderAnnouncements(announcements) {
  if (!studentAnnouncements || !studentStatusSection) return;

  const visibleAnnouncements = (announcements || []).filter((announcement) => {
    const id = Number(announcement.id);
    return !Number.isNaN(id) ? !dismissedAnnouncements.has(id) : true;
  }).slice(0, 3);

  if (!visibleAnnouncements.length) {
    studentAnnouncements.innerHTML = '<div class="empty-state">No announcements yet.</div>';
    studentStatusSection.hidden = false;
    return;
  }

  studentAnnouncements.innerHTML = visibleAnnouncements.map((announcement) => `
    <article class="announcement-card" data-announcement-id="${announcement.id}">
      <div class="announcement-card__header">
        <div class="announcement-card__title-wrap">
          <span class="hero__eyebrow">Update</span>
          <h3 class="announcement-card__title">${escapeHtml(announcement.title || "Announcement")}</h3>
        </div>
        <span class="announcement-card__meta">${formatRelativeTime(announcement.created_at)}</span>
      </div>
      <p class="announcement-card__body">${escapeHtml(announcement.message || "")}</p>
      <div class="announcement-card__actions">
        <button class="announcement-card__toggle" type="button" data-announcement-action="toggle" data-announcement-id="${announcement.id}">Hide</button>
        <button class="announcement-card__dismiss" type="button" data-announcement-action="dismiss" data-announcement-id="${announcement.id}">Dismiss</button>
      </div>
    </article>
  `).join("");

  studentStatusSection.hidden = false;
}

async function fetchAnnouncements() {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from("announcements")
      .select("id, title, message, created_at")
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) throw error;
    renderAnnouncements(data || []);
  } catch (error) {
    console.error("Failed to fetch announcements:", error);
    renderAnnouncements([]);
  }
}

async function fetchLessons() {
  if (!supabaseClient) {
    allLessons = fallbackLessons;
    allLessonVideos = [];
    updateFiltersAndRender();
    renderRecordedLessons(allLessonVideos);
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("lessons")
      .select("id, title, lesson_number, description, file_url, storage_path, created_at, category")
      .order("lesson_number", { ascending: true });

    if (error) throw error;
    allLessons = data || [];
    const { data: videoData, error: videoError } = await supabaseClient
      .from("lesson_videos")
      .select("id, lesson_id, title, video_url, created_at")
      .order("created_at", { ascending: false });
    if (videoError) throw videoError;
    allLessonVideos = videoData || [];
    updateFiltersAndRender();
    renderRecordedLessons(allLessonVideos);
  } catch (error) {
    console.error("Failed to fetch lessons:", error);
    allLessons = fallbackLessons;
    allLessonVideos = [];
    updateFiltersAndRender();
    renderRecordedLessons(allLessonVideos);
  }
}

function getCategories(lessons) {
  const values = new Set(["All"]);
  (lessons || []).forEach((lesson) => {
    if (lesson.category) {
      values.add(lesson.category);
    }
  });
  return Array.from(values);
}

function setActiveCategory(category) {
  activeCategory = category;
  document.querySelectorAll(".lesson-filter").forEach((button) => {
    button.classList.toggle(
      "lesson-filter--active",
      button.dataset.category?.toLowerCase() === category.toLowerCase()
    );
  });
  updateFiltersAndRender();
}

function updateFiltersAndRender() {
  const filteredLessons = allLessons.filter((lesson) => {
    const categoryValue = String(lesson.category || "").toLowerCase();
    const selectedCategory = activeCategory.toLowerCase();
    const matchesCategory = selectedCategory === "all" || categoryValue === selectedCategory;
    const searchTerm = lessonSearchInput?.value.trim().toLowerCase() || "";
    const matchesSearch = !searchTerm || (lesson.title || "").toLowerCase().includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  renderLessons(filteredLessons);
  renderCategoryFilters(getCategories(allLessons));
}

function renderCategoryFilters(categories) {
  if (!lessonFilters) return;
  const selectedCategory = activeCategory.toLowerCase();
  lessonFilters.innerHTML = categories
    .map((category) => {
      const isActive = category.toLowerCase() === selectedCategory;
      return `
      <button class="lesson-filter${isActive ? ' lesson-filter--active' : ''}" type="button" data-category="${category}">
        ${category}
      </button>
    `;
    })
    .join("");
}

async function handleSignup(event) {
  event.preventDefault();
  clearAuthMessage();

  const fullName = fullNameInput?.value.trim() || "";
  const email = emailInput?.value.trim() || "";
  const password = passwordInput?.value || "";
  const confirmPassword = confirmPasswordInput?.value || "";

  if (!fullName || !email || !password) {
    showAuthMessage("Please fill in every field.", true);
    return;
  }

  if (password !== confirmPassword) {
    showAuthMessage("The password and confirmation do not match.", true);
    return;
  }

  if (!supabaseClient) {
    showAuthMessage("The authentication service is unavailable.", true);
    return;
  }

  if (authSubmitBtn) {
    authSubmitBtn.disabled = true;
  }

  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;

    if (!data?.user) {
      throw new Error("Registration was not completed.");
    }

    const { error: profileError } = await supabaseClient.from("profiles").insert([
      {
        id: data.user.id,
        full_name: fullName,
        email,
        is_approved: false
      }
    ]);

    if (profileError) throw profileError;

    pendingApprovalMessage = "Your registration was successful. Please wait for teacher approval and keep an eye on your inbox for the confirmation email.";
    showApprovalState(pendingApprovalMessage, "Registration received");
    authForm.reset();
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error), true);
  } finally {
    if (authSubmitBtn) {
      authSubmitBtn.disabled = false;
    }
  }
}

async function handleForgotPasswordSubmit(event) {
  event.preventDefault();
  clearForgotMessage();

  const email = forgotPasswordEmailInput?.value.trim() || "";

  if (!email) {
    showForgotMessage("Please enter your email address.", true);
    return;
  }

  if (!supabaseClient) {
    showForgotMessage("The authentication service is unavailable.", true);
    return;
  }

  if (forgotPasswordSubmitBtn) {
    forgotPasswordSubmitBtn.disabled = true;
  }

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`
    });

    if (error) throw error;

    showForgotMessage("If an account exists for this email, a reset link has been sent.");
  } catch (error) {
    showForgotMessage(getAuthErrorMessage(error), true);
  } finally {
    if (forgotPasswordSubmitBtn) {
      forgotPasswordSubmitBtn.disabled = false;
    }
  }
}

async function handleLogin(event) {
  event.preventDefault();
  clearAuthMessage();

  const email = emailInput?.value.trim() || "";
  const password = passwordInput?.value || "";

  if (!email || !password) {
    showAuthMessage("Please enter your email and password.", true);
    return;
  }

  if (!supabaseClient) {
    showAuthMessage("The authentication service is unavailable.", true);
    return;
  }

  if (authSubmitBtn) {
    authSubmitBtn.disabled = true;
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const user = data?.user;
    if (!user) {
      throw new Error("Sign in was not completed.");
    }

    const { data: profileData, error: profileError } = await supabaseClient
      .from("profiles")
      .select("full_name, is_approved")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    if (!profileData?.is_approved) {
      await supabaseClient.auth.signOut();
      showApprovalState("Your account is still waiting for teacher approval. Please keep an eye on your email for the confirmation notice.", "Still pending approval");
      return;
    }

    currentStudentId = user.id;
    await logActivityEvent(user.id, null, "login");
    setStudentName(profileData?.full_name || "...");
    showPortalScreen();
    await Promise.all([fetchLessons(), fetchAnnouncements(), fetchStudentLessonProgress()]);
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error), true);
  } finally {
    if (authSubmitBtn) {
      authSubmitBtn.disabled = false;
    }
  }
}

async function handleAuthSubmit(event) {
  if (authMode === "signup") {
    await handleSignup(event);
    return;
  }

  await handleLogin(event);
}

async function handleLogout() {
  if (!supabaseClient) return;

  try {
    await supabaseClient.auth.signOut();
  } catch (error) {
    console.error("Logout failed:", error);
  }

  currentStudentId = null;
  showAuthScreen();
  setAuthMode("login");
}

async function handleAuthStateChange(_event, session) {
  if (!session) {
    currentStudentId = null;
    showAuthScreen();
    return;
  }

  if (!supabaseClient) {
    return;
  }

  try {
    const user = session.user;
    currentStudentId = user?.id || null;
    const { data: profileData, error } = await supabaseClient
      .from("profiles")
      .select("full_name, is_approved")
      .eq("id", user.id)
      .single();

    if (error || !profileData?.is_approved) {
      await supabaseClient.auth.signOut();
      showAuthScreen();
      showApprovalState("Your account is still waiting for teacher approval. Please keep an eye on your email for the confirmation notice.", "Still pending approval");
      return;
    }

    currentStudentId = user.id;
    setStudentName(profileData?.full_name || "...");
    showPortalScreen();
    await Promise.all([fetchLessons(), fetchAnnouncements(), fetchStudentLessonProgress()]);
  } catch (error) {
    console.error("Auth state check failed:", error);
    showAuthScreen();
  }
}

async function handleLessonDownloadClick(event) {
  const downloadButton = event.target.closest(".lesson-card__download-btn");
  if (!downloadButton || !lessonsContainer?.contains(downloadButton)) return;

  event.preventDefault();

  const rawUrl = downloadButton.dataset.downloadUrl;
  const fileName = downloadButton.dataset.downloadName;
  const lessonId = Number(downloadButton.dataset.lessonId || "");
  if (!rawUrl) {
    showAuthMessage("Download URL is not available.", true);
    return;
  }

  try {
    const fileUrl = await resolveLessonFileUrl(rawUrl);
    console.log("Download attempt for resolved file URL:", fileUrl);
    downloadedFiles.add(fileName);
    localStorage.setItem(STORAGE_DOWNLOADED_KEY, JSON.stringify(Array.from(downloadedFiles)));
    showPortalToast("Downloaded");
    await downloadLesson(fileUrl, fileName);
    await logActivityEvent(currentStudentId, Number.isFinite(lessonId) ? lessonId : null, "download");
  } catch (error) {
    console.error("Download URL resolution failed:", error);
    showAuthMessage("Unable to resolve the download link. Please contact your administrator.", true);
  }
}

async function openPreviewModal(fileUrl, fileName, lessonId) {
  if (!previewModal || !previewModalTitle || !previewModalBody || !previewDownloadButton) return;

  previewModalTitle.textContent = `Preview: ${fileName}`;
  previewModalBody.innerHTML = `<div class="preview-panel">Loading preview...</div>`;
  previewModal.hidden = false;
  document.body.classList.add("modal-open");

  await logActivityEvent(currentStudentId, Number.isFinite(Number(lessonId)) ? Number(lessonId) : null, "view");

  if (!fileUrl) {
    previewModalBody.innerHTML = `<div class="preview-panel">Preview URL is not available.</div>`;
    return;
  }

  try {
    const resolvedUrl = await resolveLessonFileUrl(fileUrl);
    console.log("Preview attempt for resolved file URL:", resolvedUrl);
    previewDownloadButton.href = resolvedUrl;
    previewDownloadButton.download = fileName;
    if (previewOpenButton) {
      previewOpenButton.href = resolvedUrl;
    }
    const extension = getFileExtension(fileName);

    if (["pdf"].includes(extension)) {
      const previewUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(resolvedUrl)}&embedded=true`;
      previewModalBody.innerHTML = `<iframe class="preview-frame" src="${previewUrl}" title="PDF preview"></iframe>`;
      return;
    }

    if (["png", "jpg", "jpeg", "svg", "gif", "bmp", "webp"].includes(extension)) {
      previewModalBody.innerHTML = `<div class="preview-panel"><img class="preview-image" src="${resolvedUrl}" alt="Preview ${fileName}" /></div>`;
      return;
    }

    if (["html", "css", "js", "json", "md", "txt"].includes(extension)) {
      try {
        const response = await fetch(resolvedUrl);
        if (!response.ok) throw new Error("Preview could not be loaded.");
        const text = await response.text();
        previewModalBody.innerHTML = `<pre class="preview-text">${escapeHtml(text)}</pre>`;
        return;
      } catch (error) {
        console.error("Preview failed:", error);
      }
    }

    previewModalBody.innerHTML = `<div class="preview-panel">Preview not available for this file type. Use download instead.</div>`;
  } catch (error) {
    console.error("Preview modal error:", error);
    previewModalBody.innerHTML = `<div class="preview-panel">Unable to load preview.</div>`;
  }
}

async function openVideoModal(videoUrl, lessonId, videoTitle = 'Lesson video') {
  if (!previewModal || !previewModalTitle || !previewModalBody) return;

  const videoId = getYouTubeVideoId(videoUrl);
  if (!videoId) {
    showPortalToast('This video link is not valid.');
    return;
  }

  previewModalTitle.textContent = videoTitle || 'Lesson video';
  previewModalBody.innerHTML = `<iframe class="preview-frame video-frame" src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1" title="Lesson video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  previewModal.hidden = false;
  document.body.classList.add("modal-open");
  if (previewOpenButton) previewOpenButton.hidden = true;
  if (previewDownloadButton) previewDownloadButton.hidden = true;
  await logActivityEvent(currentStudentId, Number.isFinite(Number(lessonId)) ? Number(lessonId) : null, "video_view");
}

function closeModal() {
  if (!previewModal) return;
  previewModal.hidden = true;
  if (previewModalBody) previewModalBody.innerHTML = "";
  document.body.classList.remove("modal-open");
  if (previewOpenButton) previewOpenButton.hidden = false;
  if (previewDownloadButton) previewDownloadButton.hidden = false;
}

function handleLessonCardAction(event) {
  const videoButton = event.target.closest(".lesson-card__video-btn");
  if (videoButton) {
    openVideoModal(videoButton.dataset.videoUrl, videoButton.dataset.lessonId, videoButton.closest('.lesson-video-item')?.querySelector('span')?.textContent);
    return;
  }

  const previewButton = event.target.closest(".lesson-card__preview-btn");
  if (previewButton) {
    const previewUrl = previewButton.dataset.previewUrl;
    const previewName = previewButton.dataset.previewName;
    const lessonId = previewButton.dataset.lessonId;
    if (previewUrl && previewName) {
      openPreviewModal(previewUrl, previewName, lessonId);
    }
    return;
  }

  handleLessonDownloadClick(event);
}

function handleRecordedLessonAction(event) {
  const videoButton = event.target.closest(".lesson-card__video-btn");
  if (!videoButton || !recordedLessonsContainer?.contains(videoButton)) return;
  openVideoModal(videoButton.dataset.videoUrl, videoButton.dataset.lessonId, videoButton.closest('.lesson-video-item')?.querySelector('span')?.textContent);
}

function handleAnnouncementCardAction(event) {
  const button = event.target.closest("[data-announcement-action]");
  if (!button || !studentAnnouncements?.contains(button)) return;

  const announcementId = Number(button.dataset.announcementId);
  if (!Number.isFinite(announcementId)) return;

  const card = button.closest(".announcement-card");
  if (!card) return;

  if (button.dataset.announcementAction === "dismiss") {
    dismissedAnnouncements.add(announcementId);
    persistDismissedAnnouncements();
    fetchAnnouncements();
    return;
  }

  const body = card.querySelector(".announcement-card__body");
  if (!body) return;

  const isHidden = body.hidden;
  body.hidden = !isHidden;
  button.textContent = isHidden ? "Hide" : "Show";
}

function setTheme(theme) {
  if (theme === "light") {
    document.documentElement.classList.add("theme-light");
    document.documentElement.classList.remove("theme-dark");
    themeToggleBtn.textContent = "🌙";
  } else {
    document.documentElement.classList.add("theme-dark");
    document.documentElement.classList.remove("theme-light");
    themeToggleBtn.textContent = "☀️";
  }
  localStorage.setItem(STORAGE_THEME_KEY, theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.classList.contains("theme-light") ? "light" : "dark";
  setTheme(currentTheme === "light" ? "dark" : "light");
}

function handleTabClick(event) {
  const button = event.target.closest(".portal-tab");
  if (!button) return;

  activeTab = button.dataset.tab || "lessons";
  portalTabs.forEach((tab) => tab.classList.toggle("portal-tab--active", tab === button));

  const isLessonsTab = activeTab === "lessons";
  const isVideosTab = activeTab === "videos";
  const isAnnouncementsTab = activeTab === "announcements";

  if (lessonsSection) lessonsSection.hidden = !isLessonsTab;
  if (recordedLessonsSection) recordedLessonsSection.hidden = !isVideosTab;

  if (studentStatusSection) {
    studentStatusSection.hidden = !isLessonsTab && !isAnnouncementsTab;
  }

  if (placeholderContent) {
    placeholderContent.hidden = isLessonsTab || isVideosTab || isAnnouncementsTab;

    if (!isLessonsTab && !isVideosTab && !isAnnouncementsTab) {
      const titleElement = placeholderContent.querySelector("#placeholderTitle");
      const descElement = placeholderContent.querySelector("#placeholderDescription");
      let title = "Coming soon";
      let description = "We are building this section for future student assignments, quizzes, and announcements.";

      if (activeTab === "assignments") {
        title = "Assignments coming soon";
        description = "This section will let you view and submit assignments once it is ready.";
      } else if (activeTab === "quizzes") {
        title = "Quizzes coming soon";
        description = "Quizzes will appear here when the section is launched.";
      }

      if (titleElement) titleElement.textContent = title;
      if (descElement) descElement.textContent = description;
    }
  }

  if (isAnnouncementsTab && studentAnnouncements) {
    fetchAnnouncements();
  }
}

function attachEvents() {
  if (authForm) {
    authForm.addEventListener("submit", handleAuthSubmit);
  }

  if (authToggleLink) {
    authToggleLink.addEventListener("click", () => {
      setAuthMode(authMode === "login" ? "signup" : "login");
    });
  }

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", showForgotPasswordScreen);
  }

  if (backToLoginLink) {
    backToLoginLink.addEventListener("click", () => {
      setAuthMode("login");
      showLoginForm();
    });
  }

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", handleForgotPasswordSubmit);
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }

  if (approvalBackBtn) {
    approvalBackBtn.addEventListener("click", () => {
      setAuthMode("login");
      showAuthScreen();
    });
  }

  if (lessonSearchInput) {
    lessonSearchInput.addEventListener("input", () => updateFiltersAndRender());
  }

  if (lessonFilters) {
    lessonFilters.addEventListener("click", (event) => {
      const button = event.target.closest(".lesson-filter");
      if (!button) return;
      const category = button.dataset.category || "All";
      setActiveCategory(category);
    });
  }

  if (lessonsContainer) {
    lessonsContainer.addEventListener("click", handleLessonCardAction);
  }

  if (recordedLessonsContainer) {
    recordedLessonsContainer.addEventListener("click", handleRecordedLessonAction);
  }

  if (studentAnnouncements) {
    studentAnnouncements.addEventListener("click", handleAnnouncementCardAction);
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  portalTabs.forEach((tab) => {
    tab.addEventListener("click", handleTabClick);
  });

  if (closePreviewModal) {
    closePreviewModal.addEventListener("click", closeModal);
  }

  if (closePreviewButton) {
    closePreviewButton.addEventListener("click", closeModal);
  }

  if (previewModal) {
    previewModal.addEventListener("click", (event) => {
      if (event.target === previewModal) closeModal();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  attachEvents();
  setAuthMode("login");
  setStudentName("...");
  showAuthScreen();

  if (!supabaseClient) {
    showAuthMessage("The authentication service is unavailable.", true);
    return;
  }

  const savedTheme = localStorage.getItem(STORAGE_THEME_KEY) || "dark";
  setTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    handleAuthStateChange(_event, session);
  });

  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    handleAuthStateChange("INITIAL_SESSION", session);
  });
});
