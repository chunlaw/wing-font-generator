from fontTools.fontBuilder import FontBuilder

from wingfont.cli import apply_release_names, set_family_name, _auto_fit_descent


def _font(copyright, designer, license):
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder([".notdef"])
    fb.setupCharacterMap({})
    fb.setupNameTable({"copyright": copyright, "familyName": "X", "styleName": "Regular",
                       "uniqueFontIdentifier": "2.004;ADBO;X", "trademark": "Source is a trademark of Adobe",
                       "designer": designer, "licenseDescription": license})
    fb.setupHorizontalMetrics({".notdef": (500, 0)})
    fb.setupHorizontalHeader()
    fb.setupOS2(achVendID="ADBO")
    fb.setupHead()
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
    lines = _n(f, 0)[:-1].split(". ")
    assert lines[0].startswith("Copyright ") and "The Wing Font Project Authors (https://" in lines[0]
    assert lines[1:] == ["Copyright 2014-2021 Adobe, with Reserved Font Name 'Source'",
                         "Copyright 2022 The Noto Project Authors"]
    assert _n(f, 7) is None  # base notice for another mark removed
    assert _n(f, 6) == "X-Regular"
    assert _n(f, 9) == "Ryoko NISHIZUKA 西塚涼子; Wing Font (annotations)"
    assert f["name"].getName(9, 1, 0, 0) is None  # CJK can't go in Mac-Roman
    assert _n(f, 3) == "2.004;WING;X" and f["OS/2"].achVendID == "WING"
    assert _n(f, 14) == "https://openfontlicense.org"


def test_overrides_and_non_ofl_license_untouched():
    f = _font("(c) Base", "D", "Proprietary")
    apply_release_names(f, _font("(c) Anno", "A", "Proprietary"),
                        copyright_line="Copyright {year} Me", vendor_id="ABCD", trademark="TM")
    assert _n(f, 0).split(". ")[0].endswith(" Me")
    assert f["OS/2"].achVendID == "ABCD" and _n(f, 7) == "TM"
    assert _n(f, 13) == "Proprietary"


def test_font_version():
    from wingfont.cli import set_font_version
    f = _font("(c) Base", "D", "Proprietary")
    f["name"].setName("Version 2.004;hotconv", 5, 3, 1, 0x409)
    set_font_version(f, "1.000")
    assert _n(f, 5) == "Version 1.000"
    assert f["head"].fontRevision == 1.0
    assert _n(f, 3) == "1.000;ADBO;X"


def test_family_name_full_name_and_no_stale_typographic_names():
    f = _font("(c) Base", "D", "Proprietary")
    for i, v in ((4, "Noto Sans HK"), (16, "Noto Sans HK"), (17, "Thin"), (25, "NotoSansHK")):
        f["name"].setName(v, i, 3, 1, 0x409)
    set_family_name(f, "Wing Sans Yue Jyutping")
    assert _n(f, 1) == "Wing Sans Yue Jyutping"
    assert _n(f, 4) == "Wing Sans Yue Jyutping Regular"
    assert _n(f, 16) is None and _n(f, 17) is None and _n(f, 25) is None
    assert "\n" not in _n(f, 0)


def test_descent_fit_leaves_typo_without_use_typo_metrics():
    f = _font("(c) Base", "D", "Proprietary")
    f["hhea"].descent, f["OS/2"].usWinDescent, f["OS/2"].sTypoDescender = -288, 288, -120
    _auto_fit_descent(f, {"min_y": -129})  # fullwidth Q tail: -149 with margin
    assert f["OS/2"].sTypoDescender == -120 and f["OS/2"].usWinDescent == 288
    f["OS/2"].fsSelection |= 1 << 7
    _auto_fit_descent(f, {"min_y": -129})
    assert f["OS/2"].sTypoDescender == -149


def test_provenance_note_is_its_own_sentence():
    from wingfont.cli import tag_wing_font_provenance
    f = _font("(c) Base", "D", "Proprietary")
    f["name"].setName("Dr. Ken Lunde (project architect)", 10, 3, 1, 0x409)
    tag_wing_font_provenance(f)
    tag_wing_font_provenance(f)
    assert _n(f, 10) == "Dr. Ken Lunde (project architect). Annotations added via Wing Font"
