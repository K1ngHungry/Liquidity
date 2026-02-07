import httpx
import os
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)

class NessieClient:
    """Async client for Nessie Banking API."""

    def __init__(self, api_key: str, base_url: str = "http://api.nessieisreal.com"):
        self.api_key = api_key
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)

    def _build_url(self, endpoint: str) -> str:
        """Build full URL with API key."""
        return f"{self.base_url}/{endpoint}?key={self.api_key}"

    async def create_customer(
        self,
        first_name: str,
        last_name: str,
        address: Dict[str, str]
    ) -> Dict:
        """Create a new Nessie customer."""
        url = self._build_url("customers")
        
        # Split street address into number and name
        street_parts = address.get("street", "").split(" ", 1)
        street_number = street_parts[0] if street_parts else ""
        street_name = street_parts[1] if len(street_parts) > 1 else ""

        payload = {
            "first_name": first_name,
            "last_name": last_name,
            "address": {
                "street_number": street_number,
                "street_name": street_name,
                "city": address.get("city", ""),
                "state": address.get("state", ""),
                "zip": address.get("zip", "")
            }
        }
        response = await self.client.post(url, json=payload)
        response.raise_for_status()
        result = response.json()
        logger.info(f"Created Nessie customer: {result}")
        return result

    async def get_customer_accounts(self, customer_id: str) -> List[Dict]:
        """Get all accounts for a customer."""
        url = self._build_url(f"customers/{customer_id}/accounts")
        response = await self.client.get(url)
        response.raise_for_status()
        return response.json()

    async def get_account_bills(self, account_id: str) -> List[Dict]:
        """Get all bills for an account."""
        url = self._build_url(f"accounts/{account_id}/bills")
        response = await self.client.get(url)
        response.raise_for_status()
        return response.json()

    async def get_account_purchases(self, account_id: str) -> List[Dict]:
        """Get all purchases for an account."""
        url = self._build_url(f"accounts/{account_id}/purchases")
        response = await self.client.get(url)
        response.raise_for_status()
        return response.json()

    async def get_account_deposits(self, account_id: str) -> List[Dict]:
        """Get all deposits for an account."""
        url = self._build_url(f"accounts/{account_id}/deposits")
        response = await self.client.get(url)
        response.raise_for_status()
        return response.json()

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()


# Global instance (initialized on startup)
nessie_client: Optional[NessieClient] = None

def get_nessie_client() -> NessieClient:
    """Get the global Nessie client instance."""
    if nessie_client is None:
        raise RuntimeError("Nessie client not initialized")
    return nessie_client


def transform_nessie_to_constraints(
    accounts: List[Dict],
    bills: List[Dict]
) -> Dict[str, Any]:
    """
    Transform Nessie banking data into solver constraint JSON.

    Simple rule-based transformation:
    - Variables: One per spending category (bills, discretionary, savings)
    - Hard constraint: Total <= total balance
    - Hard constraint: bills = sum of all bills
    - Objective: Maximize savings
    """
    # Calculate total balance across all accounts
    total_balance = sum(int(acc.get("balance", 0)) for acc in accounts)

    # Calculate total bills
    total_bills = sum(int(bill.get("payment_amount", 0)) for bill in bills)

    # Define variables
    variables = [
        {"name": "bills", "lower_bound": 0, "upper_bound": total_balance},
        {"name": "discretionary", "lower_bound": 0, "upper_bound": total_balance},
        {"name": "savings", "lower_bound": 0, "upper_bound": total_balance},
    ]

    # Define constraints
    constraints = [
        {
            "expression": "bills + discretionary + savings <= " + str(total_balance),
            "constraint_type": "hard",
            "priority": 0,
            "description": "Total allocation cannot exceed available balance"
        },
        {
            "expression": "bills == " + str(total_bills),
            "constraint_type": "hard",
            "priority": 0,
            "description": "Must cover all bills"
        }
    ]

    # Objective: maximize savings
    objective = {
        "expression": "savings",
        "direction": "maximize"
    }

    return {
        "variables": variables,
        "constraints": constraints,
        "objective": objective
    }
