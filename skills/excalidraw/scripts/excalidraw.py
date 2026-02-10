#!/usr/bin/env python3
"""
Excalidraw CLI Wrapper (Python version)
Translates CLI commands to agent-browser execute CustomEvents
Version: 2.0.0
"""
import sys
import json
import subprocess
import time
import argparse
from pathlib import Path
from analyzer import VisualAnalyzer

VERSION = "2.0.0"
SCRIPT_DIR = Path(__file__).parent


def load_control_script():
    """Load the JavaScript control script from external file"""
    control_script_path = SCRIPT_DIR / 'control-script.js'
    if not control_script_path.exists():
        print(f"Error: Control script not found at {control_script_path}", file=sys.stderr)
        sys.exit(1)

    with open(control_script_path, 'r', encoding='utf-8') as f:
        return f.read()

# Color palettes
PALETTES = {
    'frontend': {'bg': '#a5d8ff', 'stroke': '#1971c2'},
    'backend': {'bg': '#b2f2bb', 'stroke': '#2f9e44'},
    'database': {'bg': '#ffc9c9', 'stroke': '#c92a2a'},
    'external': {'bg': '#ffe066', 'stroke': '#f08c00'},
    'cache': {'bg': '#d0bfff', 'stroke': '#6741d9'},
    'queue': {'bg': '#ffd8a8', 'stroke': '#e67700'},
    'actor': {'bg': '#e9ecef', 'stroke': '#495057'},
    'neutral': {'bg': '#ffffff', 'stroke': '#000000'},
}


def run_agent_browser(command, *args):
    """Execute agent-browser command"""
    cmd = ['agent-browser', command] + list(args)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    return result.stdout


def execute_event(action, payload_dict):
    """Execute CustomEvent via agent-browser and wait for result"""
    request_id = f"req-{int(time.time() * 1000000)}"

    # Build payload string
    payload_parts = [f"action: '{action}'", f"requestId: '{request_id}'"]

    if payload_dict:
        payload_parts.extend([f"{k}: {v}" for k, v in payload_dict.items()])

    payload = ', '.join(payload_parts)

    # Combined JS: dispatch event + wait for result
    js_code = f"""(async () => {{
  // Dispatch the event
  window.dispatchEvent(new CustomEvent('chrome-mcp:execute', {{
    detail: {{ {payload} }}
  }}));

  // Wait for result with timeout
  return new Promise((resolve) => {{
    const timeoutId = setTimeout(() => {{
      window.removeEventListener('chrome-mcp:result', handler);
      resolve({{ error: 'Timeout waiting for result' }});
    }}, 10000);

    const handler = (event) => {{
      if (event.detail.requestId === '{request_id}') {{
        clearTimeout(timeoutId);
        window.removeEventListener('chrome-mcp:result', handler);
        if (event.detail.error) {{
          resolve({{ error: event.detail.error }});
        }} else {{
          resolve(event.detail.result);
        }}
      }}
    }};

    window.addEventListener('chrome-mcp:result', handler);
  }});
}})()"""

    result_str = run_agent_browser('eval', js_code)

    # Parse result
    try:
        result = json.loads(result_str) if result_str else None
        if isinstance(result, dict) and 'error' in result:
            print(f"Error from browser: {result['error']}", file=sys.stderr)
            return None
        return result
    except json.JSONDecodeError:
        return result_str  # Return raw string if not JSON


def apply_palette(palette_name):
    """Get colors for a palette"""
    return PALETTES.get(palette_name, {})


def cmd_init():
    """Initialize Excalidraw session"""
    print("Initializing Excalidraw...")
    run_agent_browser('open', 'https://excalidraw.com')
    time.sleep(3)

    print("Injecting control script...")
    control_script = load_control_script()
    run_agent_browser('eval', control_script)
    time.sleep(1)

    print("Clearing canvas...")
    execute_event('cleanup', {})
    time.sleep(1)

    print("✓ Excalidraw ready!")


def cmd_clear():
    """Clear canvas"""
    execute_event('cleanup', {})
    print("✓ Canvas cleared")


def cmd_get():
    """Get all scene elements"""
    execute_event('getSceneElements', {})


def cmd_add_shape(args):
    """Add a shape element"""
    element = {
        'type': args.type,
        'x': args.x,
        'y': args.y,
        'width': args.width,
        'height': args.height,
    }

    if args.id:
        element['id'] = args.id

    # Apply palette
    if args.palette:
        colors = apply_palette(args.palette)
        if colors:
            element['backgroundColor'] = colors['bg']
            element['strokeColor'] = colors['stroke']

    # Override with explicit colors
    if args.bg:
        element['backgroundColor'] = args.bg
    if args.stroke:
        element['strokeColor'] = args.stroke

    if args.frame:
        element['frameId'] = args.frame

    element_json = json.dumps(element)
    execute_event('addElement', {'element': element_json})


