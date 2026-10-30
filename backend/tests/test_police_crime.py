import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta
from tests.test_api import TestingSessionLocal, override_get_db, override_verify_firebase_token, client
from database.models import PoliceOfficer

USER_A_TOKEN = "Bearer test-token-userA123"

# ============================================================================
# POLICE AUTHENTICATION TESTS
# ============================================================================

def test_police_login_invalid():
    res = client.post("/police/auth/login", json={
        "badge_number": "POL-999",
        "password": "WrongPassword"
    })
    assert res.status_code == 401
    assert "Invalid officer credentials" in res.json()["detail"]

def test_police_login_success():
    res = client.post("/police/auth/login", json={
        "badge_number": "POL-101",
        "password": "PoliceSecure@2026"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["officer"]["badge_number"] == "POL-101"
    assert data["officer"]["role"] == "SUPERVISOR"

def test_police_get_me():
    # Login as POL-102 (Patrol Officer)
    login_res = client.post("/police/auth/login", json={
        "badge_number": "POL-102",
        "password": "PoliceSecure@2026"
    })
    token = login_res.json()["access_token"]
    
    me_res = client.get("/police/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["badge_number"] == "POL-102"
    assert me_res.json()["role"] == "OFFICER"

# ============================================================================
# DUTY STATUS TESTS
# ============================================================================

def test_police_toggle_duty():
    login_res = client.post("/police/auth/login", json={
        "badge_number": "POL-102",
        "password": "PoliceSecure@2026"
    })
    token = login_res.json()["access_token"]
    
    # Switch ON DUTY
    on_res = client.post("/police/duty/toggle", json={
        "is_on_duty": True,
        "patrol_zone": "Indiranagar",
        "vehicle_number": "KA-01-G-5001"
    }, headers={"Authorization": f"Bearer {token}"})
    assert on_res.status_code == 200
    assert on_res.json()["is_on_duty"] is True
    assert on_res.json()["current_patrol_zone"] == "Indiranagar"
    
    # Verify via GET /police/duty/status
    status_res = client.get("/police/duty/status", headers={"Authorization": f"Bearer {token}"})
    assert status_res.status_code == 200
    assert status_res.json()["is_on_duty"] is True

    # Update Patrol Location while ON DUTY
    loc_res = client.post("/police/patrol/location", json={
        "latitude": 12.9784,
        "longitude": 77.6408,
        "accuracy": 5.0
    }, headers={"Authorization": f"Bearer {token}"})
    assert loc_res.status_code == 200

# ============================================================================
# SOS DISPATCH & POLICE INCIDENT LIFECYCLE TESTS
# ============================================================================

def test_sos_dispatch_and_accept_flow():
    # 1. Ensure POL-102 is ON DUTY
    login_102 = client.post("/police/auth/login", json={
        "badge_number": "POL-102",
        "password": "PoliceSecure@2026"
    })
    token_102 = login_102.json()["access_token"]
    client.post("/police/duty/toggle", json={"is_on_duty": True}, headers={"Authorization": f"Bearer {token_102}"})

    # Also put POL-103 ON DUTY
    login_103 = client.post("/police/auth/login", json={
        "badge_number": "POL-103",
        "password": "PoliceSecure@2026"
    })
    token_103 = login_103.json()["access_token"]
    client.post("/police/duty/toggle", json={"is_on_duty": True}, headers={"Authorization": f"Bearer {token_103}"})

    # 2. Normal user triggers SOS
    inc_res = client.post("/incidents/", json={
        "type": "SOS Emergency",
        "trigger_source": "MANUAL",
        "locality": "Indiranagar",
        "latitude": 12.9790,
        "longitude": 77.6415,
        "accuracy": 8.0
    }, headers={"Authorization": USER_A_TOKEN})
    assert inc_res.status_code == 201
    incident_id = inc_res.json()["id"]

    # 3. Check that user's dispatch status is DISPATCH_PENDING (no false dispatch!)
    user_status_1 = client.get(f"/incidents/{incident_id}/dispatch-status", headers={"Authorization": USER_A_TOKEN})
    assert user_status_1.status_code == 200
    assert user_status_1.json()["dispatch_status"] == "DISPATCH_PENDING"
    assert user_status_1.json()["assigned_officer_name"] is None

    # 4. Officer POL-102 checks incoming alerts
    alerts_102 = client.get("/police/alerts", headers={"Authorization": f"Bearer {token_102}"})
    assert alerts_102.status_code == 200
    alert_items = alerts_102.json()
    matching = [a for a in alert_items if a["incident_id"] == incident_id]
    assert len(matching) == 1

    # 5. Officer POL-102 ACCEPTS the alert
    accept_res = client.post(f"/police/alerts/{incident_id}/accept", headers={"Authorization": f"Bearer {token_102}"})
    assert accept_res.status_code == 200
    assert accept_res.json()["dispatch_status"] == "ACCEPTED"

    # 6. Officer POL-103 attempts to accept the SAME incident -> 409 Conflict
    conflict_res = client.post(f"/police/alerts/{incident_id}/accept", headers={"Authorization": f"Bearer {token_103}"})
    assert conflict_res.status_code == 409

    # 7. Check user's dispatch status -> shows Officer Ramesh Kumar accepted!
    user_status_2 = client.get(f"/incidents/{incident_id}/dispatch-status", headers={"Authorization": USER_A_TOKEN})
    assert user_status_2.status_code == 200
    assert user_status_2.json()["dispatch_status"] == "ACCEPTED"
    assert "Officer Ramesh Kumar" in user_status_2.json()["assigned_officer_name"]

    # 8. Officer updates status to EN_ROUTE
    en_route_res = client.post(f"/police/incidents/{incident_id}/status", json={
        "status": "EN_ROUTE",
        "notes": "Patrol vehicle approaching location"
    }, headers={"Authorization": f"Bearer {token_102}"})
    assert en_route_res.status_code == 200

    user_status_3 = client.get(f"/incidents/{incident_id}/dispatch-status", headers={"Authorization": USER_A_TOKEN})
    assert user_status_3.json()["dispatch_status"] == "EN_ROUTE"

    # 9. Officer updates status to ARRIVED
    arrived_res = client.post(f"/police/incidents/{incident_id}/status", json={
        "status": "ARRIVED"
    }, headers={"Authorization": f"Bearer {token_102}"})
    assert arrived_res.status_code == 200

    user_status_4 = client.get(f"/incidents/{incident_id}/dispatch-status", headers={"Authorization": USER_A_TOKEN})
    assert user_status_4.json()["dispatch_status"] == "ARRIVED"

    # 10. Officer RESOLVES the incident
    resolve_res = client.post(f"/police/incidents/{incident_id}/status", json={
        "status": "RESOLVED",
        "notes": "User safely assisted and escorted"
    }, headers={"Authorization": f"Bearer {token_102}"})
    assert resolve_res.status_code == 200

    user_status_5 = client.get(f"/incidents/{incident_id}/dispatch-status", headers={"Authorization": USER_A_TOKEN})
    assert user_status_5.json()["dispatch_status"] == "RESOLVED"
    assert user_status_5.json()["incident_status"] == "RESOLVED"

def test_off_duty_officer_receives_no_alerts():
    login_102 = client.post("/police/auth/login", json={
        "badge_number": "POL-102",
        "password": "PoliceSecure@2026"
    })
    token_102 = login_102.json()["access_token"]
    
    # Put POL-102 OFF DUTY
    client.post("/police/duty/toggle", json={"is_on_duty": False}, headers={"Authorization": f"Bearer {token_102}"})
    
    # Trigger SOS while all officers are OFF DUTY
    login_101 = client.post("/police/auth/login", json={"badge_number": "POL-101", "password": "PoliceSecure@2026"})
    client.post("/police/duty/toggle", json={"is_on_duty": False}, headers={"Authorization": f"Bearer {login_101.json()['access_token']}"})
    login_103 = client.post("/police/auth/login", json={"badge_number": "POL-103", "password": "PoliceSecure@2026"})
    client.post("/police/duty/toggle", json={"is_on_duty": False}, headers={"Authorization": f"Bearer {login_103.json()['access_token']}"})

    inc_res = client.post("/incidents/", json={
        "type": "SOS Emergency",
        "locality": "HSR Layout"
    }, headers={"Authorization": USER_A_TOKEN})
    inc_id = inc_res.json()["id"]

    # Verify user sees no registered patrol available
    user_status = client.get(f"/incidents/{inc_id}/dispatch-status", headers={"Authorization": USER_A_TOKEN})
    assert user_status.json()["is_patrol_available"] is False
    assert "No registered police patrol is currently available" in user_status.json()["message"]

    # Off-duty officer sees empty alerts
    alerts = client.get("/police/alerts", headers={"Authorization": f"Bearer {token_102}"})
    assert len(alerts.json()) == 0

# ============================================================================
# CRIME SEARCH & WEEKLY REPORT TESTS (FEATURES 1 & 2)
# ============================================================================

def test_crime_search_by_locality():
    res = client.get("/crime/search?query=Indiranagar")
    assert res.status_code == 200
    data = res.json()
    assert data["total_found"] > 0
    assert len(data["localities"]) > 0
    assert data["localities"][0]["locality"] == "Indiranagar"
    # Ensure privacy: incidents list does not expose victim names
    for inc in data["incidents"]:
        assert hasattr(inc, "user_name") is False

def test_weekly_crime_report():
    res = client.get("/crime/weekly-report")
    assert res.status_code == 200
    data = res.json()
    assert data["insufficient_data"] is False
    assert len(data["ranked_areas"]) > 0
    # Rank 1 must have highest or equal verified count
    rank1 = data["ranked_areas"][0]
    assert rank1["rank"] == 1
    assert "time_of_day_distribution" in data
    assert data["time_of_day_distribution"]["peak_period"] is not None

def test_weekly_report_html_export():
    res = client.get("/crime/weekly-report/pdf")
    assert res.status_code == 200
    assert "SafeHer City Security" in res.text
    assert "<table" in res.text

# ============================================================================
# COMMUNITY MAP & PATROL COORDINATION TESTS (FEATURES 3, 4, 5)
# ============================================================================

def test_community_safety_map():
    res = client.get("/community/safety-map")
    assert res.status_code == 200
    localities = res.json()
    assert len(localities) > 0
    # Check that colors are valid
    valid_colors = {"RED", "ORANGE", "GREEN"}
    for loc in localities:
        assert loc["risk_color"] in valid_colors

def test_community_alerts_and_supervisor_publish():
    login_sup = client.post("/police/auth/login", json={
        "badge_number": "POL-101", # Inspector Priya Sharma (SUPERVISOR)
        "password": "PoliceSecure@2026"
    })
    token_sup = login_sup.json()["access_token"]
    
    # Supervisor publishes alert
    pub_res = client.post("/community/alerts", json={
        "locality": "Indiranagar",
        "title": "Night Security Alert",
        "advisory": "Special patrol deployed along Metro corridor.",
        "precautions": "Keep emergency contacts updated."
    }, headers={"Authorization": f"Bearer {token_sup}"})
    assert pub_res.status_code == 201
    
    # Retrieve alerts
    alerts_res = client.get("/community/alerts?locality=Indiranagar")
    assert alerts_res.status_code == 200
    assert len(alerts_res.json()) >= 1

def test_patrol_recommendation_and_assignment_workflow():
    login_sup = client.post("/police/auth/login", json={
        "badge_number": "POL-101",
        "password": "PoliceSecure@2026"
    })
    token_sup = login_sup.json()["access_token"]

    # 1. Get recommendations
    recs_res = client.get("/police/patrol/recommendations", headers={"Authorization": f"Bearer {token_sup}"})
    assert recs_res.status_code == 200
    recs = recs_res.json()
    assert len(recs) > 0
    rec_id = recs[0]["id"]

    # 2. Supervisor assigns patrol unit to recommendation
    db_lookup = TestingSessionLocal()
    off_102 = db_lookup.query(PoliceOfficer).filter(PoliceOfficer.badge_number == "POL-102").first()
    off_102_id = off_102.id if off_102 else 2
    db_lookup.close()

    assign_res = client.post(f"/police/patrol/recommendations/{rec_id}/assign", json={
        "officer_id": off_102_id,
        "instructions": "Increase foot beats on 100ft road between 22:00 and 02:00"
    }, headers={"Authorization": f"Bearer {token_sup}"})
    assert assign_res.status_code == 200
    assignment_id = assign_res.json()["id"]

    # 3. Officer POL-102 views their assignments
    login_102 = client.post("/police/auth/login", json={
        "badge_number": "POL-102",
        "password": "PoliceSecure@2026"
    })
    token_102 = login_102.json()["access_token"]

    my_assigns = client.get("/police/patrol/my-assignments", headers={"Authorization": f"Bearer {token_102}"})
    assert my_assigns.status_code == 200
    assert any(a["id"] == assignment_id for a in my_assigns.json())

    # 4. Officer updates assignment status
    update_res = client.post(f"/police/patrol/assignments/{assignment_id}/status", json={
        "status": "IN_PROGRESS"
    }, headers={"Authorization": f"Bearer {token_102}"})
    assert update_res.status_code == 200
    assert update_res.json()["current_status"] == "IN_PROGRESS"
