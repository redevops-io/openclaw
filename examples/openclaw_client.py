#!/usr/bin/env python3
"""
Quick integration client for OpenClaw Gateway
Add this to your telegram-bot/services/ directory
"""

import aiohttp
import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class OpenClawResponse:
    """OpenClaw API response"""
    success: bool
    response: str
    tool_used: Optional[str] = None
    error: Optional[str] = None


class OpenClawClient:
    """Client for OpenClaw Gateway API"""

    def __init__(self, base_url: str = "http://localhost:18789"):
        self.base_url = base_url.rstrip("/")
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def health_check(self) -> bool:
        """Check if OpenClaw gateway is healthy"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/health",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as resp:
                    return resp.status == 200
        except Exception as e:
            logger.error(f"OpenClaw health check failed: {e}")
            return False

    async def send_message(
        self,
        user_id: int,
        message: str,
        workspace_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> OpenClawResponse:
        """
        Send message to OpenClaw for processing

        Args:
            user_id: Telegram user ID
            message: User's message text
            workspace_id: Optional workspace identifier
            session_id: Optional session ID for continuity

        Returns:
            OpenClawResponse with success status and response text
        """
        if not self.session:
            self.session = aiohttp.ClientSession()

        payload = {
            "userId": str(user_id),
            "message": message,
            "channel": "telegram"
        }

        if workspace_id:
            payload["workspaceId"] = workspace_id
        if session_id:
            payload["sessionId"] = session_id

        try:
            async with self.session.post(
                f"{self.base_url}/api/message",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return OpenClawResponse(
                        success=True,
                        response=data.get("response", ""),
                        tool_used=data.get("toolUsed"),
                    )
                else:
                    error_text = await resp.text()
                    logger.error(
                        f"OpenClaw API error {resp.status}: {error_text}")
                    return OpenClawResponse(
                        success=False,
                        response="",
                        error=f"API error: {resp.status}"
                    )
        except asyncio.TimeoutError:
            logger.error("OpenClaw request timed out")
            return OpenClawResponse(
                success=False,
                response="",
                error="Request timed out"
            )
        except Exception as e:
            logger.error(f"OpenClaw request failed: {e}")
            return OpenClawResponse(
                success=False,
                response="",
                error=str(e)
            )

    async def call_tool(
        self,
        tool_name: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Call a specific OpenClaw tool directly

        Args:
            tool_name: Name of the tool (e.g., "brave-search", "clickup")
            params: Tool-specific parameters

        Returns:
            Tool execution result
        """
        if not self.session:
            self.session = aiohttp.ClientSession()

        try:
            async with self.session.post(
                f"{self.base_url}/api/tools/{tool_name}",
                json=params,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as resp:
                if resp.status == 200:
                    return await resp.json()
                else:
                    error_text = await resp.text()
                    raise Exception(f"Tool call failed: {error_text}")
        except Exception as e:
            logger.error(f"Tool {tool_name} failed: {e}")
            raise


# Helper functions for common tools

async def search_web(query: str, count: int = 10) -> Dict[str, Any]:
    """Search the web using Brave Search"""
    async with OpenClawClient() as client:
        return await client.call_tool("brave-search", {
            "query": query,
            "count": count
        })


async def create_clickup_task(
    list_id: str,
    task_name: str,
    description: str = "",
    priority: int = 3,
    assignees: list = None
) -> Dict[str, Any]:
    """Create a ClickUp task"""
    async with OpenClawClient() as client:
        return await client.call_tool("clickup", {
            "action": "createTask",
            "listId": list_id,
            "data": {
                "name": task_name,
                "description": description,
                "priority": priority,
                "assignees": assignees or []
            }
        })


async def query_notion_database(
    database_id: str,
    filter_dict: Optional[Dict] = None,
    sorts: Optional[list] = None
) -> Dict[str, Any]:
    """Query a Notion database"""
    async with OpenClawClient() as client:
        params = {
            "action": "queryDatabase",
            "dataSourceId": database_id
        }
        if filter_dict:
            params["filter"] = filter_dict
        if sorts:
            params["sorts"] = sorts
        return await client.call_tool("notion", params)


async def list_airtable_records(
    base_id: str,
    table_name: str,
    max_records: int = 100,
    filter_formula: Optional[str] = None
) -> Dict[str, Any]:
    """List records from an Airtable table"""
    async with OpenClawClient() as client:
        params = {
            "action": "listRecords",
            "baseId": base_id,
            "tableIdOrName": table_name,
            "maxRecords": max_records
        }
        if filter_formula:
            params["filterByFormula"] = filter_formula
        return await client.call_tool("airtable", params)


# Example usage
if __name__ == "__main__":
    import asyncio

    async def test():
        # Health check
        client = OpenClawClient()
        if await client.health_check():
            print("✅ OpenClaw gateway is healthy")
        else:
            print("❌ OpenClaw gateway is not reachable")
            return

        # Test message processing
        async with OpenClawClient() as client:
            response = await client.send_message(
                user_id=123456,
                message="Search for latest AI developments",
                workspace_id="test-workspace"
            )

            if response.success:
                print(f"✅ Response: {response.response}")
                if response.tool_used:
                    print(f"   Tool used: {response.tool_used}")
            else:
                print(f"❌ Error: {response.error}")

        # Test direct tool call
        try:
            results = await search_web("OpenClaw AI", count=3)
            print(f"✅ Found {len(results.get('results', []))} search results")
        except Exception as e:
            print(f"❌ Search failed: {e}")

    asyncio.run(test())
