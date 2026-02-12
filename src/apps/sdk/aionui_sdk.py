"""
AionUi App SDK for Python

Minimal SDK for Python apps (Streamlit, Flask, etc.) to integrate
with the AionUi AI platform. Uses the HTTP API to communicate.

Environment variables (auto-set by AionUi when spawning your app):
    AIONUI_API_URL   - HTTP API base URL (e.g., http://127.0.0.1:54321/__api)
    AIONUI_WS_URL    - WebSocket URL (for advanced use)
    AIONUI_PORT      - AppServer port
    AIONUI_APP_PORT  - Your app's port
    AIONUI_APP_NAME  - Your app's registered name

Usage in Streamlit:

    from aionui_sdk import AionUiApp

    app = AionUiApp()

    # Register a tool the AI agent can call
    @app.tool("get_stock_data", description="Get historical stock prices")
    def get_stock_data(symbol: str, period: str = "1Y"):
        df = fetch_stock_data(symbol, period)
        return {"prices": df.to_dict(), "symbol": symbol}

    # Push state so the agent knows what data is loaded
    app.set_state({
        "current_symbol": "AAPL",
        "price_data": prices,
        "analysis_results": results,
    })

    # Emit events
    app.emit_event("chart-clicked", {"chartId": "price_1Y"})

    # Process pending tool calls (call in Streamlit's event loop)
    app.process_tool_calls()
"""

import json
import os
import threading
import time
from typing import Any, Callable

import requests


class AionUiApp:
    """AionUi App SDK for Python apps."""

    def __init__(self, session_id: str | None = None, api_url: str | None = None):
        self.api_url = api_url or os.environ.get("AIONUI_API_URL", "")
        self.session_id = session_id or ""
        self._tools: dict[str, dict] = {}
        self._tool_handlers: dict[str, Callable] = {}
        self._polling = False
        self._poll_thread: threading.Thread | None = None

        if not self.api_url:
            raise ValueError(
                "AIONUI_API_URL not set. "
                "Run your app through AionUi or set the env var manually."
            )

    def set_session(self, session_id: str) -> None:
        """Set the session ID (from URL ?sid= parameter)."""
        self.session_id = session_id

    # ── Tools ──

    def tool(
        self,
        name: str,
        description: str = "",
        parameters: dict | None = None,
    ) -> Callable:
        """Decorator to register a tool the AI agent can call."""

        def decorator(func: Callable) -> Callable:
            self._tools[name] = {
                "name": name,
                "description": description,
                "parameters": parameters,
            }
            self._tool_handlers[name] = func
            # Register with AppServer
            if self.session_id:
                self._register_tools()
            return func

        return decorator

    def register_tool(
        self,
        name: str,
        handler: Callable,
        description: str = "",
        parameters: dict | None = None,
    ) -> None:
        """Register a tool imperatively (non-decorator style)."""
        self._tools[name] = {
            "name": name,
            "description": description,
            "parameters": parameters,
        }
        self._tool_handlers[name] = handler
        if self.session_id:
            self._register_tools()

    def _register_tools(self) -> None:
        """Push tool definitions to AppServer."""
        try:
            requests.post(
                f"{self.api_url}/tools",
                json={"sid": self.session_id, "tools": list(self._tools.values())},
                timeout=5,
            )
        except Exception:
            pass

    # ── State ──

    def set_state(self, state: dict[str, Any]) -> None:
        """Push structured state to the agent."""
        try:
            requests.post(
                f"{self.api_url}/state",
                json={"sid": self.session_id, "state": state},
                timeout=5,
            )
        except Exception as e:
            print(f"[AionUiApp] Failed to push state: {e}")

    def get_state(self) -> dict[str, Any]:
        """Read the current session state."""
        try:
            resp = requests.get(
                f"{self.api_url}/state",
                params={"sid": self.session_id},
                timeout=5,
            )
            return resp.json()
        except Exception:
            return {}

    # ── Events ──

    def emit_event(self, event: str, data: dict | None = None) -> None:
        """Emit an event to the backend."""
        try:
            payload = {"sid": self.session_id, "event": event}
            if data:
                payload.update(data)
            requests.post(f"{self.api_url}/event", json=payload, timeout=5)
        except Exception as e:
            print(f"[AionUiApp] Failed to emit event: {e}")

    # ── Tool Call Processing ──

    def process_tool_calls(self) -> list[dict]:
        """
        Poll for pending tool calls and execute them.
        Call this periodically (e.g., in a Streamlit rerun or timer).
        Returns list of results.
        """
        if not self.session_id:
            return []

        try:
            resp = requests.get(
                f"{self.api_url}/tools/pending",
                params={"sid": self.session_id},
                timeout=5,
            )
            pending = resp.json()
        except Exception:
            return []

        results = []
        for call in pending:
            tool_name = call.get("tool", "")
            handler = self._tool_handlers.get(tool_name)
            request_id = call.get("id", "")

            if not handler:
                self._send_tool_result(request_id, False, error=f"Tool not found: {tool_name}")
                continue

            try:
                result = handler(**(call.get("params", {})))
                self._send_tool_result(request_id, True, data=result)
                results.append({"tool": tool_name, "success": True, "data": result})
            except Exception as e:
                self._send_tool_result(request_id, False, error=str(e))
                results.append({"tool": tool_name, "success": False, "error": str(e)})

        return results

    def start_polling(self, interval: float = 1.0) -> None:
        """Start background polling for tool calls."""
        if self._polling:
            return
        self._polling = True

        def poll_loop():
            while self._polling:
                self.process_tool_calls()
                time.sleep(interval)

        self._poll_thread = threading.Thread(target=poll_loop, daemon=True)
        self._poll_thread.start()

    def stop_polling(self) -> None:
        """Stop background polling."""
        self._polling = False

    def _send_tool_result(
        self,
        request_id: str,
        success: bool,
        data: Any = None,
        error: str | None = None,
    ) -> None:
        """Send tool execution result back to AppServer."""
        try:
            payload: dict = {
                "sid": self.session_id,
                "requestId": request_id,
                "success": success,
            }
            if data is not None:
                payload["data"] = data
            if error:
                payload["error"] = error
            requests.post(f"{self.api_url}/tool-result", json=payload, timeout=5)
        except Exception:
            pass
