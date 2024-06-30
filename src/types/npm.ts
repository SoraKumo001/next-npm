export interface NpmObject {
  package: Package;
  score: Score;
  searchScore: number;
  flags?: Flags;
}

export interface NpmPackagesType {
  objects: NpmObject[];
  total: number;
  time: string;
}

export interface Flags {
  unstable: boolean;
}

export interface Package {
  name: string;
  scope: string;
  version: string;
  description: string;
  keywords?: string[];
  date: string;
  links: Links;
  author?: Author;
  publisher: Publisher;
  maintainers: Publisher[];
}

export interface Author {
  name: string;
  email?: string;
  username?: string;
}

export interface Links {
  npm: string;
  homepage?: string;
  repository?: string;
  bugs?: string;
}

export interface Publisher {
  username: string;
  email: string;
}

export interface Score {
  final: number;
  detail: Detail;
}

export interface Detail {
  quality: number;
  popularity: number;
  maintenance: number;
}

export type NpmUserType = {
  scope: {
    type: string;
    name: string;
    parent: {
      name: string;
      avatars: {
        small: string;
        medium: string;
        large: string;
      };
      resource: {
        githubLegacy: boolean;
        twitterLegacy: boolean;
        github: string;
        twitter: string;
        fullname: string;
      };
    };
    created: string;
    updated: string;
    urls: {
      detail: string;
      refresh: string;
      teams: string;
      packages: string;
      addPackage: null;
    };
    id: number;
    account: null;
    resource: {
      githubLegacy: boolean;
      twitterLegacy: boolean;
      github: string;
      twitter: string;
      fullname: string;
    };
  };
  orgs: {
    total: number;
    objects: [];
  };
  packages: {
    total: number;
    objects: {
      id: number;
      name: string;
      private: boolean;
      publish_requires_tfa: null;
      settings: null;
      created: {
        ts: number;
        rel: string;
      };
      updated: {
        ts: number;
        rel: string;
      };
      is_high_impact: boolean;
      freeze_status: null;
      description: string;
      maintainers: string[];
      "dist-tags": {
        latest: string;
      };
      lastPublish: {
        maintainer: string;
        time: string;
        formattedTime: string;
      };
      types: {
        typescript: {
          bundled: string;
        };
      };
      publisher: {
        name: string;
        avatars: object;
      };
      date: {
        ts: number;
        rel: string;
      };
      version: string;
    }[];
    urls: {
      next: string;
    };
  };
  pagination: {
    perPage: number;
    page: number;
  };
  isAccountLinkEnabledForUser: boolean;
  user: null;
  auditLogEnabled: boolean;
  userEmailVerified: null;
  csrftoken: string;
  notifications: [];
};
