/**
 * Central registry for CRFFL Managers and Franchises.
 * Single source of truth for manager names, teams, logos, Sleeper accounts,
 * name resolution, and cross-site credential storage.
 */

export const MANAGERS_LIST = [
  {
    id: 'corey',
    name: 'Corey',
    teamName: 'Team CoreyCash',
    logo: '/logos/corey.png',
    sleeperUsername: 'coreycash',
  },
  {
    id: 'ed',
    name: 'Ed',
    teamName: 'Team RaiderRose510',
    logo: '/logos/ed.png',
    sleeperUsername: 'RaiderRose510',
  },
  {
    id: 'eric',
    name: 'Eric',
    teamName: 'Rebel Scum',
    logo: '/logos/eric.png',
    sleeperUsername: 'XWINGBLUE',
    isCommissioner: true,
  },
  {
    id: 'jeff',
    name: 'Jeff',
    teamName: 'Hickory Huskers',
    logo: '/logos/jeff.png',
    sleeperUsername: 'JeffsSodoMojo',
  },
  {
    id: 'kc',
    name: 'KC',
    teamName: 'Shortbus Superstars',
    logo: '/logos/kc.png',
    sleeperUsername: 'Wangieii',
  },
  {
    id: 'marcus',
    name: 'Marcus',
    teamName: 'Team Killa MC',
    logo: '/logos/marcus.png',
    sleeperUsername: 'KillaMC',
  },
  {
    id: 'mike_f',
    name: 'Mike F.',
    teamName: 'Stars & Stripes',
    logo: '/logos/mike-f.png',
    sleeperUsername: 'mikef5630',
  },
  {
    id: 'mike_m',
    name: 'Mike M.',
    teamName: 'Moore Better',
    logo: '/logos/mike-m.png',
    sleeperUsername: 'iammichael2u',
  },
  {
    id: 'pam',
    name: 'Pam',
    teamName: 'Team GardenGoddess',
    logo: '/logos/pam.png',
    sleeperUsername: 'GardenGoddess',
  },
  {
    id: 'randy',
    name: 'Randy',
    teamName: 'Generic Football Team',
    logo: '/logos/randy.png',
    sleeperUsername: 'rkelsoscudder',
  },
];

export const VALID_MANAGERS = [
  'Corey',
  'Ed',
  'Eric',
  'Jeff',
  'KC',
  'Marcus',
  'Mike F.',
  'Mike M.',
  'Pam',
  'Randy',
  'The Commissioner',
];

/**
 * Standard dropdown / selection options for forms (Comments, War Room, Admin)
 */
export const MANAGERS_OPTIONS = [
  ...MANAGERS_LIST.map((m) => ({
    value: m.name,
    name: m.name,
    team: m.teamName,
    label: `${m.name} (${m.teamName})`,
    logo: m.logo,
  })),
  {
    value: 'The Commissioner',
    name: 'The Commissioner',
    team: 'Office of the Commish',
    label: 'The Commissioner (Office of the Commish)',
    logo: '/logos/league.png',
  },
];

/**
 * Resolves a manager name string (including dropdown labels or commissioner aliases)
 * to standard canonical details: managerName, authName (for PIN check), teamName, logo.
 */
export function resolveManager(name) {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim();

  if (trimmed.toLowerCase().includes('commissioner')) {
    return {
      managerName: 'The Commissioner',
      authName: 'Eric',
      teamName: 'Office of the Commissioner',
      logo: '/logos/league.png',
    };
  }

  // Find matching manager by start of string or exact name
  const matched = MANAGERS_LIST.find(
    (m) =>
      trimmed.toLowerCase() === m.name.toLowerCase() ||
      trimmed.toLowerCase().startsWith(m.name.toLowerCase()) ||
      trimmed.toLowerCase() === m.teamName.toLowerCase()
  );

  if (!matched) {
    const validMatch = VALID_MANAGERS.find((vm) =>
      trimmed.toLowerCase().startsWith(vm.toLowerCase())
    );
    if (!validMatch) return null;
    return {
      managerName: validMatch,
      authName: validMatch === 'The Commissioner' ? 'Eric' : validMatch,
      teamName: `Team ${validMatch}`,
      logo: '/logos/league.png',
    };
  }

  return {
    managerName: matched.name,
    authName: matched.name,
    teamName: matched.teamName,
    logo: matched.logo,
  };
}

/**
 * Read cached credentials from localStorage and sessionStorage
 */
export function getStoredManagerCredentials() {
  if (typeof window === 'undefined') return { managerName: '', pin: '' };
  try {
    const managerName =
      localStorage.getItem('crffl_manager_name') ||
      sessionStorage.getItem('crffl_manager_name') ||
      sessionStorage.getItem('crffl_auth_manager') ||
      '';
    const pin =
      localStorage.getItem('crffl_manager_pin') ||
      sessionStorage.getItem('crffl_manager_pin') ||
      sessionStorage.getItem('crffl_auth_pin') ||
      '';
    return { managerName, pin };
  } catch {
    return { managerName: '', pin: '' };
  }
}

/**
 * Persist manager credentials across both localStorage (persists on device)
 * and sessionStorage (per session).
 */
export function setStoredManagerCredentials(managerName, pin) {
  if (typeof window === 'undefined') return;
  try {
    const cleanMgr = (managerName || '').trim();
    const cleanPin = (pin || '').trim();
    if (cleanMgr) {
      localStorage.setItem('crffl_manager_name', cleanMgr);
      sessionStorage.setItem('crffl_manager_name', cleanMgr);
    }
    if (cleanPin) {
      localStorage.setItem('crffl_manager_pin', cleanPin);
      sessionStorage.setItem('crffl_manager_pin', cleanPin);
    }
  } catch {
    // storage unavailable
  }
}

/**
 * Clear stored manager credentials from all storage keys
 */
export function clearStoredManagerCredentials() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('crffl_manager_name');
    localStorage.removeItem('crffl_manager_pin');
    sessionStorage.removeItem('crffl_manager_name');
    sessionStorage.removeItem('crffl_manager_pin');
    sessionStorage.removeItem('crffl_auth_manager');
    sessionStorage.removeItem('crffl_auth_pin');
  } catch {
    // storage unavailable
  }
}
