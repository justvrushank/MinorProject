from celery import Celery
from app.core.config import settings

celery = Celery("bluecarbon", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery.conf.update(
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    result_expires=3600,
)
