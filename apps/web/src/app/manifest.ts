import type { MetadataRoute } from 'next';

// "Add to Home Screen": app name and icon. iPhone uses apple-icon.png (next to this
// file); Android and desktop Chrome use the icons below.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Clean Crep Jamaica',
    short_name: 'Clean Crep',
    description: 'Sneaker and Clarks cleaning in Half Way Tree. Book in under a minute.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0A1F44',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