def cmd_add_text(args):
    """Add a text element"""
    element = {
        'type': 'text',
        'text': args.text,
        'x': args.x,
        'y': args.y,
        'width': args.width,
        'height': args.height,
        'fontSize': args.size,
        'strokeColor': args.color,
    }

    if args.id:
        element['id'] = args.id

    if args.container_id:
        element['containerId'] = args.container_id

    element_json = json.dumps(element)
    execute_event('addElement', {'element': element_json})


def cmd_add_arrow(args):
    """Add an arrow element"""
    element = {
        'type': 'arrow',
        'x': args.x,
        'y': args.y,
        'strokeColor': args.stroke,
    }

    if args.id:
        element['id'] = args.id

    # Parse points
    if args.points:
        element['points'] = json.loads(args.points)
    else:
        element['points'] = [[0, 0], [120, 0]]

    if args.start_binding:
        element['startBinding'] = {'elementId': args.start_binding}

    if args.end_binding:
        element['endBinding'] = {'elementId': args.end_binding}

    element_json = json.dumps(element)
    execute_event('addElement', {'element': element_json})


def cmd_add_frame(args):
    """Add a frame element"""
    element = {
        'type': 'frame',
        'x': args.x,
        'y': args.y,
        'width': args.width,
        'height': args.height,
    }

    if args.id:
        element['id'] = args.id

    if args.name:
        element['name'] = args.name

    element_json = json.dumps(element)
    execute_event('addElement', {'element': element_json})


def cmd_link_text(shape_id, text_id):
    """Link text to shape (bidirectional)"""
    # Update shape to reference text
    shape_update = json.dumps({
        'id': shape_id,
        'boundElements': [{'type': 'text', 'id': text_id}]
    })
    execute_event('updateElement', {'element': shape_update})

    # Update text to reference shape
    text_update = json.dumps({
        'id': text_id,
        'containerId': shape_id
    })
    execute_event('updateElement', {'element': text_update})


def cmd_bind_arrow(arrow_id, from_id, to_id):
    """Bind arrow to shapes (bidirectional)"""
    # Update arrow with bindings
    arrow_update = json.dumps({
        'id': arrow_id,
        'startBinding': {'elementId': from_id, 'focus': 0, 'gap': 1},
        'endBinding': {'elementId': to_id, 'focus': 0, 'gap': 1}
    })
    execute_event('updateElement', {'element': arrow_update})

    # Update source element
    from_update = json.dumps({
        'id': from_id,
        'boundElements': [{'type': 'arrow', 'id': arrow_id}]
    })
    execute_event('updateElement', {'element': from_update})

    # Update target element
    to_update = json.dumps({
        'id': to_id,
        'boundElements': [{'type': 'arrow', 'id': arrow_id}]
    })
    execute_event('updateElement', {'element': to_update})


def cmd_delete(element_id):
    """Delete an element"""
    execute_event('deleteElement', {'elementId': f"'{element_id}'"})


def cmd_snapshot(args):
    """Capture full canvas snapshot with image and metadata"""
    print("Capturing snapshot...")
    result = execute_event('captureSnapshot', {})

    if result and isinstance(result, dict):
        # Save to file if output specified
        if hasattr(args, 'output') and args.output:
            output_file = Path(args.output)
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=2)
            print(f"Snapshot saved to {output_file}")
        else:
            # Print metadata summary
            print(f"\nSnapshot captured at {result.get('timestamp')}")
            print(f"Canvas dimensions: {result.get('dimensions', {}).get('width')}x{result.get('dimensions', {}).get('height')}")
            print(f"Elements: {len(result.get('elements', []))}")
            print(f"Viewport zoom: {result.get('viewport', {}).get('zoom')}")

            if hasattr(args, 'show_image') and args.show_image:
                print(f"\nImage data (base64): {result.get('image')[:100]}...")
    else:
        print("Error: Failed to capture snapshot", file=sys.stderr)


