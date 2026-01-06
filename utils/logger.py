# ============================================================================
# FILE 11: utils/logger.py - Logging Setup (FIXED FOR WINDOWS)
# ============================================================================

import logging
import sys
from pathlib import Path
from datetime import datetime


def setup_logging():
    """Configure application logging - Windows compatible"""
    
    # Create logs directory
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            # File handler (UTF-8 encoding for emojis)
            logging.FileHandler(
                log_dir / f'debate_ai_{datetime.now().date()}.log',
                encoding='utf-8'
            ),
            # Console handler (UTF-8 encoding)
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Set UTF-8 encoding for stdout (Windows fix)
    if sys.stdout.encoding != 'utf-8':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    # Set specific loggers
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)