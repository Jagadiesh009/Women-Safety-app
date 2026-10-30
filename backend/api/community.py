from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import os

from database.models import (
    Incident,
    Location,
    PoliceDutyStatus,
    PatrolLocation,
    CommunitySafetyAlert,
    PoliceOfficer
)
from schemas.api_schemas import (
    CommunitySafetyMapLocality,
    CommunityAlertCreate,
    CommunityAlertResponse
)
from api.deps import get_db, get_current_police_supervisor
from api.crime import LOCALITY_CENTROIDS, seed_verified_crime_data_if_needed

router = APIRouter(prefix="/community", tags=["Community Safety"])

def seed_sample_alerts_if_needed(db: Session):
    if os.environ.get('PYTEST_CURRENT_TEST') is None and os.environ.get('SEED_DEMO_DATA') != 'true':
        return
    count = db.query(CommunitySafetyAlert).count()
    if count == 0:
        now = datetime.now(timezone.utc)
        alert1 = CommunitySafetyAlert(
            locality="Indiranagar",
            title="Increased Night Patrol & Vigilance Advisory",
            advisory="Bengaluru City Police has deployed active mobile patrols along 100ft Road and 12th Main following recent nighttime harassment reports. Increased police visibility is active.",
            precautions="Prefer well-lit primary corridors after 10 PM. Use SafeHer live location sharing when traveling alone.",
            severity="WARNING",
            issuing_authority="Indiranagar Police Station",
            created_at=now - timedelta(hours=6),
            expires_at=now + timedelta(hours=48),
            is_active=True
        )
        alert2 = CommunitySafetyAlert(
            locality="Koramangala",
            title="Transit Hub Safety Awareness",
            advisory="Heightened police presence at 5th Block junction and bus terminus during evening rush hours.",
            precautions="Stay alert in crowded bus boarding zones. Report unattended bags or suspicious activity immediately.",
            severity="ADVISORY",
            issuing_authority="Koramangala Police Station",
            created_at=now - timedelta(hours=14),
            expires_at=now + timedelta(hours=36),
            is_active=True
        )
        db.add(alert1)
        db.add(alert2)
        db.commit()

# ============================================================================
# FEATURE 3: COMMUNITY AREA SAFETY MAP
# ============================================================================

@router.get("/safety-map", response_model=List[CommunitySafetyMapLocality])
def get_community_safety_map(db: Session = Depends(get_db)):
    """
    Dedicated area-based safety map for local residents.
    Classifications are calculated transparently from stored verified incidents:
    - RED: Higher verified incident concentration (>= 4 verified incidents in 14 days)
    - ORANGE: Moderate verified incident concentration (2 - 3 verified incidents)
    - GREEN: Lower verified incident concentration (0 - 1 verified incidents)
    Also shows active patrol unit presence and alerts.
    """
    seed_verified_crime_data_if_needed(db)
    seed_sample_alerts_if_needed(db)
    
    now = datetime.now(timezone.utc)
    two_weeks_ago = now - timedelta(days=14)
    
    # On-duty officers and their patrol zones
    on_duty_officers = db.query(PoliceDutyStatus).filter(PoliceDutyStatus.is_on_duty == True).all()
    patrol_by_zone = {}
    for d in on_duty_officers:
        zone = d.current_patrol_zone or "General"
        patrol_by_zone[zone] = patrol_by_zone.get(zone, 0) + 1
        
    result = []
    for loc_name, coords in LOCALITY_CENTROIDS.items():
        # Count verified incidents in last 14 days
        verified_count = db.query(Incident).filter(
            Incident.locality == loc_name,
            Incident.is_verified == True,
            Incident.start_time >= two_weeks_ago
        ).count()
        
        # Count active alerts
        alerts_count = db.query(CommunitySafetyAlert).filter(
            CommunitySafetyAlert.locality == loc_name,
            CommunitySafetyAlert.is_active == True,
            CommunitySafetyAlert.expires_at > now
        ).count()
        
        # Patrol units active
        active_units = patrol_by_zone.get(loc_name, 0)
        has_patrol = active_units > 0
        
        # Transparent rule calculation
        if verified_count >= 4:
            risk_color = "RED"
            needs_additional = True
        elif verified_count >= 2:
            risk_color = "ORANGE"
            needs_additional = (active_units == 0)
        else:
            risk_color = "GREEN"
            needs_additional = False
            
        result.append(CommunitySafetyMapLocality(
            locality=loc_name,
            city=coords.get("city", "Bengaluru"),
            latitude=coords["lat"],
            longitude=coords["lng"],
            risk_color=risk_color,
            verified_incident_count=verified_count,
            recent_alerts_count=alerts_count,
            has_active_patrol=has_patrol,
            patrol_units_active=active_units,
            needs_additional_patrol=needs_additional,
            data_source="SafeHer Verified Incident Registry & City Police Dispatch",
            last_updated=now
        ))
        
    return result

# ============================================================================
# FEATURE 5: COMMUNITY SAFETY ALERTS
# ============================================================================

@router.get("/alerts", response_model=List[CommunityAlertResponse])
def get_community_alerts(
    locality: Optional[str] = Query(None, description="Optional locality filter"),
    db: Session = Depends(get_db)
):
    """Retrieve verified community safety advisories published by police supervisors."""
    seed_sample_alerts_if_needed(db)
    now = datetime.now(timezone.utc)
    
    q = db.query(CommunitySafetyAlert).filter(
        CommunitySafetyAlert.is_active == True,
        CommunitySafetyAlert.expires_at > now
    )
    if locality and locality.strip():
        q = q.filter(func.lower(CommunitySafetyAlert.locality) == locality.strip().lower())
        
    alerts = q.order_by(CommunitySafetyAlert.created_at.desc()).all()
    
    return [
        CommunityAlertResponse(
            id=a.id,
            locality=a.locality,
            title=a.title,
            advisory=a.advisory,
            precautions=a.precautions,
            severity=a.severity,
            issuing_authority=a.issuing_authority,
            created_at=a.created_at,
            expires_at=a.expires_at,
            is_active=a.is_active
        )
        for a in alerts
    ]

@router.post("/alerts", response_model=CommunityAlertResponse, status_code=status.HTTP_201_CREATED)
def publish_community_alert(
    payload: CommunityAlertCreate,
    supervisor: PoliceOfficer = Depends(get_current_police_supervisor),
    db: Session = Depends(get_db)
):
    """Publish a new locality safety advisory (Authorized Police Supervisors only)."""
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=payload.expires_in_hours or 48)
    
    alert = CommunitySafetyAlert(
        locality=payload.locality,
        title=payload.title,
        advisory=payload.advisory,
        precautions=payload.precautions,
        severity=payload.severity or "WARNING",
        issuing_authority=f"{supervisor.station_name} ({supervisor.name})",
        issued_by_officer_id=supervisor.id,
        created_at=now,
        expires_at=expires,
        is_active=True
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    
    return CommunityAlertResponse(
        id=alert.id,
        locality=alert.locality,
        title=alert.title,
        advisory=alert.advisory,
        precautions=alert.precautions,
        severity=alert.severity,
        issuing_authority=alert.issuing_authority,
        created_at=alert.created_at,
        expires_at=alert.expires_at,
        is_active=alert.is_active
    )
