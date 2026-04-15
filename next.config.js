/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase body size limit for PDF uploads (10 MB)
  experimental: {
    serverComponentsExternalPackages: ['@aws-sdk/client-s3'],
  },
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig;
