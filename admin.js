const SUPABASE_URL = 'https://bqnhimiskwqnhrstsxld.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbmhpbWlza3dxbmhyc3RzeGxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5ODIxNzksImV4cCI6MjEwNzU1ODE3OX0.twH1OA1LzRWbTW3oKXRnI6ABMrWTZVXN8LdRMXU7dBk';
const ADMIN_EMAIL = 'ahmadjawidhaidernor@gmail.com';

const supabaseClient = window.supabase && typeof window.supabase.createClient === 'function'
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const authSection = document.getElementById('authSection');
const adminContent = document.getElementById('adminContent');
const adminAuthForm = document.getElementById('adminAuthForm');
const adminAuthMessage = document.getElementById('adminAuthMessage');
const adminEmailInput = document.getElementById('adminEmailInput');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const uploadForm = document.getElementById('uploadForm');
const editForm = document.getElementById('editForm');
const lessonsTableBody = document.getElementById('lessonsTableBody');
const lessonTitleInput = document.getElementById('lessonTitleInput');
const sessionNumberInput = document.getElementById('sessionNumberInput');
const lessonDescriptionInput = document.getElementById('lessonDescriptionInput');
const lessonCategoryInput = document.getElementById('lessonCategoryInput');
const lessonDateInput = document.getElementById('lessonDateInput');
const lessonFileInput = document.getElementById('lessonFileInput');
const editTitleInput = document.getElementById('editTitleInput');
const editSessionInput = document.getElementById('editSessionInput');
const editDescriptionInput = document.getElementById('editDescriptionInput');
const editCategoryInput = document.getElementById('editCategoryInput');
const editLessonFileInput = document.getElementById('editLessonFileInput');
const uploadMessage = document.getElementById('uploadMessage');
const editMessage = document.getElementById('editMessage');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const logoutButton = document.getElementById('logoutBtn');
const activityStudentsList = document.getElementById('activityStudentsList');
const activityLessonsList = document.getElementById('activityLessonsList');
const activityMessage = document.getElementById('activityMessage');
const videoForm = document.getElementById('videoForm');
const videoLessonInput = document.getElementById('videoLessonInput');
const videoTitleInput = document.getElementById('videoTitleInput');
const videoUrlInput = document.getElementById('videoUrlInput');
const videoMessage = document.getElementById('videoMessage');
const videosList = document.getElementById('videosList');
const announcementForm = document.getElementById('announcementForm');
const announcementTitleInput = document.getElementById('announcementTitleInput');
const announcementMessageInput = document.getElementById('announcementMessageInput');
const announcementMessage = document.getElementById('announcementMessage');
const announcementsList = document.getElementById('announcementsList');
const adminTabs = Array.from(document.querySelectorAll('[data-admin-tab]'));
const adminLessonsSection = document.getElementById('adminLessonsSection');
const recordedLessonsSection = document.getElementById('recordedLessonsSection');
const activitySection = document.getElementById('activitySection');
const announcementsSection = document.getElementById('announcementsSection');

let lessons = [];
let lessonVideos = [];
let announcements = [];
let announcementLikeCounts = new Map();
let announcementLikedBy = new Map();
let announcementComments = new Map();
let editingLessonId = null;
let currentUser = null;

function showMessage(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.className = `auth-form__message${isError ? ' auth-form__message--error' : ' auth-form__message--success'}`;
}

function clearMessage(element) {
  if (!element) return;
  element.textContent = '';
  element.className = 'auth-form__message';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isAdminUser(user) {
  return Boolean(user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
}

async function handleAuthStateChange(event, session) {
  if (event === 'SIGNED_OUT' || !session?.user) {
    currentUser = null;
    showLoginScreen();
    return;
  }

  if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && isAdminUser(session.user)) {
    currentUser = session.user;
    showAdminScreen();
    return;
  }

  if (session?.user && !isAdminUser(session.user)) {
    await supabaseClient.auth.signOut();
    currentUser = null;
    showLoginScreen();
  }
}

async function ensureAdminSessionValid() {
  if (!supabaseClient) return false;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session?.user || !isAdminUser(session.user)) {
    currentUser = null;
    showMessage(adminAuthMessage, 'Your session has expired, please log in again', true);
    await handleLogout();
    return false;
  }
  currentUser = session.user;
  return true;
}

