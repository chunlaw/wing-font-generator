"""Wing Font — compose phonetic-annotation fonts from a base font, an
annotation font and a `character,reading` CSV mapping.

CLI:    wing-font -i base.ttf -a anno.ttf -m mapping.csv -o out/prefix
Python: from wingfont.cli import main; main(base_font_file=..., ...)

Kept import-free on purpose: the Pyodide runner times its own lazy imports.
"""

__version__ = "1.2.4"