def cmd_get_state(args):
    """Get lightweight scene metadata (fast, no image encoding)"""
    print("Getting scene metadata...")
    result = execute_event('getMetadata', {})

    if result and isinstance(result, dict):
        print(f"\nScene Metadata:")
        print(f"  Total elements: {result.get('elementCount', 0)}")

        elements_by_type = result.get('elementsByType', {})
        if elements_by_type:
            print(f"  Elements by type:")
            for elem_type, count in elements_by_type.items():
                print(f"    {elem_type}: {count}")

        bbox = result.get('boundingBox')
        if bbox:
            print(f"  Bounding box: {bbox.get('width')}x{bbox.get('height')} at ({bbox.get('x')}, {bbox.get('y')})")

        connections = result.get('connections', {})
        print(f"  Arrows: {connections.get('total', 0)} ({connections.get('connected', 0)} connected, {connections.get('disconnected', 0)} disconnected)")

        issues = result.get('hasIssues', {})
        issue_count = issues.get('count', 0)
        if issue_count > 0:
            print(f"  ⚠ Issues detected ({issue_count}):")
            if issues.get('overlaps'):
                print(f"    - Element overlaps")
            if issues.get('smallText'):
                print(f"    - Text too small (< 12px)")
            if issues.get('disconnectedArrows'):
                print(f"    - Disconnected arrows")
        else:
            print(f"  ✓ No issues detected")

        if hasattr(args, 'output') and args.output:
            output_file = Path(args.output)
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=2)
            print(f"\nMetadata saved to {output_file}")
    else:
        print("Error: Failed to get metadata", file=sys.stderr)


def cmd_analyze(args):
    """Analyze diagram quality and provide scoring"""
    print("Analyzing diagram quality...")

    # Get full scene data
    result = execute_event('getSceneElements', {})

    if not result or not isinstance(result, list):
        print("Error: Failed to get scene elements", file=sys.stderr)
        return

    # Create metadata structure for analyzer
    metadata = {'elements': result}

    # Run analysis
    analyzer = VisualAnalyzer()
    report = analyzer.analyze(metadata)

    # Display report
    print(f"\n{'='*60}")
    print(f"DIAGRAM QUALITY REPORT")
    print(f"{'='*60}")
    print(f"\nOverall Score: {report['score']}/100 (Grade: {report['grade']})")
    print(f"Quality Level: {report['quality_level']}")
    print(f"Elements Analyzed: {report['element_count']}")

    if report['issues']:
        print(f"\n❌ Issues ({len(report['issues'])}):")
        for issue in report['issues']:
            print(f"  • {issue}")

    if report['warnings']:
        print(f"\n⚠️  Warnings ({len(report['warnings'])}):")
        for warning in report['warnings']:
            print(f"  • {warning}")

    if report['suggestions']:
        print(f"\n💡 Suggestions:")
        for suggestion in report['suggestions']:
            print(f"  • {suggestion}")

    print(f"\n{'='*60}\n")

    # Save report if output specified
    if hasattr(args, 'output') and args.output:
        output_file = Path(args.output)
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"Report saved to {output_file}")


def cmd_export_excalidraw(args):
    """Export scene as .excalidraw file"""
    result = execute_event('exportExcalidraw', {})

    if not result:
        print("Error: Failed to export Excalidraw data", file=sys.stderr)
        sys.exit(1)

    # Save to file
    output_file = Path(args.output)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)

    element_count = len(result.get('elements', []))
    print(f"✓ Exported {element_count} elements to {output_file}")
    print(f"  Format: Excalidraw JSON v{result.get('version', 2)}")
    print(f"  File size: {output_file.stat().st_size} bytes")


def cmd_export_png(args):
    """Export scene as PNG image"""
    result = execute_event('exportPNG', {})

    if not result:
        print("Error: Failed to export PNG data", file=sys.stderr)
        sys.exit(1)

    # Decode base64 image data
    image_data = result.get('imageData', '')
    if not image_data.startswith('data:image/png;base64,'):
        print("Error: Invalid PNG data format", file=sys.stderr)
        sys.exit(1)

    import base64
    base64_data = image_data.split(',', 1)[1]
    png_bytes = base64.b64decode(base64_data)

    # Save to file
    output_file = Path(args.output)
    with open(output_file, 'wb') as f:
        f.write(png_bytes)

    element_count = result.get('elementCount', 0)
    width = result.get('width', 0)
    height = result.get('height', 0)

    print(f"✓ Exported PNG to {output_file}")
    print(f"  Elements: {element_count}")
    print(f"  Dimensions: {width}x{height}px")
    print(f"  File size: {len(png_bytes)} bytes")


