"""Streamlit-inspired widget emitters for markdown output.

Provides Streamlit-compatible API signatures that render to agent-readable markdown.
These functions mirror st.metric, st.plotly_chart, st.line_chart, st.bar_chart,
st.area_chart, st.json, st.latex, st.columns, st.tabs, st.expander, st.progress,
st.success, st.error, st.warning, st.info, st.image, and more.
"""

from __future__ import annotations

import json as _json
from typing import Any, Literal, Sequence

try:
    import pandas as pd
except ImportError:
    pd = None  # type: ignore


# ── Data Display ──────────────────────────────────────────────────────────────


def render_metric(
    label: str,
    value: Any,
    delta: Any | None = None,
    delta_color: Literal["normal", "inverse", "off"] = "normal",
) -> str:
    """Render a big-number metric card (à la st.metric).

    Args:
        label: Short description of the metric.
        value: The primary metric value.
        delta: Optional delta from a previous value.
        delta_color: "normal" (green up / red down), "inverse", or "off".
    """
    lines: list[str] = []
    lines.append(f"| **{label}** |")
    lines.append("| :---: |")
    lines.append(f"| **{value}** |")

    if delta is not None:
        try:
            num = float(delta)
            if delta_color == "off":
                arrow = ""
            elif (delta_color == "normal" and num > 0) or (delta_color == "inverse" and num < 0):
                arrow = "▲ "
            elif (delta_color == "normal" and num < 0) or (delta_color == "inverse" and num > 0):
                arrow = "▼ "
            else:
                arrow = ""
            lines.append(f"| {arrow}{delta} |")
        except (ValueError, TypeError):
            lines.append(f"| {delta} |")

    lines.append("")
    lines.append("")
    return "\n".join(lines)


def render_metric_row(
    metrics: list[dict[str, Any]],
) -> str:
    """Render multiple metrics side-by-side in a single table row.

    Args:
        metrics: List of dicts with keys: label, value, delta (optional), delta_color (optional).

    Example::

        render_metric_row([
            {"label": "Revenue", "value": "$1.2M", "delta": "+12%"},
            {"label": "Users", "value": "3,400", "delta": "+200"},
            {"label": "Churn", "value": "2.1%", "delta": "-0.3%", "delta_color": "inverse"},
        ])
    """
    if not metrics:
        return ""

    headers = []
    alignments = []
    values = []
    deltas = []
    has_any_delta = any(m.get("delta") is not None for m in metrics)

    for m in metrics:
        headers.append(f" **{m['label']}** ")
        alignments.append(" :---: ")
        values.append(f" **{m['value']}** ")

        if has_any_delta:
            delta = m.get("delta")
            delta_color = m.get("delta_color", "normal")
            if delta is not None:
                try:
                    cleaned = str(delta).replace("%", "").replace(",", "").strip()
                    # Remove leading + but preserve -
                    if cleaned.startswith("+"):
                        cleaned = cleaned[1:]
                    num = float(cleaned)
                    if delta_color == "off":
                        arrow = ""
                    elif (delta_color == "normal" and num > 0) or (delta_color == "inverse" and num < 0):
                        arrow = "▲ "
                    elif (delta_color == "normal" and num < 0) or (delta_color == "inverse" and num > 0):
                        arrow = "▼ "
                    else:
                        arrow = ""
                    deltas.append(f" {arrow}{delta} ")
                except (ValueError, TypeError):
                    deltas.append(f" {delta} ")
            else:
                deltas.append(" — ")

    lines = [
        "|" + "|".join(headers) + "|",
        "|" + "|".join(alignments) + "|",
        "|" + "|".join(values) + "|",
    ]
    if has_any_delta:
        lines.append("|" + "|".join(deltas) + "|")

    lines.append("")
    lines.append("")
    return "\n".join(lines)


def render_json(data: Any, expanded: bool = True) -> str:
    """Render data as a formatted JSON code block (à la st.json).

    Args:
        data: Any JSON-serializable object.
        expanded: If True, pretty-print with indentation.
    """
    indent = 2 if expanded else None
    try:
        text = _json.dumps(data, indent=indent, ensure_ascii=False, default=str)
    except (TypeError, ValueError):
        text = str(data)
    return f"```json\n{text}\n```\n\n"


