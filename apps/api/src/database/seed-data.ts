import type { CreateLinkDto } from '../modules/links/dto/create-link.dto';
import type { CreateProfileSectionDto } from '../modules/profile/dto/profile.dto';
import type { CreateSongDto } from '../modules/songs/dto/create-song.dto';

/**
 * 示例种子数据。
 *
 * ⚠️ 说明：以下内容为「可运行的示例数据」，用于快速看到完整效果。
 * 其中人物资料与歌曲信息请在后台按官方资料校对后替换，播放量为演示用虚构值。
 */

const biliSearch = (keyword: string) =>
  `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`;

const song = (data: Partial<CreateSongDto> & { title: string }): CreateSongDto => ({
  status: 'published',
  vocalType: 'solo',
  aliases: [],
  tags: [],
  featuredSingers: [],
  playCount: 0,
  isFeatured: false,
  ...data,
});

export const PROFILE_SEED: CreateProfileSectionDto[] = [
  {
    slug: 'hero',
    title: '洛天依',
    subtitle: 'Luo Tianyi · 中国首位中文 VOCALOID 虚拟歌手',
    icon: 'MagicStick',
    sortOrder: 0,
    published: true,
    content: [
      '**洛天依**是 2012 年正式亮相的中文虚拟歌手，也是第一位拥有中文 VOCALOID 声库的角色。',
      '她的声音来自配音演员**山新**，形象由创作者们共同塑造，代表色是被粉丝亲切称为「天依蓝」的 `#66CCFF`。',
      '十余年来，她从一个声库产品成长为中文虚拟歌手文化的标志性存在——数以万计的原创歌曲由创作者为她写下，也把「中文虚拟歌手」这一创作形式推向了更大的舞台。',
    ].join('\n\n'),
    data: {
      stats: [
        { label: '首次亮相', value: '2012.07.12' },
        { label: '代表色', value: '#66CCFF' },
        { label: '音源提供', value: '山新' },
        { label: '所属企划', value: 'Vsinger' },
      ],
    },
  },
  {
    slug: 'basic',
    title: '基础资料',
    subtitle: '角色设定速览',
    icon: 'Postcard',
    sortOrder: 1,
    published: true,
    content:
      '下面的资料来自公开设定与粉丝整理，不同阶段官方设定可能存在差异，欢迎在后台随时修正。',
    data: {
      facts: [
        { label: '中文名', value: '洛天依' },
        { label: '外文名', value: 'Luo Tianyi / ルオ・ティエンイー' },
        { label: '身份', value: '虚拟歌手（VOCALOID / 合成声库角色）' },
        { label: '首次亮相', value: '2012 年 7 月 12 日' },
        { label: '代表色', value: '天依蓝 #66CCFF' },
        { label: '音源提供', value: '山新' },
        { label: '所属企划', value: 'Vsinger（上海禾念）' },
        { label: '生日设定', value: '7 月 12 日' },
        { label: '年龄设定', value: '15 岁' },
        { label: '身高设定', value: '156 cm' },
        { label: '擅长曲风', value: '中文流行 / 古风 / 电子' },
      ],
    },
  },
  {
    slug: 'story',
    title: '角色历程',
    subtitle: '从一个声库到一种文化',
    icon: 'Compass',
    sortOrder: 2,
    published: true,
    content: [
      '洛天依的成长史，几乎就是中文虚拟歌手创作生态的成长史。',
      '',
      '- 她最初只是一个「会唱歌的软件」，创作者们用她写下的第一批量产曲目，让这个角色拥有了人格与温度。',
      '- 随着《普通 DISCO》《权御天下》等作品在网络上广泛传播，"虚拟歌手" 从亚文化小圈层走进了主流视野。',
      '- 如今，她拥有从 VOCALOID 到 AI 合成引擎的多代声库，也频繁出现在演唱会、晚会与主流综艺的舞台上。',
    ].join('\n'),
    data: {
      timeline: [
        {
          year: '2012',
          title: '正式亮相',
          description: '于第八届中国国际动漫游戏博览会（CCG EXPO）首次公开，成为首位中文 VOCALOID 虚拟歌手。',
        },
        {
          year: '2015',
          title: '中文 VOCALOID 的代表曲诞生',
          description: '《普通 DISCO》等作品在网络平台广泛传播，推动中文虚拟歌手进入大众视野。',
        },
        {
          year: '2017',
          title: 'VOCALOID4 中文声库',
          description: '发布新一代中文声库，音色与表现力显著提升，创作生态进一步扩大。',
        },
        {
          year: '2018',
          title: '日语声库与舞台拓展',
          description: '推出日语声库，并在跨年演唱会等大型舞台上与真人歌手同台演出。',
        },
        {
          year: '2022',
          title: '出道十周年',
          description: '十周年纪念活动与系列企划，回顾十年间积累的海量原创作品。',
        },
        {
          year: '2023 至今',
          title: 'AI 声库时代',
          description: '接入 AI 合成声库，在保留经典音色的同时带来更自然的演唱表现。',
        },
      ],
    },
  },
  {
    slug: 'voice',
    title: '音源与声库',
    subtitle: '她是如何"唱"出来的',
    icon: 'Microphone',
    sortOrder: 3,
    published: true,
    content: [
      '虚拟歌手的「声音」由两部分构成：**音源提供者**录制的声音样本，以及**合成引擎**对这些样本的处理与重排。',
      '',
      '洛天依的音源由配音演员**山新**提供。创作者通过编辑器输入音符与歌词、调整滑音与力度，就能让洛天依唱出任意旋律——这也就是"调教"一词的由来。',
      '',
      '### 声库版本',
      '',
      '- **VOCALOID3 中文声库**：最初一代，奠定了洛天依的标志性音色。',
      '- **VOCALOID4 中文声库**：增加音量、力度等参数控制，表现力更强。',
      '- **VOCALOID4 日语声库**：面向日语创作与海外传播。',
      '- **AI 合成声库**：基于深度学习的合成方案，咬字与情感表现更自然。',
    ].join('\n'),
    data: {
      facts: [
        { label: '音源提供', value: '山新' },
        { label: '初代引擎', value: 'VOCALOID3（中文声库）' },
        { label: '常用编辑方式', value: '输入音符 + 歌词后调教参数' },
        { label: '当前支持', value: 'VOCALOID 系列声库与 AI 声库' },
      ],
    },
  },
  {
    slug: 'gallery',
    title: '形象图鉴',
    subtitle: '不同阶段的经典造型',
    icon: 'Picture',
    sortOrder: 4,
    published: true,
    content:
      '形象图鉴支持在后台填写图片地址；未填写图片时会以渐变卡片占位展示名称与说明。',
    data: {
      gallery: [
        {
          name: '初始设定造型',
          imageUrl: '',
          description: '灰白色长发与绿色瞳孔，最深入人心的经典形象。',
        },
        {
          name: '天依蓝主题',
          imageUrl: '',
          description: '代表色 #66CCFF，出现在周边、舞台灯光与粉丝创作中。',
        },
        {
          name: '舞台演出形象',
          imageUrl: '',
          description: '演唱会与晚会舞台使用的全套演出造型。',
        },
        {
          name: '周年纪念造型',
          imageUrl: '',
          description: '周年企划中推出的特别设计。',
        },
      ],
    },
  },
  {
    slug: 'achievement',
    title: '荣誉与影响',
    subtitle: '数据之外的意义',
    icon: 'Trophy',
    sortOrder: 5,
    published: true,
    content: [
      '- 第一位中文 VOCALOID 虚拟歌手，开启中文虚拟歌手创作生态。',
      '- 多首作品成为中文 VOCALOID 的里程碑曲目，长期占据各类盘点榜单。',
      '- 多次登上电视跨年演唱会与大型晚会舞台，实现虚拟形象与真人演出同台。',
      '- 举办线下全息演唱会，让"虚拟歌手演唱会"成为可持续的演出形式。',
      '- 拥有庞大的同人创作社区，涵盖音乐、绘画、小说、翻调与周边制作。',
    ].join('\n'),
    data: {
      stats: [
        { label: '出道年份', value: '2012' },
        { label: '原创曲目量级', value: '以万计' },
        { label: '主要平台', value: '哔哩哔哩 / 网易云音乐 / QQ 音乐' },
      ],
    },
  },
];