def cmd_template(template_name):
    """Run a template"""
    skill_dir = Path(__file__).parent.parent
    template_file = skill_dir / 'templates' / f'{template_name}.sh'

    if not template_file.exists():
        print(f"Error: Template '{template_name}' not found at {template_file}", file=sys.stderr)
        sys.exit(1)

    subprocess.run(['bash', str(template_file)])


def cmd_batch(input_file):
    """Execute batch operations from JSON"""
    if input_file == '-':
        json_content = sys.stdin.read()
    else:
        with open(input_file, 'r') as f:
            json_content = f.read()

    data = json.loads(json_content)

    for operation in data.get('operations', []):
        cmd = operation.pop('command')
        # Convert operation dict to args-like object
        # This is simplified - full implementation would need proper arg parsing
        print(f"Executing: {cmd} with {operation}")


def cmd_version():
    """Show version"""
    print(f"excalidraw CLI v{VERSION} (Python)")


def cmd_help():
    """Show help"""
    help_text = """
Excalidraw CLI - Programmatic diagram creation tool (Python version)

USAGE:
  excalidraw.py <command> [options]

COMMANDS:
  Session Management:
    init                      Initialize Excalidraw session
    clear                     Clear the canvas
    get                       Get all elements as JSON

  Element Creation:
    add-shape [options]       Create a shape (rectangle/ellipse/diamond)
    add-text [options]        Create a text element
    add-arrow [options]       Create an arrow/line
    add-frame [options]       Create a frame container

  Relationships:
    link-text <shape> <text>  Link text to shape (bidirectional)
    bind-arrow <arrow> <from> <to>
                              Bind arrow to shapes (bidirectional)

  Visual Feedback:
    snapshot [options]        Capture full canvas snapshot (image + metadata)
    get-state [options]       Get scene metadata (fast, no image)
    analyze [options]         Analyze diagram quality and get scored report

  Export:
    export-excalidraw -o <file>
                              Export scene as .excalidraw file (JSON format)
    export-png -o <file>      Export scene as PNG image

  Utilities:
    delete <element-id>       Delete an element
    template <name>           Run a template
    batch [file]              Execute batch operations from JSON

  Info:
    version                   Show version
    help                      Show this help

EXAMPLES:
  # Initialize session
  python3 excalidraw.py init

  # Create shape with text
  python3 excalidraw.py add-shape --type rectangle --id "api" --x 100 --y 100 --width 200 --height 100 --palette backend
  python3 excalidraw.py add-text --id "api-label" --text "API Service" --x 160 --y 135 --container-id "api"
  python3 excalidraw.py link-text api api-label

  # Connect shapes with arrow
  python3 excalidraw.py add-arrow --id "flow" --x 280 --y 150 --points "[[0,0],[120,0]]"
  python3 excalidraw.py bind-arrow flow api database

  # Use template
  python3 excalidraw.py template architecture-diagram

For more information, see the documentation in .claude/skills/excalidraw-diagram/
"""
    print(help_text)