def render_dataframe(
    df_obj: Any,
    name: str = "",
    max_rows: int = 30,
    use_container_width: bool = False,
) -> str:
    """Render a DataFrame with st.dataframe-compatible API.

    Args:
        df_obj: A pandas DataFrame.
        name: Optional heading.
        max_rows: Max rows to render.
        use_container_width: Ignored for markdown, kept for API compatibility.
    """
    # Delegate to the existing table renderer logic
    from .emitters import render_table

    return render_table(df_obj, name=name or "Data", max_rows=max_rows)


# ── Chart Widgets ─────────────────────────────────────────────────────────────


def render_line_chart(
    data: Any,
    x: str | None = None,
    y: str | Sequence[str] | None = None,
    title: str = "",
    x_label: str = "",
    y_label: str = "",
) -> str:
    """Describe a line chart in markdown (à la st.line_chart).

    When matplotlib is available, generates an ASCII-art-style summary table
    of the data. The actual chart rendering is handled by the Notebook.line_chart
    method which saves to an image file.

    Args:
        data: DataFrame or dict-like data.
        x: Column name for x-axis.
        y: Column name(s) for y-axis.
        title: Chart title.
        x_label: X-axis label.
        y_label: Y-axis label.
    """
    return _render_chart_description("Line Chart", data, x, y, title, x_label, y_label)


def render_area_chart(
    data: Any,
    x: str | None = None,
    y: str | Sequence[str] | None = None,
    title: str = "",
    x_label: str = "",
    y_label: str = "",
) -> str:
    """Describe an area chart in markdown (à la st.area_chart)."""
    return _render_chart_description("Area Chart", data, x, y, title, x_label, y_label)


def render_bar_chart(
    data: Any,
    x: str | None = None,
    y: str | Sequence[str] | None = None,
    title: str = "",
    x_label: str = "",
    y_label: str = "",
    horizontal: bool = False,
) -> str:
    """Describe a bar chart in markdown (à la st.bar_chart)."""
    chart_type = "Horizontal Bar Chart" if horizontal else "Bar Chart"
    return _render_chart_description(chart_type, data, x, y, title, x_label, y_label)


def render_plotly_chart(
    rel_path: str,
    caption: str = "",
    use_container_width: bool = True,
) -> str:
    """Render a Plotly chart reference (à la st.plotly_chart).

    The actual saving is handled by AssetManager. This emitter renders the markdown link.

    Args:
        rel_path: Relative path to the saved chart image/HTML.
        caption: Optional caption.
        use_container_width: Ignored for markdown, kept for API compat.
    """
    from .emitters import render_figure

    return render_figure(rel_path, caption=caption, filename=rel_path)


def render_altair_chart(
    rel_path: str,
    caption: str = "",
    use_container_width: bool = True,
) -> str:
    """Render an Altair/Vega-Lite chart reference (à la st.altair_chart)."""
    from .emitters import render_figure

    return render_figure(rel_path, caption=caption, filename=rel_path)


def _render_chart_description(
    chart_type: str,
    data: Any,
    x: str | None,
    y: str | Sequence[str] | None,
    title: str,
    x_label: str,
    y_label: str,
) -> str:
    """Internal helper to render chart metadata as markdown."""
    lines: list[str] = []
    heading = title or chart_type
    lines.append(f"#### {heading}\n")

    if pd is not None and hasattr(data, "shape"):
        nrows, ncols = data.shape
        lines.append(f"\n_Chart data: {nrows:,} rows × {ncols:,} cols_\n")

        # Show x/y mapping
        if x:
            lines.append(f"- **x-axis**: `{x}`")
        if y:
            if isinstance(y, str):
                lines.append(f"- **y-axis**: `{y}`")
            else:
                lines.append(f"- **y-axis**: {', '.join(f'`{c}`' for c in y)}")
        if x_label:
            lines.append(f"- **x-label**: {x_label}")
        if y_label:
            lines.append(f"- **y-label**: {y_label}")

        lines.append("")

        # Summary statistics for charted columns
        y_cols = [y] if isinstance(y, str) else (list(y) if y else [])
        if not y_cols and pd is not None and isinstance(data, pd.DataFrame):
            y_cols = data.select_dtypes(include="number").columns.tolist()

        if y_cols and pd is not None and isinstance(data, pd.DataFrame):
            stats_df = data[y_cols].describe().T[["min", "mean", "max"]]
            try:
                lines.append(stats_df.to_markdown() + "\n")
            except Exception:
                lines.append(str(stats_df) + "\n")

    lines.append("")
    return "\n".join(lines)


# ── Text Elements ─────────────────────────────────────────────────────────────


