import logging
import os
from pathlib import Path

_LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
_LOG_DIR.mkdir(exist_ok=True)

_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

_formatter = logging.Formatter(
    fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

_console_handler = logging.StreamHandler()
_console_handler.setFormatter(_formatter)

_file_handler = logging.FileHandler(_LOG_DIR / "playtactix.log")
_file_handler.setFormatter(_formatter)

_root = logging.getLogger("playtactix")
_root.setLevel(_LOG_LEVEL)
_root.addHandler(_console_handler)
_root.addHandler(_file_handler)
_root.propagate = False


def get_logger(name: str) -> logging.Logger:
    return _root.getChild(name)

def clear_log() -> None:
    _file_handler.stream.truncate(0)
    _file_handler.stream.seek(0)
    _root.info("Log cleared — new data download started")