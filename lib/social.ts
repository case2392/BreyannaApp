// Dwell's social media pages. Update a link here and it updates everywhere the
// social links appear. Leave href null to hide a network until it's ready.
export const SOCIAL_LINKS: { name: string; href: string | null }[] = [
  { name: "Instagram", href: "https://www.instagram.com/dwellstudio.lnk/" },
  { name: "TikTok", href: "https://www.tiktok.com/@dwellstudio.lnk" },
  // Facebook page "Dwell Studio Lincoln" — paste its address here.
  { name: "Facebook", href: null },
];

export const activeSocialLinks = () =>
  SOCIAL_LINKS.filter((l): l is { name: string; href: string } => Boolean(l.href));
