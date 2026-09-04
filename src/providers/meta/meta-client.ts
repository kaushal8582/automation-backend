import axios, { type AxiosInstance } from 'axios';
import { env } from '../../config/env.js';

/** Instagram Graph API base (Instagram Login / IG user tokens). */
export function createInstagramGraphClient(): AxiosInstance {
  const version = env.META_GRAPH_API_VERSION.replace(/^\/+|\/+$/g, '');
  return axios.create({
    baseURL: `https://graph.instagram.com/${version}`,
    timeout: 30_000,
  });
}

/** Facebook Graph API base (Pages / FB user tokens) — used in later phases. */
export function createFacebookGraphClient(): AxiosInstance {
  const version = env.META_GRAPH_API_VERSION.replace(/^\/+|\/+$/g, '');
  return axios.create({
    baseURL: `https://graph.facebook.com/${version}`,
    timeout: 30_000,
  });
}

export function getMetaGraphApiVersion(): string {
  return env.META_GRAPH_API_VERSION.replace(/^\/+|\/+$/g, '');
}
