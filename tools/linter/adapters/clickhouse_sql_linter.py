from __future__ import annotations

import argparse
import concurrent.futures
import dataclasses
import enum
import json
import logging
import os
import subprocess
import sys
import time
from typing import Any, BinaryIO


LINTER_CODE = "CLICKHOUSE"
IS_WINDOWS: bool = os.name == "nt"


def eprint(*args: Any, **kwargs: Any) -> None:
    """Print to stderr."""
    print(*args, file=sys.stderr, flush=True, **kwargs)



@dataclasses.dataclass(frozen=True)
class LintMessage:
    """A lint message defined by https://docs.rs/lintrunner/latest/lintrunner/lint_message/struct.LintMessage.html."""

    path: str | None
    line: int | None
    char: int | None
    code: str
    name: str
    original: str | None
    replacement: str | None
    description: str | None

    def asdict(self) -> dict[str, Any]:
        return dataclasses.asdict(self)

    def display(self) -> None:
        """Print to stdout for lintrunner to consume."""
        print(json.dumps(self.asdict()), flush=True)


def as_posix(name: str) -> str:
    return name.replace("\\", "/") if IS_WINDOWS else name


def _run_command(
    args: list[str],
    *,
    timeout: int | None,
    stdin: BinaryIO | None,
    input: bytes | None,
    check: bool,
    cwd: os.PathLike[Any] | None,
) -> subprocess.CompletedProcess[bytes]:
    logging.debug("$ %s", " ".join(args))
    start_time = time.monotonic()
    try:
        if input is not None:
            return subprocess.run(
                args,
                capture_output=True,
                shell=False,
                input=input,
                timeout=timeout,
                check=check,
                cwd=cwd,
            )

        return subprocess.run(
            args,
            stdin=stdin,
            capture_output=True,
            shell=False,
            timeout=timeout,
            check=check,
            cwd=cwd,
        )
    finally:
        end_time = time.monotonic()
        logging.debug("took %dms", (end_time - start_time) * 1000)


def run_command(
    args: list[str],
    *,
    retries: int = 0,
    timeout: int | None = None,
    stdin: BinaryIO | None = None,
    input: bytes | None = None,
    check: bool = False,
    cwd: os.PathLike[Any] | None = None,
) -> subprocess.CompletedProcess[bytes]:
    remaining_retries = retries
    while True:
        try:
            return _run_command(
                args, timeout=timeout, stdin=stdin, input=input, check=check, cwd=cwd
            )
        except subprocess.TimeoutExpired as err:
            if remaining_retries == 0:
                raise err
            remaining_retries -= 1
            logging.warning(
                "(%s/%s) Retrying because command failed with: %r",
                retries - remaining_retries,
                retries,
                err,
            )
            time.sleep(1)


def add_default_options(parser: argparse.ArgumentParser) -> None:
    """Add default options to a parser.

    This should be called the last in the chain of add_argument calls.
    """
    parser.add_argument(
        "--retries",
        type=int,
        default=3,
        help="number of times to retry if the linter times out.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="verbose logging",
    )
    parser.add_argument(
        "filenames",
        nargs="+",
        help="paths to lint",
    )


# def explain_rule(code: str) -> str:
#     proc = run_command(
#         ["clickhouse", "rule", "--output-format=json", code],
#         check=True,
#     )
#     rule = json.loads(str(proc.stdout, "utf-8").strip())
#     return f"\n{rule['linter']}: {rule['summary']}"


def format_lint_message(
    message: str, code: str, rules: dict[str, str], show_disable: bool
) -> str:
    if rules:
        message += f".\n{rules.get(code) or ''}"
    message += (
        ".\nSee https://clickhouse.com/docs/en/operations/utilities/clickhouse-format"
    )
    if show_disable:
        message += f".\n\nTo disable, use `  # noqa: {code}`"
    return message


def check_file_for_fixes(
    filename: str,
    *,
    config: str | None,
    retries: int,
    timeout: int,
) -> list[LintMessage]:
    try:
        with open(filename, "rb") as f:
            original = f.read()
        with open(filename, "rb") as f:
            proc_fix = run_command(
                [
                    sys.executable,
                    "clickhouse-format",
                    "--query",
                    '"',
                    filename,
                    '"',
                ],
                stdin=f,
                retries=retries,
                timeout=timeout,
                check=True,
            )
    except (OSError, subprocess.CalledProcessError) as err:
        return [
            LintMessage(
                path=None,
                line=None,
                char=None,
                code=LINTER_CODE,
                name="command-failed",
                original=None,
                replacement=None,
                description=(
                    f"Failed due to {err.__class__.__name__}:\n{err}"
                    if not isinstance(err, subprocess.CalledProcessError)
                    else (
                        f"COMMAND (exit code {err.returncode})\n"
                        f"{' '.join(as_posix(x) for x in err.cmd)}\n\n"
                        f"STDERR\n{err.stderr.decode('utf-8').strip() or '(empty)'}\n\n"
                        f"STDOUT\n{err.stdout.decode('utf-8').strip() or '(empty)'}"
                    )
                ),
            )
        ]

    replacement = proc_fix.stdout
    if original == replacement:
        return []

    return [
        LintMessage(
            path=filename,
            name="format",
            description="Run `lintrunner -a` to apply this patch.",
            line=None,
            char=None,
            code=LINTER_CODE,
            original=original.decode("utf-8"),
            replacement=replacement.decode("utf-8"),
        )
    ]


def main() -> None:
    parser = argparse.ArgumentParser(
        description=f"Clickhouse format linter. Linter code: {LINTER_CODE}. Use with CLICKHOUSE-FIX to auto-fix issues.",
        fromfile_prefix_chars="@",
    )

    add_default_options(parser)
    args = parser.parse_args()

    logging.basicConfig(
        format="<%(threadName)s:%(levelname)s> %(message)s",
        level=(
            logging.NOTSET
            if args.verbose
            else logging.DEBUG if len(args.filenames) < 1000 else logging.INFO
        ),
        stream=sys.stderr,
    )

    #trying this here since having issues with init_command'
    run_command(
                [
                    sys.executable,
                    '-m',
                    'pip',
                    'install',
                    'clickhouse',
                ],
                retries=0,
                timeout=0,
                check=True,
            )
    # run_command(["python3 -m pip install clickhouse"])             

    with concurrent.futures.ThreadPoolExecutor(
        max_workers=os.cpu_count(),
        thread_name_prefix="Thread",
    ) as executor:
        futures = {
            executor.submit(
                check_file_for_fixes,
                path,
                config='',
                retries=0,
                timeout=90,
            ): path
            for path in args.filenames
        }
        for future in concurrent.futures.as_completed(futures):
            try:
                for lint_message in future.result():
                    lint_message.display()
            except Exception:  # Catch all exceptions for lintrunner
                logging.critical('Failed at "%s".', futures[future])
                raise


if __name__ == "__main__":
    main()
