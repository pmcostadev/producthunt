import type { MetadataRoute } from 'next';

const SITE = (process.env.OAUTH_PUBLIC_ORIGIN ?? 'https://producthunt.pmcosta.dev').replace(
  /\/$/,
  ''
);

/**
 * The landing page is the only thing worth indexing. Everything under /api is
 * protocol surface: the MCP transport, the OAuth endpoints, the health check.
 * Crawling those produces nothing useful and fills the logs with 400s.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/']
      }
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE
  };
}
