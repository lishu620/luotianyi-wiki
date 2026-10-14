#!/usr/bin/env python
"""
远程执行辅助脚本（基于 paramiko）。

凭据从 <repo>/.local/deploy/server.json 读取，避免在命令行里反复出现密码。

用法:
    py scripts/deploy/remote.py info                       # 打印服务器基础信息
    py scripts/deploy/remote.py run "<shell command>"      # 执行命令并流式输出
    py scripts/deploy/remote.py put <本地路径> <远端路径>    # 上传文件
    py scripts/deploy/remote.py putdir <本地目录> <远端目录>  # 递归上传目录
    py scripts/deploy/remote.py get <远端路径> <本地路径>    # 下载文件
    py scripts/deploy/remote.py getdir <远端目录> <本地目录>  # 递归下载目录

可选参数:
    --config <文件>  指定凭据文件，默认 .local/deploy/server.json
    --timeout <秒>   命令超时，默认 1800
"""

from __future__ import annotations

import json
import os
import posixpath
import stat
import sys
import time
from pathlib import Path

import paramiko

REPO_ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = REPO_ROOT / ".local" / "deploy" / "server.json"


def load_config(path: Path | None = None) -> dict:
    config_path = path or CONFIG_PATH
    if not config_path.is_absolute():
        config_path = REPO_ROOT / config_path
    if not config_path.exists():
        raise SystemExit(f"缺少凭据文件: {config_path}")
    return json.loads(config_path.read_text(encoding="utf-8"))


def connect(config: dict) -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=config["host"],
        port=int(config.get("port", 22)),
        username=config["user"],
        password=config.get("password"),
        timeout=30,
        banner_timeout=30,
        auth_timeout=30,
        allow_agent=False,
        look_for_keys=False,
    )
    return client


def run_command(client: paramiko.SSHClient, command: str, timeout: int) -> int:
    # 非交互登录，保证 PATH 与 apt 行为稳定
    wrapped = f"export DEBIAN_FRONTEND=noninteractive; bash -lc {shell_quote(command)}"
    stdin, stdout, stderr = client.exec_command(wrapped, timeout=timeout)
    stdin.close()

    channel = stdout.channel
    channel.settimeout(1.0)

    while True:
        if channel.recv_ready():
            sys.stdout.write(channel.recv(65536).decode("utf-8", "replace"))
            sys.stdout.flush()
            continue

        if channel.recv_stderr_ready():
            sys.stderr.write(channel.recv_stderr(65536).decode("utf-8", "replace"))
            sys.stderr.flush()
            continue

        if channel.exit_status_ready():
            break

        time.sleep(0.05)

    # 收尾：把剩余缓冲读干净
    while channel.recv_ready():
        sys.stdout.write(channel.recv(65536).decode("utf-8", "replace"))
    while channel.recv_stderr_ready():
        sys.stderr.write(channel.recv_stderr(65536).decode("utf-8", "replace"))

    return channel.recv_exit_status()


def shell_quote(value: str) -> str:
    return "'" + value.replace("'", "'\"'\"'") + "'"


def put_file(client: paramiko.SSHClient, local: str, remote: str) -> None:
    sftp = client.open_sftp()
    try:
        remote_dir = posixpath.dirname(remote)
        if remote_dir:
            ensure_remote_dir(sftp, remote_dir)
        sftp.put(local, remote)
        print(f"已上传 {local} -> {remote}")
    finally:
        sftp.close()


def ensure_remote_dir(sftp: paramiko.SFTPClient, path: str) -> None:
    parts = [p for p in path.split("/") if p]
    current = ""
    for part in parts:
        current += "/" + part
        try:
            sftp.stat(current)
        except IOError:
            sftp.mkdir(current)


def get_file(client: paramiko.SSHClient, remote: str, local: str) -> None:
    local_path = Path(local)
    if local_path.parent != Path(""):
        local_path.parent.mkdir(parents=True, exist_ok=True)
    sftp = client.open_sftp()
    try:
        sftp.get(remote, local)
        print(f"已下载 {remote} -> {local}")
    finally:
        sftp.close()


def get_dir(client: paramiko.SSHClient, remote_dir: str, local_dir: str, sftp: paramiko.SFTPClient | None = None) -> None:
    owns_sftp = sftp is None
    sftp = sftp or client.open_sftp()
    try:
        local_root = Path(local_dir)
        local_root.mkdir(parents=True, exist_ok=True)
        for entry in sorted(sftp.listdir_attr(remote_dir), key=lambda a: a.filename):
            remote_path = posixpath.join(remote_dir, entry.filename)
            local_path = local_root / entry.filename
            if stat.S_ISDIR(entry.st_mode):
                get_dir(client, remote_path, str(local_path), sftp)
                continue
            if not stat.S_ISREG(entry.st_mode):
                continue
            sftp.get(remote_path, str(local_path))
            print(f"  {local_path}")
    finally:
        if owns_sftp:
            sftp.close()


def put_dir(client: paramiko.SSHClient, local_dir: str, remote_dir: str, sftp: paramiko.SFTPClient | None = None) -> None:
    owns_sftp = sftp is None
    sftp = sftp or client.open_sftp()
    try:
        ensure_remote_dir(sftp, remote_dir)
        for entry in sorted(os.listdir(local_dir)):
            local_path = os.path.join(local_dir, entry)
            remote_path = posixpath.join(remote_dir, entry)

            if os.path.isdir(local_path):
                put_dir(client, local_path, remote_path, sftp)
                continue

            if not os.path.isfile(local_path):
                continue

            sftp.put(local_path, remote_path)
            mode = os.stat(local_path).st_mode
            if mode & stat.S_IXUSR:
                sftp.chmod(remote_path, 0o755)
            print(f"  {remote_path}")
    finally:
        if owns_sftp:
            sftp.close()


def print_info(client: paramiko.SSHClient) -> None:
    command = (
        "echo '--- os ---'; cat /etc/os-release | head -3; "
        "echo '--- arch/kernel ---'; uname -m; uname -r; "
        "echo '--- cpu/mem ---'; nproc; free -m | head -2; "
        "echo '--- disk ---'; df -h / | tail -1; "
        "echo '--- docker ---'; (docker --version && docker compose version) 2>/dev/null || echo 'docker 未安装'; "
        "echo '--- ports ---'; (ss -tlnp 2>/dev/null | head -20) || true"
    )
    run_command(client, command, 120)


def main() -> int:
    args = [a for a in sys.argv[1:]]
    timeout = 1800
    config_path: Path | None = None

    if "--config" in args:
        idx = args.index("--config")
        config_path = Path(args[idx + 1])
        del args[idx : idx + 2]

    if "--timeout" in args:
        idx = args.index("--timeout")
        timeout = int(args[idx + 1])
        del args[idx : idx + 2]

    if not args:
        print(__doc__)
        return 1

    action = args[0]
    config = load_config(config_path)
    client = connect(config)

    try:
        if action == "info":
            print_info(client)
            return 0

        if action == "run":
            if len(args) < 2:
                print("缺少命令参数")
                return 1
            code = run_command(client, args[1], timeout)
            print(f"\n[exit code: {code}]")
            return code

        if action == "put":
            put_file(client, args[1], args[2])
            return 0

        if action == "putdir":
            print(f"上传目录 {args[1]} -> {args[2]}")
            put_dir(client, args[1], args[2])
            return 0

        if action == "get":
            get_file(client, args[1], args[2])
            return 0

        if action == "getdir":
            print(f"下载目录 {args[1]} -> {args[2]}")
            get_dir(client, args[1], args[2])
            return 0

        print(f"未知操作: {action}")
        return 1
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
