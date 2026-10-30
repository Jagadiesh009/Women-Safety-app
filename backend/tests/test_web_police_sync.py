import pytest
from datetime import datetime, timezone
from main import app
from tests.test_api import TestingSessionLocal, client
from database.models import (
    PoliceOfficer,
    PoliceDutyStatus,
    PatrolLocation,
    Incident,
    Location,
    User,
    PatrolRecommendation,
    DispatchNotification,
    IncidentResponse
)

def test_01_police_role_based_login():
    """Verify police login authenticates credentials and enforces role verification."""
    # 1. Successful Supervisor login
    resp = client.post("/police/auth/login", json={
        "badge_number": "POL-101",
        "password": "PoliceSecure@2026"
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "access_token" in data
    assert data["officer"]["badge_number"] == "POL-101"
    assert data["officer"]["role"] == "SUPERVISOR"

    # 2. Successful Patrol Officer login
    resp_off = client.post("/police/auth/login", json={
        "badge_number": "POL-102",
        "password": "PoliceSecure@2026"
    })
    assert resp_off.status_code == 200
    assert resp_off.json()["officer"]["badge_number"] == "POL-102"
    assert resp_off.json()["officer"]["role"] == "OFFICER"

    # 3. Invalid credentials rejected
    resp_bad = client.post("/police/auth/login", json={
        "badge_number": "POL-101",
        "password": "WrongPassword123"
    })
    assert resp_bad.status_code == 401

def test_02_duty_toggle_and_patrol_radar():
    """Verify ON DUTY toggle publishes officer coordinates to active patrol radar."""
    login_resp = client.post("/police/auth/login", json={
        "badge_number": "POL-102",
        "password": "PoliceSecure@2026"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Set ON DUTY
    duty_resp = client.post("/police/duty/toggle", headers=headers, json={
        "is_on_duty": True,
        "patrol_zone": "Indiranagar",
        "vehicle_number": "KA-01-G-1002"
    })
    assert duty_resp.status_code == 200
    assert duty_resp.json()["is_on_duty"] is True

    # Broadcast GPS location
    loc_resp = client.post("/police/patrol/location", headers=headers, json={
        "latitude": 12.9784,
        "longitude": 77.6408,
        "accuracy": 8.5
    })
    assert loc_resp.status_code == 200

    # Query active units radar
    units_resp = client.get("/police/patrol/active-units", headers=headers)
    assert units_resp.status_code == 200
    units = units_resp.json()
    assert any(u["badge_number"] == "POL-102" for u in units)

def test_03_supervisor_patrol_recommendation_and_assignment():
    """Verify supervisor can approve and deploy patrol orders, received by assigned officer."""
    # Login supervisor
    sup_login = client.post("/police/auth/login", json={
        "badge_number": "POL-101",
        "password": "PoliceSecure@2026"
    })
    sup_token = sup_login.json()["access_token"]
    sup_headers = {"Authorization": f"Bearer {sup_token}"}

    # Fetch recommendations (generate via weekly report if empty)
    recs_resp = client.get("/police/patrol/recommendations", headers=sup_headers)
    assert recs_resp.status_code == 200
    recs = recs_resp.json()
    if len(recs) == 0:
        client.get("/crime/weekly-report")
        recs_resp = client.get("/police/patrol/recommendations", headers=sup_headers)
        recs = recs_resp.json()
    assert len(recs) > 0
    rec_id = recs[0]["id"]

    # Assign recommendation to Officer POL-102
    db_lookup = TestingSessionLocal()
    off2_obj = db_lookup.query(PoliceOfficer).filter(PoliceOfficer.badge_number == "POL-102").first()
    off2_id = off2_obj.id if off2_obj else 2
    db_lookup.close()

    assign_resp = client.post(f"/police/patrol/recommendations/{rec_id}/assign", headers=sup_headers, json={
        "officer_id": off2_id,
        "shift_period": "Night Beat (22:00 - 05:00)",
        "instructions": "Priority foot patrol along high concentration route"
    })
    assert assign_resp.status_code == 200
    assign_data = assign_resp.json()
    assert assign_data["status"] == "ASSIGNED"

    # Officer POL-102 views assigned orders
    off_login = client.post("/police/auth/login", json={
        "badge_number": "POL-102",
        "password": "PoliceSecure@2026"
    })
    off_token = off_login.json()["access_token"]
    off_headers = {"Authorization": f"Bearer {off_token}"}

    my_orders_resp = client.get("/police/patrol/my-assignments", headers=off_headers)
    assert my_orders_resp.status_code == 200
    my_orders = my_orders_resp.json()
    assert any(o["id"] == assign_data["id"] for o in my_orders)

def test_04_emergency_sos_dispatch_and_concurrency_locking():
    """Verify live SOS alert dispatch, atomic acceptance, and conflict rejection."""
    # Officer 2 (POL-102) logs in and sets ON DUTY
    off2_login = client.post("/police/auth/login", json={
        "badge_number": "POL-102",
        "password": "PoliceSecure@2026"
    })
    off2_token = off2_login.json()["access_token"]
    off2_headers = {"Authorization": f"Bearer {off2_token}"}
    client.post("/police/duty/toggle", headers=off2_headers, json={"is_on_duty": True, "patrol_zone": "Indiranagar"})

    db = TestingSessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            user = User(firebase_uid="test_citizen_uid", email="citizen@safeher.app", name="Citizen Test")
            db.add(user)
            db.commit()
            db.refresh(user)

        # Trigger emergency SOS incident
        inc = Incident(
            user_id=user.id,
            type="EMERGENCY",
            category="SOS Emergency",
            status="ACTIVE",
            dispatch_status="PENDING",
            trigger_source="VOICE_DETECTED",
            start_time=datetime.now(timezone.utc),
            locality="Indiranagar",
            city="Bengaluru"
        )
        db.add(inc)
        db.commit()
        db.refresh(inc)

        # Add location
        loc = Location(
            incident_id=inc.id,
            latitude=12.9785,
            longitude=77.6409,
            accuracy=5.0
        )
        db.add(loc)

        # Create dispatch notifications for on-duty officers
        off1_obj = db.query(PoliceOfficer).filter(PoliceOfficer.badge_number == "POL-101").first()
        off2_obj = db.query(PoliceOfficer).filter(PoliceOfficer.badge_number == "POL-102").first()
        notif1 = DispatchNotification(
            incident_id=inc.id,
            officer_id=off1_obj.id if off1_obj else 1,
            distance_km=1.2,
            status="PENDING"
        )
        notif2 = DispatchNotification(
            incident_id=inc.id,
            officer_id=off2_obj.id if off2_obj else 2,
            distance_km=0.8,
            status="PENDING"
        )
        db.add_all([notif1, notif2])
        db.commit()
        inc_id = inc.id
    finally:
        db.close()

    # Officer 2 checks incoming alerts
    alerts_resp = client.get("/police/alerts", headers=off2_headers)
    assert alerts_resp.status_code == 200
    alerts = alerts_resp.json()
    assert any(a["incident_id"] == inc_id for a in alerts)

    # Officer 2 accepts dispatch
    accept_resp = client.post(f"/police/alerts/{inc_id}/accept", headers=off2_headers)
    assert accept_resp.status_code == 200
    assert accept_resp.json()["dispatch_status"] == "ACCEPTED"

    # Officer 1 logs in, sets ON DUTY, and attempts to accept already assigned incident -> HTTP 409 Conflict
    off1_login = client.post("/police/auth/login", json={
        "badge_number": "POL-101",
        "password": "PoliceSecure@2026"
    })
    off1_token = off1_login.json()["access_token"]
    off1_headers = {"Authorization": f"Bearer {off1_token}"}
    client.post("/police/duty/toggle", headers=off1_headers, json={"is_on_duty": True, "patrol_zone": "Indiranagar"})

    conflict_resp = client.post(f"/police/alerts/{inc_id}/accept", headers=off1_headers)
    assert conflict_resp.status_code == 409
    assert "already been assigned" in conflict_resp.json()["detail"]

def test_05_incident_response_lifecycle_progression():
    """Verify 5-stage lifecycle: ACCEPTED -> EN_ROUTE -> ARRIVED -> ASSISTANCE_PROVIDED -> RESOLVED."""
    off2_login = client.post("/police/auth/login", json={
        "badge_number": "POL-102",
        "password": "PoliceSecure@2026"
    })
    off2_token = off2_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {off2_token}"}
    client.post("/police/duty/toggle", headers=headers, json={"is_on_duty": True, "patrol_zone": "Indiranagar"})

    # Ensure officer has an active accepted incident
    active_resp = client.get("/police/incidents/active", headers=headers)
    active = active_resp.json()
    
    if not active:
        # Create an accepted incident directly for officer 2
        db = TestingSessionLocal()
        try:
            user = db.query(User).first()
            inc = Incident(
                user_id=user.id if user else 1,
                type="EMERGENCY",
                category="SOS Emergency",
                status="ACTIVE",
                dispatch_status="ACCEPTED",
                assigned_officer_id=2,
                start_time=datetime.now(timezone.utc),
                locality="Indiranagar",
                city="Bengaluru"
            )
            db.add(inc)
            db.commit()
            db.refresh(inc)
            
            resp_rec = IncidentResponse(
                incident_id=inc.id,
                officer_id=2,
                status="ACCEPTED",
                accepted_at=datetime.now(timezone.utc)
            )
            db.add(resp_rec)
            db.commit()
            inc_id = inc.id
        finally:
            db.close()
    else:
        inc_id = active["id"]

    # 1. Advance to EN_ROUTE
    r1 = client.post(f"/police/incidents/{inc_id}/status", headers=headers, json={
        "status": "EN_ROUTE",
        "notes": "Patrol vehicle dispatched with siren active"
    })
    assert r1.status_code == 200
    assert r1.json()["dispatch_status"] == "EN_ROUTE"

    # 2. Advance to ARRIVED
    r2 = client.post(f"/police/incidents/{inc_id}/status", headers=headers, json={
        "status": "ARRIVED",
        "notes": "On scene. Locating citizen."
    })
    assert r2.status_code == 200
    assert r2.json()["dispatch_status"] == "ARRIVED"

    # 3. Advance to ASSISTANCE_PROVIDED
    r3 = client.post(f"/police/incidents/{inc_id}/status", headers=headers, json={
        "status": "ASSISTANCE_PROVIDED",
        "notes": "Citizen safe. First aid administered."
    })
    assert r3.status_code == 200
    assert r3.json()["dispatch_status"] == "ASSISTANCE_PROVIDED"

    # 4. Resolve incident
    r4 = client.post(f"/police/incidents/{inc_id}/status", headers=headers, json={
        "status": "RESOLVED",
        "notes": "Escorted citizen safely. Incident closed."
    })
    assert r4.status_code == 200
    assert r4.json()["dispatch_status"] == "RESOLVED"

    # Verify incident is in history
    hist_resp = client.get("/police/incidents/history", headers=headers)
    assert hist_resp.status_code == 200
    history = hist_resp.json()
    assert any(h["id"] == inc_id and h["dispatch_status"] == "RESOLVED" for h in history)

def test_06_crime_analytics_and_community_endpoints():
    """Verify crime search, weekly intelligence reports, and community safety map."""
    # 1. Crime search
    search_resp = client.get("/crime/search?locality=Indiranagar&days=30")
    assert search_resp.status_code == 200
    s_data = search_resp.json()
    assert "incidents" in s_data
    assert "total_found" in s_data

    # 2. Weekly intelligence report
    weekly_resp = client.get("/crime/weekly-report?weeks_ago=0")
    assert weekly_resp.status_code == 200
    w_data = weekly_resp.json()
    assert "ranked_areas" in w_data
    assert len(w_data["ranked_areas"]) >= 3
    assert w_data["ranked_areas"][0]["rank"] == 1

    # 3. Weekly PDF report endpoint
    pdf_resp = client.get("/crime/weekly-report/pdf?weeks_ago=0")
    assert pdf_resp.status_code == 200

    # 4. Community safety map
    comm_resp = client.get("/community/safety-map")
    assert comm_resp.status_code == 200
    c_data = comm_resp.json()
    assert any(loc["risk_color"] in ("RED", "ORANGE", "GREEN") for loc in c_data)
