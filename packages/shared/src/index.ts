/**
 * @luotianyi/shared
 * 前后端共享的领域模型、枚举与常量。
 * 该文件不依赖任何运行时库，可同时被 NestJS(CommonJS) 与 Vue(Vite) 消费。
 */

/* ------------------------------------------------------------------ */
/* 通用响应包装                                                        */
/* ------------------------------------------------------------------ */

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  timestamp?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ------------------------------------------------------------------ */
/* 歌曲                                                                */
/* ------------------------------------------------------------------ */

export const VOCAL_TYPES = ['solo', 'chorus', 'duet', 'ensemble'] as const;
export type VocalType = (typeof VOCAL_TYPES)[number];

export const VOCAL_TYPE_LABELS: Record<VocalType, string> = {
  solo: '独唱',
  chorus: '合唱',
  duet: '对唱',
  ensemble: '群唱',
};

export const SONG_STATUSES = ['published', 'draft'] as const;
export type SongStatus = (typeof SONG_STATUSES)[number];

export const SONG_STATUS_LABELS: Record<SongStatus, string> = {
  published: '已发布',
  draft: '草稿',
};

/** 歌曲排序字段白名单 */
export const SONG_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'releaseDate',
  'playCount',
  'title',
] as const;
export type SongSortField = (typeof SONG_SORT_FIELDS)[number];

