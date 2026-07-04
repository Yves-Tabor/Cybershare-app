const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Token helpers
export function saveToken(token) {
  localStorage.setItem("cybershare_token", token);
}
export function getToken() {
  return localStorage.getItem("cybershare_token");
}
export function clearToken() {
  localStorage.removeItem("cybershare_token");
}

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
  };

  // Attach Bearer token if available (used after Google OAuth redirect)
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const defaultOptions = {
    headers,
    credentials: "include",
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  };

  try {
    const response = await fetch(url, mergedOptions);

    const contentType = response.headers.get("content-type") || "";
    let data = null;

    if (contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      const text = await response.text();
      data = text ? { message: text } : null;
    }

    if (!response.ok) {
      const error = new Error(
        data?.error ||
          data?.message ||
          response.statusText ||
          "API request failed",
      );
      error.status = response.status;
      if (data?.details) {
        error.details = data.details;
      }
      throw error;
    }

    return data ?? {};
  } catch (error) {
    if (error?.status !== 429) {
      console.error("API request error:", error);
    }
    throw error;
  }
}

// Auth API
export const authAPI = {
  register: async (username, email, password) => {
    return apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
  },

  login: async (email, password) => {
    return apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  logout: async () => {
    return apiRequest("/auth/logout", {
      method: "POST",
    });
  },

  me: async () => {
    return apiRequest("/auth/me");
  },

  completeProfile: async (username, password) => {
    return apiRequest("/auth/complete-profile", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },
};

// Resources API
export const resourcesAPI = {
  getAll: async () => {
    return apiRequest("/resources");
  },

  getById: async (id) => {
    return apiRequest(`/resources/${id}`);
  },

  create: async (title, description, url, category) => {
    return apiRequest("/resources", {
      method: "POST",
      body: JSON.stringify({ title, description, url, category }),
    });
  },

  update: async (id, title, description, url, category) => {
    return apiRequest(`/resources/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title, description, url, category }),
    });
  },

  delete: async (id) => {
    return apiRequest(`/resources/${id}`, {
      method: "DELETE",
    });
  },
};

// Posts API
export const postsAPI = {
  getAll: async () => {
    return apiRequest("/posts");
  },

  getById: async (id) => {
    return apiRequest(`/posts/${id}`);
  },

  create: async (content) => {
    return apiRequest("/posts", {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },

  update: async (id, content) => {
    return apiRequest(`/posts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    });
  },

  delete: async (id) => {
    return apiRequest(`/posts/${id}`, {
      method: "DELETE",
    });
  },

  like: async (id) => {
    return apiRequest(`/posts/${id}/like`, {
      method: "POST",
    });
  },

  unlike: async (id) => {
    return apiRequest(`/posts/${id}/like`, {
      method: "DELETE",
    });
  },
};

// Comments API
export const commentsAPI = {
  getByPostId: async (postId) => {
    return apiRequest(`/posts/${postId}/comments`);
  },

  create: async (postId, content, parentCommentId) => {
    const body = { content };
    if (parentCommentId != null) {
      body.parent_comment_id = parentCommentId;
    }
    return apiRequest(`/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  delete: async (postId, commentId) => {
    return apiRequest(`/posts/${postId}/comments/${commentId}`, {
      method: "DELETE",
    });
  },
};

// Scans API
export const scansAPI = {
  checkDependencies: async () => {
    return apiRequest("/scans/dependencies/check");
  },

  create: async (targetUrl) => {
    return apiRequest("/scans", {
      method: "POST",
      body: JSON.stringify({ target_url: targetUrl }),
    });
  },

  getAll: async () => {
    return apiRequest("/scans");
  },

  getById: async (id) => {
    return apiRequest(`/scans/${id}`);
  },

  delete: async (id) => {
    return apiRequest(`/scans/${id}`, {
      method: "DELETE",
    });
  },

  deleteAll: async () => {
    return apiRequest("/scans", {
      method: "DELETE",
    });
  },
};

// Events API
export const eventsAPI = {
  getAll: async (category, status) => {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (status) params.append("status", status);
    const queryString = params.toString();
    return apiRequest(`/events${queryString ? `?${queryString}` : ""}`);
  },

  getById: async (id) => {
    return apiRequest(`/events/${id}`);
  },

  create: async (
    title,
    description,
    location,
    startDate,
    endDate,
    imageUrl,
    category,
    status,
  ) => {
    return apiRequest("/events", {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        location,
        start_date: startDate,
        end_date: endDate,
        image_url: imageUrl,
        category,
        status,
      }),
    });
  },

  update: async (
    id,
    title,
    description,
    location,
    startDate,
    endDate,
    imageUrl,
    category,
    status,
  ) => {
    return apiRequest(`/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title,
        description,
        location,
        start_date: startDate,
        end_date: endDate,
        image_url: imageUrl,
        category,
        status,
      }),
    });
  },

  delete: async (id) => {
    return apiRequest(`/events/${id}`, {
      method: "DELETE",
    });
  },

  register: async (id) => {
    return apiRequest(`/events/${id}/register`, {
      method: "POST",
    });
  },

  unregister: async (id) => {
    return apiRequest(`/events/${id}/register`, {
      method: "DELETE",
    });
  },

  getAttendees: async (id) => {
    return apiRequest(`/events/${id}/attendees`);
  },
};

// Notifications API
export const notificationsAPI = {
  getAll: async (unreadOnly = false) => {
    const params = new URLSearchParams();
    if (unreadOnly) params.append("unread_only", "true");
    const queryString = params.toString();
    return apiRequest(`/notifications${queryString ? `?${queryString}` : ""}`);
  },

  getUnreadCount: async () => {
    return apiRequest("/notifications/unread-count");
  },

  markAsRead: async (id) => {
    return apiRequest(`/notifications/${id}/read`, {
      method: "PATCH",
    });
  },

  markAllAsRead: async () => {
    return apiRequest("/notifications/read-all", {
      method: "PATCH",
    });
  },

  delete: async (id) => {
    return apiRequest(`/notifications/${id}`, {
      method: "DELETE",
    });
  },

  deleteAll: async () => {
    return apiRequest("/notifications", {
      method: "DELETE",
    });
  },
};

// Groups API
export const groupsAPI = {
  getAll: async () => {
    return apiRequest("/groups");
  },

  getById: async (id) => {
    return apiRequest(`/groups/${id}`);
  },

  create: async (name, description, category) => {
    return apiRequest("/groups", {
      method: "POST",
      body: JSON.stringify({ name, description, category }),
    });
  },

  join: async (id) => {
    return apiRequest(`/groups/${id}/join`, {
      method: "POST",
    });
  },

  leave: async (id) => {
    return apiRequest(`/groups/${id}/leave`, {
      method: "POST",
    });
  },

  createPost: async (groupId, content) => {
    return apiRequest(`/groups/${groupId}/posts`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },

  likePost: async (groupId, postId) => {
    return apiRequest(`/groups/${groupId}/posts/${postId}/like`, {
      method: "POST",
    });
  },

  unlikePost: async (groupId, postId) => {
    return apiRequest(`/groups/${groupId}/posts/${postId}/like`, {
      method: "DELETE",
    });
  },

  createComment: async (groupId, postId, content, parent_comment_id) => {
    return apiRequest(`/groups/${groupId}/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content, parent_comment_id }),
    });
  },

  removeMember: async (groupId, userId) => {
    return apiRequest(`/groups/${groupId}/members/${userId}`, {
      method: "DELETE",
    });
  },

  invite: async (groupId, email) => {
    return apiRequest(`/groups/${groupId}/invite`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
};

export default apiRequest;
