"""
word_liga_handler — GSUB rules that collapse a typed Arabic word into
its single composed (annotated) glyph, plus the editing affordances
around it.

Why a different mechanism than the CJK handlers
-----------------------------------------------

For CJK, every character keeps its own glyph and chain context merely
*re-points* each position at a variant (1 codepoint → 1 glyph,
context-disambiguated). Arabic is cursive: letters change shape by
position (init/medi/fina) and join, so the unit build_glyph composes is
the whole WORD — one glyph whose outline is the HarfBuzz-shaped word
with the annotation above. That glyph has no codepoint, so the only way
to reach it is a many-to-one GSUB substitution: Ligature Substitution
(Type 4) from the word's NOMINAL letter glyphs.

Why this works at `ccmp` time: shapers apply `ccmp` *before* the
script-specific joining features (`init`/`medi`/`fina`/`rlig`/`liga`),
i.e. while the buffer still holds the plain cmap glyphs of the typed
letters, in logical order (HarfBuzz reverses RTL runs only after
substitution). So a ligature keyed on the nominal letter sequence fires
reliably, and afterwards the joining features simply find nothing to do
— the composed outline already carries the correct positional forms,
because build_glyph drew it from a real HarfBuzz shape of the base font.

Word-boundary guards
--------------------

A bare ligature matches *anywhere*, including inside longer unmapped
words: with كتاب mapped, the text كتابة would wrongly ligate its first
four letters and strand the ة. GSUB cannot express "not followed by a
letter" directly, so we use the standard blocker-rule idiom — the
ligation lives inside a Chain Context (Type 6) lookup whose rules are,
per word and in this order:

  1. ``[word] lookahead=[Arabic letter/mark]``  → match, do nothing
  2. ``backtrack=[Arabic letter/mark/tatweel] [word]`` → match, do nothing
  3. ``[word]`` → apply the nested ligature at position 0

When a rule matches, the shaper applies its (possibly empty) records
and skips past the matched input — so rule 1/2 firing *consumes* the
mid-word match and rule 3 never sees it. Words are emitted longest
first so a mapped longer word always outranks a mapped prefix of it.

The guard classes deliberately EXCLUDE tatweel (U+0640) from the
lookahead so a trailing kashida can reach the variant-cycling path
below; tatweel IS in the backtrack class (a preceding kashida means
we're mid-word).

Known limitation: a word written with harakat (vowel marks between the
letters) won't match the nominal sequence and simply renders
un-annotated — add fully-vocalised spellings as their own mapping rows
if you need them annotated.

Variant cycling via trailing tatweel
------------------------------------

CJK uses ``<char><digit>`` ligatures for manual variant override.
Digits don't work after Arabic: the bidi algorithm puts them in a
different directional run, and ligatures cannot match across runs. We
use tatweel (ـ U+0640) instead — same script, same run, trivially
typed on Arabic keyboards, and visually self-erasing once the ligature
consumes it. ``<word>ـ`` selects the next reading, ``<word>ـ ـ`` the one
after, cycling modulo the variant count:

    (variant_k, tatweel × m) → variant_(k+m mod N)

Thai (and how it differs from Arabic)
-------------------------------------

Thai words are word-unit entries too — romanization is per word, and a
word is a run of consonants plus stacking vowel/tone mark glyphs that
the ligature matches as ordinary sequence members. Three deliberate
differences from the Arabic strategy:

* **No boundary guards.** Thai running text has NO spaces between
  words, so "block when an adjacent letter exists" would veto every
  match mid-sentence. Like the CJK chain-context, Thai relies on
  longest-match-first rule ordering; a mapped word can in principle
  match across an (invisible) word boundary — the same trade-off CJK
  word disambiguation already accepts.
* **Digit-suffix variant selection, not tatweel.** Thai is LTR, so a
  typed digit stays in the same directional run and the CJK-style
  ``<word><digit>`` ligature works: digit 1–9 picks that variant,
  digit 0 resets to the default. Both ASCII and Thai digits (๑ ๒ …)
  are wired.
* **Components come from bare-font shaping, not cmap.** HarfBuzz's
  Thai shaper rewrites text BEFORE any GSUB lookup: typed SARA AM
  (ำ) becomes NIKHAHIT + SARA AA reordered around tone marks. The
  component sequences are therefore computed by build_glyph against a
  substitution-less copy of the base font (`word_components`) so they
  match what the buffer really contains.

Indic scripts (Devanagari — EXPERIMENTAL)
-----------------------------------------

Indic shapers are syllable machines: HarfBuzz segments the text into
aksharas and applies `ccmp`, `locl`, the basic features (nukt/akhn/
half/cjct/…) AND the presentation features (pres/abvs/blws/psts/haln)
with the per-syllable flag — a match can never cross a syllable
boundary in any of them, so a two-akshara word like घर is un-ligatable
there (empirically verified). What IS applied buffer-globally is the
set of generic horizontal features the default collector enables
without the per-syllable flag — `calt` among them — so Devanagari word
ligation registers under `calt` (WordScript.feature = "calt").

Components for Indic come from component_mode="basic": shaping with
the REAL font with the late-stage features disabled, because by the
time our lookup runs the buffer has been syllable-reordered (pre-base
matras moved: कि is ि-then-क) and conjunct-formed by the font's own
per-syllable GSUB (स्ते). Hindi is space-separated, so the Arabic-style
boundary guards apply (with spacing matras, category Mc, included in
the guard classes), and the digit-suffix variant trigger works with
ASCII and Devanagari numerals.

Caveat, and why this tier is experimental: verified against HarfBuzz
(browsers, Android, Linux, LibreOffice, Java). CoreText and
Uniscribe/DirectWrite implement their own Indic engines and may scope
`calt` per-cluster — unverified there. `calt` is also user-toggleable
in some apps, unlike `ccmp`.

Like the CJK handlers, everything else registers under `ccmp`
(required by spec, applied by every shaper, no user toggle, not
script-suppressed by iWork — see chain_context_handler.py).

Lookup ordering: why we PREPEND instead of append
-------------------------------------------------

Within a shaping stage, lookups apply in LookupList INDEX order — not
feature-registration order. Arabic fonts do real work in their own
`ccmp`: Noto Nastaliq Urdu, for instance, decomposes every dotted
letter into a skeleton + dot-mark pair (ب → BehxSep + OneDotBelowNS)
right there. If our lookups were appended (highest indices), the
buffer would no longer contain the nominal cmap glyphs by the time
they run, and the word match would never fire.

So unlike the CJK handlers, this module inserts its lookups at the
FRONT of the LookupList and bumps every existing lookup reference
(feature records, nested contextual SubstLookupRecords, Extension
subtables, FeatureVariations) by the insertion count. Our word
ligation then runs before the base font's own substitutions; the
source lookups still apply afterwards to everything we didn't consume,
and the composed word glyph isn't in their coverage, so they pass over
it untouched.
"""