def render_title(text: str, anchor: str | None = None) -> str:
    """Render a title heading (à la st.title).

    Args:
        text: Title text.
        anchor: Optional HTML anchor ID.
    """
    if anchor:
        return f'# {text} {{#{anchor}}}\n\n'
    return f"# {text}\n\n"


def render_header(text: str, anchor: str | None = None, divider: bool = False) -> str:
    """Render a header (à la st.header).

    Args:
        text: Header text.
        anchor: Optional HTML anchor ID.
        divider: If True, add a horizontal rule below.
    """
    line = f"## {text}"
    if anchor:
        line += f" {{#{anchor}}}"
    result = line + "\n\n"
    if divider:
        result += "---\n\n"
    return result


def render_subheader(text: str, anchor: str | None = None, divider: bool = False) -> str:
    """Render a subheader (à la st.subheader).

    Args:
        text: Subheader text.
        anchor: Optional HTML anchor ID.
        divider: If True, add a horizontal rule below.
    """
    line = f"### {text}"
    if anchor:
        line += f" {{#{anchor}}}"
    result = line + "\n\n"
    if divider:
        result += "---\n\n"
    return result


def render_caption(text: str) -> str:
    """Render small caption text (à la st.caption).

    Args:
        text: Caption text (supports markdown).
    """
    return f"_{text}_\n\n"


def render_latex(body: str) -> str:
    """Render a LaTeX math expression (à la st.latex).

    Args:
        body: LaTeX expression string.
    """
    return f"$$\n{body.strip()}\n$$\n\n"


def render_text(body: str) -> str:
    """Render fixed-width preformatted text (à la st.text).

    Args:
        body: Plain text to render in monospace.
    """
    return f"```text\n{body.rstrip()}\n```\n\n"


def render_divider() -> str:
    """Render a horizontal divider (à la st.divider)."""
    return "---\n\n"


# ── Status Elements ───────────────────────────────────────────────────────────


def render_success(body: str, icon: str = "✅") -> str:
    """Render a success message (à la st.success).

    Args:
        body: Message text.
        icon: Icon prefix.
    """
    return f"> {icon} **Success:** {body.strip()}\n\n"


def render_error(body: str, icon: str = "❌") -> str:
    """Render an error message (à la st.error).

    Args:
        body: Message text.
        icon: Icon prefix.
    """
    return f"> {icon} **Error:** {body.strip()}\n\n"


def render_warning(body: str, icon: str = "⚠️") -> str:
    """Render a warning message (à la st.warning).

    Args:
        body: Message text.
        icon: Icon prefix.
    """
    return f"> {icon} **Warning:** {body.strip()}\n\n"


def render_info(body: str, icon: str = "ℹ️") -> str:
    """Render an info message (à la st.info).

    Args:
        body: Message text.
        icon: Icon prefix.
    """
    return f"> {icon} **Info:** {body.strip()}\n\n"


def render_exception(exc: Exception) -> str:
    """Render an exception display (à la st.exception).

    Args:
        exc: The exception to display.
    """
    return (
        f"> ❌ **{type(exc).__name__}:** {str(exc)}\n\n"
    )


def render_progress(value: float, text: str = "") -> str:
    """Render a text-based progress bar (à la st.progress).

    Args:
        value: Progress from 0.0 to 1.0.
        text: Optional label text shown above the bar.
    """
    pct = max(0.0, min(1.0, float(value)))
    filled = int(pct * 20)
    bar = "█" * filled + "░" * (20 - filled)
    label = f" {text}" if text else ""
    return f"`[{bar}] {pct:.0%}`{label}\n\n"


def render_toast(body: str, icon: str = "🔔") -> str:
    """Render a toast notification (à la st.toast).

    Args:
        body: Toast message.
        icon: Icon prefix.
    """
    return f"> {icon} {body.strip()}\n\n"


def render_balloons() -> str:
    """Render a balloons celebration marker (à la st.balloons)."""
    return "> 🎈🎈🎈 **Celebration!**\n\n"


def render_snow() -> str:
    """Render a snow celebration marker (à la st.snow)."""
    return "> ❄️❄️❄️ **Snow!**\n\n"


# ── Layout Elements ───────────────────────────────────────────────────────────


def render_expander_start(label: str, expanded: bool = False) -> str:
    """Render the start of a collapsible section (à la st.expander).

    Args:
        label: The expander heading.
        expanded: If True, section is open by default.
    """
    open_attr = " open" if expanded else ""
    return f"<details{open_attr}>\n<summary><strong>{label}</strong></summary>\n\n"


