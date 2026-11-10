"""Shared visual language for the Excel character-sheet template and demo."""
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.page import PageMargins
from openpyxl.worksheet.properties import PageSetupProperties

PAPER = "F6EEDC"
INK = "1E1B16"
NAVY = "18212B"
GOLD = "B08A3E"
RED = "B33A2B"
MUTED = "6B6254"
INPUT = "FBF6EA"
CALC = "E9E4D8"
LINE = "D8CBB3"
ALT = "F4EBD9"
WHITE = "FFFDF6"

FONT = "Microsoft YaHei"
TITLE_SIZE = 18
BODY_SIZE = 10.5
SMALL_SIZE = 9

THIN = Side(style="thin", color=LINE)
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
LEFT = Alignment(horizontal="left", vertical="center", wrap_text=True)
RIGHT = Alignment(horizontal="right", vertical="center", wrap_text=True)

GRID_COLUMNS = 8
GRID_WIDTH = 13.5


def fill(color):
    return PatternFill("solid", fgColor=color)


def font(size=BODY_SIZE, bold=False, color=INK, italic=False):
    return Font(name=FONT, size=size, bold=bold, color=color, italic=italic)


def title(ws, text, end="H", subtitle=""):
    ws.merge_cells(f"A1:{end}2")
    cell = ws["A1"]
    cell.value = text
    cell.font = font(TITLE_SIZE, True, PAPER)
    cell.fill = fill(NAVY)
    cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[1].height = 28
    ws.row_dimensions[2].height = 28
    for row in (1, 2):
        for col in range(1, ws.max_column + 1):
            ws.cell(row=row, column=col).fill = fill(NAVY)
    if subtitle:
        ws.merge_cells(f"A3:{end}3")
        cell = ws["A3"]
        cell.value = subtitle
        cell.font = font(SMALL_SIZE, False, MUTED, True)
        cell.fill = fill(PAPER)
        cell.alignment = LEFT
        ws.row_dimensions[3].height = 22


def section(ws, row, text, end="H", color=NAVY):
    ws.merge_cells(f"A{row}:{end}{row}")
    cell = ws[f"A{row}"]
    cell.value = text
    cell.font = font(11.5, True, PAPER)
    cell.fill = fill(color)
    cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    cell.border = Border(left=Side(style="thick", color=GOLD))
    ws.row_dimensions[row].height = 24


def table_header(ws, row, headers, start=1):
    for offset, header in enumerate(headers):
        cell = ws.cell(row=row, column=start + offset, value=header)
        cell.font = font(BODY_SIZE, True, PAPER)
        cell.fill = fill(NAVY)
        cell.alignment = CENTER
        cell.border = BORDER
    ws.row_dimensions[row].height = 24


def data_row(ws, row, values, start=1, calc_columns=(), height=24):
    for offset, value in enumerate(values):
        col = start + offset
        cell = ws.cell(row=row, column=col, value=value)
        cell.font = font(BODY_SIZE, False, INK)
        cell.fill = fill(CALC if col in calc_columns else INPUT)
        cell.border = BORDER
        cell.alignment = RIGHT if isinstance(value, (int, float)) else LEFT
        if isinstance(value, str) and value.startswith("="):
            cell.fill = fill(CALC)
    ws.row_dimensions[row].height = height


def setup(ws, print_area, freeze="A5", tab=NAVY, landscape=False):
    # The sheet is an 8-column square grid. Per-sheet ragged widths are not
    # allowed; long text wraps instead of widening one column.
    for index in range(1, GRID_COLUMNS + 1):
        ws.column_dimensions[chr(64 + index)].width = GRID_WIDTH
    ws.sheet_view.showGridLines = False
    ws.sheet_view.zoomScale = 100
    ws.freeze_panes = freeze
    ws.print_area = print_area
    ws.page_setup.orientation = "landscape" if landscape else "portrait"
    ws.page_setup.paperSize = 9
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
    ws.page_margins = PageMargins(left=0.35, right=0.35, top=0.45, bottom=0.45)
    ws.print_options.horizontalCentered = True
    ws.sheet_properties.tabColor = tab


def note(ws, row, text, end="H"):
    ws.merge_cells(f"A{row}:{end}{row}")
    cell = ws[f"A{row}"]
    cell.value = text
    cell.font = font(SMALL_SIZE, False, MUTED, True)
    cell.alignment = LEFT
    cell.fill = fill(PAPER)
    ws.row_dimensions[row].height = 22


def label_value(ws, row, pairs):
    """pairs = [(label, value, label_span, value_span), ...] on one row."""
    col = 1
    for label, value, label_span, value_span in pairs:
        if label_span > 1:
            ws.merge_cells(start_row=row, start_column=col, end_row=row, end_column=col + label_span - 1)
        cell = ws.cell(row=row, column=col, value=label)
        cell.font = font(BODY_SIZE, True, MUTED)
        cell.fill = fill(PAPER)
        cell.alignment = LEFT
        cell.border = BORDER
        for i in range(1, label_span):
            ws.cell(row=row, column=col + i).border = BORDER
            ws.cell(row=row, column=col + i).fill = fill(PAPER)
        col += label_span
        if value_span > 1:
            ws.merge_cells(start_row=row, start_column=col, end_row=row, end_column=col + value_span - 1)
        cell = ws.cell(row=row, column=col, value=value)
        cell.font = font(BODY_SIZE, False, INK)
        cell.fill = fill(INPUT)
        cell.alignment = LEFT
        cell.border = BORDER
        for i in range(1, value_span):
            ws.cell(row=row, column=col + i).border = BORDER
            ws.cell(row=row, column=col + i).fill = fill(INPUT)
        col += value_span
    ws.row_dimensions[row].height = 26
