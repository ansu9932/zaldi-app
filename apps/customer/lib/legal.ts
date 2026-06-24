/**
 * Public URLs for the legal pages (Terms, Privacy) operated by Moolya India Pvt Ltd.
 *
 * 👉 Replace these with the real hosted URLs once you publish the pages (you can host
 *    PRIVACY_POLICY.md / TERMS_AND_CONDITIONS.md on your website or GitHub Pages).
 *    They can also be overridden at build time via EAS env vars without code changes.
 */
export const LEGAL = {
  company: 'Moolya India Private Limited',
  terms: process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://moolyaindiapvtltd.com/next/terms',
  privacy: process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://moolyaindiapvtltd.com/next/privacy',
};