function showAdminScreen() {
  if (authSection) authSection.hidden = true;
  if (adminContent) adminContent.hidden = false;
}

function showLoginScreen() {
  if (authSection) authSection.hidden = false;
  if (adminContent) adminContent.hidden = true;
  if (editForm) editForm.hidden = true;
  editingLessonId = null;
}

function parseStoredLessonValue(value) {
  if (typeof value !== 'string') return value;

  const trimmedValue = value.trim();
  if (!trimmedValue) return '';

  try {
    return JSON.parse(trimmedValue);
  } catch {
    return trimmedValue;
  }
}

function normalizeAdminLessonFiles(fileData) {
  const parsedFileData = parseStoredLessonValue(fileData);
  const normalizeEntry = (item) => {
    if (typeof item === 'string') {
      const url = item.trim();
      return url ? { url, name: url.split(/[?#]/, 1)[0].split(/[\\/]/).pop() || 'download' } : null;
    }
    if (!item || typeof item !== 'object') return null;

    const url = String(item.url || item.name || '').trim();
    if (!url) return null;
    return {
      url,
      name: String(item.name || url.split(/[?#]/, 1)[0].split(/[\\/]/).pop() || 'download')
    };
  };

  const fileEntries = (Array.isArray(parsedFileData) ? parsedFileData : [parsedFileData])
    .map(normalizeEntry)
    .filter(Boolean);
  return fileEntries;
}

function normalizeStoragePaths(storagePathData) {
  const parsedPaths = parseStoredLessonValue(storagePathData);
  const paths = Array.isArray(parsedPaths) ? parsedPaths : [parsedPaths];
  return paths
    .filter((path) => typeof path === 'string' && path.trim())
    .map((path) => path.trim());
}

function renderLessons() {
  if (!lessonsTableBody) return;
  if (!lessons.length) {
    lessonsTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No lessons yet.</td></tr>';
    return;
  }

  lessonsTableBody.innerHTML = lessons.map((lesson) => {
    const title = lesson.title || 'Untitled lesson';
    const session = lesson.lesson_number || '-';
    const category = lesson.category || 'General';
    const date = lesson.created_at ? new Date(lesson.created_at).toLocaleDateString('en-US') : '-';
    const fileList = normalizeAdminLessonFiles(lesson.file_url);
    const fileUrl = fileList[0]?.url || '#';
    const fileLabel = escapeHtml(fileList.length > 1 ? `Open ${fileList.length} files` : 'Open file');
    return `
      <tr>
        <td>${title}</td>
        <td>${session}</td>
        <td>${category}</td>
        <td>${date}</td>
        <td><a href="${escapeHtml(fileUrl)}" target="_blank" rel="noopener noreferrer">${fileLabel}</a></td>
        <td>
          <div class="admin-actions">
            <button class="admin-action-btn" type="button" data-action="edit" data-id="${lesson.id}">Edit</button>
            <button class="admin-action-btn" type="button" data-action="delete" data-id="${lesson.id}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadLessons() {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from('lessons')
      .select('id, title, lesson_number, description, category, file_url, created_at, storage_path')
      .order('created_at', { ascending: false });

    if (error) throw error;
    lessons = data || [];
    renderLessons();
    renderVideoLessonOptions();
    renderVideos();
  } catch (error) {
    try {
      const { data, error: fallbackError } = await supabaseClient
        .from('lessons')
        .select('id, title, lesson_number, description, category, file_url, created_at')
        .order('created_at', { ascending: false });

      if (fallbackError) throw fallbackError;
      lessons = data || [];
      renderLessons();
      renderVideoLessonOptions();
      renderVideos();
    } catch (fallbackError) {
      console.error(fallbackError);
      showMessage(adminAuthMessage, 'Unable to load lessons right now.', true);
    }
  }
}

function renderVideoLessonOptions() {
  if (!videoLessonInput) return;
  const sortedLessons = lessons.slice().sort((a, b) => Number(a.lesson_number || 0) - Number(b.lesson_number || 0));
  videoLessonInput.innerHTML = sortedLessons.length
    ? sortedLessons.map((lesson) => `<option value="${lesson.id}">Session ${escapeHtml(lesson.lesson_number || '-')} - ${escapeHtml(lesson.title || 'Untitled lesson')}</option>`).join('')
    : '<option value="">No lessons available</option>';
}

function renderVideos() {
  if (!videosList) return;
  if (!lessonVideos.length) {
    videosList.innerHTML = '<div class="empty-state">No recorded lessons yet.</div>';
    return;
  }

  const groupedVideos = new Map();
  lessonVideos.forEach((video) => {
    const lesson = lessons.find((item) => item.id === video.lesson_id) || { title: 'Unknown lesson', lesson_number: '-' };
    const group = groupedVideos.get(video.lesson_id) || { lesson, videos: [] };
    group.videos.push(video);
    groupedVideos.set(video.lesson_id, group);
  });

  videosList.innerHTML = Array.from(groupedVideos.values()).map(({ lesson, videos }) => `
    <section class="admin-video-group">
      <h3>Session ${escapeHtml(lesson.lesson_number || '-')} - ${escapeHtml(lesson.title || 'Untitled lesson')}</h3>
      <ul class="admin-activity-list">
        ${videos.map((video) => `<li class="admin-activity-item"><strong>${escapeHtml(video.title)}</strong><span>${escapeHtml(video.video_url)}</span><button class="admin-action-btn" type="button" data-video-action="delete" data-id="${video.id}">Delete</button></li>`).join('')}
      </ul>
    </section>
  `).join('');
}

async function loadLessonVideos() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .from('lesson_videos')
    .select('id, lesson_id, title, video_url, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  lessonVideos = data || [];
  renderVideoLessonOptions();
  renderVideos();
}

async function addLessonVideo(event) {
  event.preventDefault();
  if (!supabaseClient || !currentUser || !(await ensureAdminSessionValid())) return;

  const lessonId = Number(videoLessonInput?.value);
  const title = videoTitleInput?.value.trim() || '';
  const videoUrl = videoUrlInput?.value.trim() || '';
  if (!Number.isFinite(lessonId) || !title || !videoUrl) {
    showMessage(videoMessage, 'Please select a lesson and fill in every video field.', true);
    return;
  }

  try {
    const { error } = await supabaseClient.from('lesson_videos').insert([{ lesson_id: lessonId, title, video_url: videoUrl }]);
    if (error) throw error;
    videoForm.reset();
    showMessage(videoMessage, 'Recorded lesson added successfully.', false);
    await loadLessonVideos();
  } catch (error) {
    showMessage(videoMessage, error.message || 'Unable to add recorded lesson.', true);
  }
}

async function deleteLessonVideo(id) {
  if (!supabaseClient || !(await ensureAdminSessionValid())) return;
  const video = lessonVideos.find((item) => item.id === id);
  if (!video || !window.confirm(`Delete ${video.title || 'this recorded lesson'}?`)) return;
  try {
    const { error } = await supabaseClient.from('lesson_videos').delete().eq('id', id);
    if (error) throw error;
    await loadLessonVideos();
  } catch (error) {
    showMessage(videoMessage, error.message || 'Unable to delete recorded lesson.', true);
  }
}

function handleVideoListClick(event) {
  const button = event.target.closest('[data-video-action="delete"]');
  if (button) deleteLessonVideo(Number(button.dataset.id));
}

function setAdminTab(tabName) {
  adminTabs.forEach((tab) => tab.classList.toggle('portal-tab--active', tab.dataset.adminTab === tabName));
  if (adminLessonsSection) adminLessonsSection.hidden = tabName !== 'lessons';
  if (recordedLessonsSection) recordedLessonsSection.hidden = tabName !== 'videos';
  if (activitySection) activitySection.hidden = tabName !== 'activity';
  if (announcementsSection) announcementsSection.hidden = tabName !== 'announcements';
}

function formatRelativeTime(value) {
  if (!value) return 'Recently';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;

  const diffYears = Math.round(diffMonths / 12);
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
}

function renderAnnouncementsList() {
  if (!announcementsList) return;

  if (!announcements.length) {
    announcementsList.innerHTML = '<div class="empty-state">No announcements yet.</div>';
    return;
  }

  announcementsList.innerHTML = announcements.map((announcement) => `
    <article class="admin-announcement-item">
      <div class="admin-announcement-item__header">
        <h3 class="admin-announcement-item__title">${escapeHtml(announcement.title || 'Untitled announcement')}</h3>
        <span class="admin-announcement-item__meta">${formatRelativeTime(announcement.created_at)}</span>
      </div>
      <p class="admin-announcement-item__message">${escapeHtml(announcement.message || '')}</p>
      <p class="admin-announcement-item__engagement">
        Likes: ${announcementLikeCounts.get(String(announcement.id)) || 0}
        <span aria-hidden="true">•</span>
        Comments: ${(announcementComments.get(String(announcement.id)) || []).length}
      </p>
      <p class="admin-announcement-item__liked-by">
        Liked by: ${(announcementLikedBy.get(String(announcement.id)) || []).map((name) => escapeHtml(name)).join(', ') || 'No one yet'}
      </p>
      <div class="admin-announcement-comments">
        ${(announcementComments.get(String(announcement.id)) || []).length
          ? announcementComments.get(String(announcement.id)).map((comment) => `
            <div class="admin-announcement-comment">
              <div class="admin-announcement-comment__header">
                <strong>${escapeHtml(comment.student_name || 'Student')}</strong>
                <span>${formatRelativeTime(comment.created_at)}</span>
              </div>
              <p>${escapeHtml(comment.body)}</p>
              <button class="admin-action-btn" type="button" data-announcement-action="delete-comment" data-announcement-id="${escapeHtml(announcement.id)}" data-comment-id="${escapeHtml(comment.id)}">Delete comment</button>
            </div>
          `).join('')
          : '<p class="admin-announcement-comment__empty">No comments yet.</p>'}
      </div>
      <button class="admin-form__submit admin-announcement-item__delete" type="button" data-announcement-action="delete" data-id="${announcement.id}">Delete</button>
    </article>
  `).join('');
}

async function loadAnnouncements() {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from('announcements')
      .select('id, title, message, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    announcements = data || [];
    const announcementIds = announcements.map((announcement) => announcement.id);
    announcementLikeCounts = new Map(announcementIds.map((id) => [String(id), 0]));
    announcementLikedBy = new Map(announcementIds.map((id) => [String(id), []]));
    announcementComments = new Map(announcementIds.map((id) => [String(id), []]));

    if (announcementIds.length) {
      const [likesResult, commentsResult] = await Promise.all([
        supabaseClient
          .from('announcement_likes')
          .select('announcement_id, student_id')
          .in('announcement_id', announcementIds),
        supabaseClient
          .from('announcement_comments')
          .select('id, announcement_id, student_id, student_name, body, created_at')
          .in('announcement_id', announcementIds)
          .order('created_at', { ascending: true })
      ]);
      if (likesResult.error) throw likesResult.error;
      if (commentsResult.error) throw commentsResult.error;

      const likes = likesResult.data || [];
      const studentIds = [...new Set(likes.map((like) => like.student_id).filter(Boolean))];
      let profileNames = new Map();
      if (studentIds.length) {
        const { data: profiles, error: profilesError } = await supabaseClient
          .from('profiles')
          .select('id, full_name, email')
          .in('id', studentIds);
        if (profilesError) throw profilesError;
        profileNames = new Map((profiles || []).map((profile) => [
          profile.id,
          profile.full_name?.trim() || profile.email || 'Student'
        ]));
      }

      likes.forEach(({ announcement_id: id, student_id: studentId }) => {
        const key = String(id);
        if (announcementLikeCounts.has(key)) {
          announcementLikeCounts.set(key, announcementLikeCounts.get(key) + 1);
          announcementLikedBy.get(key).push(profileNames.get(studentId) || 'Student');
        }
      });
      (commentsResult.data || []).forEach((comment) => {
        const key = String(comment.announcement_id);
        if (announcementComments.has(key)) announcementComments.get(key).push(comment);
      });
    }

    renderAnnouncementsList();
  } catch (error) {
    console.error('Failed to load announcements:', error);
    if (announcementMessage) {
      showMessage(announcementMessage, 'Unable to load announcements right now.', true);
    }
  }
}

async function handleAnnouncementSubmit(event) {
  event.preventDefault();
  if (!supabaseClient || !currentUser || !(await ensureAdminSessionValid())) return;

  const title = announcementTitleInput?.value.trim() || '';
  const message = announcementMessageInput?.value.trim() || '';

  if (!title || !message) {
    showMessage(announcementMessage, 'Please fill in both the title and message.', true);
    return;
  }

  try {
    const { error } = await supabaseClient
      .from('announcements')
      .insert([{ title, message }]);

    if (error) throw error;

    announcementForm.reset();
    showMessage(announcementMessage, 'Announcement posted successfully.', false);
    await loadAnnouncements();
  } catch (error) {
    showMessage(announcementMessage, error.message || 'Unable to post announcement.', true);
  }
}

async function deleteAnnouncement(id) {
  if (!supabaseClient || !(await ensureAdminSessionValid())) return;

  const item = announcements.find((announcement) => announcement.id === id);
  if (!item || !window.confirm(`Delete ${item.title || 'this announcement'}?`)) return;

  try {
    const { error } = await supabaseClient.from('announcements').delete().eq('id', id);
    if (error) throw error;
    await loadAnnouncements();
  } catch (error) {
    showMessage(announcementMessage, error.message || 'Unable to delete announcement.', true);
  }
}

async function deleteAnnouncementComment(announcementId, commentId) {
  if (!supabaseClient || !(await ensureAdminSessionValid())) return;
  const key = String(announcementId);
  const comments = announcementComments.get(key) || [];
  const comment = comments.find((item) => String(item.id) === String(commentId));
  if (!comment || !window.confirm(`Delete ${comment.student_name || 'this'} student's comment?`)) return;

  try {
    const { error } = await supabaseClient
      .from('announcement_comments')
      .delete()
      .eq('id', commentId);
    if (error) throw error;
    announcementComments.set(key, comments.filter((item) => String(item.id) !== String(commentId)));
    renderAnnouncementsList();
  } catch (error) {
    console.error('Failed to delete announcement comment:', error);
    showMessage(announcementMessage, error.message || 'Unable to delete comment.', true);
  }
}

function handleAnnouncementListClick(event) {
  const commentButton = event.target.closest('[data-announcement-action="delete-comment"]');
  if (commentButton) {
    deleteAnnouncementComment(Number(commentButton.dataset.announcementId), commentButton.dataset.commentId);
    return;
  }

  const button = event.target.closest('[data-announcement-action="delete"]');
  if (button) {
    deleteAnnouncement(Number(button.dataset.id));
  }
}

function renderActivityStudents(loginRows, studentProfiles) {
  if (!activityStudentsList) return;

  if (!loginRows.length) {
    activityStudentsList.innerHTML = '<li class="empty-state">No student login activity yet.</li>';
    return;
  }

  activityStudentsList.innerHTML = loginRows.map((entry) => {
    const profile = studentProfiles.get(entry.student_id) || {};
    const studentLabel = profile.full_name || profile.email || entry.student_id;
    const loginTime = entry.created_at ? new Date(entry.created_at).toLocaleString('en-US') : 'Unknown time';
    return `<li class="admin-activity-item"><strong>${escapeHtml(studentLabel)}</strong><span>Last login: ${escapeHtml(loginTime)}</span></li>`;
  }).join('');
}

function renderActivityLessons(lessonStats) {
  if (!activityLessonsList) return;

  if (!lessonStats.length) {
    activityLessonsList.innerHTML = '<li class="empty-state">No lesson activity recorded yet.</li>';
    return;
  }

  activityLessonsList.innerHTML = lessonStats.map((entry) => {
    const students = entry.students.length ? entry.students.join(', ') : 'No student activity';
    return `<li class="admin-activity-item"><strong>${escapeHtml(entry.title)}</strong><span>Viewed: ${entry.views} • Downloaded: ${entry.downloads} • Students: ${escapeHtml(students)}</span></li>`;
  }).join('');
}

async function loadActivitySummary() {
  if (!supabaseClient || !currentUser) return;

  try {
    const { data: activityData, error: activityError } = await supabaseClient
      .from('activity_log')
      .select('id, student_id, lesson_id, action_type, created_at')
      .order('created_at', { ascending: false });

    if (activityError) throw activityError;

    const rows = activityData || [];
    const uniqueStudentIds = [...new Set(rows.map((row) => row.student_id).filter(Boolean))];
    const uniqueLessonIds = [...new Set(rows.map((row) => row.lesson_id).filter(Boolean))];
    const profileMap = new Map();
    const lessonMap = new Map();

    if (uniqueStudentIds.length) {
      const { data: profiles, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('id, full_name, email')
        .in('id', uniqueStudentIds);

      if (profilesError) throw profilesError;
      (profiles || []).forEach((profile) => profileMap.set(profile.id, profile));
    }

    if (uniqueLessonIds.length) {
      const { data: lessonsData, error: lessonsError } = await supabaseClient
        .from('lessons')
        .select('id, title, lesson_number')
        .in('id', uniqueLessonIds);

      if (lessonsError) throw lessonsError;
      (lessonsData || []).forEach((lesson) => lessonMap.set(lesson.id, lesson));
    }

    const latestLogins = new Map();
    rows.forEach((row) => {
      if (row.action_type !== 'login' || !row.student_id) return;
      const existing = latestLogins.get(row.student_id);
      if (!existing || new Date(row.created_at) > new Date(existing.created_at)) {
        latestLogins.set(row.student_id, row);
      }
    });

    const loginRows = Array.from(latestLogins.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    renderActivityStudents(loginRows, profileMap);

    const lessonStats = new Map();
    rows.forEach((row) => {
      if (!row.lesson_id) return;
      const lesson = lessonMap.get(row.lesson_id);
      if (!lesson) return;

      const existing = lessonStats.get(row.lesson_id) || {
        lesson_id: row.lesson_id,
        title: lesson.title || `Lesson ${lesson.lesson_number || row.lesson_id}`,
        views: 0,
        downloads: 0,
        students: new Set()
      };

      if (row.action_type === 'view') {
        existing.views += 1;
      }

      if (row.action_type === 'download') {
        existing.downloads += 1;
      }

      if (row.student_id) {
        const profile = profileMap.get(row.student_id) || {};
        const studentLabel = profile.full_name || profile.email || row.student_id;
        existing.students.add(studentLabel);
      }

      lessonStats.set(row.lesson_id, existing);
    });

    const activityLessonEntries = Array.from(lessonStats.values())
      .map((entry) => ({
        ...entry,
        students: Array.from(entry.students).sort((a, b) => a.localeCompare(b))
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    renderActivityLessons(activityLessonEntries);
  } catch (error) {
    console.error('Activity summary failed to load:', error);
    if (activityMessage) {
      showMessage(activityMessage, 'Unable to load activity data right now.', true);
    }
  }
}

async function signInAdmin(event) {
  event.preventDefault();
  clearMessage(adminAuthMessage);

  const email = adminEmailInput?.value.trim() || '';
  const password = adminPasswordInput?.value || '';

  if (!supabaseClient) {
    showMessage(adminAuthMessage, 'The authentication service is unavailable.', true);
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (!data?.user || !isAdminUser(data.user)) {
      await supabaseClient.auth.signOut();
      showMessage(adminAuthMessage, 'Only the configured administrator account can access this panel.', true);
      return;
    }

    currentUser = data.user;
    showAdminScreen();
    setAdminTab('lessons');
    await Promise.all([loadLessons(), loadLessonVideos(), loadActivitySummary(), loadAnnouncements()]);
  } catch (error) {
    console.error("Login Error:", error);
    showMessage(adminAuthMessage, error.message || 'Sign-in failed.', true);
  }
}

async function handleLogout() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  currentUser = null;
  showLoginScreen();
}

function getTodayDateValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function setDefaultLessonDate() {
  if (lessonDateInput) {
    lessonDateInput.value = getTodayDateValue();
  }
}

async function uploadLesson(event) {
  event.preventDefault();
  if (!supabaseClient || !currentUser) return;
  if (!(await ensureAdminSessionValid())) return;

  const title = lessonTitleInput?.value.trim();
  const sessionNumber = sessionNumberInput?.value;
  const description = lessonDescriptionInput?.value.trim();
  const category = lessonCategoryInput?.value;
  const lessonDate = lessonDateInput?.value;
  const selectedFiles = Array.from(lessonFileInput?.files || []);

  if (!title || !sessionNumber || !category || !lessonDate || selectedFiles.length === 0) {
    showMessage(uploadMessage, 'Please fill in every field and choose at least one file.', true);
    return;
  }

  const uploadedPaths = [];
  const fileUrlEntries = [];
  const storagePaths = [];

  try {
    for (let index = 0; index < selectedFiles.length; index += 1) {
      const file = selectedFiles[index];
      const safeFileName = (file.name || 'lesson-file').replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${Date.now()}-${index}-${safeFileName}`;

      const { error: uploadError } = await supabaseClient.storage.from('lessons').upload(storagePath, file, {
        cacheControl: 'max-age=0, s-maxage=0, no-cache, no-store, must-revalidate',
        contentType: file.type || 'application/octet-stream',
        upsert: true
      });
      if (uploadError) throw uploadError;

      const { data: publicUrlData, error: publicUrlError } = supabaseClient.storage.from('lessons').getPublicUrl(storagePath);
      if (publicUrlError) throw publicUrlError;

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error(`Unable to generate public URL for ${file.name}`);

      uploadedPaths.push(storagePath);
      fileUrlEntries.push({ name: file.name, url: publicUrl });
      storagePaths.push(storagePath);
    }

    const { error: lessonsError } = await supabaseClient.from('lessons').insert([{
      title,
      lesson_number: Number(sessionNumber),
      description,
      category,
      file_url: fileUrlEntries,
      storage_path: storagePaths,
      created_at: lessonDate
    }]);

    if (lessonsError) throw lessonsError;

    uploadForm.reset();
    setDefaultLessonDate();
    showMessage(uploadMessage, 'Lesson uploaded successfully.', false);
    await loadLessons();
  } catch (error) {
    if (uploadedPaths.length) {
      try {
        await supabaseClient.storage.from('lessons').remove(uploadedPaths);
      } catch (cleanupError) {
        console.warn('Cleanup after failed upload failed:', cleanupError);
      }
    }
    showMessage(adminAuthMessage, error.message || 'Upload failed.', true);
  }
}

function startEditLesson(id) {
  const lesson = lessons.find((item) => item.id === id);
  if (!lesson) return;
  editingLessonId = id;
  editTitleInput.value = lesson.title || '';
  editSessionInput.value = lesson.lesson_number || '';
  editDescriptionInput.value = lesson.description || '';
  editCategoryInput.value = lesson.category || 'Lesson Materials';
  editForm.hidden = false;
}

function cancelEdit() {
  editingLessonId = null;
  editForm.hidden = true;
  editForm.reset();
}

async function uploadFilesToStorage(files) {
  const uploadedPaths = [];
  const fileUrlEntries = [];
  const storagePaths = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const safeFileName = (file.name || 'lesson-file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${Date.now()}-${index}-${safeFileName}`;

    const { error: uploadError } = await supabaseClient.storage.from('lessons').upload(storagePath, file, {
      cacheControl: 'max-age=0, s-maxage=0, no-cache, no-store, must-revalidate',
      contentType: file.type || 'application/octet-stream',
      upsert: true
    });
    if (uploadError) throw uploadError;

    const { data: publicUrlData, error: publicUrlError } = supabaseClient.storage.from('lessons').getPublicUrl(storagePath);
    if (publicUrlError) throw publicUrlError;

    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) throw new Error(`Unable to generate public URL for ${file.name}`);

    uploadedPaths.push(storagePath);
    fileUrlEntries.push({ name: file.name, url: publicUrl });
    storagePaths.push(storagePath);
  }

  return { uploadedPaths, fileUrlEntries, storagePaths };
}

async function saveEditLesson(event) {
  event.preventDefault();
  if (!supabaseClient || !editingLessonId) return;
  if (!(await ensureAdminSessionValid())) return;

  const replacementFiles = Array.from(editLessonFileInput?.files || []);
  const updateData = {
    title: editTitleInput.value.trim(),
    lesson_number: Number(editSessionInput.value),
    description: editDescriptionInput.value.trim(),
    category: editCategoryInput.value || 'Lesson Materials'
  };

  let uploadedPaths = [];
  let newStoragePaths = [];
  let newFileUrlEntries = [];
  let oldStoragePaths = [];

  try {
    if (replacementFiles.length) {
      const lesson = lessons.find((item) => item.id === editingLessonId);
      oldStoragePaths = normalizeStoragePaths(lesson.storage_path);

      const uploadResult = await uploadFilesToStorage(replacementFiles);
      uploadedPaths = uploadResult.uploadedPaths;
      newStoragePaths = uploadResult.storagePaths;
      newFileUrlEntries = uploadResult.fileUrlEntries;

      updateData.file_url = newFileUrlEntries;
      updateData.storage_path = newStoragePaths;
    }

    const { error } = await supabaseClient
      .from('lessons')
      .update(updateData)
      .eq('id', editingLessonId);

    if (error) throw error;

    if (replacementFiles.length && oldStoragePaths.length) {
      await supabaseClient.storage.from('lessons').remove(oldStoragePaths);
    }

    showMessage(editMessage, 'Lesson updated successfully.', false);
    cancelEdit();
    await loadLessons();
  } catch (error) {
    if (uploadedPaths.length) {
      try {
        await supabaseClient.storage.from('lessons').remove(uploadedPaths);
      } catch (cleanupError) {
        console.warn('Cleanup after failed edit upload failed:', cleanupError);
      }
    }
    showMessage(adminAuthMessage, error.message || 'Update failed.', true);
  }
}

async function deleteLesson(id) {
  if (!supabaseClient) return;
  if (!(await ensureAdminSessionValid())) return;
  const lesson = lessons.find((item) => item.id === id);
  if (!lesson) return;

  const confirmed = window.confirm(`Delete ${lesson.title || 'this lesson'}?`);
  if (!confirmed) return;

  try {
    if (lesson.storage_path) {
      const storagePaths = normalizeStoragePaths(lesson.storage_path);
      if (storagePaths.length) {
        await supabaseClient.storage.from('lessons').remove(storagePaths);
      }
    }
    const { error } = await supabaseClient.from('lessons').delete().eq('id', id);
    if (error) throw error;
    showMessage(adminAuthMessage, 'Lesson deleted successfully.', false);
    await loadLessons();
  } catch (error) {
    showMessage(adminAuthMessage, error.message || 'Delete failed.', true);
  }
}

function handleTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'edit') startEditLesson(Number(id));
  if (action === 'delete') deleteLesson(Number(id));
}

async function initializeAdmin() {
  if (!supabaseClient) {
    showMessage(adminAuthMessage, 'Supabase is not available.', true);
    return;
  }

  adminAuthForm?.addEventListener('submit', signInAdmin);
  uploadForm?.addEventListener('submit', uploadLesson);
  videoForm?.addEventListener('submit', addLessonVideo);
  editForm?.addEventListener('submit', saveEditLesson);
  announcementForm?.addEventListener('submit', handleAnnouncementSubmit);
  cancelEditBtn?.addEventListener('click', cancelEdit);
  lessonsTableBody?.addEventListener('click', handleTableClick);
  videosList?.addEventListener('click', handleVideoListClick);
  announcementsList?.addEventListener('click', handleAnnouncementListClick);
  adminTabs.forEach((tab) => tab.addEventListener('click', () => setAdminTab(tab.dataset.adminTab)));
  logoutButton?.addEventListener('click', handleLogout);
  setDefaultLessonDate();

  supabaseClient.auth.onAuthStateChange((event, session) => {
    handleAuthStateChange(event, session).catch((error) => console.error('Auth state listener failed:', error));
  });

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user) {
    if (!isAdminUser(session.user)) {
      await supabaseClient.auth.signOut();
      showLoginScreen();
      return;
    }
    currentUser = session.user;
    showAdminScreen();
    setAdminTab('lessons');
    await Promise.all([loadLessons(), loadLessonVideos(), loadActivitySummary(), loadAnnouncements()]);
  } else {
    showLoginScreen();
  }
}

document.addEventListener('DOMContentLoaded', initializeAdmin);
