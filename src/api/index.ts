/**
 * API Calls - Simple Model for Making API Requests
 *
 * This file uses AXIOS (configured in ../config/server.ts)
 *
 * HOW TO USE:
 * 1. Import what you need: import { getCategories, getRaffles } from '../api';
 * 2. Call in your component: const response = await getCategories();
 * 3. Check response.success before using response.data
 *
 * HOW TO ADD NEW API CALLS:
 * 1. Create a function that calls getRequest/postRequest/etc
 * 2. Export it from this file
 * 3. Use it in your component!
 */

// These are axios-based request functions from server.ts
// Re-exported so you can use them directly: import { getRequest } from '../api';
import {
  getRequest,
  postRequest,
  putRequest,
  patchRequest,
  deleteRequest,
} from "../config/server";

export {
  getRequest,
  postRequest,
  putRequest,
  patchRequest,
  deleteRequest,
};

// ============================================
// EXAMPLE API CALLS (Use these as templates!)
// ============================================

/**
 * Get all categories
 * @example const response = await getCategories();
 */
export const getCategories = () => {
  return getRequest("/metadata/categories");
};

/**
 * Get all raffles
 * @example const response = await getRaffles();
 */
export const getRaffles = () => {
  return getRequest("/raffles");
};

/**
 * Get raffle by ID
 * @example const response = await getRaffleById(123);
 */
export const getRaffleById = (raffleId: number) => {
  return getRequest(`/raffles/${raffleId}`);
};

/**
 * Get raffles with filters
 * @example const response = await getRafflesWithFilters({ status: 'active', page: 1 });
 */
export const getRafflesWithFilters = (params: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  return getRequest("/raffles", { params });
};

/**
 * Create a new raffle
 * @example const response = await createRaffle({ title: 'My Raffle', ... });
 */
export const createRaffle = (data: {
  title: string;
  description: string;
  price: number;
}) => {
  return postRequest("/raffles", data);
};

/**
 * Update a raffle
 * @example const response = await updateRaffle(123, { title: 'Updated Title' });
 */
export const updateRaffle = (
  raffleId: number,
  data: { title?: string; description?: string; price?: number }
) => {
  return putRequest(`/raffles/${raffleId}`, data);
};

/**
 * Delete a raffle
 * @example const response = await deleteRaffle(123);
 */
export const deleteRaffle = (raffleId: number) => {
  return deleteRequest(`/raffles/${raffleId}`);
};

/**
 * Upload an image (example with file upload)
 * @example const response = await uploadImage(file);
 */
export const uploadImage = (file: File) => {
  const formData = new FormData();
  formData.append("image", file);

  return postRequest("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ============================================
// AUTH EXAMPLES
// ============================================

export const login = (email: string, password: string) => {
  return postRequest("/auth/login", { email, password });
};

export const logout = () => {
  return postRequest("/logout");
};

export const checkAuth = () => {
  return getRequest("/authenticate");
};

// ============================================
// USER EXAMPLES
// ============================================

export const getMyProfile = () => {
  return getRequest("/user/profile/me");
};

export const updateProfile = (data: { firstName?: string; lastName?: string; bio?: string }) => {
  return putRequest("/users/info", data);
};
