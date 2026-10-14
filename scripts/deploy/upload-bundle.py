#!/usr/bin/env python
"""
把 .local/deploy/bundle 上传到服务器。

用法:
    py scripts/deploy/upload-bundle.py
    py scripts/deploy/upload-bundle.py --remote-dir /home/mlishu/luotianyi-wiki
"""

from __future__ import annotations

import argparse
import os
import posixpath
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from remote import connect, ensure_remote_dir, load_config  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_BUNDLE = REPO_ROOT / ".local" / "deploy" / "bundle"


def upload_tree(sftp, local_dir: Path, remote_dir: str) -> tuple[int, int]:
    ensure_remote_dir(sftp, remote_dir)
    files = 0
    total_bytes = 0

    for root, dirs, filenames in os.walk(local_dir):
        dirs.sort()
        relative = Path(root).relative_to(local_dir)
        current_remote = posixpath.join(remote_dir, relative.as_posix()) if relative.as_posix() != "." else remote_dir
        ensure_remote_dir(sftp, current_remote)

        for name in sorted(filenames):
            local_path = Path(root) / name
            remote_path = posixpath.join(current_remote, name)
            size = local_path.stat().st_size
            sftp.put(str(local_path), remote_path)
            files += 1
            total_bytes += size
            if files % 25 == 0:
                print(f"  ... 已上传 {files} 个文件（{total_bytes / 1024 / 1024:.1f} MB）")

    return files, total_bytes


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundle", default=str(DEFAULT_BUNDLE))
    parser.add_argument("--remote-dir", default="/home/mlishu/luotianyi-wiki")
    parser.add_argument("--clean", action="store_true", help="上传前先清空远端目录内容")
    args = parser.parse_args()

    bundle = Path(args.bundle).resolve()
    if not bundle.exists():
        print(f"部署包不存在: {bundle}\n请先执行 scripts/deploy/build-bundle.ps1")
        return 1

    client = connect(load_config())
    try:
        sftp = client.open_sftp()
        try:
            if args.clean:
                print(f"清理远端目录 {args.remote_dir}")
                try:
                    for entry in sftp.listdir_attr(args.remote_dir):
                        target = posixpath.join(args.remote_dir, entry.filename)
                        if entry.st_mode & 0o40000:
                            sftp.rmdir(target)
                        else:
                            sftp.remove(target)
                except IOError:
                    pass

            print(f"上传 {bundle} -> {args.remote_dir}")
            files, total = upload_tree(sftp, bundle, args.remote_dir)
            print(f"完成：{files} 个文件，共 {total / 1024 / 1024:.2f} MB")
        finally:
            sftp.close()
    finally:
        client.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
