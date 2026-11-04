from __future__ import annotations

import argparse
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "segundo-borrador.md"
OUTPUT = ROOT / "Alas-de-mundos-rotos.docx"
ILLUSTRATED_OUTPUT = ROOT / "Alas-de-mundos-rotos-con-portada-ilustrada.docx"
SYMBOLIC_COVER_ART = ROOT / "arte" / "portada-simbolica-sin-texto-v1.png"
COMPOSED_SYMBOLIC_COVER = ROOT / "arte" / "portada-alas-de-mundos-rotos-v1.png"
FIRST_INTERIOR_ILLUSTRATION = ROOT / "arte" / "interiores" / "01-convento-primer-encuentro-v1.png"
SECOND_INTERIOR_ILLUSTRATION = ROOT / "arte" / "interiores" / "02-biblioteca-caida-v1.png"
THIRD_INTERIOR_ILLUSTRATION = ROOT / "arte" / "interiores" / "03-talismanes-v1.png"
TITLE_FONT = Path("/System/Library/Fonts/Supplemental/Times New Roman.ttf")


def set_font(run, name: str, size: float, *, bold: bool = False, italic: bool = False) -> None:
    run.font.name = name
    run._element.rPr.rFonts.set(qn("w:ascii"), name)
    run._element.rPr.rFonts.set(qn("w:hAnsi"), name)
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor(0, 0, 0)


def set_style_font(style, name: str, size: float, *, bold: bool = False) -> None:
    style.font.name = name
    style._element.rPr.rFonts.set(qn("w:ascii"), name)
    style._element.rPr.rFonts.set(qn("w:hAnsi"), name)
    style.font.size = Pt(size)
    style.font.bold = bold
    style.font.color.rgb = RGBColor(0, 0, 0)


def set_language(style, language: str = "es-EC") -> None:
    rpr = style.element.get_or_add_rPr()
    lang = rpr.find(qn("w:lang"))
    if lang is None:
        lang = OxmlElement("w:lang")
        rpr.append(lang)
    lang.set(qn("w:val"), language)


def add_page_number(paragraph) -> None:
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run()
    set_font(run, "Liberation Serif", 10)
    fld_char_1 = OxmlElement("w:fldChar")
    fld_char_1.set(qn("w:fldCharType"), "begin")
    instr_text = OxmlElement("w:instrText")
    instr_text.set(qn("xml:space"), "preserve")
    instr_text.text = " PAGE "
    fld_char_2 = OxmlElement("w:fldChar")
    fld_char_2.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char_1)
    run._r.append(instr_text)
    run._r.append(fld_char_2)


def restart_page_numbering(section, start: int = 1) -> None:
    sect_pr = section._sectPr
    pg_num_type = sect_pr.find(qn("w:pgNumType"))
    if pg_num_type is None:
        pg_num_type = OxmlElement("w:pgNumType")
        sect_pr.append(pg_num_type)
    pg_num_type.set(qn("w:start"), str(start))


def add_bookmark(paragraph, name: str, bookmark_id: int) -> None:
    start = OxmlElement("w:bookmarkStart")
    start.set(qn("w:id"), str(bookmark_id))
    start.set(qn("w:name"), name)
    end = OxmlElement("w:bookmarkEnd")
    end.set(qn("w:id"), str(bookmark_id))
    paragraph._p.insert(0, start)
    paragraph._p.append(end)


def add_internal_link(paragraph, text: str, anchor: str) -> None:
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("w:anchor"), anchor)

    run = OxmlElement("w:r")
    run_properties = OxmlElement("w:rPr")
    fonts = OxmlElement("w:rFonts")
    fonts.set(qn("w:ascii"), "Liberation Serif")
    fonts.set(qn("w:hAnsi"), "Liberation Serif")
    run_properties.append(fonts)
    color = OxmlElement("w:color")
    color.set(qn("w:val"), "000000")
    run_properties.append(color)
    size = OxmlElement("w:sz")
    size.set(qn("w:val"), "23")
    run_properties.append(size)
    run.append(run_properties)
    text_element = OxmlElement("w:t")
    text_element.text = text
    run.append(text_element)
    hyperlink.append(run)
    paragraph._p.append(hyperlink)


def add_section_footer(section) -> None:
    section.footer.is_linked_to_previous = False
    footer_p = section.footer.paragraphs[0]
    footer_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer_p.paragraph_format.space_before = Pt(0)
    footer_p.paragraph_format.space_after = Pt(0)
    add_page_number(footer_p)