import unicodedata

from fontTools.otlLib.builder import (
    ChainContextSubstBuilder,
    ChainContextualRule,
    LigatureSubstBuilder,
)
from fontTools.ttLib import newTable
from fontTools.ttLib.tables import otTables

from mappings.csv_parser import (
    WORD_SCRIPTS,
    get_word_unit_script,
)
from utils import get_glyph_name_by_char, register_feature_lookup, step_timer

# Native digit sets accepted by the digit-suffix variant selection
# path, alongside ASCII 0-9.
NATIVE_DIGITS = (
    "๐๑๒๓๔๕๖๗๘๙",   # Thai
    "०१२३४५६७८९",   # Devanagari
)

# Maximum number of trailing tatweels matched by one variant-cycling
# ligature. A shaper applies each lookup in ONE pass — after
# (v0, tatweel) → v1 fires, matching resumes AFTER v1, so a second
# tatweel would be left dangling rather than cycling again. Emitting
# explicit rules for every tatweel count up to this depth keeps
# "word + m tatweels → variant (k+m) mod N" exact for any m a user
# would plausibly type. 9 matches MAX_CHAR_VARIANTS-1, the deepest a
# cycle could meaningfully go.
MAX_TATWEEL_CYCLE = 9

# Same per-subtable budget rationale as chain_context_handler.py.
RULES_PER_SUBTABLE = 500