export const SONG_SEED: CreateSongDto[] = [
  song({
    title: '普通DISCO',
    titlePinyin: 'putongdisco',
    aliases: ['普通迪斯科'],
    producer: 'ilem',
    vocalType: 'duet',
    featuredSingers: ['言和'],
    releaseYear: 2015,
    duration: 200,
    playCount: 12500000,
    tags: ['电子', '神曲', '传说曲'],
    isFeatured: true,
    description:
      '中文 VOCALOID 的里程碑曲目之一，凭借洗脑的旋律与幽默的表达在网络上广泛传播，长期被视为中文虚拟歌手走向大众的代表作。',
    lyrics: '',
    bilibiliUrl: biliSearch('普通DISCO 洛天依'),
    neteaseUrl: 'https://music.163.com/#/search/m/?s=%E6%99%AE%E9%80%9ADISCO&type=1',
  }),
  song({
    title: '权御天下',
    titlePinyin: 'quanyutianxia',
    producer: 'litterzy',
    releaseYear: 2015,
    duration: 260,
    playCount: 9800000,
    tags: ['古风', '史诗', '战争'],
    isFeatured: true,
    description:
      '气势磅礴的古风作品，将历史叙事与电子编曲结合，是洛天依古风代表作之一，也是各类盘点中高频出现的曲目。',
    bilibiliUrl: biliSearch('权御天下 洛天依'),
  }),
  song({
    title: '达拉崩吧',
    titlePinyin: 'dalabengba',
    producer: 'ilem',
    vocalType: 'duet',
    featuredSingers: ['言和'],
    releaseYear: 2017,
    duration: 232,
    playCount: 8600000,
    tags: ['洗脑', '叙事', '童话'],
    isFeatured: true,
    description:
      '以荒诞童话叙事和超长角色名为特色的作品，节奏明快、歌词密集，是中文虚拟歌手中传播度极高的曲目。',
    bilibiliUrl: biliSearch('达拉崩吧 洛天依'),
  }),
  song({
    title: '世末歌者',
    titlePinyin: 'shimogezhe',
    producer: 'ilem',
    releaseYear: 2014,
    duration: 250,
    playCount: 4200000,
    tags: ['电子', '循环曲', '情绪'],
    description: '旋律循环感强烈、情绪层层推进的作品，是许多听众入坑洛天依的曲目之一。',
    bilibiliUrl: biliSearch('世末歌者 洛天依'),
  }),
  song({
    title: '阴阳先生',
    titlePinyin: 'yinyangxiansheng',
    producer: 'ilem',
    releaseYear: 2014,
    duration: 240,
    playCount: 3100000,
    tags: ['悬疑', '叙事', '中式恐怖'],
    description: '以民间志怪为题材的叙事型作品，氛围营造与段落结构颇具辨识度。',
    bilibiliUrl: biliSearch('阴阳先生 洛天依'),
  }),
  song({
    title: '霜雪千年',
    titlePinyin: 'shuangxueqiannian',
    releaseYear: 2015,
    duration: 275,
    playCount: 5600000,
    tags: ['古风', '唯美', '对唱'],
    description: '古风唯美向作品，旋律细腻、意象清冷，在古风爱好者中流传度很高。',
    bilibiliUrl: biliSearch('霜雪千年 洛天依'),
  }),
  song({
    title: '千年食谱颂',
    titlePinyin: 'qiannanshipusong',
    releaseYear: 2012,
    duration: 210,
    playCount: 2900000,
    tags: ['古风', '美食', '早期经典'],
    description: '洛天依早期高人气作品，以美食为线索串联叙事，是早期中文 VOCALOID 的代表曲之一。',
    bilibiliUrl: biliSearch('千年食谱颂 洛天依'),
  }),
  song({
    title: '干物女weiwei',
    titlePinyin: 'ganwunvweiwei',
    releaseYear: 2012,
    duration: 195,
    playCount: 2400000,
    tags: ['日常', '洗脑', '早期经典'],
    description: '轻快俏皮的日常向曲目，展现了洛天依作为"普通女孩"的一面。',
    bilibiliUrl: biliSearch('干物女weiwei 洛天依'),
  }),
];