def parse_source(source: Path) -> list[tuple[str, list[str]]]:
    lines = source.read_text(encoding="utf-8").splitlines()
    chapters: list[tuple[str, list[str]]] = []
    title: str | None = None
    content: list[str] = []

    for line in lines:
        if line.startswith("## "):
            if title is not None:
                chapters.append((title, content))
            title = line[3:].strip()
            content = []
        elif title is not None:
            content.append(line)

    if title is not None:
        chapters.append((title, content))

    if not chapters:
        raise ValueError("No se encontraron capítulos en el borrador.")
    return chapters


def source_paragraphs(lines: list[str]) -> list[str]:
    result: list[str] = []
    current: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current:
                result.append(" ".join(current))
                current = []
            continue
        current.append(stripped)
    if current:
        result.append(" ".join(current))
    return result


def add_body_paragraph(document: Document, text: str, *, first_in_chapter: bool) -> None:
    paragraph = document.add_paragraph(style="Cuerpo de novela")
    # Las frases breves de ritmo narrativo no deben estirarse en algunos lectores.
    is_short_rhythm_line = len(text) <= 80
    paragraph.alignment = (
        WD_ALIGN_PARAGRAPH.LEFT if is_short_rhythm_line else WD_ALIGN_PARAGRAPH.JUSTIFY
    )
    paragraph.paragraph_format.first_line_indent = Inches(
        0 if first_in_chapter or is_short_rhythm_line else 0.25
    )
    run = paragraph.add_run(text)
    set_font(run, "Liberation Serif", 11.5)


def compose_symbolic_cover() -> Path:
    if not SYMBOLIC_COVER_ART.exists():
        raise FileNotFoundError(f"No se encontró la portada base: {SYMBOLIC_COVER_ART}")

    image = Image.open(SYMBOLIC_COVER_ART).convert("RGB")
    draw = ImageDraw.Draw(image)
    width, height = image.size
    title_font = ImageFont.truetype(str(TITLE_FONT), size=72)
    author_font = ImageFont.truetype(str(TITLE_FONT), size=31)

    title = "ALAS DE\nMUNDOS ROTOS"
    title_box = draw.multiline_textbbox(
        (0, 0), title, font=title_font, spacing=5, align="center"
    )
    title_width = title_box[2] - title_box[0]
    draw.multiline_text(
        ((width - title_width) / 2, 125),
        title,
        font=title_font,
        fill="#EAE2D2",
        spacing=5,
        align="center",
    )

    author = "Hernández Axel"
    author_box = draw.textbbox((0, 0), author, font=author_font)
    author_width = author_box[2] - author_box[0]
    draw.text(
        ((width - author_width) / 2, height - 92),
        author,
        font=author_font,
        fill="#D8D0C1",
    )
    image.save(COMPOSED_SYMBOLIC_COVER, quality=96)
    return COMPOSED_SYMBOLIC_COVER


def configure_standard_margins(section) -> None:
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.9)
    section.bottom_margin = Inches(0.65)
    section.left_margin = Inches(0.95)
    section.right_margin = Inches(0.85)


def add_full_page_illustration(document: Document, image_path: Path) -> None:
    if not image_path.exists():
        raise FileNotFoundError(f"No se encontró la ilustración: {image_path}")

    # La imagen va en línea, centrada y en una página propia para que Word y
    # LibreOffice conserven la composición sin superponerla al texto.
    document.add_page_break()
    illustration = document.add_paragraph()
    illustration.alignment = WD_ALIGN_PARAGRAPH.CENTER
    illustration.paragraph_format.space_before = Pt(0)
    illustration.paragraph_format.space_after = Pt(0)
    illustration.paragraph_format.line_spacing = 1
    illustration.add_run().add_picture(str(image_path), width=Inches(6.0))


