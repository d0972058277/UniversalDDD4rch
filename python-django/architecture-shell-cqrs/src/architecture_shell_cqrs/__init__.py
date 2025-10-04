"""
Architecture.Shell.Cqrs - CQRS mediator pattern for Python.

This package provides a mediator pattern implementation for routing
commands and queries with cross-cutting concerns like logging, validation,
and transaction management.
"""

from architecture_shell_cqrs.mediator import Mediator
from architecture_shell_cqrs.handlers import ICommandHandler, IQueryHandler
from architecture_shell_cqrs.behaviors import IPipelineBehavior
from architecture_shell_cqrs.requests import ICommand, IQuery
from architecture_shell_cqrs.unit import Unit, UnitType
from architecture_shell_cqrs.unit_of_work import IUnitOfWork

__version__ = "2.0.0"

__all__ = [
    "Mediator",
    "ICommandHandler",
    "IQueryHandler",
    "IPipelineBehavior",
    "ICommand",
    "IQuery",
    "Unit",
    "UnitType",
    "IUnitOfWork",
]
