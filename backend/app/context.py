"""
Context builder for merging Nessie-derived constraints with user-defined constraints.

This module transforms dashboard data and user preferences into a complete
solver input JSON that the OR-Tools CP-SAT solver can process.
"""

from typing import Any
import uuid

from app.models import UserConstraint, UserPriority, DashboardResponse


def _sanitize_category_name(name: str) -> str:
    """Convert category name to valid Python identifier for solver."""
    return name.lower().replace(" ", "_").replace("-", "_").replace("&", "and")


def build_constraints_from_dashboard(
    dashboard: DashboardResponse,
) -> list[UserConstraint]:
    """
    Generate pre-populated constraints from Nessie dashboard data.
    
    Creates soft constraints based on historical spending patterns:
    - For each category, suggest limit at ~120% of historical average
    - Income becomes a hard budget ceiling
    """
    constraints: list[UserConstraint] = []
    
    # Create soft constraints for each spending category
    for idx, category in enumerate(dashboard.categoryBreakdown):
        cat_name = _sanitize_category_name(category.category)
        # Suggest limit at 120% of historical (allow some flexibility)
        suggested_limit = int(category.amount * 1.2)
        
        constraints.append(
            UserConstraint(
                id=f"nessie-{idx}",
                category=cat_name,
                operator="<=",
                amount=suggested_limit,
                constraint_type="soft",
                priority=2,  # Medium priority
                description=f"{category.category} (historical: ${int(category.amount)})",
                source="nessie",
            )
        )
    
    return constraints


def build_solver_input(
    monthly_income: int,
    user_constraints: list[UserConstraint],
    category_priorities: list[UserPriority] | None = None,
    objective_category: str = "savings",
    objective_direction: str = "maximize",
) -> dict[str, Any]:
    """
    Build complete solver input JSON from user constraints.
    
    Args:
        monthly_income: Total monthly budget ceiling
        user_constraints: List of form-based constraints
        category_priorities: Optional priority overrides
        objective_category: Variable to optimize (default: "savings")
        objective_direction: "maximize" or "minimize"
    
    Returns:
        Dict ready for solve_from_json()
    """
    # Collect all unique categories from constraints
    categories = set()
    for c in user_constraints:
        categories.add(c.category)
    
    # Ensure savings category exists for objective
    if objective_category not in categories:
        categories.add(objective_category)
    
    # Build variables (one per category)
    variables = [
        {"name": cat, "lower_bound": 0, "upper_bound": monthly_income}
        for cat in sorted(categories)
    ]
    
    # Build priority map from user preferences
    priority_map: dict[str, int] = {}
    if category_priorities:
        for p in category_priorities:
            priority_map[p.category] = p.priority
    
    # Build constraints
    constraints: list[dict[str, Any]] = []
    
    # Hard constraint: total cannot exceed income
    all_cats = " + ".join(sorted(categories))
    constraints.append({
        "expression": f"{all_cats} <= {monthly_income}",
        "constraint_type": "hard",
        "priority": 0,
        "description": f"Total cannot exceed ${monthly_income:,} income",
    })
    
    # Add user/nessie constraints
    for c in user_constraints:
        # Use priority from user preference if available, else from constraint
        priority = priority_map.get(c.category, c.priority)
        
        constraints.append({
            "expression": f"{c.category} {c.operator} {c.amount}",
            "constraint_type": c.constraint_type,
            "priority": priority,
            "description": c.description or f"{c.category} {c.operator} ${c.amount}",
        })
    
    return {
        "variables": variables,
        "constraints": constraints,
        "objective": {
            "expression": objective_category,
            "direction": objective_direction,
        },
    }


def merge_constraints(
    nessie_constraints: list[UserConstraint],
    user_constraints: list[UserConstraint],
) -> list[UserConstraint]:
    """
    Merge Nessie-generated and user-defined constraints.
    
    User constraints override Nessie constraints for the same category.
    """
    # Index Nessie constraints by category
    merged: dict[str, UserConstraint] = {}
    
    for c in nessie_constraints:
        merged[c.category] = c
    
    # User constraints override
    for c in user_constraints:
        merged[c.category] = c
    
    return list(merged.values())


def generate_constraint_id() -> str:
    """Generate a unique constraint ID."""
    return f"user-{uuid.uuid4().hex[:8]}"
