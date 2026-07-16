/**
 * Next.js/Vercel build-time fallback for Cloudflare runtime bindings.
 *
 * The vinext build does not read next.config.ts, so Cloudflare deployments keep
 * using the real `cloudflare:workers` module. Native Next.js deployments alias
 * that module to this empty environment and let API routes return their existing
 * service-unavailable response until equivalent Vercel storage is configured.
 */
export const env = Object.freeze({});