def create_document(
    chapters: list[tuple[str, list[str]]],
    *,
    output: Path = OUTPUT,
    cover_art: Path | None = None,
    interior_illustrations: dict[int, Path] | None = None,
) -> None:
    document = Document()
    section = document.sections[0]
    configure_standard_margins(section)

    normal = document.styles["Normal"]
    set_style_font(normal, "Liberation Serif", 11.5)
    set_language(normal)

    title_style = document.styles["Title"]
    set_style_font(title_style, "Liberation Serif", 28, bold=False)
    title_style.paragraph_format.space_after = Pt(18)
    title_style.paragraph_format.keep_with_next = True

    heading = document.styles["Heading 1"]
    set_style_font(heading, "Liberation Serif", 18, bold=False)
    heading.paragraph_format.space_before = Pt(0)
    heading.paragraph_format.space_after = Pt(26)
    heading.paragraph_format.keep_with_next = True
    heading.paragraph_format.keep_together = True

    if "Cuerpo de novela" not in [style.name for style in document.styles]:
        body_style = document.styles.add_style("Cuerpo de novela", WD_STYLE_TYPE.PARAGRAPH)
    else:
        body_style = document.styles["Cuerpo de novela"]
    set_style_font(body_style, "Liberation Serif", 11.5)
    set_language(body_style)
    body_style.paragraph_format.line_spacing = 1.25
    body_style.paragraph_format.space_before = Pt(0)
    body_style.paragraph_format.space_after = Pt(3)
    body_style.paragraph_format.widow_control = True

    # Portada. La edición ilustrada usa un archivo compuesto para garantizar que
    # el título y el nombre de autor se mantengan exactos, sin depender de texto IA.
    if cover_art is not None:
        section.top_margin = Inches(0.25)
        section.bottom_margin = Inches(0.25)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)
        cover = document.add_paragraph()
        cover.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cover.paragraph_format.space_before = Pt(0)
        cover.paragraph_format.space_after = Pt(0)
        cover.add_run().add_picture(str(cover_art), width=Inches(6.95))

        front_matter = document.add_section(WD_SECTION.NEW_PAGE)
        configure_standard_margins(front_matter)
    else:
        cover = document.add_paragraph()
        cover.paragraph_format.space_before = Inches(3.0)
        cover.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = cover.add_run("Alas de mundos rotos")
        set_font(run, "Liberation Serif", 30)

        author = document.add_paragraph()
        author.alignment = WD_ALIGN_PARAGRAPH.CENTER
        author.paragraph_format.space_before = Pt(24)
        author.paragraph_format.space_after = Pt(0)
        run = author.add_run("Hernández Axel")
        set_font(run, "Liberation Serif", 14)

        document.add_page_break()

    # Contenido
    contents_title = document.add_paragraph()
    contents_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    contents_title.paragraph_format.space_before = Inches(0.45)
    contents_title.paragraph_format.space_after = Pt(18)
    run = contents_title.add_run("Contenido")
    set_font(run, "Liberation Serif", 18)

    for index, (chapter_title, _lines) in enumerate(chapters, start=1):
        item = document.add_paragraph()
        item.paragraph_format.space_before = Pt(0)
        item.paragraph_format.space_after = Pt(4)
        item.paragraph_format.left_indent = Inches(0.18)
        add_internal_link(item, chapter_title, f"cap{index:02d}")

    # El texto narrativo empieza en una nueva sección y con la página 1.
    narrative = document.add_section(WD_SECTION.NEW_PAGE)
    configure_standard_margins(narrative)
    restart_page_numbering(narrative, 1)
    add_section_footer(narrative)

    for index, (chapter_title, lines) in enumerate(chapters):
        chapter = document.add_paragraph(style="Heading 1")
        chapter.alignment = WD_ALIGN_PARAGRAPH.CENTER
        chapter.paragraph_format.page_break_before = index > 0
        run = chapter.add_run(chapter_title)
        set_font(run, "Liberation Serif", 18)
        add_bookmark(chapter, f"cap{index + 1:02d}", index + 1)

        paragraphs = source_paragraphs(lines)
        for paragraph_index, text in enumerate(paragraphs):
            add_body_paragraph(document, text, first_in_chapter=paragraph_index == 0)

        if interior_illustrations and index + 1 in interior_illustrations:
            add_full_page_illustration(document, interior_illustrations[index + 1])

    properties = document.core_properties
    properties.title = "Alas de mundos rotos"
    properties.subject = "Novela corta de fantasía"
    properties.author = "Hernández Axel"
    properties.comments = ""
    document.save(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--with-symbolic-cover",
        action="store_true",
        help="Crea una copia con la portada simbólica ilustrada.",
    )
    parser.add_argument(
        "--with-approved-interiors",
        action="store_true",
        help="Incluye las ilustraciones interiores que ya fueron aprobadas.",
    )
    args = parser.parse_args()

    if args.with_symbolic_cover:
        create_document(
            parse_source(SOURCE),
            output=ILLUSTRATED_OUTPUT,
            cover_art=compose_symbolic_cover(),
            interior_illustrations=(
                {
                    4: FIRST_INTERIOR_ILLUSTRATION,
                    8: SECOND_INTERIOR_ILLUSTRATION,
                    10: THIRD_INTERIOR_ILLUSTRATION,
                }
                if args.with_approved_interiors
                else None
            ),
        )
        print(ILLUSTRATED_OUTPUT)
    else:
        create_document(parse_source(SOURCE))
        print(OUTPUT)