def _bump_subst_lookup_records(subtable, lookup_type, k):
    """Add `k` to every nested LookupListIndex inside a (Chain)Context
    or Extension subtable. Other lookup types carry no lookup refs."""
    if lookup_type == 7:  # Extension — recurse into the wrapped subtable
        _bump_subst_lookup_records(
            subtable.ExtSubTable, subtable.ExtensionLookupType, k
        )
        return

    def bump(records):
        for rec in records or []:
            rec.LookupListIndex += k

    if lookup_type == 5:  # Context Substitution
        if subtable.Format == 1:
            for rule_set in subtable.SubRuleSet or []:
                for rule in (rule_set.SubRule if rule_set else []) or []:
                    bump(rule.SubstLookupRecord)
        elif subtable.Format == 2:
            for class_set in subtable.SubClassSet or []:
                for rule in (
                    class_set.SubClassRule if class_set else []
                ) or []:
                    bump(rule.SubstLookupRecord)
        elif subtable.Format == 3:
            bump(subtable.SubstLookupRecord)
    elif lookup_type == 6:  # Chain Context Substitution
        if subtable.Format == 1:
            for rule_set in subtable.ChainSubRuleSet or []:
                for rule in (
                    rule_set.ChainSubRule if rule_set else []
                ) or []:
                    bump(rule.SubstLookupRecord)
        elif subtable.Format == 2:
            for class_set in subtable.ChainSubClassSet or []:
                for rule in (
                    class_set.ChainSubClassRule if class_set else []
                ) or []:
                    bump(rule.SubstLookupRecord)
        elif subtable.Format == 3:
            bump(subtable.SubstLookupRecord)


def _prepend_lookups(gsub, lookups):
    """
    Insert `lookups` at the front of gsub.LookupList and shift every
    existing lookup reference by len(lookups):

      * Feature.LookupListIndex in every FeatureRecord
      * Feature tables inside FeatureVariations substitutions
      * SubstLookupRecord.LookupListIndex nested in contextual lookups
        (Types 5/6, all formats, incl. Extension-wrapped)

    The relative order of the source font's lookups is preserved, so
    its internal behaviour is unchanged — everything just runs AFTER
    the inserted lookups.
    """
    k = len(lookups)
    if k == 0:
        return

    for record in gsub.FeatureList.FeatureRecord:
        record.Feature.LookupListIndex = [
            i + k for i in record.Feature.LookupListIndex
        ]

    feature_variations = getattr(gsub, "FeatureVariations", None)
    if feature_variations:
        for fvr in feature_variations.FeatureVariationRecord or []:
            fts = fvr.FeatureTableSubstitution
            for sub_rec in (
                fts.SubstitutionRecord if fts else []
            ) or []:
                sub_rec.Feature.LookupListIndex = [
                    i + k for i in sub_rec.Feature.LookupListIndex
                ]

    for lookup in gsub.LookupList.Lookup:
        for subtable in lookup.SubTable or []:
            _bump_subst_lookup_records(subtable, lookup.LookupType, k)

    gsub.LookupList.Lookup[0:0] = lookups
    gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)


def _guard_classes(font, behavior):
    """
    Build the (backtrack, lookahead) guard glyph classes for one
    word-unit script, from the font's cmap: every encoded letter (Lo,
    Lm) and combining mark (Mn non-spacing, Mc spacing — Indic matras
    are Mc) inside the script's codepoint ranges.

    The script's variant trigger_char (e.g. Arabic tatweel) goes into
    the BACKTRACK class only: a preceding trigger means mid-word, but
    a FOLLOWING trigger is the user invoking variant cycling and must
    not block the ligation — see the module docstring.
    """
    cmap = font.getBestCmap() or {}
    trigger_cp = ord(behavior.trigger_char) if behavior.trigger_char else None
    back: list[str] = []
    ahead: list[str] = []
    for cp, glyph_name in cmap.items():
        if not any(lo <= cp <= hi for lo, hi in behavior.ranges):
            continue
        if not isinstance(glyph_name, str):
            continue
        if cp == trigger_cp:
            back.append(glyph_name)
            continue
        cat = unicodedata.category(chr(cp))
        if cat in ("Lo", "Lm", "Mn", "Mc"):
            back.append(glyph_name)
            ahead.append(glyph_name)
    # De-duplicate (multiple codepoints can map to one glyph) while
    # keeping deterministic order for reproducible builds.
    return sorted(set(back)), sorted(set(ahead))


def _resolve_select_digits(font):
    """{variant_index: [glyph, ...]} for the digit-suffix path —
    ASCII 0-9 plus the native digit sets of every supported script,
    skipping whichever aren't in the font."""
    digits: dict = {}
    for i in range(10):
        for ch in (str(i), *(d[i] for d in NATIVE_DIGITS)):
            name = get_glyph_name_by_char(font, ch)
            if name:
                digits.setdefault(i, []).append(name)
    return digits