def render_expander_end() -> str:
    """Render the end of a collapsible section."""
    return "\n</details>\n\n"


def render_tabs_header(labels: Sequence[str]) -> str:
    """Render tab headers as a section list (markdown doesn't support real tabs).

    Args:
        labels: List of tab labels.
    """
    tabs_line = " | ".join(f"**{lbl}**" for lbl in labels)
    return f"[{tabs_line}]\n\n"


def render_tab_start(label: str) -> str:
    """Render the start of a tab section."""
    return f"#### {label}\n\n"


def render_tab_end() -> str:
    """Render the end of a tab section."""
    return "---\n\n"


def render_columns_start(spec: int | Sequence[float]) -> str:
    """Render a note about column layout start.

    Since markdown doesn't support true columns, this renders as a visual separator.

    Args:
        spec: Number of columns or list of relative widths.
    """
    if isinstance(spec, int):
        n = spec
    else:
        n = len(spec)
    return f"<!-- columns: {n} -->\n\n"


def render_column_separator() -> str:
    """Render a separator between columns."""
    return "| | |\n"


def render_columns_end() -> str:
    """Render column layout end marker."""
    return "<!-- /columns -->\n\n"


def render_container_start(border: bool = False) -> str:
    """Render a container start (à la st.container).

    Args:
        border: If True, wrap in a blockquote for visual separation.
    """
    if border:
        return "> ---\n>\n"
    return ""


def render_container_end(border: bool = False) -> str:
    """Render a container end."""
    if border:
        return ">\n> ---\n\n"
    return ""


# ── Media Elements ────────────────────────────────────────────────────────────


def render_image(
    rel_path: str,
    caption: str = "",
    width: int | None = None,
) -> str:
    """Render an image (à la st.image).

    Args:
        rel_path: Path or URL to the image.
        caption: Optional caption.
        width: Optional width in pixels (rendered as HTML img for control).
    """
    alt = caption or rel_path
    if width:
        html = f'<img src="{rel_path}" alt="{alt}" width="{width}" />\n\n'
        if caption:
            html += f"_{caption}_\n\n"
        return html
    else:
        result = f"![{alt}]({rel_path})\n\n"
        if caption:
            result += f"_{caption}_\n\n"
        return result


def render_audio(rel_path: str, caption: str = "") -> str:
    """Render an audio player link (à la st.audio).

    Args:
        rel_path: Path or URL to the audio file.
        caption: Optional caption.
    """
    label = caption or "Audio"
    return f"🔊 [{label}]({rel_path})\n\n"


def render_video(rel_path: str, caption: str = "") -> str:
    """Render a video player link (à la st.video).

    Args:
        rel_path: Path or URL to the video file.
        caption: Optional caption.
    """
    label = caption or "Video"
    return f"🎬 [{label}]({rel_path})\n\n"


# ── Utility Widgets ───────────────────────────────────────────────────────────


def render_code_block(body: str, language: str = "python", line_numbers: bool = False) -> str:
    """Render a code block with language (à la st.code).

    Args:
        body: Code string.
        language: Syntax highlighting language.
        line_numbers: If True, prepend line numbers.
    """
    if line_numbers:
        lines = body.rstrip().split("\n")
        width = len(str(len(lines)))
        numbered = "\n".join(f"{i+1:>{width}} | {line}" for i, line in enumerate(lines))
        return f"```{language}\n{numbered}\n```\n\n"
    return f"```{language}\n{body.rstrip()}\n```\n\n"


def render_echo(source: str, output: str = "") -> str:
    """Render code and its output together (à la st.echo).

    Args:
        source: The source code.
        output: The output produced by the code.
    """
    result = f"```python\n{source.rstrip()}\n```\n\n"
    if output.strip():
        result += f"```text\n{output.rstrip()}\n```\n\n"
    return result


def render_empty() -> str:
    """Render an empty placeholder (à la st.empty)."""
    return ""


# ── Connection / Data Source ──────────────────────────────────────────────────


def render_connection_status(
    name: str,
    status: Literal["connected", "disconnected", "error"] = "connected",
    details: str = "",
) -> str:
    """Render a data connection status indicator.

    Args:
        name: Connection name.
        status: Current status.
        details: Optional extra information.
    """
    icons = {"connected": "🟢", "disconnected": "🔴", "error": "🟡"}
    icon = icons.get(status, "⚪")
    line = f"{icon} **{name}**: {status}"
    if details:
        line += f" — {details}"
    return line + "\n\n"
