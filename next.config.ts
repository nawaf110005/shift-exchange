import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

const nextConfig: NextConfig = {
  // @netlify/plugin-nextjs handles output — do not set output:'standalone'
}

export default withNextIntl(nextConfig)
