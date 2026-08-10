const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8756'

function getToken() {
  return localStorage.getItem('inspire_token')
}

async function request(path, { method = 'GET', body, form, auth = true } = {}) {
  const headers = {}
  if (!form) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: form ? body : body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let detail = 'Something went wrong.'
    try {
      const data = await res.json()
      // FastAPI's own request-validation errors (missing field, wrong type,
      // over a length limit) return `detail` as a list of {msg, loc, ...}
      // objects rather than a plain string -- unwrap those into readable text.
      if (Array.isArray(data.detail)) {
        detail = data.detail.map((d) => d.msg).filter(Boolean).join(' ') || detail
      } else if (typeof data.detail === 'string') {
        detail = data.detail
      }
    } catch (_) {}
    const err = new Error(detail)
    err.status = res.status
    throw err
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  usernameAvailable: (username) => request(`/auth/username-available?username=${encodeURIComponent(username)}`, { auth: false }),
  login: (email, password) => {
    const form = new URLSearchParams()
    form.set('username', email)
    form.set('password', password)
    return request('/auth/login', { method: 'POST', body: form, form: true, auth: false })
  },
  googleLogin: (credential) => request('/auth/google', { method: 'POST', body: { credential }, auth: false }),
  finishGoogleSignup: (credential, username, dateOfBirth, acceptedTerms) =>
    request('/auth/google/finish', {
      method: 'POST',
      body: { credential, username, date_of_birth: dateOfBirth, accepted_terms: acceptedTerms },
      auth: false,
    }),
  listStories: (category) => request(`/stories${category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : ''}`),
  getStory: (storyId) => request(`/stories/${storyId}`),
  createStory: (payload) => request('/stories', { method: 'POST', body: payload }),
  reactToStory: (storyId, reaction) => request('/stories/react', { method: 'POST', body: { story_id: storyId, reaction } }),
  unreactToStory: (storyId) => request(`/stories/${storyId}/react`, { method: 'DELETE' }),
  getStoryReactors: (storyId) => request(`/stories/${storyId}/reactions`),
  repostStory: (storyId) => request(`/stories/${storyId}/repost`, { method: 'POST' }),
  unrepostStory: (storyId) => request(`/stories/${storyId}/repost`, { method: 'DELETE' }),
  saveStory: (storyId) => request(`/stories/${storyId}/save`, { method: 'POST' }),
  unsaveStory: (storyId) => request(`/stories/${storyId}/save`, { method: 'DELETE' }),
  getUserStories: (userId) => request(`/users/${userId}/stories`),
  getUserReposts: (userId) => request(`/users/${userId}/reposts`),
  getSavedStories: (userId) => request(`/users/${userId}/saved`),
  getAnonymousStories: (userId) => request(`/users/${userId}/anonymous`),
  listComments: (storyId) => request(`/stories/${storyId}/comments`),
  createComment: (storyId, body) => request('/stories/comments', { method: 'POST', body: { story_id: storyId, body } }),
  ariaUsage: () => request('/aria/usage'),
  ariaChat: (message) => request('/aria/chat', { method: 'POST', body: { message } }),
  me: () => request('/auth/me'),
  updateProfile: (fields) => request('/auth/me', { method: 'PATCH', body: fields }),
  createCheckoutSession: (interval = 'month') => request(`/premium/checkout?interval=${interval}`, { method: 'POST' }),
  createPortalSession: () => request('/premium/portal', { method: 'POST' }),
  listAccounts: (includeTest) => request(`/admin/users${includeTest ? '?include_test=true' : ''}`),
  markTestAccount: (userId) => request(`/admin/users/${userId}/mark-test`, { method: 'POST' }),
  unmarkTestAccount: (userId) => request(`/admin/users/${userId}/mark-test`, { method: 'DELETE' }),
  bulkMarkTestAccounts: (userIds) => request('/admin/users/bulk-mark-test', { method: 'POST', body: { user_ids: userIds } }),
  getProfile: (userId) => request(`/users/${userId}`),
  listFollowers: (userId) => request(`/users/${userId}/followers`, { auth: false }),
  listFollowing: (userId) => request(`/users/${userId}/following`, { auth: false }),
  followUser: (userId) => request(`/users/${userId}/follow`, { method: 'POST' }),
  unfollowUser: (userId) => request(`/users/${userId}/follow`, { method: 'DELETE' }),
  blockUser: (userId) => request(`/users/${userId}/block`, { method: 'POST' }),
  unblockUser: (userId) => request(`/users/${userId}/block`, { method: 'DELETE' }),
  addToCloseCircle: (userId) => request(`/users/${userId}/close-circle`, { method: 'POST' }),
  removeFromCloseCircle: (userId) => request(`/users/${userId}/close-circle`, { method: 'DELETE' }),
  getMyActivity: () => request('/me/activity'),
  getMyBlocked: () => request('/me/blocked'),
  getMyCloseCircle: () => request('/me/close-circle'),
  getMyInsights: () => request('/me/insights'),
  searchUsers: (q) => request(`/users?q=${encodeURIComponent(q)}`),
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),
  muteUser: (userId) => request(`/users/${userId}/mute`, { method: 'POST' }),
  unmuteUser: (userId) => request(`/users/${userId}/mute`, { method: 'DELETE' }),
  getMyMuted: () => request('/me/muted'),
  getFollowRequests: () => request('/me/follow-requests'),
  acceptFollowRequest: (userId) => request(`/me/follow-requests/${userId}/accept`, { method: 'POST' }),
  declineFollowRequest: (userId) => request(`/me/follow-requests/${userId}`, { method: 'DELETE' }),
  exportMyData: () => request('/me/export'),
  deleteMyAccount: () => request('/me', { method: 'DELETE' }),

  // Ephemeral Stories (Instagram-style, avatar-triggered)
  getUserStory: (userId) => request(`/ephemeral-stories/by-user/${userId}`, { auth: false }),
  createEphemeralStory: (payload) => request('/ephemeral-stories', { method: 'POST', body: payload }),
  likeEphemeralStory: (storyId) => request(`/ephemeral-stories/${storyId}/like`, { method: 'POST' }),
  unlikeEphemeralStory: (storyId) => request(`/ephemeral-stories/${storyId}/like`, { method: 'DELETE' }),
  getStoryReplies: (storyId) => request(`/ephemeral-stories/${storyId}/replies`, { auth: false }),
  replyToStory: (storyId, body) => request('/ephemeral-stories/replies', { method: 'POST', body: { ephemeral_story_id: storyId, body } }),
  sendStory: (storyId, recipientId) => request(`/ephemeral-stories/${storyId}/send`, { method: 'POST', body: { recipient_id: recipientId } }),
  getStoryInbox: () => request('/me/story-inbox'),

  // Reporting
  getReportReasons: () => request('/reports/reasons', { auth: false }),
  reportContent: (targetType, targetId, reason, note) =>
    request('/reports', { method: 'POST', body: { target_type: targetType, target_id: targetId, reason, note } }),
  adminListReports: (includeResolved) => request(`/admin/reports${includeResolved ? '?include_resolved=true' : ''}`),
  adminResolveReport: (reportId) => request(`/admin/reports/${reportId}/resolve`, { method: 'POST' }),

  // Direct messages
  listConversations: () => request('/dms'),
  getUnreadDmCount: () => request('/dms/unread-count'),
  getMessages: (userId) => request(`/dms/${userId}/messages`),
  sendMessage: (userId, body) => request(`/dms/${userId}/messages`, { method: 'POST', body: { body } }),
  markMessagesRead: (userId) => request(`/dms/${userId}/read`, { method: 'POST' }),
  acceptMessageRequest: (userId) => request(`/dms/${userId}/accept`, { method: 'POST' }),
  declineMessageRequest: (userId) => request(`/dms/${userId}/request`, { method: 'DELETE' }),
  markFounderStorySeen: () => request('/me/founder-story-seen', { method: 'POST' }),
  recordFounderStoryView: (durationSeconds) => request('/me/founder-story-view', { method: 'POST', body: { duration_seconds: durationSeconds } }),
  getFounderStoryViews: () => request('/me/founder-story-views'),
  markOnboardingGuideSeen: () => request('/me/onboarding-guide-seen', { method: 'POST' }),
  markStoryPremiumPitchSeen: () => request('/me/story-premium-pitch-seen', { method: 'POST' }),
  getOnboardingChecklist: () => request('/me/onboarding'),

  // Notifications
  getNotifications: () => request('/notifications'),
  getUnreadNotificationCount: () => request('/notifications/unread-count'),
  getUnreadNotificationSummary: () => request('/notifications/unread-summary'),
  markNotificationsRead: () => request('/notifications/read', { method: 'POST' }),
}

export { getToken }
