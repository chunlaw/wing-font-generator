from wingfont.fetch import DIY_URL, MAPPINGS_URL, url_for


def test_routes_by_name():
    assert url_for("cantonese/lshk.diy-annotation.csv")[0] == f"{DIY_URL}/cantonese/lshk.diy-annotation.csv"
    assert url_for("cantonese/canto-lshk.csv")[0] == f"{MAPPINGS_URL}/cantonese/canto-lshk.csv"
    assert url_for("NotoSansHK-VariableFont_wght.ttf")[1] == 1024
