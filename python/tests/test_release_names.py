from fontTools.fontBuilder import FontBuilder

from wingfont.cli import apply_release_names


def _font(copyright, designer, license):
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder([".notdef"])
    fb.setupCharacterMap({})
    fb.setupNameTable({"copyright": copyright, "familyName": "X", "styleName": "Regular",
                       "uniqueFontIdentifier": "2.004;ADBO;X", "trademark": "Source is a trademark of Adobe",
                       "designer": designer, "licenseDescription": license})
    fb.setupHorizontalMetrics({".notdef": (500, 0)})
    fb.setupOS2(achVendID="ADBO")
    return fb.font


def _n(f, i):
    r = f["name"].getName(i, 3, 1, 0x409)
    return r.toUnicode() if r else None


def test_defaults_keep_upstream_and_are_idempotent():
    ofl = "SIL Open Font License, Version 1.1"
    f = _font("Copyright 2014-2021 Adobe, with Reserved Font Name 'Source'.", "Ryoko NISHIZUKA 西塚涼子", ofl)
    anno = _font("Copyright 2022 The Noto Project Authors", "Monotype", ofl)
    for _ in range(2):
        apply_release_names(f, anno)
    lines = _n(f, 0).split("\n")
    assert lines[0].startswith("Copyright ") and "The Wing Font Project Authors (https://" in lines[0]
    assert lines[1:] == ["Copyright 2014-2021 Adobe, with Reserved Font Name 'Source'.",
                         "Copyright 2022 The Noto Project Authors"]
    assert _n(f, 7) == "Wing Font"
    assert _n(f, 6) == "X-Regular"
    assert _n(f, 9) == "Ryoko NISHIZUKA 西塚涼子; Wing Font (annotations)"
    assert f["name"].getName(9, 1, 0, 0) is None  # CJK can't go in Mac-Roman
    assert _n(f, 3) == "2.004;WING;X" and f["OS/2"].achVendID == "WING"
    assert _n(f, 14) == "https://openfontlicense.org"


def test_overrides_and_non_ofl_license_untouched():
    f = _font("(c) Base", "D", "Proprietary")
    apply_release_names(f, _font("(c) Anno", "A", "Proprietary"),
                        copyright_line="Copyright {year} Me", vendor_id="ABCD", trademark="TM")
    assert _n(f, 0).split("\n")[0].endswith(" Me")
    assert f["OS/2"].achVendID == "ABCD" and _n(f, 7) == "TM"
    assert _n(f, 13) == "Proprietary"
