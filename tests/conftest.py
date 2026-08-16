import pytest


def pytest_addoption(parser):
    parser.addoption(
        "--label",
        action="store",
        default="manual",
        help="Label stored with match download timing results.",
    )
    parser.addoption(
        "--start",
        action="store",
        type=int,
        default=10,
        help="Start frame used by route timing tests.",
    )
    parser.addoption(
        "--end",
        action="store",
        type=int,
        default=110,
        help="End frame used by route timing tests.",
    )


@pytest.fixture
def label(request):
    return request.config.getoption("--label")


@pytest.fixture
def start_frame(request):
    return request.config.getoption("--start")


@pytest.fixture
def end_frame(request):
    return request.config.getoption("--end")