import type { Actor } from './fs';
import { HOME, USER } from './path';

/** Utenti del computer simulato. Lo studente fa parte del gruppo sudo, come il primo utente di Ubuntu. */
export const USERS: Record<string, { uid: number; gid: number; groups: string[]; home: string }> = {
  root: { uid: 0, gid: 0, groups: ['root'], home: '/root' },
  [USER]: { uid: 1000, gid: 1000, groups: [USER, 'sudo'], home: HOME },
};

export const GROUP_IDS: Record<string, number> = { root: 0, sudo: 27, shadow: 42, [USER]: 1000 };

export function actorFor(user: string): Actor {
  return { user, groups: USERS[user]?.groups ?? [user] };
}

export const STUDENT = actorFor(USER);

export const DEFAULT_PATH = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';

/** Comandi interni della shell: non sono programmi su disco, quindi non dipendono da PATH e sudo non li trova. */
export const BUILTINS = new Set(['cd', 'echo', 'pwd', 'export', 'unset', 'history', 'help', 'kill']);

export const PASSWD = `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
${USER}:x:1000:1000:Studente:${HOME}:/bin/bash
`;

export const GROUP = `root:x:0:
sudo:x:27:${USER}
shadow:x:42:
${USER}:x:1000:
`;

// --- Processi ------------------------------------------------------------------------

export interface Process {
  pid: number;
  user: string;
  command: string;
  tty: string;
  stat: string;
  cpu: number;
  mem: number;
  vsz: number;
  rss: number;
  start: string;
  time: string;
  /** Ignora il segnale TERM: si ferma solo con KILL (kill -9). */
  ignoreTerm?: boolean;
}

/** PID della shell dello studente. */
export const SHELL_PID = 1234;

/** Processi presenti all'accensione (valori indicativi, come su un piccolo server Ubuntu). */
export function defaultProcesses(): Process[] {
  return [
    { pid: 1, user: 'root', command: '/sbin/init', tty: '?', stat: 'Ss', cpu: 0, mem: 0.3, vsz: 22132, rss: 13184, start: '09:58', time: '0:01' },
    { pid: 211, user: 'root', command: '/usr/lib/systemd/systemd-journald', tty: '?', stat: 'Ss', cpu: 0, mem: 0.4, vsz: 50324, rss: 16640, start: '09:58', time: '0:00' },
    { pid: 498, user: 'root', command: '/usr/sbin/cron -f -P', tty: '?', stat: 'Ss', cpu: 0, mem: 0.1, vsz: 6696, rss: 2688, start: '09:58', time: '0:00' },
    { pid: 512, user: 'root', command: '/usr/bin/containerd', tty: '?', stat: 'Ssl', cpu: 0.1, mem: 1.2, vsz: 1876528, rss: 48512, start: '09:58', time: '0:02' },
    { pid: 640, user: 'root', command: '/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock', tty: '?', stat: 'Ssl', cpu: 0.2, mem: 2.1, vsz: 2283764, rss: 86016, start: '09:58', time: '0:03' },
    { pid: SHELL_PID, user: USER, command: '-bash', tty: 'pts/0', stat: 'Ss', cpu: 0, mem: 0.1, vsz: 8820, rss: 5376, start: '10:00', time: '0:00' },
  ];
}

// --- Pacchetti (apt) -----------------------------------------------------------------

/** Pacchetti installabili nel simulatore. Versioni e dimensioni sono indicative (Ubuntu 24.04). */
export const PACKAGES: Record<string, { version: string; section: string; download: string; installed: string }> = {
  tree: { version: '2.1.1-2ubuntu3', section: 'noble/universe', download: '47.1 kB', installed: '111 kB' },
  htop: { version: '3.3.0-4build1', section: 'noble/main', download: '171 kB', installed: '434 kB' },
};

// --- Memoria (free) ------------------------------------------------------------------

/** Valori in KiB, come `free` (indicativi: un piccolo server da 4 GB). */
export const MEMORY = {
  mem: { total: 4026532, used: 1258291, free: 1153433, shared: 12288, cache: 1782579, available: 2768240 },
  swap: { total: 2097148, used: 0, free: 2097148 },
};
