import asyncio
import json
from typing import Set, Dict, Any

class SSEManager:
    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()

    async def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        self._subscribers.discard(q)

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        message = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
        for q in list(self._subscribers):
            try:
                await q.put(message)
            except Exception:
                self._subscribers.discard(q)

# Global singleton
sse_manager = SSEManager()
