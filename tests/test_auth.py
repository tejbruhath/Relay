import pytest
from rest_framework.test import APIClient
from apps.tenants.models import Tenant, APIKey

pytestmark = pytest.mark.django_db


def test_register_tenant_success():
    client = APIClient()
    response = client.post('/api/v1/auth/register/', {
        'name': 'Test Company',
        'email': 'test@example.com',
        'password': 'password123'
    }, format='json')
    
    assert response.status_code == 201
    assert 'tenant_id' in response.data
    assert 'api_key' in response.data
    
    tenant = Tenant.objects.get(email='test@example.com')
    assert tenant.name == 'Test Company'


def test_login_success(tenant):
    from django.contrib.auth.hashers import make_password
    tenant.password_hash = make_password('password123')
    tenant.save()

    client = APIClient()
    response = client.post('/api/v1/auth/login/', {
        'email': tenant.email,
        'password': 'password123'
    }, format='json')
    
    assert response.status_code == 200
    assert 'tenant_id' in response.data
    assert 'email' in response.data


def test_login_failure(tenant):
    from django.contrib.auth.hashers import make_password
    tenant.password_hash = make_password('password123')
    tenant.save()

    client = APIClient()
    response = client.post('/api/v1/auth/login/', {
        'email': tenant.email,
        'password': 'wrongpassword'
    }, format='json')
    
    assert response.status_code == 400


def test_auth_missing_header():
    client = APIClient()
    response = client.get('/api/v1/endpoints/')
    assert response.status_code == 401


def test_auth_invalid_key():
    client = APIClient()
    response = client.get('/api/v1/endpoints/', HTTP_X_RELAY_KEY='invalid_key')
    assert response.status_code == 401


def test_auth_inactive_key(tenant, api_key):
    raw_key, key_obj = api_key
    key_obj.is_active = False
    key_obj.save()

    client = APIClient()
    response = client.get('/api/v1/endpoints/', HTTP_X_RELAY_KEY=raw_key)
    assert response.status_code == 401


def test_auth_updates_last_used_at(tenant, api_key):
    raw_key, key_obj = api_key
    assert key_obj.last_used_at is None

    client = APIClient()
    response = client.get('/api/v1/endpoints/', HTTP_X_RELAY_KEY=raw_key)
    assert response.status_code == 200

    key_obj.refresh_from_db()
    assert key_obj.last_used_at is not None


def test_api_key_crud(auth_headers):
    client = APIClient()
    
    # Create
    response = client.post('/api/v1/api-keys/', {'name': 'New Key'}, format='json', **auth_headers)
    assert response.status_code == 201
    assert response.data['name'] == 'New Key'
    assert 'api_key' in response.data
    key_id = response.data['id']
    
    # List
    response = client.get('/api/v1/api-keys/', **auth_headers)
    assert response.status_code == 200
    assert len(response.data) >= 2 # Includes the one from auth_headers
    
    # Delete
    response = client.delete(f'/api/v1/api-keys/{key_id}/', **auth_headers)
    assert response.status_code == 204
    
    # Verify deleted
    key_obj = APIKey.objects.get(id=key_id)
    assert key_obj.is_active is False
