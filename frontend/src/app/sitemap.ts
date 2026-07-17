import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const date = new Date();

  return [
    {
      url: `${SITE_URL}`,
      lastModified: date,
      changeFrequency: "yearly",
      priority: 1
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: date,
      changeFrequency: "yearly",
      priority: 0.9
    },
    {
      url: `${SITE_URL}/register`,
      lastModified: date,
      changeFrequency: "yearly",
      priority: 0.7
    },
  ];
}
