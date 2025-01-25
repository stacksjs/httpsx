/// <reference lib="dom" />

export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
} as const

export type HttpMethod = typeof HTTP_METHODS[keyof typeof HTTP_METHODS]

export interface BunFetchInit extends Omit<RequestInit, 'body'> {
  verbose?: boolean
  timeout?: number
  body?: BodyInit | Record<string, string>
}

export interface RequestOptions extends Omit<BunFetchInit, 'method'> {
  method: HttpMethod
  query?: Record<string, string>
  form?: boolean
  multipart?: boolean
  json?: boolean
  unix?: string
  proxy?: string
  downloadProgress?: (progress: number) => void
}

export interface HttxConfig {
  verbose?: boolean | string[]
  defaultHeaders?: Record<string, string>
  baseUrl?: string
  timeout?: number
}


export interface HttxResponse<T = unknown> {
  status: number
  statusText: string
  headers: Headers
  data: T
  timings: {
    start: number
    end: number
    duration: number
  }
}
