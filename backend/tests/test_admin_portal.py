import pytest
from datetime import datetime, timezone
from tests.test_api import client, TestingSessionLocal
from database.models import AdminUser, PoliceOfficer, Incident, CommunitySafetyAlert

def get_admin_token():
    # Ensure admin user exists in test db
    db = TestingSessionLocal()
    admin = db.query(AdminUser).filter(AdminUser.admin_id == "admin").first()
    if not admin:
        client.post("/admin/auth/setup")
    db.close()
    
    login_resp = client.post("/admin/auth/login", json={
        "admin_id": "admin",
        "password": "admin123"
    })
    assert login_resp.status_code == 200, login_resp.text
    return login_resp.json()["access_token"]

def test_admin_login_and_me():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    me_resp = client.get("/admin/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["admin_id"] == "admin"
    assert me_resp.json()["role"] == "ADMIN"

def test_admin_comprehensive_stats():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    stats_resp = client.get("/admin/stats", headers=headers)
    assert stats_resp.status_code == 200
    data = stats_resp.json()
    assert "total_users" in data
    assert "total_officers" in data
    assert "on_duty_officers" in data
    assert "pending_incidents" in data
    assert "active_responses" in data
    assert "resolved_incidents" in data
    assert "patrol_units_available" in data
    assert "total_crime_reports" in data
    assert "verified_crime_reports" in data
    assert "active_safety_alerts" in data
    assert "weekly_crime_count" in data
    assert "locality_crime_rankings" in data

def test_admin_officer_management_lifecycle():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Provision new officer
    create_resp = client.post("/admin/officers", headers=headers, json={
        "badge_number": "POL-999",
        "name": "Admin Created Officer",
        "email": "pol999@police.gov.in",
        "password": "OfficerSecret@2026",
        "rank": "Inspector",
        "role": "OFFICER",
        "station_name": "Koramangala Station",
        "assigned_zone": "Koramangala",
        "phone": "+919999988888"
    })
    assert create_resp.status_code == 201, create_resp.text
    officer_data = create_resp.json()
    officer_id = officer_data["id"]
    assert officer_data["badge_number"] == "POL-999"
    assert officer_data["is_active"] is True
    
    # 2. List officers and verify new officer present
    list_resp = client.get("/admin/officers", headers=headers)
    assert list_resp.status_code == 200
    officers = list_resp.json()
    assert any(o["badge_number"] == "POL-999" for o in officers)
    
    # 3. Toggle officer status (deactivate)
    deact_resp = client.put(f"/admin/officers/{officer_id}/status", headers=headers, json={
        "is_active": False
    })
    assert deact_resp.status_code == 200
    assert deact_resp.json()["is_active"] is False
    
    # 4. Reactivate officer
    react_resp = client.put(f"/admin/officers/{officer_id}/status", headers=headers, json={
        "is_active": True
    })
    assert react_resp.status_code == 200
    assert react_resp.json()["is_active"] is True
    
    # 5. Update officer profile
    update_resp = client.put(f"/admin/officers/{officer_id}", headers=headers, json={
        "rank": "Senior Inspector",
        "station_name": "Cyber Command Division"
    })
    assert update_resp.status_code == 200

def test_admin_crime_report_verification():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # List reports
    reports_resp = client.get("/admin/crime-reports", headers=headers)
    assert reports_resp.status_code == 200
    reports = reports_resp.json()
    
    if len(reports) > 0:
        first_id = reports[0]["id"]
        # Toggle verify
        verify_resp = client.put(f"/admin/crime-reports/{first_id}/verify", headers=headers, json={
            "is_verified": False
        })
        assert verify_resp.status_code == 200
        assert verify_resp.json()["is_verified"] is False
        
        # Verify back
        verify_resp2 = client.put(f"/admin/crime-reports/{first_id}/verify", headers=headers, json={
            "is_verified": True
        })
        assert verify_resp2.status_code == 200
        assert verify_resp2.json()["is_verified"] is True

def test_admin_safety_advisory_broadcast():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Publish advisory
    pub_resp = client.post("/admin/advisories", headers=headers, json={
        "locality": "Whitefield",
        "title": "IT Corridor High Alert Advisory",
        "advisory": "Enhanced police patrolling and escort services operational.",
        "precautions": "Use well-lit main arterial roads.",
        "severity": "CRITICAL",
        "expires_days": 10
    })
    assert pub_resp.status_code == 201
    advisory_id = pub_resp.json()["id"]
    
    # List advisories
    list_resp = client.get("/admin/advisories", headers=headers)
    assert list_resp.status_code == 200
    assert any(a["id"] == advisory_id for a in list_resp.json())
    
    # Toggle active
    toggle_resp = client.put(f"/admin/advisories/{advisory_id}/toggle", headers=headers)
    assert toggle_resp.status_code == 200
    assert toggle_resp.json()["is_active"] is False

