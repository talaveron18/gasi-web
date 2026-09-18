"""Compatibility package for backend-local test execution.

The synthetic prototype CI executes pytest with backend/ as the working directory.
This package keeps absolute backend.* imports resolvable in that isolated context
without changing production routing or enabling any real-data path.
"""