def main():
    """Main command dispatcher"""
    if len(sys.argv) < 2:
        cmd_help()
        return

    command = sys.argv[1]

    # Simple commands (including flag variants)
    if command in ['init', 'clear', 'get', 'version', '--version', '-v', 'help', '--help', '-h']:
        cmd_map = {
            'init': cmd_init,
            'clear': cmd_clear,
            'get': cmd_get,
            'version': cmd_version,
            '--version': cmd_version,
            '-v': cmd_version,
            'help': cmd_help,
            '--help': cmd_help,
            '-h': cmd_help,
        }
        cmd_map[command]()
        return

    # Commands with positional args
    if command == 'link-text':
        if len(sys.argv) < 4:
            print("Error: link-text requires <shape-id> <text-id>", file=sys.stderr)
            sys.exit(1)
        cmd_link_text(sys.argv[2], sys.argv[3])
        return

    if command == 'bind-arrow':
        if len(sys.argv) < 5:
            print("Error: bind-arrow requires <arrow-id> <from-id> <to-id>", file=sys.stderr)
            sys.exit(1)
        cmd_bind_arrow(sys.argv[2], sys.argv[3], sys.argv[4])
        return

    if command == 'delete':
        if len(sys.argv) < 3:
            print("Error: delete requires <element-id>", file=sys.stderr)
            sys.exit(1)
        cmd_delete(sys.argv[2])
        return

    if command == 'template':
        if len(sys.argv) < 3:
            print("Error: template requires <name>", file=sys.stderr)
            sys.exit(1)
        cmd_template(sys.argv[2])
        return

    if command == 'batch':
        input_file = sys.argv[2] if len(sys.argv) > 2 else '-'
        cmd_batch(input_file)
        return

    # Commands with argparse
    if command == 'add-shape':
        parser = argparse.ArgumentParser(prog='excalidraw.py add-shape')
        parser.add_argument('--id', help='Element ID')
        parser.add_argument('--type', required=True, help='Shape type (rectangle/ellipse/diamond)')
        parser.add_argument('--x', type=int, required=True, help='X position')
        parser.add_argument('--y', type=int, required=True, help='Y position')
        parser.add_argument('--width', type=int, required=True, help='Width')
        parser.add_argument('--height', type=int, required=True, help='Height')
        parser.add_argument('--bg', help='Background color')
        parser.add_argument('--stroke', help='Stroke color')
        parser.add_argument('--palette', help='Color palette name')
        parser.add_argument('--frame', help='Frame ID')
        args = parser.parse_args(sys.argv[2:])
        cmd_add_shape(args)
        return

    if command == 'add-text':
        parser = argparse.ArgumentParser(prog='excalidraw.py add-text')
        parser.add_argument('--id', help='Element ID')
        parser.add_argument('--text', required=True, help='Text content')
        parser.add_argument('--x', type=int, required=True, help='X position')
        parser.add_argument('--y', type=int, required=True, help='Y position')
        parser.add_argument('--width', type=int, default=200, help='Width')
        parser.add_argument('--height', type=int, default=50, help='Height')
        parser.add_argument('--size', type=int, default=20, help='Font size')
        parser.add_argument('--color', default='#000000', help='Text color')
        parser.add_argument('--container-id', help='Container element ID')
        args = parser.parse_args(sys.argv[2:])
        cmd_add_text(args)
        return

    if command == 'add-arrow':
        parser = argparse.ArgumentParser(prog='excalidraw.py add-arrow')
        parser.add_argument('--id', help='Element ID')
        parser.add_argument('--x', type=int, required=True, help='X position')
        parser.add_argument('--y', type=int, required=True, help='Y position')
        parser.add_argument('--points', help='Points array as JSON')
        parser.add_argument('--stroke', default='#000000', help='Stroke color')
        parser.add_argument('--start-binding', help='Start binding element ID')
        parser.add_argument('--end-binding', help='End binding element ID')
        args = parser.parse_args(sys.argv[2:])
        cmd_add_arrow(args)
        return

    if command == 'add-frame':
        parser = argparse.ArgumentParser(prog='excalidraw.py add-frame')
        parser.add_argument('--id', help='Element ID')
        parser.add_argument('--name', help='Frame name')
        parser.add_argument('--x', type=int, required=True, help='X position')
        parser.add_argument('--y', type=int, required=True, help='Y position')
        parser.add_argument('--width', type=int, required=True, help='Width')
        parser.add_argument('--height', type=int, required=True, help='Height')
        args = parser.parse_args(sys.argv[2:])
        cmd_add_frame(args)
        return

    if command == 'snapshot':
        parser = argparse.ArgumentParser(prog='excalidraw.py snapshot')
        parser.add_argument('--output', '-o', help='Save snapshot to JSON file')
        parser.add_argument('--show-image', action='store_true', help='Show base64 image data')
        args = parser.parse_args(sys.argv[2:])
        cmd_snapshot(args)
        return

    if command == 'get-state':
        parser = argparse.ArgumentParser(prog='excalidraw.py get-state')
        parser.add_argument('--output', '-o', help='Save metadata to JSON file')
        args = parser.parse_args(sys.argv[2:])
        cmd_get_state(args)
        return

    if command == 'analyze':
        parser = argparse.ArgumentParser(prog='excalidraw.py analyze')
        parser.add_argument('--output', '-o', help='Save analysis report to JSON file')
        args = parser.parse_args(sys.argv[2:])
        cmd_analyze(args)
        return

    if command == 'export-excalidraw':
        parser = argparse.ArgumentParser(prog='excalidraw.py export-excalidraw')
        parser.add_argument('--output', '-o', required=True, help='Output .excalidraw file path')
        args = parser.parse_args(sys.argv[2:])
        cmd_export_excalidraw(args)
        return

    if command == 'export-png':
        parser = argparse.ArgumentParser(prog='excalidraw.py export-png')
        parser.add_argument('--output', '-o', required=True, help='Output PNG file path')
        args = parser.parse_args(sys.argv[2:])
        cmd_export_png(args)
        return

    print(f"Unknown command: {command}", file=sys.stderr)
    print("Run 'excalidraw.py help' for usage", file=sys.stderr)
    sys.exit(1)


if __name__ == '__main__':
    main()
