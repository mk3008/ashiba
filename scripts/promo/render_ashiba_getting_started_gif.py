from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "docs" / "public" / "brand"
PREVIEW_DIR = ROOT / "tmp" / "promo"
INIT_GIF_PATH = OUT_DIR / "ashiba-getting-started-init.gif"
INIT_PNG_PATH = PREVIEW_DIR / "ashiba-getting-started-init-final.png"
SCAFFOLD_GIF_PATH = OUT_DIR / "ashiba-getting-started-scaffold.gif"
SCAFFOLD_PNG_PATH = PREVIEW_DIR / "ashiba-getting-started-scaffold-final.png"

WIDTH = 1200
HEIGHT = 675
MARGIN = 34
TERM_X = 56
TERM_Y = 94
TERM_W = WIDTH - TERM_X * 2
TERM_H = HEIGHT - TERM_Y - 54
HEADER_H = 44
PADDING_X = 28
PADDING_Y = 22
LINE_H = 26
MAX_LINES = 16
STEP_WAIT_SCALE = 4

BG = (9, 14, 26)
TERM_BG = (17, 24, 39)
TERM_BORDER = (54, 65, 86)
TITLE = (236, 244, 255)
MUTED = (145, 159, 184)
BLUE = (96, 165, 250)
GREEN = (74, 222, 128)
YELLOW = (250, 204, 21)
PURPLE = (167, 139, 250)
WHITE = (226, 232, 240)
COMMENT = (148, 163, 184)
SHADOW = (0, 0, 0)


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


