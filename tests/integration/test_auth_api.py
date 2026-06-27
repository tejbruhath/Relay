import pytest
from django.urls import reverse
from apps.tenants.models import APIKey, Tenant

pytestmark = pytest.mark.django_db

def test_register_returns_201_with_api_key(client):
    url = reverse("auth-register")
    data = {
        "name": "Test Tenant",
        "email": "test@test.com",
        "password": "strongpassword123"
    }
    response = client.post(url, data, format="json")
    
    assert response.status_code == 201
    assert "api_key" in response.data
    assert "tenant_id" in response.data
    assert "api_key_prefix" in response.data
    assert response.data["api_key"].startswith("rly_live_")

def test_register_api_key_shown_once(client):
    # This specifically tests that if we fetch keys later, the raw key isn't there
    url = reverse("auth-register")
    data = {
        "name": "Test Tenant",
        "email": "test@test.com",
        "password": "strongpassword123"
    }
    response = client.post(url, data, format="json")
    raw_key = response.data["api_key"]
    
    # Authenticate and get keys
    client.credentials(HTTP_X_RELAY_KEY=raw_key)
    list_url = reverse("apikey-list")
    list_response = client.get(list_url)
    
    assert list_response.status_code == 200
    assert len(list_response.data["results"]) == 1
    key_data = list_response.data["results"][0]
    
    assert "api_key" not in key_data
    assert key_data["prefix"] == raw_key[:16]

def test_register_duplicate_email_returns_400(client, tenant):
    url = reverse("auth-register")
    data = {
        "name": "Another Tenant",
        "email": tenant.email,  # Existing email
        "password": "strongpassword123"
    }
    response = client.post(url, data, format="json")
    assert response.status_code == 400

def test_register_missing_fields_returns_400(client):
    url = reverse("auth-register")
    data = {
        "name": "Test Tenant",
        # missing email
        "password": "strongpassword123"
    }
    response = client.post(url, data, format="json")
    assert response.status_code == 400

def test_register_creates_api_key_in_db(client):
    url = reverse("auth-register")
    data = {
        "name": "Test Tenant",
        "email": "test@test.com",
        "password": "strongpassword123"
    }
    response = client.post(url, data, format="json")
    tenant_id = response.data["tenant_id"]
    
    keys = APIKey.objects.filter(tenant_id=tenant_id)
    assert keys.count() == 1

def test_login_with_valid_credentials_returns_200(client):
    # First register
    register_url = reverse("auth-register")
    client.post(register_url, {
        "name": "Test Tenant",
        "email": "test@test.com",
        "password": "strongpassword123"
    }, format="json")
    
    # Then login
    login_url = reverse("auth-login")
    response = client.post(login_url, {
        "email": "test@test.com",
        "password": "strongpassword123"
    }, format="json")
    
    assert response.status_code == 200
    assert "token" in response.data

def test_login_with_wrong_password_returns_401(client):
    register_url = reverse("auth-register")
    client.post(register_url, {
        "name": "Test Tenant",
        "email": "test@test.com",
        "password": "strongpassword123"
    }, format="json")
    
    login_url = reverse("auth-login")
    response = client.post(login_url, {
        "email": "test@test.com",
        "password": "wrongpassword"
    }, format="json")
    
    assert response.status_code == 401

def test_login_with_nonexistent_email_returns_401(client):
    login_url = reverse("auth-login")
    response = client.post(login_url, {
        "email": "doesnotexist@test.com",
        "password": "password123"
    }, format="json")
    
    assert response.status_code == 401
