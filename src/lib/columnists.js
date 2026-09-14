/**
 * Central registry for the four CRFFL Times-Herald columnists.
 * Provides names, roles, desk names, WordPress author mapping, and avatar image paths.
 */
export const COLUMNISTS = {
  marcus_vance: {
    id: 'marcus_vance',
    name: 'Dr. Marcus Vance',
    title: 'Senior Analytics Columnist',
    desk: 'Applied Mathematics & Fantasy Arbitrage Desk',
    category: 'Power Rankings',
    href: '/?category=Power+Rankings#dispatches',
    avatar: '/reporters/marcus-vance.png',
    wpAuthorId: 4,
    wpAuthorSlug: 'marcus_vance',
  },
  buck_callahan: {
    id: 'buck_callahan',
    name: 'Buck Callahan',
    title: 'Senior Grit & Matchups Columnist',
    desk: 'The Look-Ahead Desk',
    category: 'The Grit Desk',
    href: '/?category=The+Grit+Desk#dispatches',
    avatar: '/reporters/buck-callahan.png',
    wpAuthorId: 3,
    wpAuthorSlug: 'buck_callahan',
  },
  marty_sullivan: {
    id: 'marty_sullivan',
    name: 'Marty Sullivan',
    title: 'Traditionalist Columnist',
    desk: 'The Tuesday Recap',
    category: 'The Tuesday Recap',
    href: '/?category=The+Tuesday+Recap#dispatches',
    avatar: '/reporters/marty-sullivan.png',
    wpAuthorId: 5,
    wpAuthorSlug: 'marty_sullivan',
  },
  chloe_carmichael: {
    id: 'chloe_carmichael',
    name: 'Chloe Carmichael',
    title: 'Transactions & Waiver Wire Columnist',
    desk: 'The Spin Room',
    category: 'The Spin Room',
    href: '/?category=The+Spin+Room#dispatches',
    avatar: '/reporters/chloe-carmichael.png',
    wpAuthorId: 2,
    wpAuthorSlug: 'chloe_carmichael',
  },
  commissioner: {
    id: 'commissioner',
    name: 'Eric Vaughan',
    title: 'CRFFL Commissioner & League Founder',
    desk: 'The Front Office',
    category: "Commissioner's Corner",
    href: '/?category=Commissioner%27s+Corner#dispatches',
    avatar: '/logos/league.png',
    banner: '/commissioner-banner.png',
    wpAuthorId: 6,
    wpAuthorSlug: 'the-commissioner',
  },
};

export function getColumnist(id) {
  return COLUMNISTS[id] || {
    id,
    name: 'Staff Reporter',
    title: 'Columnist',
    desk: 'CRFFL Times-Herald',
    avatar: '/reporters/default-avatar.png',
  };
}

