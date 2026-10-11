import { basename, dirname } from './path';

export interface DirNode {
  type: 'dir';
  children: Map<string, FsNode>;
  mtime: number;
}

export interface FileNode {
  type: 'file';
  content: string;
  mtime: number;
}

export type FsNode = DirNode | FileNode;

export type FsError = 'missing' | 'exists' | 'notDir' | 'isDir' | 'notEmpty' | 'noParent';

/** File system in memoria. Tutti i percorsi passati qui sono assoluti e normalizzati. */
export class VirtualFs {
  readonly root: DirNode;

  constructor(private readonly now: () => number) {
    this.root = { type: 'dir', children: new Map(), mtime: now() };
  }

  get(path: string): FsNode | undefined {
    let node: FsNode = this.root;
    for (const part of path.split('/').filter(Boolean)) {
      if (node.type !== 'dir') return undefined;
      const child = node.children.get(part);
      if (!child) return undefined;
      node = child;
    }
    return node;
  }

  isDir(path: string): boolean {
    return this.get(path)?.type === 'dir';
  }

  private parentDir(path: string): DirNode | FsError {
    const parent = this.get(dirname(path));
    if (!parent) return 'noParent';
    if (parent.type !== 'dir') return 'notDir';
    return parent;
  }

  mkdir(path: string, parents = false): FsError | null {
    if (path === '/') return parents ? null : 'exists';
    const existing = this.get(path);
    if (existing) return parents && existing.type === 'dir' ? null : 'exists';
    if (parents && !this.get(dirname(path))) {
      const error = this.mkdir(dirname(path), true);
      if (error) return error;
    }
    const parent = this.parentDir(path);
    if (typeof parent === 'string') return parent;
    parent.children.set(basename(path), { type: 'dir', children: new Map(), mtime: this.now() });
    parent.mtime = this.now();
    return null;
  }

  writeFile(path: string, content: string, append = false): FsError | null {
    const existing = this.get(path);
    if (existing?.type === 'dir') return 'isDir';
    if (existing) {
      existing.content = append ? existing.content + content : content;
      existing.mtime = this.now();
      return null;
    }
    const parent = this.parentDir(path);
    if (typeof parent === 'string') return parent;
    parent.children.set(basename(path), { type: 'file', content, mtime: this.now() });
    parent.mtime = this.now();
    return null;
  }

  /** Crea un file vuoto o aggiorna la data di uno esistente. */
  touch(path: string): FsError | null {
    const existing = this.get(path);
    if (existing) {
      existing.mtime = this.now();
      return null;
    }
    return this.writeFile(path, '');
  }

  remove(path: string, recursive = false): FsError | null {
    const node = this.get(path);
    if (!node || path === '/') return 'missing';
    if (node.type === 'dir' && !recursive) return 'isDir';
    const parent = this.get(dirname(path));
    if (parent?.type !== 'dir') return 'missing';
    parent.children.delete(basename(path));
    parent.mtime = this.now();
    return null;
  }

  removeEmptyDir(path: string): FsError | null {
    const node = this.get(path);
    if (!node) return 'missing';
    if (node.type !== 'dir') return 'notDir';
    if (node.children.size > 0) return 'notEmpty';
    return this.remove(path, true);
  }

  /** Nomi contenuti in una cartella, in ordine alfabetico (come `ls`). */
  list(path: string): string[] {
    const node = this.get(path);
    if (node?.type !== 'dir') return [];
    return [...node.children.keys()].sort((a, b) =>
      a.replace(/^\./, '').localeCompare(b.replace(/^\./, ''), 'en'),
    );
  }

  /** Copia profonda di un nodo (per `cp -r`). */
  clone(node: FsNode): FsNode {
    if (node.type === 'file') return { ...node, mtime: this.now() };
    return {
      type: 'dir',
      mtime: this.now(),
      children: new Map([...node.children].map(([name, child]) => [name, this.clone(child)])),
    };
  }

  /** Inserisce un nodo già pronto in un percorso (per `cp` e `mv`). */
  place(path: string, node: FsNode): FsError | null {
    const parent = this.parentDir(path);
    if (typeof parent === 'string') return parent;
    parent.children.set(basename(path), node);
    parent.mtime = this.now();
    return null;
  }
}
