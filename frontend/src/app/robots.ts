import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Semua halaman ini butuh login - crawler tidak boleh akses
      // melihat isinya cuma sampai di bagian login,
      // dissalow di explisit agar tidak buang budget crawl
      disallow: ["/api/", "/dashboard", "/budgets", "/expense", "/ai-insight"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}