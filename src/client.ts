import type { Result } from 'neverthrow'
import type { HttxConfig, HttxResponse, RequestOptions } from './types'
import { err, ok } from 'neverthrow'
import { debugLog } from './utils'

export class HttxClient {
  private config: Required<HttxConfig>

  constructor(config: Partial<HttxConfig> = {}) {
    this.config = {
      verbose: false,
      defaultHeaders: {},
      baseUrl: '',
      timeout: 30000,
      ...config,
    }
  }

  async request<T = unknown>(
    url: string,
    options: RequestOptions,
  ): Promise<Result<HttxResponse<T>, Error>> {
    const startTime = performance.now()

    try {
      const finalUrl = this.buildUrl(url, options.query)
      debugLog('request', `${options.method} ${finalUrl}`, this.config.verbose)

      const controller = new AbortController()
      const timeoutSignal = options.timeout || this.config.timeout
        ? AbortSignal.timeout(options.timeout || this.config.timeout)
        : undefined

      const headers = this.buildHeaders(options)
      const body = await this.buildBody(options)

      debugLog('request', `Request headers: ${JSON.stringify(Object.fromEntries(headers.entries()))}`, this.config.verbose)
      if (body) {
        debugLog('request', `Request body: ${typeof body === 'string' ? body : JSON.stringify(body)}`, this.config.verbose)
      }

      const requestInit: RequestInit = {
        method: options.method,
        headers,
        signal: options.signal || timeoutSignal || controller.signal,
        body,
      }

      const response = await fetch(finalUrl, {
        ...requestInit,
        verbose: options.verbose || this.config.verbose !== false,
      })

      const data = await this.parseResponse<T>(response)
      const endTime = performance.now()

      const result: HttxResponse<T> = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data,
        timings: {
          start: startTime,
          end: endTime,
          duration: endTime - startTime,
        },
      }

      debugLog('response', `${result.status} ${result.statusText} (${result.timings.duration}ms)`, this.config.verbose)
      debugLog('response', `Response data: ${JSON.stringify(data)}`, this.config.verbose)

      return ok(result)
    }
    catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)))
    }
  }

  private buildUrl(url: string, query?: Record<string, string>): string {
    const baseUrl = this.config.baseUrl ? new URL(this.config.baseUrl) : null
    const finalUrl = baseUrl ? new URL(url, baseUrl) : new URL(url)

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        finalUrl.searchParams.append(key, value)
      })
    }

    return finalUrl.toString()
  }

  private buildHeaders(options: RequestOptions): Headers {
    const headers = new Headers(this.config.defaultHeaders)

    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (value)
          headers.set(key, value)
      })
    }

    if (options.json) {
      headers.set('Content-Type', 'application/json')
      headers.set('Accept', 'application/json')
    }
    else if (options.form) {
      headers.set('Content-Type', 'application/x-www-form-urlencoded')
    }
    else if (options.multipart) {
      // Content-Type is automatically set for FormData
      headers.delete('Content-Type')
    }

    return headers
  }

  private async buildBody(options: RequestOptions): Promise<BodyInit | undefined> {
    if (!options.body)
      return undefined

    if (options.json) {
      debugLog('request', `Building JSON body from: ${JSON.stringify(options.body)}`, true)
      return JSON.stringify(options.body)
    }

    if (options.form && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      const params = new URLSearchParams()
      Object.entries(options.body).forEach(([key, value]) => {
        params.append(key, String(value))
      })
      return params.toString()
    }

    if (options.body instanceof FormData) {
      return options.body
    }

    if (typeof options.body === 'string') {
      return options.body
    }

    if (typeof options.body === 'object') {
      return JSON.stringify(options.body)
    }

    throw new Error('Invalid body type')
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type')

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error)
    }

    if (contentType?.includes('application/json')) {
      return response.json()
    }

    if (contentType?.includes('text/')) {
      return response.text() as Promise<T>
    }

    return response.blob() as Promise<T>
  }
}
