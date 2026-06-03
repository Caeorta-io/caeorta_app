import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; let Next transpile them.
  transpilePackages: ["@caeorta/types", "@caeorta/supabase"],
};

export default nextConfig;
