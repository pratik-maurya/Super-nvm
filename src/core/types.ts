export interface NodeVersion {
  version: string;
  isCurrent: boolean;
  isDefault: boolean;
  raw: string;
  architecture?: string;
  path?: string;
  npmVersion?: string;
}

export interface RemoteRelease {
  version: string;
  date: string;
  lts: string | false;
  npm?: string;
  security?: boolean;
  isInstalled?: boolean;
}

export interface NvmInfo {
  nvmVersion: string;
  currentVersion: string | null;
  defaultVersion: string | null;
  operatingMode: string;
  nvmPath: string;
  installsPath: string;
  installedVersions: NodeVersion[];
  isNvmInstalled?: boolean;
}

export interface ProjectVersionInfo {
  source: '.nvmrc' | '.node-version' | 'package.json' | null;
  requiredVersion: string | null;
  rawSpec: string | null;
  matchesCurrent: boolean;
}

export interface OperationLog {
  type: 'stdout' | 'stderr' | 'info' | 'error' | 'success';
  message: string;
  timestamp: number;
}

export interface GlobalPackageInfo {
  name: string;
  version: string;
}

export interface VersionStorageDetail {
  version: string;
  sizeBytes: number;
  formattedSize: string;
  packageCount: number;
}

export interface StorageInfo {
  versions: VersionStorageDetail[];
  cacheSizeBytes: number;
  formattedCacheSize: string;
  totalSizeBytes: number;
  formattedTotalSize: string;
}

export interface MigrationResult {
  success: boolean;
  migrated: string[];
  failed: string[];
  message: string;
}