export const LINK_SEED: CreateLinkDto[] = [
  {
    title: '萌娘百科 · 洛天依',
    url: 'https://zh.moegirl.org.cn/洛天依',
    description: '中文 ACG 百科，洛天依词条资料详尽，涵盖设定、声库、作品与事件年表。',
    category: 'wiki',
    tags: ['百科', '资料'],
    recommended: true,
    sortOrder: 1,
  },
  {
    title: '百度百科 · 洛天依',
    url: 'https://baike.baidu.com/item/洛天依',
    description: '适合快速了解角色基本信息与主要经历的入门词条。',
    category: 'wiki',
    tags: ['百科'],
    sortOrder: 2,
  },
  {
    title: '中文维基百科 · 洛天依',
    url: 'https://zh.wikipedia.org/wiki/洛天依',
    description: '偏重事件脉络与来源引用，适合做资料交叉核对。',
    category: 'wiki',
    tags: ['百科', '来源'],
    sortOrder: 3,
  },
  {
    title: '萌娘百科 · VOCALOID',
    url: 'https://zh.moegirl.org.cn/VOCALOID',
    description: '了解 VOCALOID 引擎、声库体系与中文虚拟歌手发展脉络的入口。',
    category: 'wiki',
    tags: ['百科', 'VOCALOID'],
    sortOrder: 4,
  },
  {
    title: '哔哩哔哩 · 洛天依',
    url: 'https://search.bilibili.com/all?keyword=洛天依',
    description: '中文虚拟歌手内容最集中的平台，原创曲、翻调、MMD、直播录播一应俱全。',
    category: 'video',
    tags: ['视频', '原创曲'],
    recommended: true,
    sortOrder: 1,
  },
  {
    title: 'AcFun · 洛天依',
    url: 'https://www.acfun.cn/search?keyword=洛天依',
    description: '早期虚拟歌手内容的重要阵地之一，可以找到不少历史投稿。',
    category: 'video',
    tags: ['视频', '历史投稿'],
    sortOrder: 2,
  },
  {
    title: '抖音 · 洛天依',
    url: 'https://www.douyin.com/search/洛天依',
    description: '短视频平台上的洛天依相关内容与二次创作。',
    category: 'video',
    tags: ['短视频'],
    sortOrder: 3,
  },
  {
    title: '网易云音乐 · 洛天依',
    url: 'https://music.163.com/#/search/m/?s=洛天依&type=100',
    description: '搜索洛天依相关歌手与歌单，多数原创曲与翻调作品可在此收听。',
    category: 'music',
    tags: ['音乐', '歌单'],
    recommended: true,
    sortOrder: 1,
  },
  {
    title: 'QQ 音乐 · 洛天依',
    url: 'https://y.qq.com/n/ryqq/search?w=洛天依',
    description: '正版曲库中的洛天依作品，适合想要收藏歌单的听众。',
    category: 'music',
    tags: ['音乐', '正版曲库'],
    sortOrder: 2,
  },
  {
    title: 'VOCALOID 官方网站',
    url: 'https://www.vocaloid.com/',
    description: 'Yamaha 官方 VOCALOID 站点，可查询引擎与声库的官方信息。',
    category: 'tool',
    tags: ['官方', '引擎'],
    sortOrder: 1,
  },
  {
    title: 'Vsinger 官方站点',
    url: 'https://www.vsinger.com/',
    description: '洛天依所属企划 Vsinger 的官方站点，发布新声库、演出与周边资讯。',
    category: 'other',
    tags: ['官方', '企划'],
    recommended: true,
    sortOrder: 1,
  },
  {
    title: '微博 · 洛天依',
    url: 'https://s.weibo.com/weibo?q=洛天依',
    description: '相关超话与实时讨论，适合追踪活动与同人动态。',
    category: 'community',
    tags: ['社交', '同人'],
    sortOrder: 1,
  },
];
