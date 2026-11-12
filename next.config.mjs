import mdx from "@next/mdx";

const withMDX = mdx({
  extension: /\.mdx?$/,
  options: {},
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  transpilePackages: ["next-mdx-remote"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "**",
      },
    ],
  },
  async redirects() {
    return [
      {
        // Short link for the Instagram bio. It forwards to the home page with
        // the bio tag, so the visit is recorded as "Instagram · Bio link".
        // Also listed in the admin link builder (SHORT_BIO_PATH).
        source: "/dk",
        destination: "/?utm_source=instagram&utm_medium=bio",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        // Keep the private dashboard out of search engines.
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  sassOptions: {
    compiler: "modern",
    silenceDeprecations: ["legacy-js-api"],
  },
};

export default withMDX(nextConfig);