export const SORT_ORDERS = ['ASC', 'DESC'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export interface Song {
  id: string;
  title: string;
  /** 标题拼音，便于拼音检索 */
  titlePinyin: string | null;
  aliases: string[];
  /** P主 / 投稿者 */
  producer: string | null;
  lyricist: string | null;
  composer: string | null;
  arranger: string | null;
  vocalType: VocalType;
  /** 除洛天依外的其他演唱者 */
  featuredSingers: string[];
  releaseDate: string | null;
  releaseYear: number | null;
  /** 时长（秒） */
  duration: number | null;
  playCount: number;
  tags: string[];
  description: string | null;
  lyrics: string | null;
  coverUrl: string | null;
  bilibiliUrl: string | null;
  youtubeUrl: string | null;
  neteaseUrl: string | null;
  qqMusicUrl: string | null;
  /** 是否为代表作 / 名曲 */
  isFeatured: boolean;
  status: SongStatus;
  sortOrder: number;
  /** 创建者（投稿人）ID */
  ownerId: string | null;
  ownerName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SongQuery {
  /** 关键词（走后端 Meilisearch 优先） */
  keyword?: string;
  year?: number;
  tag?: string;
  vocalType?: VocalType;
  producer?: string;
  featured?: boolean;
  status?: SongStatus;
  sortBy?: SongSortField;
  order?: SortOrder;
  page?: number;
  pageSize?: number;
}

/* ------------------------------------------------------------------ */
/* 同好外链                                                            */
/* ------------------------------------------------------------------ */

export const LINK_CATEGORIES = [
  'wiki',
  'video',
  'music',
  'community',
  'tool',
  'art',
  'other',
] as const;
export type LinkCategory = (typeof LINK_CATEGORIES)[number];

export const LINK_CATEGORY_LABELS: Record<LinkCategory, string> = {
  wiki: '百科资料',
  video: '视频平台',
  music: '音乐平台',
  community: '同好社区',
  tool: '实用工具',
  art: '同人创作',
  other: '其他站点',
};

export const LINK_CATEGORY_ICONS: Record<LinkCategory, string> = {
  wiki: 'Notebook',
  video: 'VideoCamera',
  music: 'Headset',
  community: 'ChatDotRound',
  tool: 'Tools',
  art: 'Picture',
  other: 'Link',
};

export interface ExternalLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: LinkCategory;
  iconUrl: string | null;
  tags: string[];
  /** 是否为官方/强烈推荐站点 */
  recommended: boolean;
  sortOrder: number;
  clicks: number;
  status: SongStatus;
  /** 创建者 ID */
  ownerId: string | null;
  ownerName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinkQuery {
  keyword?: string;
  category?: LinkCategory;
  recommended?: boolean;
  status?: SongStatus;
  page?: number;
  pageSize?: number;
}

/* ------------------------------------------------------------------ */
/* 中V群聊                                                             */
/* ------------------------------------------------------------------ */

export const COMMUNITY_GROUP_SECTIONS = [
  'concert',
  'expo',
  'regional',
  'goods',
  'creative',
  'other',
] as const;
export type CommunityGroupSection = (typeof COMMUNITY_GROUP_SECTIONS)[number];

export const COMMUNITY_GROUP_SECTION_LABELS: Record<CommunityGroupSection, string> = {
  concert: '演唱会交流群',
  expo: '同人展 / 线下活动',
  regional: '各地同好地方群',
  goods: '周边 / 专辑 / 娃娃群',
  creative: '创作交流群',
  other: '其他综合群',
};

export const COMMUNITY_GROUP_SECTION_ICONS: Record<CommunityGroupSection, string> = {
  concert: 'Microphone',
  expo: 'Ticket',
  regional: 'Location',
  goods: 'ShoppingBag',
  creative: 'EditPen',
  other: 'MoreFilled',
};

export const COMMUNITY_GROUP_SECTION_HINTS: Record<CommunityGroupSection, string> = {
  concert: '演唱会相关群聊，团建、海底捞等活动请关注相关临时群与地方群',
  expo: '圈内小型漫展与线下活动，按举办时间排序',
  regional: '以省会城市为主，按省份首字母排序；各省份首位为地方大群',
  goods: '同人周边、专辑、娃衣、谷子等定制与蹲蹲群',
  creative: '新人创作、乐器合奏、百科协作等创作向交流群',
  other: '音游、cos、wota 艺、兴趣同好等综合向群聊',
};

/** 活跃度标记：★★ > ★ > ① > ② > ③ > ④ */
export const COMMUNITY_GROUP_LEVELS = ['★★', '★', '①', '②', '③', '④'] as const;
export type CommunityGroupLevel = (typeof COMMUNITY_GROUP_LEVELS)[number];

export interface CommunityGroup {
  id: string;
  /** 群名 / 地区名 */
  name: string;
  /** QQ 群号 */
  number: string;
  /** 活跃度标记 */
  level: string | null;
  /** 备注（同人展为举办日期） */
  note: string | null;
  /** 所属栏目 */
  /** 创建者 ID */
  ownerId: string | null;
  ownerName?: string | null;
  section: CommunityGroupSection;
  sortOrder: number;
  status: SongStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityGroupQuery {
  keyword?: string;
  section?: CommunityGroupSection;
  status?: SongStatus;
  page?: number;
  pageSize?: number;
}

/* ------------------------------------------------------------------ */
/* 介绍页分节                                                          */
/* ------------------------------------------------------------------ */

export const PROFILE_SLUGS = [
  'hero',
  'basic',
  'story',
  'voice',
  'gallery',
  'achievement',
] as const;
export type ProfileSlug = (typeof PROFILE_SLUGS)[number];

export const PROFILE_SLUG_LABELS: Record<ProfileSlug, string> = {
  hero: '首屏主视觉',
  basic: '基础资料',
  story: '角色历程',
  voice: '音源与声库',
  gallery: '形象图鉴',
  achievement: '荣誉与影响',
};

/** 形象图鉴条目 */
export interface GalleryItem {
  name: string;
  imageUrl: string;
  author?: string;
  description?: string;
}

/** 基础资料键值对 */
export interface FactItem {
  label: string;
  value: string;
}

/** 分节的结构化数据，按 slug 解释其字段 */
export interface ProfileSectionData {
  facts?: FactItem[];
  gallery?: GalleryItem[];
  timeline?: { year: string; title: string; description?: string }[];
  stats?: FactItem[];
  [key: string]: unknown;
}

export interface ProfileSection {
  id: string;
  slug: ProfileSlug;
  title: string;
  subtitle: string | null;
  /** 分节主文案，支持 Markdown 子集（标题/列表/粗体/段落） */
  content: string;
  data: ProfileSectionData | null;
  icon: string | null;
  sortOrder: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* 统计                                                                */
/* ------------------------------------------------------------------ */

export interface StatsOverview {
  songCount: number;
  publishedSongCount: number;
  featuredCount: number;
  linkCount: number;
  totalPlayCount: number;
  tagCount: number;
  earliestYear: number | null;
  latestYear: number | null;
}

export interface YearStat {
  year: number;
  songCount: number;
  playCount: number;
}

export interface TagStat {
  tag: string;
  count: number;
}

export interface TopSongStat {
  id: string;
  title: string;
  producer: string | null;
  playCount: number;
  releaseYear: number | null;
}

export interface CategoryStat {
  category: LinkCategory;
  count: number;
}

export interface StatsDashboard {
  overview: StatsOverview;
  byYear: YearStat[];
  topSongs: TopSongStat[];
  tags: TagStat[];
  linkCategories: CategoryStat[];
}

/* ------------------------------------------------------------------ */
/* 搜索                                                                */
/* ------------------------------------------------------------------ */

export interface SearchHit<T> {
  item: T;
  /** Meilisearch 匹配得分，降级检索时缺失 */
  score?: number;
  highlights?: Record<string, string>;
}

export interface SearchResponse<T> {
  hits: T[];
  total: number;
  /** 本次检索实际使用的引擎 */
  engine: 'meilisearch' | 'postgres';
  processingTimeMs?: number;
  query: string;
}

/* ------------------------------------------------------------------ */
/* CN 扩列条                                                           */
/* ------------------------------------------------------------------ */

export const CN_GENDERS = ['female', 'male', 'other', 'secret'] as const;
export type CnGender = (typeof CN_GENDERS)[number];

export const CN_GENDER_LABELS: Record<CnGender, string> = {
  female: '女',
  male: '男',
  other: '其他',
  secret: '保密',
};

export const CN_SORTS = ['latest', 'active', 'random', 'heart'] as const;
export type CnSort = (typeof CN_SORTS)[number];

export const CN_SORT_LABELS: Record<CnSort, string> = {
  latest: '最新',
  active: '活跃',
  random: '随机',
  heart: '心动推荐',
};

/** 用途：先把个人介绍做好，再决定要不要扩列（也可以只展示） */
export const CN_PURPOSES = ['display', 'friends'] as const;
export type CnPurpose = (typeof CN_PURPOSES)[number];

export const CN_PURPOSE_LABELS: Record<CnPurpose, string> = {
  display: '仅展示',
  friends: '想扩列',
};

export const CN_PURPOSE_HINTS: Record<CnPurpose, string> = {
  display: '只展示个人介绍，不参与扩列（不展示“心动”按钮）',
  friends: '愿意通过扩列认识同好（可与他人互相心动解锁联系方式）',
};

/** 个人介绍卡款式（卡面配色） */
export const CN_CARD_STYLES = [
  'classic',
  'sakura',
  'midnight',
  'mint',
  'sunset',
  'mono',
] as const;
export type CnCardStyle = (typeof CN_CARD_STYLES)[number];

export const CN_CARD_STYLE_LABELS: Record<CnCardStyle, string> = {
  classic: '天依蓝',
  sakura: '樱花粉',
  midnight: '午夜星',
  mint: '薄荷绿',
  sunset: '落日橙',
  mono: '极简白',
};

export const CN_CONTACT_KEYS = ['qq', 'wechat', 'bilibili', 'weibo', 'email'] as const;
export type CnContactKey = (typeof CN_CONTACT_KEYS)[number];

export const CN_CONTACT_LABELS: Record<CnContactKey, string> = {
  qq: 'QQ',
  wechat: '微信',
  bilibili: 'B站',
  weibo: '微博',
  email: '邮箱',
};

export type CnContact = Partial<Record<CnContactKey, string>>;

/** 扩列条状态 */
export const CN_STATUSES = ['visible', 'hidden'] as const;
export type CnStatus = (typeof CN_STATUSES)[number];

export const CN_STATUS_LABELS: Record<CnStatus, string> = {
  visible: '展示中',
  hidden: '已隐藏',
};

export interface CnProfile {
  id: string;
  userId: string;
  /** 账号名（用于展示归属） */
  authorUsername: string | null;
  /** 圈名 */
  cn: string;
  avatarUrl: string | null;
  /** B 站 UID（填写后可一键同步 B 站头像） */
  bilibiliUid: string | null;
  /** 个人介绍卡款式 */
  cardStyle: CnCardStyle;
  gender: CnGender;
  age: number | null;
  region: string | null;
  personality: string | null;
  declaration: string | null;
  interests: string[];
  lookingFor: string[];
  /** 用途：仅展示 / 想扩列 */
  purpose: CnPurpose;
  /** 仅在已解锁时返回内容（互相心动 / 本人 / 有 cn.manage） */
  contacts: CnContact;
  /** 联系方式是否已解锁 */
  contactsVisible: boolean;
  status: CnStatus;
  viewCount: number;
  likeCount: number;
  /** 我是否已对他心动 */
  likedByMe: boolean;
  /** 是否互相心动 */
  mutualWithMe: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CnProfileQuery {
  keyword?: string;
  interest?: string;
  region?: string;
  gender?: CnGender;
  /** 用途筛选：仅展示 / 想扩列 */
  purpose?: CnPurpose;
  sort?: CnSort;
  page?: number;
  pageSize?: number;
}

export interface CnProfilePayload {
  cn: string;
  avatarUrl?: string | null;
  bilibiliUid?: string | null;
  cardStyle?: CnCardStyle;
  gender?: CnGender;
  age?: number | null;
  region?: string | null;
  personality?: string | null;
  declaration?: string | null;
  interests?: string[];
  lookingFor?: string[];
  /** 用途：仅展示 / 想扩列 */
  purpose?: CnPurpose;
  contacts?: CnContact;
  status?: CnStatus;
}

export interface CnFilters {
  interests: { value: string; count: number }[];
  regions: string[];
}

/** B 站账号公开信息（用于同步头像） */
export interface CnBilibiliProfile {
  mid: string;
  name: string | null;
  avatarUrl: string;
  spaceUrl: string;
}

/* ------------------------------------------------------------------ */
/* 权限与角色                                                          */
/* ------------------------------------------------------------------ */

export const PERMISSION_MODULES = [
  'song',
  'link',
  'group',
  'cn',
  'profile',
  'user',
  'role',
  'system',
] as const;
export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export const PERMISSION_MODULE_LABELS: Record<PermissionModule, string> = {
  song: '歌曲',
  link: '外链站点',
  group: '群聊',
  cn: 'CN 扩列条',
  profile: '介绍页',
  user: '用户',
  role: '角色权限',
  system: '系统',
};

export interface PermissionDef {
  key: string;
  module: PermissionModule;
  label: string;
  /** own = 仅作用于自己创建的内容；any = 作用于全部内容 */
  scope?: 'own' | 'any';
}

export const PERMISSIONS: PermissionDef[] = [
  { key: 'song.create', module: 'song', label: '投稿歌曲' },
  { key: 'song.update.own', module: 'song', label: '修改自己的歌曲', scope: 'own' },
  { key: 'song.update.any', module: 'song', label: '修改任意歌曲', scope: 'any' },
  { key: 'song.delete', module: 'song', label: '删除歌曲' },
  { key: 'song.approve', module: 'song', label: '审批歌曲修改申请' },
  { key: 'link.create', module: 'link', label: '提交外链站点' },
  { key: 'link.update.own', module: 'link', label: '修改自己的外链', scope: 'own' },
  { key: 'link.update.any', module: 'link', label: '修改任意外链', scope: 'any' },
  { key: 'link.delete', module: 'link', label: '删除外链' },
  { key: 'group.create', module: 'group', label: '提交群聊' },
  { key: 'group.update.own', module: 'group', label: '修改自己的群聊', scope: 'own' },
  { key: 'group.update.any', module: 'group', label: '修改任意群聊', scope: 'any' },
  { key: 'group.delete', module: 'group', label: '删除群聊' },
  { key: 'cn.manage', module: 'cn', label: 'CN 扩列条管理' },
  { key: 'profile.update', module: 'profile', label: '编辑介绍页' },
  { key: 'user.manage', module: 'user', label: '用户管理' },
  { key: 'role.manage', module: 'role', label: '角色与权限管理' },
  { key: 'system.reindex', module: 'system', label: '重建搜索索引' },
];

export const ALL_PERMISSIONS: string[] = PERMISSIONS.map((item) => item.key);

/** 通配权限：拥有它即拥有全部权限（内置超级管理员角色） */
export const SUPER_PERMISSION = '*';

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  /** 内置角色：不可删除、不可改名 */
  builtin: boolean;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RolePayload {
  name: string;
  description?: string | null;
  permissions?: string[];
}

/* ------------------------------------------------------------------ */
/* 认证与用户                                                          */
/* ------------------------------------------------------------------ */

export interface AdminUser {
  id: string;
  username: string;
  roleId: string | null;
  roleName: string | null;
  /** 展开后的权限清单；含 '*' 表示全部权限 */
  permissions: string[];
  /** 停用后无法登录 */
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: AdminUser;
}

export interface UserQuery {
  keyword?: string;
  roleId?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
}

export interface UserPayload {
  username: string;
  password?: string;
  roleId?: string | null;
  active?: boolean;
}

/* ------------------------------------------------------------------ */
/* 歌曲修改申请                                                        */
/* ------------------------------------------------------------------ */

export const CHANGE_REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];

export const CHANGE_REQUEST_STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
};

export interface SongChangeRequest {
  id: string;
  songId: string;
  songTitle: string | null;
  requesterId: string;
  requesterName: string | null;
  /** 拟修改的字段 */
  changes: Record<string, unknown>;
  reason: string | null;
  status: ChangeRequestStatus;
  reviewerId: string | null;
  reviewerName: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
