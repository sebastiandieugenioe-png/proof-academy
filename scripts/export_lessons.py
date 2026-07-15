#!/usr/bin/env python3
"""
Read-only Word (.docx) export of ALL current OSC lesson content.

Consumes /tmp/osc_content_dump.json (produced by export_lessons_dump.mjs) and
produces a professionally-formatted Word document containing every course,
every lesson and every stored educational field, PLUS a completeness appendix.

DOES NOT modify the database, the codebase or any file outside the output
folder. All content is copied verbatim from the sources of truth:
  * lib/content.js
  * lib/ai-content.js
  * courses_published (Mongo collection)
  * lib/media.js  (per-slug image + sources supplement)

Usage:
  python3 scripts/export_lessons.py /tmp/osc_content_dump.json /app/exports/
"""
from __future__ import annotations

import io
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn, nsmap
from docx.oxml import OxmlElement
from docx.shared import Cm, Pt, RGBColor, Inches
from docx.enum.table import WD_TABLE_ALIGNMENT

# ------------------------------------------------------------------ helpers

def add_field(paragraph, instr_text: str):
    """Insert a Word FIELD (used for TOC + PAGE numbers)."""
    run = paragraph.add_run()
    r = run._r
    fld_char_begin = OxmlElement('w:fldChar')
    fld_char_begin.set(qn('w:fldCharType'), 'begin')
    instr = OxmlElement('w:instrText')
    instr.set(qn('xml:space'), 'preserve')
    instr.text = instr_text
    fld_char_sep = OxmlElement('w:fldChar')
    fld_char_sep.set(qn('w:fldCharType'), 'separate')
    fld_char_end = OxmlElement('w:fldChar')
    fld_char_end.set(qn('w:fldCharType'), 'end')
    r.append(fld_char_begin); r.append(instr); r.append(fld_char_sep); r.append(fld_char_end)


