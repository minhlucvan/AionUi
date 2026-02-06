#!/usr/bin/env python3
"""
memU Local Server for AionUi
Thin FastAPI wrapper around memU's MemoryService, exposing /api/v3/memory/* endpoints
compatible with AionUi's MemuClient.

Usage:
    python memu_local_server.py --port 11411 --db-path /path/to/memu.db

Requires: pip install memu-py fastapi uvicorn[standard]
"""

import argparse
import json
import os
import sys
import signal
import tempfile
from contextlib import asynccontextmanager

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import JSONResponse
    import uvicorn
except ImportError:
    print("ERROR: fastapi and uvicorn are required. Install with: pip install fastapi uvicorn[standard]", file=sys.stderr)
    sys.exit(1)

try:
    from memu.app import MemoryService
except ImportError:
    print("ERROR: memu is required. Install with: pip install memu-py", file=sys.stderr)
    sys.exit(1)


memory_service: MemoryService | None = None


def build_llm_profiles(args):
    """Build LLM profiles from CLI args or environment variables."""
    base_url = args.llm_base_url or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    api_key = args.llm_api_key or os.getenv("OPENAI_API_KEY", "")
    chat_model = args.chat_model or os.getenv("CHAT_MODEL", "gpt-4o-mini")
    embed_model = args.embed_model or os.getenv("EMBED_MODEL", "text-embedding-3-small")

    if not api_key:
        print("WARNING: No LLM API key provided. Memory extraction will fail.", file=sys.stderr)

    return {
        "default": {
            "base_url": base_url,
            "api_key": api_key,
            "chat_model": chat_model,
            "embed_model": embed_model,
        },
        "embedding": {
            "base_url": base_url,
            "api_key": api_key,
            "embed_model": embed_model,
        },
    }


def build_database_config(args):
    """Build database config from CLI args."""
    db_path = args.db_path
    if db_path:
        return {
            "metadata_store": {
                "provider": "sqlite",
                "dsn": f"sqlite:///{db_path}",
                "ddl_mode": "create",
            },
            "vector_index": {"provider": "bruteforce"},
        }
    else:
        return {
            "metadata_store": {"provider": "inmemory"},
            "vector_index": {"provider": "bruteforce"},
        }


@asynccontextmanager
async def lifespan(app: FastAPI):
    global memory_service
    args = app.state.args

    memory_service = MemoryService(
        llm_profiles=build_llm_profiles(args),
        database_config=build_database_config(args),
    )
    print(f"[memU] Local server started (db: {args.db_path or 'in-memory'})", file=sys.stderr)
    yield
    print("[memU] Local server shutting down", file=sys.stderr)


app = FastAPI(title="memU Local Server", lifespan=lifespan)


# ─── Health ───────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "memu-local"}


# ─── /api/v3/memory/memorize ──────────────────────────────

@app.post("/api/v3/memory/memorize")
async def memorize(body: dict):
    try:
        resource_url = body.get("resource_url", "")
        modality = body.get("modality", "conversation")
        user = body.get("user")

        # For inline conversation data, write to temp file
        messages = body.get("messages")
        if messages and not os.path.exists(resource_url):
            tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False)
            json.dump(messages, tmp)
            tmp.close()
            resource_url = tmp.name

        result = await memory_service.memorize(
            resource_url=resource_url,
            modality=modality,
            user=user,
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── /api/v3/memory/retrieve ─────────────────────────────

@app.post("/api/v3/memory/retrieve")
async def retrieve(body: dict):
    try:
        queries = body.get("queries", [])
        where = body.get("where")
        result = await memory_service.retrieve(queries=queries, where=where)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── /api/v3/memory/items (CRUD) ─────────────────────────

@app.post("/api/v3/memory/items")
async def create_item(body: dict):
    try:
        result = await memory_service.create_memory_item(
            memory_type=body.get("memory_type", "knowledge"),
            memory_content=body.get("memory_content", ""),
            memory_categories=body.get("memory_categories", ["general"]),
            user=body.get("user"),
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/v3/memory/items")
async def delete_item(body: dict):
    try:
        result = await memory_service.delete_memory_item(
            memory_id=body.get("memory_id", ""),
            user=body.get("user"),
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v3/memory/items/list")
async def list_items(body: dict):
    try:
        result = await memory_service.list_memory_items(where=body.get("where"))
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── /api/v3/memory/categories ────────────────────────────

@app.post("/api/v3/memory/categories")
async def list_categories(body: dict):
    try:
        result = await memory_service.list_memory_categories(where=body.get("where"))
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── /api/v3/memory/clear ────────────────────────────────

@app.post("/api/v3/memory/clear")
async def clear_memory(body: dict):
    try:
        result = await memory_service.clear_memory(where=body.get("where"))
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Entry point ──────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="memU Local Server for AionUi")
    parser.add_argument("--port", type=int, default=11411, help="Server port (default: 11411)")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address (default: 127.0.0.1)")
    parser.add_argument("--db-path", default=None, help="SQLite database path (default: in-memory)")
    parser.add_argument("--llm-base-url", default=None, help="LLM API base URL")
    parser.add_argument("--llm-api-key", default=None, help="LLM API key")
    parser.add_argument("--chat-model", default=None, help="Chat model name")
    parser.add_argument("--embed-model", default=None, help="Embedding model name")
    args = parser.parse_args()

    app.state.args = args

    # Write ready signal to stdout for parent process detection
    print(json.dumps({"status": "starting", "port": args.port}), flush=True)

    # Handle graceful shutdown
    def handle_signal(sig, frame):
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