def _emit_trigger_cycle(cycle_builder, index_to_glyph, trigger_glyph):
    """Trailing-trigger cycling (Arabic tatweel & friends):
    (v_k, trigger × m) → v_(k+m mod N), with explicit rules for EVERY
    trigger count up to MAX_TATWEEL_CYCLE — a lookup applies in one
    pass, so "v0 + 2 triggers" must be its own ligature rather than
    relying on the 1-trigger rule firing twice. Returns the rule
    count."""
    n_var = len(index_to_glyph)
    emitted = 0
    if not trigger_glyph or n_var <= 1:
        return emitted
    for k, variant_glyph in index_to_glyph.items():
        for m in range(1, MAX_TATWEEL_CYCLE + 1):
            target = index_to_glyph.get((k + m) % n_var)
            if target:
                cycle_builder.ligatures[
                    (variant_glyph,) + (trigger_glyph,) * m
                ] = target
                emitted += 1
    return emitted


def _emit_digit_select(
    cycle_builder, index_to_glyph, default_glyph, select_digits
):
    """Digit-suffix selection (Thai & other LTR word-unit scripts):
    <word>1..9 picks that variant, <word>0 resets to the default —
    mirrors the CJK convention. Like the CJK path, it's one shaping
    pass: changing a chosen variant means REPLACING the digit, not
    appending another. Returns the rule count."""
    emitted = 0
    if not select_digits or len(index_to_glyph) <= 1:
        return emitted
    for variant_glyph in index_to_glyph.values():
        for i, digit_glyphs in select_digits.items():
            target = default_glyph if i == 0 else index_to_glyph.get(i)
            if not target:
                continue
            for dg in digit_glyphs:
                cycle_builder.ligatures[(variant_glyph, dg)] = target
                emitted += 1
    return emitted