def add_hyperlink(paragraph, text: str, url: str, color='0563C1', underline=True):
    part = paragraph.part
    r_id = part.relate_to(url, 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink', is_external=True)
    hyperlink = OxmlElement('w:hyperlink'); hyperlink.set(qn('r:id'), r_id)
    new_run = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    if color:
        c = OxmlElement('w:color'); c.set(qn('w:val'), color); rPr.append(c)
    if underline:
        u = OxmlElement('w:u'); u.set(qn('w:val'), 'single'); rPr.append(u)
    new_run.append(rPr)
    t = OxmlElement('w:t'); t.text = text; new_run.append(t)
    hyperlink.append(new_run)
    paragraph._p.append(hyperlink)


def set_cell_shading(cell, hex_color: str):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd'); shd.set(qn('w:val'), 'clear'); shd.set(qn('w:color'), 'auto'); shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)


def add_page_number(paragraph):
    add_field(paragraph, 'PAGE   \\* MERGEFORMAT')


# --------- Very light markdown -> runs (bold **x**, italic *x*, links [t](u))

MD_TOKEN = re.compile(r'(\*\*.+?\*\*|__.+?__|_.+?_|\*.+?\*|\[[^\]]+\]\([^)]+\)|https?://\S+)')

def add_markdown_paragraph(doc, text: str, style: str | None = None):
    """Adds a paragraph, rendering **bold** / *italic* / [text](url) / bare URLs."""
    if style:
        p = doc.add_paragraph(style=style)
    else:
        p = doc.add_paragraph()
    _render_markdown_into(p, text)
    return p


def _render_markdown_into(p, text: str):
    idx = 0
    for m in MD_TOKEN.finditer(text):
        if m.start() > idx:
            p.add_run(text[idx:m.start()])
        tok = m.group(0)
        if tok.startswith('**') and tok.endswith('**') and len(tok) > 4:
            r = p.add_run(tok[2:-2]); r.bold = True
        elif tok.startswith('__') and tok.endswith('__') and len(tok) > 4:
            r = p.add_run(tok[2:-2]); r.bold = True
        elif tok.startswith('_') and tok.endswith('_') and len(tok) > 2:
            r = p.add_run(tok[1:-1]); r.italic = True
        elif tok.startswith('*') and tok.endswith('*') and len(tok) > 2:
            r = p.add_run(tok[1:-1]); r.italic = True
        elif tok.startswith('[') and '](' in tok:
            m2 = re.match(r'\[([^\]]+)\]\(([^)]+)\)', tok)
            if m2:
                add_hyperlink(p, m2.group(1), m2.group(2))
        elif tok.startswith('http'):
            add_hyperlink(p, tok, tok)
        idx = m.end()
    if idx < len(text):
        p.add_run(text[idx:])


def add_theory(doc, theory: str):
    """Convert stored theory (plain text w/ markdown-style bold) into paragraphs.
    Preserves paragraph breaks; renders inline bold/italic/links; passes URLs
    through as clickable hyperlinks. Never emits raw markdown/HTML tokens."""
    if theory is None:
        add_markdown_paragraph(doc, 'No theory is currently stored for this lesson.').italic = True
        return
    if isinstance(theory, list):
        # If ever a list of {title, html} shape appears, handle it too.
        for section in theory:
            if isinstance(section, dict):
                if section.get('title'):
                    h = doc.add_paragraph(style='Heading 5'); h.add_run(section['title'])
                if section.get('html'):
                    add_markdown_paragraph(doc, _strip_html(section['html']))
                elif section.get('text'):
                    add_markdown_paragraph(doc, section['text'])
        return
    text = str(theory).strip()
    if not text:
        add_markdown_paragraph(doc, 'Theory is stored but empty.').italic = True
        return
    # If theory contains HTML, strip to a paragraph-preserving text.
    if '<' in text and '>' in text:
        text = _strip_html(text)
    for para in re.split(r'\n\s*\n', text):
        para = para.strip()
        if not para:
            continue
        # Detect list items
        if all(line.lstrip().startswith(('- ', '* ', '\u2022 ')) for line in para.split('\n')):
            for line in para.split('\n'):
                stripped = line.lstrip('-* \u2022').strip()
                add_markdown_paragraph(doc, stripped, style='List Bullet')
        elif all(re.match(r'^\s*\d+[.)] ', line) for line in para.split('\n')):
            for line in para.split('\n'):
                add_markdown_paragraph(doc, re.sub(r'^\s*\d+[.)] ', '', line), style='List Number')
        elif para.startswith('##'):
            heading_text = para.lstrip('#').strip()
            h = doc.add_paragraph(style='Heading 5'); h.add_run(heading_text)
        else:
            add_markdown_paragraph(doc, para.replace('\n', ' '))


HTML_TAG_RE = re.compile(r'<[^>]+>')

def _strip_html(html: str) -> str:
    # Preserve <br> -> newline, <p> -> newline+newline, then drop the rest.
    txt = re.sub(r'<\s*br\s*/?>', '\n', html, flags=re.I)
    txt = re.sub(r'</\s*p\s*>', '\n\n', txt, flags=re.I)
    txt = re.sub(r'<\s*/?\s*(strong|b)\s*>', '**', txt, flags=re.I)
    txt = re.sub(r'<\s*/?\s*(em|i)\s*>', '*', txt, flags=re.I)
    txt = re.sub(r'<\s*li[^>]*>', '\n- ', txt, flags=re.I)
    txt = HTML_TAG_RE.sub('', txt)
    return re.sub(r'\n{3,}', '\n\n', txt).strip()


# ------------------------------------------------------------ image helpers

def download_image(url: str, timeout=15):
    if not url or not url.startswith('http'):
        return None, 'Non-HTTP URL cannot be downloaded'
    try:
        r = requests.get(url, timeout=timeout,
                         headers={'User-Agent': 'OSC-Export/1.0'})
        if r.status_code != 200:
            return None, f'HTTP {r.status_code}'
        ctype = (r.headers.get('content-type') or '').lower()
        if not any(t in ctype for t in ('image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif')):
            return None, f'Unsupported content-type: {ctype}'
        return r.content, None
    except Exception as e:  # noqa: BLE001
        return None, str(e)


# ------------------------------------------------------------ document build

def add_metadata_table(doc, rows: list[tuple[str, str]]):
    tbl = doc.add_table(rows=len(rows), cols=2)
    tbl.style = 'Light Grid Accent 1'
    tbl.alignment = WD_TABLE_ALIGNMENT.LEFT
    for i, (k, v) in enumerate(rows):
        tbl.rows[i].cells[0].text = k
        tbl.rows[i].cells[1].text = v if v is not None else 'Not currently stored'
        set_cell_shading(tbl.rows[i].cells[0], 'F2F2F2')
    for row in tbl.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(10)
    return tbl


def build_document(dump_path: str, out_dir: str) -> tuple[Path, dict]:
    with open(dump_path, encoding='utf-8') as f:
        dump = json.load(f)

    out_dir_path = Path(out_dir); out_dir_path.mkdir(parents=True, exist_ok=True)
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    filename = f'OSC_Complete_Lesson_Content_Export_{today}.docx'
    out_path = out_dir_path / filename

    doc = Document()
    style = doc.styles['Normal']
    style.font.name = 'Calibri'; style.font.size = Pt(11)

    # ---- Header and Footer -----------------------------------------------
    section = doc.sections[0]
    header = section.header
    hp = header.paragraphs[0]; hp.text = 'Online Spirits Club \u2014 Complete Lesson Content Export'
    hp.alignment = WD_ALIGN_PARAGRAPH.LEFT
    footer = section.footer
    fp = footer.paragraphs[0]
    fp.text = f'Export date: {today}    Page '
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_page_number(fp)

    # ---- Precompute stats needed on the cover ----------------------------
    courses = dump['courses']
    lesson_media = dump.get('lessonMedia') or {}

    def lesson_media_for(slug: str) -> dict:
        return lesson_media.get(slug) or {}

    total_lessons = sum(len(c.get('lessons') or []) for c in courses)
    total_objectives = sum(len(l.get('objectives') or []) for c in courses for l in (c.get('lessons') or []))
    total_active_recall = sum(len(l.get('embedded') or []) for c in courses for l in (c.get('lessons') or []))
    total_flashcards = sum(len(l.get('flashcards') or []) for c in courses for l in (c.get('lessons') or []))
    total_quiz_questions = sum(len(l.get('quiz') or []) for c in courses for l in (c.get('lessons') or []))
    total_quiz_options = sum(len((q.get('options') or [])) for c in courses for l in (c.get('lessons') or []) for q in (l.get('quiz') or []))
    total_sources = sum(len((l.get('sources') or lesson_media_for(l['slug']).get('sources') or [])) for c in courses for l in (c.get('lessons') or []))

    # ---- Cover page ------------------------------------------------------
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run('Online Spirits Club'); r.bold = True; r.font.size = Pt(28)
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run('Complete Lesson Content Export'); r.bold = True; r.font.size = Pt(20)
    doc.add_paragraph()
    exported_at_utc = dump.get('exportedAt', datetime.now(timezone.utc).isoformat())
    env = os.environ.get('OSC_EXPORT_ENV', 'preview / development')
    add_metadata_table(doc, [
        ('Export generated (UTC)', exported_at_utc),
        ('Environment exported from', env),
        ('Database name', dump.get('dbName', 'osc_db')),
        ('Snapshot type', 'Read-only. No records were modified during export.'),
        ('Total Learning Paths / Courses', str(len(courses))),
        ('Total modules', 'Not currently stored \u2014 OSC does not currently model modules separately; lessons live directly under a course.'),
        ('Total lessons', str(total_lessons)),
        ('Total learning objectives', str(total_objectives)),
        ('Total Active Recall items (embedded)', str(total_active_recall)),
        ('Total Study Cards (flashcards)', str(total_flashcards)),
        ('Total quiz questions', str(total_quiz_questions)),
        ('Total quiz answer options', str(total_quiz_options)),
        ('Total sources', str(total_sources)),
    ])
    doc.add_paragraph()
    p = doc.add_paragraph()
    r = p.add_run('This document is a read-only snapshot of current OSC lesson content. '
                  'It has been generated from the live application data models (static bundled '
                  'content, AI content bundle, and per-course Mongo overrides) without altering '
                  'any record. Content is reproduced verbatim; no grammar or spelling was corrected.')
    r.italic = True; r.font.size = Pt(10); r.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
    doc.add_page_break()

    # ---- Table of contents ----------------------------------------------
    doc.add_heading('Table of contents', level=1)
    p = doc.add_paragraph()
    add_field(p, 'TOC \\o "1-3" \\h \\z \\u')
    p2 = doc.add_paragraph()
    r = p2.add_run('The TOC updates on first open in Microsoft Word (right-click \u2192 Update Field, or press F9).')
    r.italic = True; r.font.size = Pt(9); r.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
    doc.add_page_break()

    # ---- Export inventory summary ---------------------------------------
    doc.add_heading('Export summary \u2014 inventory by course', level=1)
    doc.add_paragraph('Numbers reflect what is currently stored. Missing content is recorded accurately \u2014 not treated as an export error.')
    inv = doc.add_table(rows=1, cols=10)
    inv.style = 'Light Grid Accent 1'
    hdr = inv.rows[0].cells
    for i, h in enumerate(['Course', 'Status', 'Modules', 'Lessons', 'w/ Objectives', 'w/ Active Recall', 'w/ Study Cards', 'w/ Quiz', 'w/ Sources', 'w/ SEO']):
        hdr[i].text = h; set_cell_shading(hdr[i], 'D9E2F3')
        for r in hdr[i].paragraphs[0].runs: r.bold = True; r.font.size = Pt(9)

    for c in courses:
        lessons = c.get('lessons') or []
        row = inv.add_row().cells
        row[0].text = c.get('title', c.get('slug'))
        row[1].text = c.get('__status', 'bundled')
        row[2].text = 'n/a (no module entity)'
        row[3].text = str(len(lessons))
        row[4].text = str(sum(1 for l in lessons if l.get('objectives')))
        row[5].text = str(sum(1 for l in lessons if l.get('embedded')))
        row[6].text = str(sum(1 for l in lessons if l.get('flashcards')))
        row[7].text = str(sum(1 for l in lessons if l.get('quiz')))
        row[8].text = str(sum(1 for l in lessons if (l.get('sources') or lesson_media_for(l['slug']).get('sources'))))
        row[9].text = str(sum(1 for l in lessons if l.get('seo')))
        for cell in row:
            for pp in cell.paragraphs:
                for rr in pp.runs: rr.font.size = Pt(9)
    doc.add_page_break()

    # ---- Complete educational content -----------------------------------
    doc.add_heading('Complete educational content', level=1)
    completeness_rows = []
    images_embedded = 0
    images_referenced = 0

    for course_index, c in enumerate(courses):
        if course_index > 0:
            doc.add_page_break()
        title = c.get('title', c.get('slug'))
        doc.add_heading(f'{title}', level=1)

        add_metadata_table(doc, [
            ('Slug', c.get('slug', '')),
            ('Public title', title),
            ('Internal title', title if title == c.get('title') else c.get('title', '')),
            ('Tagline', c.get('tagline', '') or ''),
            ('Category', c.get('category') or 'Not currently stored'),
            ('Level', c.get('level') or 'Not currently stored'),
            ('Accent (theme color)', c.get('accent') or 'Not currently stored'),
            ('Icon slug', c.get('icon') or 'Not currently stored'),
            ('Source (where the record lives)', c.get('__source', 'static')),
            ('Status', c.get('__status', 'bundled')),
            ('Overridden in DB (courses_published)?', 'Yes' if c.get('__dbOverride') else 'No'),
            ('Hidden?', 'Yes' if c.get('__hidden') else 'No'),
            ('Display order', 'Not explicitly stored \u2014 preserved as returned by the merge (static bundled first, then AI bundled, then DB-only).'),
            ('Number of modules', 'Not currently stored'),
            ('Number of lessons', str(len(c.get('lessons') or []))),
            ('Published at', str(c.get('publishedAt') or 'Not currently stored')),
            ('Last updated at', str(c.get('updatedAt') or 'Not currently stored')),
            ('SEO title (course-level)', 'Not currently stored \u2014 SEO metadata is per-lesson, not per-course.'),
            ('Meta description (course-level)', 'Not currently stored'),
        ])

        # No module entity in OSC \u2014 state this once per course.
        doc.add_paragraph('OSC does not currently model separate modules or course sections. Lessons live directly under a course. The hierarchy is: Course \u2192 Lesson.')

        for lesson_index, l in enumerate(c.get('lessons') or []):
            lslug = l.get('slug', f'lesson-{lesson_index}')
            media = lesson_media_for(lslug)
            has_objectives = bool(l.get('objectives'))
            has_theory     = bool(l.get('theory'))
            has_active     = bool(l.get('embedded'))
            has_flash      = bool(l.get('flashcards'))
            has_quiz       = bool(l.get('quiz'))
            has_sources    = bool(l.get('sources') or media.get('sources'))
            has_seo        = bool(l.get('seo'))
            has_image      = bool(l.get('image') or media.get('image'))

            doc.add_heading(f'Lesson: {l.get("title", lslug)}', level=3)

            image_url = None; image_alt = ''; image_caption = ''; image_credit = ''
            li = l.get('image')
            if isinstance(li, dict) and li.get('url'):
                image_url = li['url']; image_alt = li.get('alt') or ''
                image_caption = li.get('caption') or ''; image_credit = li.get('credit') or ''
            elif isinstance(li, str) and li:
                image_url = li
            elif media.get('image'):
                image_url = media['image']; image_alt = media.get('imageAlt') or ''
                image_credit = media.get('imageCredit') or ''

            add_metadata_table(doc, [
                ('Lesson title', l.get('title', '')),
                ('Slug', lslug),
                ('Internal ID', 'Not currently stored (identifier IS the slug)'),
                ('Learning Path / Course', title),
                ('Module or section', 'n/a \u2014 no module entity currently stored'),
                ('Lesson order', str(lesson_index + 1)),
                ('Level (course-level applies)', c.get('level') or 'Not currently stored'),
                ('Status', c.get('__status', 'bundled')),
                ('Estimated duration (minutes)', str(l.get('minutes')) if l.get('minutes') is not None else 'Not currently stored'),
                ('Created date', 'Not currently stored'),
                ('Last updated date', str(c.get('updatedAt') or 'Not currently stored')),
                ('Published date', str(c.get('publishedAt') or 'Not currently stored')),
                ('Featured image URL', image_url or 'Not currently stored'),
                ('Featured image alt text', image_alt or (media.get('imageAlt') or 'Not currently stored')),
                ('Featured image caption', image_caption or 'Not currently stored'),
                ('Featured image credit', image_credit or media.get('imageCredit') or 'Not currently stored'),
                ('Image prompt (generator hint)', l.get('imagePrompt') or 'Not currently stored'),
                ('Image search hint', l.get('imageSearch') or 'Not currently stored'),
                ('SEO block', json.dumps(l.get('seo'), ensure_ascii=False) if l.get('seo') else 'Not currently stored'),
                ('Canonical URL', f"/learn/{c.get('slug')}/{lslug}"),
                ('Open Graph image', image_url or 'Not currently stored'),
            ])

            # A. Objectives
            doc.add_heading('A. Learning objectives', level=4)
            if has_objectives:
                for obj in l['objectives']:
                    add_markdown_paragraph(doc, str(obj), style='List Number')
            else:
                p = doc.add_paragraph('No learning objectives are currently stored for this lesson.')
                for run in p.runs: run.italic = True

            # B. Theory
            doc.add_heading('B. Theory', level=4)
            add_theory(doc, l.get('theory'))

            # C. Featured image
            doc.add_heading('C. Image inside the lesson', level=4)
            if image_url:
                content, err = download_image(image_url)
                if content:
                    try:
                        doc.add_picture(io.BytesIO(content), width=Inches(5.5))
                        images_embedded += 1
                        cap = doc.add_paragraph()
                        cr = cap.add_run(image_caption or image_alt or l.get('title', lslug))
                        cr.italic = True; cr.font.size = Pt(9); cr.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
                        if image_credit:
                            cap2 = doc.add_paragraph()
                            r2 = cap2.add_run(f'Credit: {image_credit}')
                            r2.italic = True; r2.font.size = Pt(9); r2.font.color.rgb = RGBColor(0x88, 0x88, 0x88)
                        src = doc.add_paragraph()
                        rs = src.add_run(f'Source URL: {image_url}')
                        rs.font.size = Pt(8); rs.font.color.rgb = RGBColor(0xAA, 0xAA, 0xAA)
                    except Exception as ex:  # noqa: BLE001
                        images_referenced += 1
                        _write_image_placeholder(doc, image_url, image_alt, image_caption, image_credit, f'python-docx failed to embed: {ex}')
                else:
                    images_referenced += 1
                    _write_image_placeholder(doc, image_url, image_alt, image_caption, image_credit, err or 'Download failed')
            else:
                p = doc.add_paragraph('No image is currently stored for this lesson.')
                for run in p.runs: run.italic = True

            # D. Active Recall (stored in the `embedded` field)
            doc.add_heading('D. Active Recall', level=4)
            if has_active:
                doc.add_paragraph('Active Recall in OSC is stored on the lesson under the "embedded" field. Each item is a multiple-choice prompt used mid-lesson.')
                for i_ar, ar in enumerate(l['embedded']):
                    p = doc.add_paragraph()
                    r = p.add_run(f'Q{i_ar + 1}. '); r.bold = True
                    _render_markdown_into(p, ar.get('q', '(missing question text)'))
                    correct_idx = ar.get('correct')
                    for j, opt in enumerate(ar.get('options') or []):
                        is_correct = (j == correct_idx)
                        p = doc.add_paragraph(style='List Bullet')
                        prefix = p.add_run(f'{chr(65 + j)}. ')
                        if is_correct: prefix.bold = True
                        run = p.add_run(str(opt))
                        if is_correct:
                            run.bold = True
                            run.font.color.rgb = RGBColor(0x1F, 0x66, 0x1F)
                            p.add_run('  \u2713 correct')
                    if ar.get('explanation'):
                        p = doc.add_paragraph()
                        rlabel = p.add_run('Explanation: '); rlabel.bold = True; rlabel.italic = True
                        _render_markdown_into(p, ar['explanation'])
                        for r in p.runs: r.italic = True
            else:
                p = doc.add_paragraph('No Active Recall content is currently stored for this lesson.')
                for run in p.runs: run.italic = True

            # E. Study Cards
            doc.add_heading('E. Study Cards', level=4)
            if has_flash:
                tbl = doc.add_table(rows=1, cols=3)
                tbl.style = 'Light Grid Accent 1'
                h = tbl.rows[0].cells
                h[0].text = '#'; h[1].text = 'Front (prompt)'; h[2].text = 'Back (answer)'
                for cell in h: set_cell_shading(cell, 'D9E2F3')
                for i_fc, fc in enumerate(l['flashcards']):
                    row = tbl.add_row().cells
                    row[0].text = str(i_fc + 1)
                    row[1].text = str(fc.get('front', ''))
                    row[2].text = str(fc.get('back', ''))
                    for cell in row:
                        for pp in cell.paragraphs:
                            for rr in pp.runs: rr.font.size = Pt(10)
            else:
                p = doc.add_paragraph('No Study Cards are currently stored for this lesson.')
                for run in p.runs: run.italic = True

            # F. Quiz
            doc.add_heading('F. Quiz', level=4)
            if has_quiz:
                for i_q, q in enumerate(l['quiz']):
                    p = doc.add_paragraph()
                    r = p.add_run(f'Q{i_q + 1}. '); r.bold = True
                    _render_markdown_into(p, q.get('q', '(missing question text)'))
                    r_type = doc.add_paragraph()
                    r_type_run = r_type.add_run(f'Type: single-choice (fixed) \u2014 correct-index model')
                    r_type_run.italic = True; r_type_run.font.size = Pt(9); r_type_run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
                    correct_idx = q.get('correct')
                    for j, opt in enumerate(q.get('options') or []):
                        is_correct = (j == correct_idx)
                        p = doc.add_paragraph(style='List Bullet')
                        prefix = p.add_run(f'{chr(65 + j)}. ')
                        if is_correct: prefix.bold = True
                        run = p.add_run(str(opt))
                        if is_correct:
                            run.bold = True; run.font.color.rgb = RGBColor(0x1F, 0x66, 0x1F)
                            p.add_run('  \u2713 correct')
                    if q.get('explanation'):
                        p = doc.add_paragraph()
                        rlabel = p.add_run('Explanation: '); rlabel.bold = True; rlabel.italic = True
                        _render_markdown_into(p, q['explanation'])
                        for r in p.runs: r.italic = True
            else:
                p = doc.add_paragraph('No quiz content is currently stored for this lesson.')
                for run in p.runs: run.italic = True

            # G. Sources
            doc.add_heading('G. Sources & bibliography', level=4)
            sources = l.get('sources') or media.get('sources') or []
            if sources:
                for i_s, s in enumerate(sources):
                    p = doc.add_paragraph(style='List Number')
                    label = s.get('label') or s.get('title') or s.get('name') or 'Source'
                    url = s.get('url') or ''
                    if url:
                        add_hyperlink(p, label, url)
                    else:
                        p.add_run(label)
                    extras = []
                    for k in ('author', 'organisation', 'organization', 'publication', 'publicationDate', 'accessed', 'accessDate', 'doi', 'notes'):
                        if s.get(k):
                            extras.append(f'{k}: {s[k]}')
                    if extras:
                        p2 = doc.add_paragraph('  ' + ' | '.join(extras))
                        for r in p2.runs: r.italic = True; r.font.size = Pt(9)
                    if l.get('sources') is None and media.get('sources'):
                        # These came from lib/media.js, not the lesson doc itself.
                        p3 = doc.add_paragraph()
                        r3 = p3.add_run('  (stored in lib/media.js keyed by lesson slug)')
                        r3.italic = True; r3.font.size = Pt(8); r3.font.color.rgb = RGBColor(0xAA, 0xAA, 0xAA)
                        break
            else:
                p = doc.add_paragraph('No sources are currently stored for this lesson.')
                for run in p.runs: run.italic = True

            # H. SEO
            doc.add_heading('H. SEO information', level=4)
            seo = l.get('seo') or {}
            seo_rows = [
                ('Public lesson title', l.get('title', 'Empty')),
                ('SEO title', seo.get('title') if seo.get('title') else 'Empty' if 'title' in seo else 'Not currently stored'),
                ('Meta description', seo.get('description') if seo.get('description') else 'Empty' if 'description' in seo else 'Not currently stored'),
                ('Slug', lslug),
                ('Canonical URL', f"/learn/{c.get('slug')}/{lslug}"),
                ('Indexing status', 'Public (default; site follows /robots.txt for /learn/**)'),
                ('Featured / OG image', image_url or 'Not currently stored'),
                ('Image alt text', image_alt or media.get('imageAlt') or 'Not currently stored'),
                ('Structured data (JSON-LD) fields', 'Not currently stored on the lesson document'),
            ]
            add_metadata_table(doc, seo_rows)

            completeness_rows.append({
                'course': c.get('title', c.get('slug')),
                'course_slug': c.get('slug'),
                'module': 'n/a',
                'lesson': l.get('title', lslug),
                'slug': lslug,
                'status': c.get('__status', 'bundled'),
                'objectives': has_objectives,
                'theory': has_theory,
                'active_recall': has_active,
                'study_cards': has_flash,
                'quiz': has_quiz,
                'sources': has_sources,
                'seo_title': bool((l.get('seo') or {}).get('title')),
                'meta_description': bool((l.get('seo') or {}).get('description')),
                'featured_image': has_image,
                'updated_at': str(c.get('updatedAt') or ''),
            })

    # ---- Completeness appendix ------------------------------------------
    doc.add_page_break()
    doc.add_heading('Completeness appendix', level=1)
    doc.add_paragraph('One row per lesson. \u201cNot supported\u201d indicates a field the current OSC data model does not currently store.')
    tbl = doc.add_table(rows=1, cols=15)
    tbl.style = 'Light Grid Accent 1'
    headers = ['Course', 'Module', 'Lesson', 'Slug', 'Status',
               'Objectives', 'Theory', 'Active Recall', 'Study Cards', 'Quiz',
               'Sources', 'SEO title', 'Meta desc.', 'Featured image', 'Last updated']
    for i, h in enumerate(headers):
        tbl.rows[0].cells[i].text = h
        set_cell_shading(tbl.rows[0].cells[i], 'D9E2F3')
        for r in tbl.rows[0].cells[i].paragraphs[0].runs: r.bold = True; r.font.size = Pt(8)
    yn = lambda b: 'Yes' if b else 'No'
    for cr in completeness_rows:
        row = tbl.add_row().cells
        row[0].text = cr['course']
        row[1].text = 'Not supported'
        row[2].text = cr['lesson']
        row[3].text = cr['slug']
        row[4].text = cr['status']
        row[5].text = yn(cr['objectives'])
        row[6].text = yn(cr['theory'])
        row[7].text = yn(cr['active_recall'])
        row[8].text = yn(cr['study_cards'])
        row[9].text = yn(cr['quiz'])
        row[10].text = yn(cr['sources'])
        row[11].text = 'Not supported' if not cr.get('seo_title') else 'Yes'
        row[12].text = 'Not supported' if not cr.get('meta_description') else 'Yes'
        row[13].text = yn(cr['featured_image'])
        row[14].text = cr['updated_at'] or 'Not currently stored'
        for cell in row:
            for pp in cell.paragraphs:
                for rr in pp.runs: rr.font.size = Pt(8)

    doc.add_paragraph()
    doc.add_heading('Final totals', level=2)
    totals_rows = [
        ('Learning Paths / Courses exported', str(len(courses))),
        ('Modules exported', 'Not currently stored (0 module entities)'),
        ('Lessons exported', str(total_lessons)),
        ('Objectives exported', str(total_objectives)),
        ('Active Recall items exported', str(total_active_recall)),
        ('Study Cards exported', str(total_flashcards)),
        ('Quiz questions exported', str(total_quiz_questions)),
        ('Quiz answer options exported', str(total_quiz_options)),
        ('Sources exported', str(total_sources)),
        ('Images embedded', str(images_embedded)),
        ('Images referenced but not embedded', str(images_referenced)),
    ]
    add_metadata_table(doc, totals_rows)

    doc.save(str(out_path))
    return out_path, {
        'total_courses': len(courses),
        'total_lessons': total_lessons,
        'total_objectives': total_objectives,
        'total_active_recall': total_active_recall,
        'total_flashcards': total_flashcards,
        'total_quiz_questions': total_quiz_questions,
        'total_quiz_options': total_quiz_options,
        'total_sources': total_sources,
        'images_embedded': images_embedded,
        'images_referenced': images_referenced,
    }


def _write_image_placeholder(doc, url, alt, caption, credit, reason):
    p = doc.add_paragraph()
    r = p.add_run('[Image referenced but not embedded] ')
    r.bold = True
    p.add_run(f'Reason: {reason}')
    for label, val in (('URL', url), ('Alt text', alt), ('Caption', caption), ('Credit', credit)):
        if val:
            p = doc.add_paragraph()
            rl = p.add_run(f'{label}: '); rl.bold = True
            if label == 'URL':
                add_hyperlink(p, val, val)
            else:
                p.add_run(val)


if __name__ == '__main__':
    dump_path = sys.argv[1] if len(sys.argv) > 1 else '/tmp/osc_content_dump.json'
    out_dir = sys.argv[2] if len(sys.argv) > 2 else '/app/exports'
    path, stats = build_document(dump_path, out_dir)
    print(f'\u2713 wrote {path}')
    print(json.dumps(stats, indent=2))