FONT_PATH = r"C:\Windows\Fonts\JetBrainsMonoNerdFont-Regular.ttf"
FONT_BOLD_PATH = r"C:\Windows\Fonts\JetBrainsMonoNerdFont-Bold.ttf"
UI_FONT = font(FONT_BOLD_PATH, 44)
SUB_FONT = font(FONT_PATH, 22)
MONO = font(FONT_PATH, 20)
MONO_BOLD = font(FONT_BOLD_PATH, 20)
BADGE_FONT = font(FONT_BOLD_PATH, 17)


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], radius: int, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_badge(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, color: tuple[int, int, int]) -> int:
    pad_x = 13
    pad_y = 6
    bbox = draw.textbbox((0, 0), text, font=BADGE_FONT)
    w = bbox[2] - bbox[0] + pad_x * 2
    h = bbox[3] - bbox[1] + pad_y * 2
    rounded(draw, (x, y, x + w, y + h), 14, (color[0] // 5, color[1] // 5, color[2] // 5), color, 1)
    draw.text((x + pad_x, y + pad_y - 1), text, font=BADGE_FONT, fill=color)
    return x + w + 10


def wrap_line(text: str, max_chars: int = 92) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    chunks: list[str] = []
    current = text
    while len(current) > max_chars:
        cut = current.rfind(" ", 0, max_chars)
        if cut < 20:
            cut = max_chars
        chunks.append(current[:cut])
        current = "  " + current[cut:].lstrip()
    chunks.append(current)
    return chunks


def visible_lines(lines: list[tuple[str, tuple[int, int, int], bool]]) -> list[tuple[str, tuple[int, int, int], bool]]:
    expanded: list[tuple[str, tuple[int, int, int], bool]] = []
    for text, color, bold in lines:
        for part in wrap_line(text):
            expanded.append((part, color, bold))
    return expanded[-MAX_LINES:]


def draw_frame(
    lines: list[tuple[str, tuple[int, int, int], bool]],
    cursor: bool = False,
    subtitle: str = "SQL-first TypeScript generator",
    terminal_title: str = "ashiba-getting-started",
    footer: str = "npx ashiba init  ->  feature scaffold  ->  npx vitest run",
) -> Image.Image:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(img)

    # Subtle background wash.
    for i in range(0, HEIGHT, 3):
        shade = int(10 + i / HEIGHT * 9)
        draw.line((0, i, WIDTH, i), fill=(shade, shade + 4, shade + 13))

    draw.text((MARGIN, 24), "Ashiba", font=UI_FONT, fill=BLUE)
    draw.text((MARGIN + 178, 38), subtitle, font=SUB_FONT, fill=TITLE)
    x = WIDTH - 420
    x = draw_badge(draw, x, 35, "SQL stays visible", GREEN)
    x = draw_badge(draw, x, 35, "Mapper tested", PURPLE)

    shadow_box = (TERM_X + 8, TERM_Y + 10, TERM_X + TERM_W + 8, TERM_Y + TERM_H + 10)
    rounded(draw, shadow_box, 20, SHADOW)
    rounded(draw, (TERM_X, TERM_Y, TERM_X + TERM_W, TERM_Y + TERM_H), 20, TERM_BG, TERM_BORDER, 1)
    rounded(draw, (TERM_X, TERM_Y, TERM_X + TERM_W, TERM_Y + HEADER_H), 20, (27, 36, 55))
    draw.rectangle((TERM_X, TERM_Y + HEADER_H - 20, TERM_X + TERM_W, TERM_Y + HEADER_H), fill=(27, 36, 55))

    dot_y = TERM_Y + 18
    for idx, color in enumerate([(248, 113, 113), (251, 191, 36), (52, 211, 153)]):
        draw.ellipse((TERM_X + 22 + idx * 24, dot_y, TERM_X + 36 + idx * 24, dot_y + 14), fill=color)
    draw.text((TERM_X + 112, TERM_Y + 14), terminal_title, font=MONO_BOLD, fill=COMMENT)

    y = TERM_Y + HEADER_H + PADDING_Y
    for text, color, bold in visible_lines(lines):
        draw.text((TERM_X + PADDING_X, y), text, font=MONO_BOLD if bold else MONO, fill=color)
        y += LINE_H
    if cursor:
        draw.rectangle((TERM_X + PADDING_X, y + 4, TERM_X + PADDING_X + 12, y + 24), fill=GREEN)

    draw.text((MARGIN, HEIGHT - 36), footer, font=SUB_FONT, fill=MUTED)
    return img


def add_pause(frames: list[Image.Image], durations: list[int], lines, ms: int, **frame_options):
    frames.append(draw_frame(lines, cursor=True, **frame_options))
    durations.append(ms * STEP_WAIT_SCALE)


def type_command(frames: list[Image.Image], durations: list[int], lines, command: str, **frame_options):
    prefix = "$ "
    for end in range(0, len(command) + 1, 3):
        current = command[:end]
        frames.append(draw_frame(lines + [(prefix + current, GREEN, True)], cursor=True, **frame_options))
        durations.append(45)
    lines.append((prefix + command, GREEN, True))
    frames.append(draw_frame(lines, cursor=False, **frame_options))
    durations.append(260)


def output_lines(frames: list[Image.Image], durations: list[int], lines, output: list[tuple[str, tuple[int, int, int], bool]], **frame_options):
    for line in output:
        lines.append(line)
        frames.append(draw_frame(lines, cursor=False, **frame_options))
        durations.append(240)
    durations[-1] = 650 * STEP_WAIT_SCALE


def save_gif(frames: list[Image.Image], durations: list[int], gif_path: Path, png_path: Path) -> None:
    frames[-1].save(png_path, optimize=True)
    frames[0].save(
        gif_path,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(gif_path.resolve())
    print(png_path.resolve())


def render_init() -> None:
    lines: list[tuple[str, tuple[int, int, int], bool]] = [
        ("# Create the SQL-first starter files in this project.", COMMENT, False),
    ]
    frames: list[Image.Image] = []
    durations: list[int] = []
    frame_options = {
        "subtitle": "Getting started: init",
        "terminal_title": "ashiba-init",
        "footer": "install packages  ->  npx ashiba init  ->  docker compose up -d",
    }

    add_pause(frames, durations, lines, 700, **frame_options)
    type_command(frames, durations, lines, "npx ashiba init --db postgres --driver pg --with-demo-ddl", **frame_options)
    output_lines(frames, durations, lines, [
        ("Ashiba starter created in the current project.", BLUE, True),
        ("- create: ashiba.config.json", COMMENT, False),
        ("- create: compose.yaml", COMMENT, False),
        ("- create: db/ddl/public.sql", COMMENT, False),
        ("- create: src/adapters/pg/pool.ts", COMMENT, False),
    ], **frame_options)

    type_command(frames, durations, lines, "cp .env.example .env", **frame_options)
    output_lines(frames, durations, lines, [("env ready", GREEN, False)], **frame_options)

    type_command(frames, durations, lines, "docker compose up -d", **frame_options)
    output_lines(frames, durations, lines, [
        ("Container ashiba-demo-postgres-1  Started", GREEN, False),
    ], **frame_options)

    add_pause(frames, durations, lines, 4800, **frame_options)
    save_gif(frames, durations, INIT_GIF_PATH, INIT_PNG_PATH)


def render_scaffold() -> None:
    lines: list[tuple[str, tuple[int, int, int], bool]] = [
        ("# Starter and PostgreSQL are ready. Now generate one feature.", COMMENT, False),
    ]
    frames: list[Image.Image] = []
    durations: list[int] = []
    frame_options = {
        "subtitle": "Getting started: scaffold",
        "terminal_title": "ashiba-scaffold",
        "footer": "feature scaffold  ->  visible SQL  ->  npx vitest run",
    }

    add_pause(frames, durations, lines, 700, **frame_options)
    type_command(frames, durations, lines, "npx ashiba feature scaffold users-list --table users --action list", **frame_options)
    output_lines(frames, durations, lines, [
        ("Feature scaffold completed: users-list", BLUE, True),
        ("- write: visible SQL and editable query boundary", COMMENT, False),
        ("- write: generated metadata and mapper tests", COMMENT, False),
        ("Visible SQL file + mapper test are generated.", YELLOW, False),
    ], **frame_options)

    type_command(frames, durations, lines, "type src\\features\\users-list\\queries\\list\\list.sql", **frame_options)
    output_lines(frames, durations, lines, [
        ("select", WHITE, False),
        ("    user_id", WHITE, False),
        ("    , email", WHITE, False),
        ("from", WHITE, False),
        ("    public.users", WHITE, False),
    ], **frame_options)

    type_command(frames, durations, lines, "npx vitest run", **frame_options)
    output_lines(frames, durations, lines, [
        ("RUN  v4.1.7  ./ashiba-demo", PURPLE, False),
        ("✓ ZTD mapper test: SQL row -> TypeScript DTO", GREEN, True),
        ("Test Files  2 passed (2)", GREEN, True),
        ("DB access is mapper-tested from visible SQL to TypeScript.", BLUE, True),
    ], **frame_options)
    add_pause(frames, durations, lines, 4800, **frame_options)
    save_gif(frames, durations, SCAFFOLD_GIF_PATH, SCAFFOLD_PNG_PATH)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    render_init()
    render_scaffold()


if __name__ == "__main__":
    main()
