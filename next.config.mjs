import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Netlify Next.js Runtime handles output — do not set output:'standalone'
  transpilePackages: ['date-fns'],
}

export default withNextIntl(nextConfig)
