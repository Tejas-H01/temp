import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:8000/auth';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const authClient = axios.create({
  baseURL: AUTH_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor for auth headers
const interceptor = (config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

apiClient.interceptors.request.use(interceptor);
authClient.interceptors.request.use(interceptor);

export const authApi = {
  login: async (email, password) => {
    const response = await authClient.post('/login', { email, password });
    return response.data;
  },
  register: async (username, email, password, confirm_password) => {
    const response = await authClient.post('/register', { username, email, password, confirm_password: confirm_password || password });
    return response.data;
  },
  verifyOtp: async (email, purpose, otp) => {
    const response = await authClient.post('/verify-otp', { email, purpose, otp });
    return response.data;
  },
  resendOtp: async (email, purpose) => {
    const response = await authClient.post('/resend-otp', { email, purpose });
    return response.data;
  },
  forgotPassword: async (email) => {
    const response = await authClient.post('/forgot-password', { email });
    return response.data;
  },
  resetPassword: async (email, otp, new_password, confirm_password) => {
    const response = await authClient.post('/reset-password', { email, otp, new_password, confirm_password: confirm_password || new_password });
    return response.data;
  },
  getMe: async () => {
    const response = await authClient.get('/me');
    return response.data;
  },
  updateMe: async (data) => {
    const response = await authClient.put('/me', data);
    return response.data;
  },
  deleteMe: async () => {
    const response = await authClient.delete('/me');
    return response.data;
  }
};

export const tripsApi = {
  getDashboard: async () => {
    const response = await apiClient.get('/dashboard');
    return response.data;
  },
  getTrips: async () => {
    const response = await apiClient.get('/trips');
    return response.data;
  },
  getTrip: async (id) => {
    const response = await apiClient.get(`/trips/${id}`);
    return response.data;
  },
  createTrip: async (data) => {
    const response = await apiClient.post('/trips', data);
    return response.data;
  },
  updateTrip: async (id, data) => {
    const response = await apiClient.put(`/trips/${id}`, data);
    return response.data;
  },
  deleteTrip: async (id) => {
    const response = await apiClient.delete(`/trips/${id}`);
    return response.data;
  },
  getPublicTrip: async (shareId) => {
    const response = await apiClient.get(`/public/trips/${shareId}`);
    return response.data;
  },
  publishTrip: async (id) => {
    const response = await apiClient.post(`/trips/${id}/publish`);
    return response.data;
  },
  unpublishTrip: async (id) => {
    const response = await apiClient.post(`/trips/${id}/unpublish`);
    return response.data;
  },
  addStop: async (tripId, data) => {
    const response = await apiClient.post(`/trips/${tripId}/stops`, data);
    return response.data;
  },
  updateStop: async (tripId, stopId, data) => {
    const response = await apiClient.put(`/trips/${tripId}/stops/${stopId}`, data);
    return response.data;
  },
  deleteStop: async (tripId, stopId) => {
    const response = await apiClient.delete(`/trips/${tripId}/stops/${stopId}`);
    return response.data;
  },
  addActivity: async (stopId, data) => {
    const response = await apiClient.post(`/stops/${stopId}/activities`, data);
    return response.data;
  },
  updateActivity: async (stopId, activityId, data) => {
    const response = await apiClient.put(`/stops/${stopId}/activities/${activityId}`, data);
    return response.data;
  },
  deleteActivity: async (stopId, activityId) => {
    const response = await apiClient.delete(`/stops/${stopId}/activities/${activityId}`);
    return response.data;
  },
  getBudget: async (tripId) => {
    const response = await apiClient.get(`/trips/${tripId}/budget`);
    return response.data;
  },
  addExpense: async (tripId, data) => {
    const response = await apiClient.post(`/trips/${tripId}/expenses`, data);
    return response.data;
  },
  updateExpense: async (tripId, expenseId, data) => {
    const response = await apiClient.put(`/trips/${tripId}/expenses/${expenseId}`, data);
    return response.data;
  },
  deleteExpense: async (tripId, expenseId) => {
    const response = await apiClient.delete(`/trips/${tripId}/expenses/${expenseId}`);
    return response.data;
  }
};

export const masterApi = {
  getCities: async (search) => {
    const params = search ? { q: search } : {};
    const response = await apiClient.get('/cities', { params });
    return response.data;
  },
  getActivities: async (cityId) => {
    const params = cityId ? { city_id: cityId } : {};
    const response = await apiClient.get('/activities', { params });
    return response.data;
  }
};

export const savedDestinationsApi = {
  getSavedDestinations: async () => {
    const response = await apiClient.get('/saved-destinations');
    return response.data;
  },
  saveDestination: async (cityId) => {
    const response = await apiClient.post(`/saved-destinations/${cityId}`);
    return response.data;
  },
  removeDestination: async (cityId) => {
    const response = await apiClient.delete(`/saved-destinations/${cityId}`);
    return response.data;
  }
};

export const recommendationsApi = {
  // Consolidated city bundle: places + restaurants + budget
  getCityBundle: async (cityId, params = {}) => {
    const response = await apiClient.get(`/recommendations/cities/${cityId}`, { params });
    return response.data;
  },
  // Just places for a city
  getCityPlaces: async (cityId, params = {}) => {
    const response = await apiClient.get(`/recommendations/cities/${cityId}/places`, { params });
    return response.data;
  },
  // Just restaurants for a city
  getCityRestaurants: async (cityId, params = {}) => {
    const response = await apiClient.get(`/recommendations/cities/${cityId}/restaurants`, { params });
    return response.data;
  },
  // Single city budget reference
  getBudgetReference: async (cityId, tier, days) => {
    const params = { city_id: cityId, days: days || 1 };
    if (tier) params.tier = tier;
    const response = await apiClient.get('/recommendations/budget', { params });
    return response.data;
  },
  // Multi-city budget breakdown
  getMultiCityBudget: async (stops, remainingBudget) => {
    const params = {};
    if (remainingBudget != null) params.remaining_budget = remainingBudget;
    const response = await apiClient.post('/recommendations/budget/multi-city', stops, { params });
    return response.data;
  },
  getTripRecommendations: async (tripId, params = {}) => {
    const response = await apiClient.get(`/recommendations/trips/${tripId}`, { params });
    return response.data;
  },
};

export const communityApi = {
  getExperiences: async (params = {}) => {
    const response = await apiClient.get('/community/experiences', { params });
    return response.data;
  },
  getExperience: async (id) => {
    const response = await apiClient.get(`/community/experiences/${id}`);
    return response.data;
  },
  likeExperience: async (id) => {
    const response = await apiClient.post(`/community/experiences/${id}/like`);
    return response.data;
  },
  unlikeExperience: async (id) => {
    const response = await apiClient.delete(`/community/experiences/${id}/like`);
    return response.data;
  },
  copyExperience: async (id) => {
    const response = await apiClient.post(`/community/experiences/${id}/copy`);
    return response.data;
  }
};

export const usersApi = {
  getPublicProfile: async (username) => {
    const response = await apiClient.get(`/users/${username}`);
    return response.data;
  }
};

export const seasonalApi = {
  getConditions: async (cityId, month) => {
    const response = await apiClient.get(`/cities/${cityId}/seasonal-check`, { params: { month } });
    return response.data;
  }
};


