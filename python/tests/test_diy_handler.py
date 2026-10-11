"""Tests for diy_handler — two-column DIY CSV parsing, PUA assignment,
typed-input derivation, and the sidecar.

Run: ``python -m pytest tests/test_diy_handler.py`` or
``python tests/test_diy_handler.py`` (plain runner fallback)."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from wingfont.diy_handler import (  # noqa: E402
    DIY_PUA_BASE,
    DIY_PUA_CAPACITY,
    DiyInventoryError,
    assign_pua,
    build_diy_inventory,
    load_diy_rows,
)


def _fw(s):
    return "".join(chr(ord(c) + 0xFEE0) for c in s)


def _write(tmp, name, text):
    p = os.path.join(tmp, name)
    with open(p, "w", encoding="utf-8") as fh:
        fh.write(text)
    return p


def test_one_column_shorthand_derives_fullwidth(tmp_path):
    p = _write(tmp_path, "A.csv", "zaa1\n")
    rows = load_diy_rows(p)
    assert rows == [(_fw("zaa1"), "zaa1")]


def test_two_column_explicit_input(tmp_path):
    p = _write(tmp_path, "A.csv", "ABC,zaa1\n")
    rows = load_diy_rows(p)
    assert rows == [("ABC", "zaa1")]


def test_empty_input_means_pua_only(tmp_path):
    # ',ザー' → annotation present, no typed route
    p = _write(tmp_path, "A.csv", ",zaa1\n")
    rows = load_diy_rows(p)
    assert rows == [(None, "zaa1")]


def test_nonascii_annotation_has_no_derived_input(tmp_path):
    # one-column Katakana → can't derive a full-width input
    p = _write(tmp_path, "A.csv", "ザー\n")
    rows = load_diy_rows(p)
    assert rows == [(None, "ザー")]


def test_comments_blanks_and_overlong_skipped(tmp_path):
    p = _write(
        tmp_path, "A.csv",
        "# header\n\nzaa1\n" + ("x" * 40) + "\n",
    )
    rows = load_diy_rows(p)
    assert rows == [(_fw("zaa1"), "zaa1")]


def test_build_inventory_pua_and_inputs(tmp_path):
    p = _write(tmp_path, "A.csv", "ABC,zaa1\nhoeng1\n")
    inv = build_diy_inventory(p)
    # annotations numbered in CSV row order → zaa1, then hoeng1
    assert inv.pua_map == {"zaa1": DIY_PUA_BASE, "hoeng1": DIY_PUA_BASE + 1}
    # inputs: hoeng1 derived full-width, zaa1 explicit 'ABC'
    assert (_fw("hoeng1"), DIY_PUA_BASE + 1) in inv.inputs
    assert ("ABC", DIY_PUA_BASE) in inv.inputs
    assert len(inv.inputs) == 2


def test_multiple_inputs_one_annotation(tmp_path):
    p = _write(tmp_path, "A.csv", "ABC,zaa1\nXYZ,zaa1\n")
    inv = build_diy_inventory(p)
    cp = inv.pua_map["zaa1"]
    assert sorted(inv.inputs) == sorted([("ABC", cp), ("XYZ", cp)])


def test_pua_only_row_has_no_input(tmp_path):
    p = _write(tmp_path, "A.csv", ",ザー\nzaa1\n")
    inv = build_diy_inventory(p)
    assert set(inv.pua_map) == {"ザー", "zaa1"}
    # only zaa1 has a typed input; ザー is PUA-only
    assert [i[0] for i in inv.inputs] == [_fw("zaa1")]


def test_assign_pua_capacity_guard():
    too_many = [f"s{i}" for i in range(DIY_PUA_CAPACITY + 1)]
    try:
        assign_pua(too_many)
    except DiyInventoryError:
        pass
    else:
        raise AssertionError("expected DiyInventoryError on overflow")


def test_empty_file_yields_empty(tmp_path):
    p = _write(tmp_path, "A.csv", "# only comments\n\n")
    inv = build_diy_inventory(p)
    assert inv.pua_map == {} and inv.inputs == []


if __name__ == "__main__":
    import tempfile
    import traceback

    class _TmpPath:
        def __init__(self, d):
            self._d = d

        def __fspath__(self):
            return self._d

        def __str__(self):
            return self._d

    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failed = 0
    for t in tests:
        with tempfile.TemporaryDirectory() as d:
            try:
                if t.__code__.co_argcount == 1:
                    t(_TmpPath(d))
                else:
                    t()
                print(f"PASS {t.__name__}")
            except Exception:
                failed += 1
                print(f"FAIL {t.__name__}")
                traceback.print_exc()
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    sys.exit(1 if failed else 0)
