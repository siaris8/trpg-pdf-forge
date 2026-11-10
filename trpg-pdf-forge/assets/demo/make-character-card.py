from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ART = HERE / "art"
ART.mkdir(exist_ok=True)
W, H = 820, 1160
paper = (244, 236, 218)
ink = (24, 24, 22)
muted = (96, 88, 76)
red = (178, 52, 39)
gold = (166, 132, 54)

image = Image.new("RGB", (W, H), paper)
draw = ImageDraw.Draw(image)


def font(size, bold=False):
    name = "msyhbd.ttc" if bold else "msyh.ttc"
    path = Path("C:/Windows/Fonts") / name
    if not path.exists():
        path = Path("C:/Windows/Fonts/msyh.ttc")
    return ImageFont.truetype(str(path), size)


draw.rectangle((28, 28, W - 28, H - 28), outline=ink, width=4)
draw.rectangle((42, 42, W - 42, H - 42), outline=ink, width=1)

draw.text((58, 56), "ORIGINAL PLAYER CARD · 原卡示意", font=font(18, True), fill=red)
draw.text((58, 92), "THE CLOCK WARDEN", font=font(44, True), fill=ink)
draw.text((60, 148), "钟表守卫 · 调查员 · 3 级", font=font(20), fill=muted)

draw.line((58, 188, W - 58, 188), fill=ink, width=3)
draw.text((58, 204), "PLAYER  ______________", font=font(15), fill=muted)
draw.text((470, 204), "FACTION  _____________", font=font(15), fill=muted)

# left column boxes
boxes = [
    ("ATTRIBUTES / 属性", ["FRC  3  (+1)", "TAC  2  (+0)", "CRE  4  (+2)", "PER  2  (+0)"], 58, 250),
    ("DERIVED / 衍生", ["HP  12 / 12", "ARMOR  1", "WILL  4 / 4", "AMMO  6 / 6"], 58, 470),
]
for title, lines, x, y in boxes:
    draw.rectangle((x, y, 390, y + 190), outline=ink, width=2)
    draw.text((x + 14, y + 12), title, font=font(16, True), fill=gold)
    for i, line in enumerate(lines):
        draw.text((x + 16, y + 48 + i * 32), line, font=font(18), fill=ink)

# right clock art panel
draw.rectangle((420, 250, 760, 660), outline=ink, width=2)
clock = Image.open(ART / "clock.png").convert("RGBA")
clock.thumbnail((280, 330))
image.paste(clock, (450, 300), clock)
draw.text((444, 630), "THE THIRTEENTH HOUR", font=font(14, True), fill=red)

# weapons table
draw.text((58, 706), "WEAPONS / 武器", font=font(17, True), fill=gold)
draw.line((58, 732, 760, 732), fill=ink, width=2)
rows = [
    ("Revolver", "2D6", "12", "6", "Loud, reload 2"),
    ("Clock key", "D6", "melee", "—", "Opens one wrong door"),
]
for i, row in enumerate(rows):
    y = 742 + i * 34
    draw.text((62, y), row[0], font=font(16, True), fill=ink)
    for j, value in enumerate(row[1:], start=1):
        draw.text((250 + (j - 1) * 105, y), value, font=font(15), fill=ink)

# spells
draw.text((58, 840), "SPELLS / 法术", font=font(17, True), fill=gold)
draw.line((58, 866, 760, 866), fill=ink, width=2)
spells = [
    ("Second Hand", "1 will", "stop one clock for 1 round"),
    ("Wrong Door", "2 will", "choose an exit; it is always the wrong one"),
]
for i, row in enumerate(spells):
    y = 878 + i * 36
    draw.text((62, y), row[0], font=font(16, True), fill=ink)
    draw.text((250, y), row[1], font=font(15), fill=ink)
    draw.text((380, y), row[2], font=font(15), fill=ink)

# footer note
draw.line((58, 1000, 760, 1000), fill=ink, width=1)
draw.text((58, 1014), "HANDWRITTEN NOTE: the clock is not the trap. the room is.", font=font(14), fill=muted)
draw.text((58, 1040), "扫描/手写字段无法全部辨认；抽象表只放可确认项，其余标 [待校对]。", font=font(14), fill=muted)
draw.text((58, 1090), "SOURCE CARD · KEEP ORIGINAL / 原卡保留", font=font(12, True), fill=red)

image.save(ART / "character-card.png")
print(ART / "character-card.png")
