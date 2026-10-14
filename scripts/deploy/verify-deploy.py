#!/usr/bin/env python3
"""
在服务器上运行的全站部署校验脚本。

用法:
    python3 verify-deploy.py https://luotianyi.wiki
    python3 verify-deploy.py http://127.0.0.1:8081 admin luotianyi2026

校验内容: 静态页面 / 接口连通 / Meilisearch 索引重建 / 中文与拼音检索 /
          筛选与排序 / 外链分组 / JWT 鉴权 / 404 处理
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

PASS = 'PASS'
FAIL = 'FAIL'
failures = 0


def check(label: str, condition: bool, detail: str = '') -> None:
    global failures
    mark = PASS if condition else FAIL
    if not condition:
        failures += 1
    print(f'  [{mark}] {label}' + (f'  -> {detail}' if detail else ''))


def request(method: str, url: str, body: dict | None = None, token: str | None = None, timeout: int = 30):
    data = json.dumps(body).encode('utf-8') if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Accept', 'application/json, text/html;q=0.9')
    # Cloudflare 的 Bot 防护会拦截默认的 Python-urllib UA，这里伪装成浏览器
    req.add_header(
        'User-Agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
        '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    )
    if data is not None:
        req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = resp.read().decode('utf-8', 'replace')
            return resp.status, payload
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode('utf-8', 'replace')
    except Exception as exc:  # noqa: BLE001
        return 0, str(exc)


def api(method: str, base: str, path: str, body=None, token=None):
    status, payload = request(method, base + path, body, token)
    try:
        parsed = json.loads(payload)
    except Exception:  # noqa: BLE001
        parsed = None
    return status, parsed, payload


def data_of(body) -> dict:
    """稳健地取出统一响应信封里的 data，Cloudflare 错误页等情况返回空字典。"""
    if isinstance(body, dict):
        value = body.get('data')
        if isinstance(value, dict):
            return value
        if isinstance(value, list):
            return {'__list__': value}
    return {}


def list_of(body) -> list:
    if isinstance(body, dict) and isinstance(body.get('data'), list):
        return body['data']
    return []


def main() -> int:
    base = (sys.argv[1] if len(sys.argv) > 1 else 'https://luotianyi.wiki').rstrip('/')
    username = sys.argv[2] if len(sys.argv) > 2 else 'admin'
    password = sys.argv[3] if len(sys.argv) > 3 else 'luotianyi2026'

    print(f'校验目标: {base}')
    print()

    # ---------------------------------------------------------- 静态页面
    print('1) 前端静态页面')
    status, html = request('GET', base + '/')
    check('首页返回 200', status == 200, f'HTTP {status}')
    if status != 200:
        print('    —— 响应片段 ——')
        print('    ' + html[:400].replace('\n', '\n    '))
    check('返回的是 SPA 页面', '<div id="app">' in html, f'长度 {len(html)}')
    check('标题包含站点名', '洛天依' in html)

    status, _ = request('GET', base + '/songs')
    check('history 路由回退 (/songs)', status == 200, f'HTTP {status}')

    # ---------------------------------------------------------- 接口连通
    print()
    print('2) 接口连通')
    status, body, raw = api('GET', base, '/api/stats/overview')
    overview = data_of(body)
    check('GET /api/stats/overview', status == 200 and overview, f'HTTP {status}')
    check('歌曲数 > 0', overview.get('songCount', 0) > 0, f"songCount={overview.get('songCount')}")
    check('外链数 > 0', overview.get('linkCount', 0) > 0, f"linkCount={overview.get('linkCount')}")

    status, body, _ = api('GET', base, '/api/songs?pageSize=3')
    songs_page = data_of(body)
    check('GET /api/songs', status == 200 and songs_page.get('total', 0) > 0,
          f"total={songs_page.get('total')}")

    status, body, _ = api('GET', base, '/api/profile')
    sections = list_of(body)
    check('GET /api/profile', status == 200 and len(sections) >= 6, f'sections={len(sections)}')

    status, body, _ = api('GET', base, '/api/links/grouped')
    groups = list_of(body)
    check('GET /api/links/grouped', status == 200 and len(groups) > 0, f'groups={len(groups)}')

    # ---------------------------------------------------------- 鉴权
    print()
    print('3) 鉴权')
    status, body, _ = api('POST', base, '/api/auth/login', {'username': username, 'password': password})
    token = data_of(body).get('accessToken')
    check('管理员登录', token is not None, f'HTTP {status}')

    status, _, _ = api('POST', base, '/api/auth/login', {'username': username, 'password': 'wrong-password'})
    check('错误密码被拒 (401)', status == 401, f'HTTP {status}')

    status, _, _ = api('GET', base, '/api/admin/songs')
    check('无令牌访问后台被拒 (401)', status == 401, f'HTTP {status}')

    status, body, _ = api('GET', base, '/api/songs/11111111-1111-1111-1111-111111111111')
    check('不存在的歌曲返回 404', status == 404, f'HTTP {status}')

    if not token:
        print()
        print('登录失败，跳过索引重建与检索校验')
        return 1

    # ---------------------------------------------------------- 索引重建
    print()
    print('4) 搜索索引')
    status, body, _ = api('POST', base, '/api/search/reindex', token=token)
    reindex = data_of(body)
    check('重建索引', status in (200, 201), f'HTTP {status}')
    check('索引写入成功', reindex.get('meilisearchReady') is True, json.dumps(reindex, ensure_ascii=False))
    time.sleep(3)

    status, body, _ = api('GET', base, '/api/search/status')
    search_status = data_of(body)
    check('搜索引擎为 Meilisearch', search_status.get('meilisearchReady') is True)
    check('歌曲已入索引', search_status.get('songsIndexed', 0) > 0, f"songs={search_status.get('songsIndexed')}")
    check('外链已入索引', search_status.get('linksIndexed', 0) > 0, f"links={search_status.get('linksIndexed')}")

    # ---------------------------------------------------------- 检索
    print()
    print('5) 检索能力')

    def search(path: str):
        status_, body_, _ = api('GET', base, path)
        if status_ == 200 and body_ and body_.get('data'):
            return body_['data']
        return None

    data = search('/api/search?q=' + urllib.parse.quote('权御天下'))
    check('中文检索「权御天下」', bool(data and data.get('songs')), f"engine={data.get('engine') if data else '?'}")
    check('检索走 Meilisearch', bool(data and data.get('engine') == 'meilisearch'),
          f"engine={data.get('engine') if data else '?'}")

    data = search('/api/search/songs?q=quanyu')
    check('拼音检索「quanyu」', bool(data and data.get('total', 0) > 0), f"total={data.get('total') if data else '?'}")

    data = search('/api/search/songs?tag=' + urllib.parse.quote('古风'))
    check('标签筛选「古风」', bool(data and data.get('total', 0) > 0), f"total={data.get('total') if data else '?'}")

    data = search('/api/search/songs?year=2015&featured=true')
    check('年份+代表作筛选', bool(data and data.get('total', 0) > 0), f"total={data.get('total') if data else '?'}")

    data = search('/api/search/songs?sortBy=playCount&order=DESC&pageSize=3')
    top = data['hits'][0]['title'] if data and data.get('hits') else '?'
    check('按播放量排序', bool(data and data.get('hits')), f'Top1={top}')

    data = search('/api/search/links?q=' + urllib.parse.quote('百科'))
    check('外链检索「百科」', bool(data and data.get('total', 0) > 0), f"total={data.get('total') if data else '?'}")

    # ---------------------------------------------------------- 后台写读
    print()
    print('6) 后台数据读写（带令牌）')
    status, body, _ = api('GET', base, '/api/admin/songs?pageSize=100', token=token)
    admin_songs = data_of(body)
    check('后台歌曲列表', status == 200 and admin_songs.get('total', 0) > 0, f"total={admin_songs.get('total')}")

    status, body, _ = api('GET', base, '/api/admin/links?pageSize=100', token=token)
    admin_links = data_of(body)
    check('后台外链列表', status == 200 and admin_links.get('total', 0) > 0, f"total={admin_links.get('total')}")

    # ---------------------------------------------------------- 汇总
    print()
    if failures == 0:
        print('全部校验通过 ✓')
        return 0

    print(f'存在 {failures} 项失败 ✗')
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
