/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS,
    NEXT_PUBLIC_PROPOSAL_ADDRESS: process.env.NEXT_PUBLIC_PROPOSAL_ADDRESS,
    NEXT_PUBLIC_TIMELOCK_ADDRESS: process.env.NEXT_PUBLIC_TIMELOCK_ADDRESS,
    NEXT_PUBLIC_AUDIT_LOG_ADDRESS: process.env.NEXT_PUBLIC_AUDIT_LOG_ADDRESS,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  },
};

module.exports = nextConfig;