def buildWordLiga(output_font, char_mapping, word_components=None):
    """
    Emit the word→glyph ligation and the per-script variant-override
    rules for every multi-character key in ``char_mapping``.
    Single-character keys are untouched — they belong to the CJK-style
    cmap/liga/IVS paths.

    Per script: Arabic gets boundary-guard blockers + tatweel cycling;
    Thai gets guard-less longest-match ligation + digit-suffix variant
    selection. See the module docstring.

    Args:
        output_font: TTFont being mutated.
        char_mapping: ``key -> {annotation: (glyph_name, variant_index)}``
            where multi-char keys were composed by
            build_glyph.generate_annotated_glyphs (word entries).
        word_components: ``{word: [glyph_name, ...]}`` exact component
            sequences from build_glyph (falls back to per-codepoint
            cmap resolution for words missing from it).
    """
    with step_timer("word ligature substitution") as timer:
        # Collect word entries whose composition actually succeeded
        # (values are (glyph_name, index) tuples, not the parser's
        # None placeholders).
        word_entries = {}
        for key, annos in char_mapping.items():
            if len(key) <= 1:
                continue
            resolved = {
                anno: tpl
                for anno, tpl in annos.items()
                if isinstance(tpl, tuple)
            }
            if resolved:
                word_entries[key] = resolved

        if not word_entries:
            timer.note("0 word entries")
            return

        gsub = output_font["GSUB"].table
        glyph_order_set = set(output_font.getGlyphOrder())
        select_digits = _resolve_select_digits(output_font)

        # Per-script caches, built lazily for the scripts actually
        # present in the mapping.
        guard_classes_cache: dict = {}
        trigger_glyph_cache: dict = {}

        def _guards_for(behavior):
            if behavior.tag not in guard_classes_cache:
                guard_classes_cache[behavior.tag] = _guard_classes(
                    output_font, behavior
                )
            return guard_classes_cache[behavior.tag]

        def _trigger_glyph_for(behavior):
            if behavior.tag not in trigger_glyph_cache:
                trigger_glyph_cache[behavior.tag] = (
                    get_glyph_name_by_char(output_font, behavior.trigger_char)
                    if behavior.trigger_char
                    else None
                )
            return trigger_glyph_cache[behavior.tag]

        liga_builder = LigatureSubstBuilder(output_font, None)
        chain_builder = ChainContextSubstBuilder(output_font, None)
        cycle_builder = LigatureSubstBuilder(output_font, None)

        rules_in_subtable = 0
        subtable_break_counter = 0
        words_built = 0
        cycle_rules = 0

        # Resolve components up front so rule priority can be sorted by
        # COMPONENT-sequence length (what the shaper actually matches),
        # not codepoint count — Thai preprocessing can change one into
        # the other.
        prepared = []
        for word, resolved in word_entries.items():
            comp_glyphs = (word_components or {}).get(word) or [
                get_glyph_name_by_char(output_font, c) for c in word
            ]
            if any(
                not isinstance(g, str) or g not in glyph_order_set
                for g in comp_glyphs
            ):
                continue
            index_to_glyph = {idx: name for name, idx in resolved.values()}
            default_glyph = index_to_glyph.get(0)
            if default_glyph is None:
                continue
            prepared.append((word, comp_glyphs, index_to_glyph, default_glyph))

        # Longest match first: a mapped word that is a prefix/suffix or
        # substring of another mapped word must lose to the longer
        # match, and that priority is encoded purely by rule order.
        # (For Thai, with no boundary guards, this ordering is the ONLY
        # thing standing between a long word and its mapped substrings.)
        prepared.sort(key=lambda t: len(t[1]), reverse=True)

        # Feature tags to register the lookups under — the union over
        # the scripts actually built (csv_parser.WordScript.feature).
        feature_tags: set = set()

        for word, comp_glyphs, index_to_glyph, default_glyph in prepared:
            # Per-script policy is data, not branching — see
            # csv_parser.WordScript for what each flag means and why.
            behavior = WORD_SCRIPTS.get(get_word_unit_script(word))
            feature_tags.add(behavior.feature if behavior else "ccmp")

            # The nested many→one substitution itself.
            liga_builder.ligatures[tuple(comp_glyphs)] = default_glyph

            n_pos = len(comp_glyphs)
            glyphs_ctx = [[g] for g in comp_glyphs]

            # Boundary blockers fit scripts with DETECTABLE boundaries
            # (space-separated Arabic / Hindi). Unspaced scripts (Thai)
            # ligate guard-less and rely on longest-first ordering.
            if behavior is not None and behavior.boundary_guards:
                back_class, ahead_class = _guards_for(behavior)
                # 1) lookahead blocker, 2) backtrack blocker, 3) ligate.
                if ahead_class:
                    chain_builder.rules.append(
                        ChainContextualRule(
                            prefix=[],
                            glyphs=glyphs_ctx,
                            suffix=[ahead_class],
                            lookups=[None] * n_pos,
                        )
                    )
                if back_class:
                    chain_builder.rules.append(
                        ChainContextualRule(
                            prefix=[back_class],
                            glyphs=glyphs_ctx,
                            suffix=[],
                            lookups=[None] * n_pos,
                        )
                    )
                rules_in_subtable += 2
            chain_builder.rules.append(
                ChainContextualRule(
                    prefix=[],
                    glyphs=glyphs_ctx,
                    suffix=[],
                    lookups=[[liga_builder]] + [None] * (n_pos - 1),
                )
            )
            words_built += 1
            rules_in_subtable += 1

            if rules_in_subtable >= RULES_PER_SUBTABLE:
                chain_builder.add_subtable_break(subtable_break_counter)
                subtable_break_counter += 1
                rules_in_subtable = 0

            # ── Variant override (per-script trigger) ───────────────
            if behavior is not None and behavior.variant_trigger == "cycle":
                cycle_rules += _emit_trigger_cycle(
                    cycle_builder,
                    index_to_glyph,
                    _trigger_glyph_for(behavior),
                )
            else:
                cycle_rules += _emit_digit_select(
                    cycle_builder,
                    index_to_glyph,
                    default_glyph,
                    select_digits,
                )

        if not chain_builder.rules:
            timer.note("0 buildable words")
            return

        # Our lookups go to the FRONT of the LookupList (see module
        # docstring "why we PREPEND") in this index order:
        #   0 — nested ligature (word → composed glyph)
        #   1 — chain context (guards + entry point; nested ref to 0)
        #   2 — tatweel variant cycling (must run after 1 so the
        #       composed glyph it matches on already exists)
        # The chain builder resolves its SubstLookupRecord references
        # from `.lookup_index`, so that must be assigned BEFORE build().
        liga_builder.lookup_index = 0
        liga_lookup = liga_builder.build()
        chain_lookup = chain_builder.build()

        new_lookups = [liga_lookup, chain_lookup]
        cycle_lookup = None
        if cycle_builder.ligatures:
            cycle_lookup = cycle_builder.build()
            new_lookups.append(cycle_lookup)

        _prepend_lookups(gsub, new_lookups)

        # The chain lookup is the feature entry point; the nested liga
        # lookup is reached only through it (deliberately NOT feature-
        # registered, or it would also fire un-guarded). The cycle
        # lookup IS feature-registered and runs after the chain lookup
        # (higher LookupList index ⇒ later application within a stage).
        #
        # Registration goes under the union of the built scripts'
        # feature tags: `ccmp` for Arabic/Thai, `pres` for Indic (whose
        # shapers apply ccmp per-syllable — a word ligature spanning
        # syllables can only fire in the buffer-global stage). Multiple
        # registration is harmless: a shaper only applies the features
        # its script plan enables, so e.g. the Arabic shaper never runs
        # the `pres` copy, and Indic words can't accidentally ligate at
        # ccmp time because their components are the post-basic-feature
        # sequence, which doesn't exist in the buffer that early.
        for tag in sorted(feature_tags):
            register_feature_lookup(gsub, tag, 1)
            if cycle_lookup is not None:
                register_feature_lookup(gsub, tag, 2)

        timer.note(
            f"{words_built} words, {len(chain_builder.rules)} chain rules, "
            f"{cycle_rules} cycle rules"
        )


