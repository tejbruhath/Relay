import pytest
from unittest.mock import patch
from apps.webhooks.tasks import process_dlq
from apps.webhooks.models import WebhookEvent
from tests.factories import WebhookEventFactory

pytestmark = pytest.mark.django_db

@patch("apps.webhooks.tasks.redis.from_url")
def test_process_dlq_marks_events_dead(mock_redis):
    ev1 = WebhookEventFactory()
    ev2 = WebhookEventFactory()
    
    mock_redis_inst = mock_redis.return_value
    mock_redis_inst.xread.return_value = [
        [b"relay:dlq", [
            (b"1-0", {b"event_id": str(ev1.id).encode()}),
            (b"2-0", {b"event_id": str(ev2.id).encode()}),
        ]]
    ]

    process_dlq()

    ev1.refresh_from_db()
    ev2.refresh_from_db()
    assert ev1.status == "dead"
    assert ev2.status == "dead"

@patch("apps.webhooks.tasks.redis.from_url")
def test_process_dlq_xack_called(mock_redis):
    ev1 = WebhookEventFactory()
    
    mock_redis_inst = mock_redis.return_value
    mock_redis_inst.xread.return_value = [
        [b"relay:dlq", [
            (b"1-0", {b"event_id": str(ev1.id).encode()}),
        ]]
    ]

    process_dlq()

    mock_redis_inst.xack.assert_called_once_with("relay:dlq", "relay_group", b"1-0")
