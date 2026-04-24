import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Netlify Next.js Runtime handles output — do not set output:'standalone'
<<<<<<< HEAD
  transpilePackages: ['date-fns'],
=======
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
}

export default withNextIntl(nextConfig)