def buildLigCarets(output_font, ligature_carets):
    """
    Write GDEF LigCaretList entries for the composed word glyphs so
    editors that honour ligature carets (CoreText, DirectWrite, …) can
    step the text cursor *between the letters* of a word glyph instead
    of treating it as one opaque block. Also classifies those glyphs as
    GDEF class 2 (ligature) when the font already carries a
    GlyphClassDef.

    Args:
        output_font: TTFont being mutated.
        ligature_carets: ``{glyph_name: [x, ...]}`` caret X coordinates
            (font units, ascending), as produced by
            build_glyph.generate_annotated_glyphs.
    """
    with step_timer("gdef ligature carets") as timer:
        if not ligature_carets:
            timer.note("no carets")
            return

        from fontTools.otlLib.builder import buildLigCaretList

        glyph_map = output_font.getReverseGlyphMap()
        carets = {
            g: sorted(xs)
            for g, xs in ligature_carets.items()
            if g in glyph_map and xs
        }
        if not carets:
            timer.note("no carets")
            return

        if "GDEF" in output_font:
            gdef = output_font["GDEF"].table
            existing = gdef.LigCaretList
            if existing is not None:
                # Merge: re-extract the existing format-1 carets and
                # rebuild a combined list. (Format 2/3 caret values are
                # essentially unused in practice; they're preserved
                # only if we don't collide with their glyphs — our
                # wingfont* names never collide with source glyphs.)
                for g_name, lig_glyph in zip(
                    existing.Coverage.glyphs, existing.LigGlyph
                ):
                    if g_name in carets:
                        continue
                    xs = [
                        cv.Coordinate
                        for cv in lig_glyph.CaretValue
                        if getattr(cv, "Format", 1) == 1
                        and hasattr(cv, "Coordinate")
                    ]
                    if xs:
                        carets[g_name] = xs
            gdef.LigCaretList = buildLigCaretList(carets, {}, glyph_map)
            # Mark the word glyphs as ligatures (class 2) when the font
            # has a class def. (If it doesn't, we deliberately don't
            # create one — introducing a GlyphClassDef where the source
            # font relied on Unicode-property fallback would change how
            # shapers classify every OTHER glyph.)
            if gdef.GlyphClassDef is not None:
                for g in ligature_carets:
                    if g in glyph_map:
                        gdef.GlyphClassDef.classDefs[g] = 2
        else:
            gdef_table = newTable("GDEF")
            table = otTables.GDEF()
            table.Version = 0x00010000
            table.GlyphClassDef = None
            table.AttachList = None
            table.LigCaretList = buildLigCaretList(carets, {}, glyph_map)
            table.MarkAttachClassDef = None
            gdef_table.table = table
            output_font["GDEF"] = gdef_table

        timer.note(f"{len(carets)} glyph(s) with carets")
