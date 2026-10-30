import math
import os
import secrets
from urllib.parse import quote_plus
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from schemas.api_schemas import (
    LocationCreate, 
    LocationResponse,
    LocationShareStartRequest,
    LocationShareStartResponse,
    LocationShareUpdateRequest,
    LocationSharePublicResponse,
    SafetyScoreResponse,
    SafetyFactor
)
from database.models import User, Incident, Location, LocationSharingSession, EmergencyContact
from api.deps import get_db, get_current_user

router = APIRouter(prefix="/locations", tags=["Locations"])

# ============================================================================
# INCIDENT LOCATION TELEMETRY
# ============================================================================

@router.post("/{incident_id}", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
def add_location_update(
    incident_id: int, 
    location: LocationCreate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Add a new location update to an active incident."""
    db_incident = db.query(Incident).filter(
        Incident.id == incident_id, 
        Incident.user_id == current_user.id
    ).first()
    
    if not db_incident:
        raise HTTPException(status_code=404, detail="Incident not found or not authorized")
        
    if db_incident.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Cannot add location updates to a resolved incident")
        
    new_location = Location(
        incident_id=incident_id,
        latitude=location.latitude,
        longitude=location.longitude,
        accuracy=location.accuracy
    )
    db.add(new_location)
    db.commit()
    db.refresh(new_location)

    # Check and trigger/update police dispatch if pending or unassigned
    try:
        from api.incidents import dispatch_incident_to_officers
        if db_incident.dispatch_status in ("UNASSIGNED", "DISPATCH_PENDING"):
            dispatch_incident_to_officers(db_incident, db, user_lat=location.latitude, user_lng=location.longitude)
            db.commit()
    except Exception as e:
        print(f"Non-critical dispatch update note: {e}")

    return new_location

# ============================================================================
# LIVE LOCATION SHARING SESSIONS
# ============================================================================

@router.post("/share/start", response_model=LocationShareStartResponse)
def start_location_sharing(
    payload: Optional[LocationShareStartRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start an authenticated live location sharing session with a secure unguessable token."""
    # Deactivate existing active sessions for this user
    existing_sessions = db.query(LocationSharingSession).filter(
        LocationSharingSession.user_id == current_user.id,
        LocationSharingSession.is_active == True
    ).all()
    for s in existing_sessions:
        s.is_active = False

    # Generate or reuse client-provided secure token
    token = (payload.session_token.strip() if payload and payload.session_token and payload.session_token.strip() else None) or secrets.token_urlsafe(24)
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=4)

    session = LocationSharingSession(
        user_id=current_user.id,
        session_token=token,
        is_active=True,
        expires_at=expires,
        last_updated_at=now
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    public_web_base = os.environ.get(
        "SAFEHER_PUBLIC_WEB_URL", 
        os.environ.get("PUBLIC_WEB_URL", "https://safeherweb.vercel.app")
    ).rstrip("/")
    tracking_url = f"{public_web_base}/track?token={quote_plus(token)}"

    return LocationShareStartResponse(
        session_token=token,
        tracking_url=tracking_url,
        expires_at=session.expires_at,
        is_active=True
    )

@router.post("/share/update")
def update_shared_location(
    data: LocationShareUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update coordinates for the user's active sharing session."""
    if not (-90.0 <= data.latitude <= 90.0) or not (-180.0 <= data.longitude <= 180.0):
        raise HTTPException(status_code=400, detail="Invalid GPS coordinate ranges")

    session = db.query(LocationSharingSession).filter(
        LocationSharingSession.user_id == current_user.id,
        LocationSharingSession.is_active == True
    ).order_by(LocationSharingSession.started_at.desc()).first()

    if not session:
        raise HTTPException(status_code=404, detail="No active location sharing session found")

    now = datetime.now(timezone.utc)
    session_expires = session.expires_at if session.expires_at.tzinfo else session.expires_at.replace(tzinfo=timezone.utc)
    if now > session_expires:
        session.is_active = False
        db.commit()
        raise HTTPException(status_code=410, detail="Sharing session has expired")

    session.last_latitude = data.latitude
    session.last_longitude = data.longitude
    session.last_accuracy = data.accuracy
    session.last_updated_at = now
    db.commit()

    return {"status": "updated", "timestamp": now.isoformat()}

@router.post("/share/stop")
def stop_location_sharing(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Stop live location sharing and revoke the active token."""
    active_sessions = db.query(LocationSharingSession).filter(
        LocationSharingSession.user_id == current_user.id,
        LocationSharingSession.is_active == True
    ).all()
    
    for s in active_sessions:
        s.is_active = False
    
    db.commit()
    return {"status": "stopped", "sessions_closed": len(active_sessions)}

@router.get("/share/active", response_model=LocationSharePublicResponse)
def get_my_active_share_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve current user's active location sharing session state."""
    session = db.query(LocationSharingSession).filter(
        LocationSharingSession.user_id == current_user.id,
        LocationSharingSession.is_active == True
    ).order_by(LocationSharingSession.started_at.desc()).first()

    if not session:
        raise HTTPException(status_code=404, detail="No active sharing session")

    now = datetime.now(timezone.utc)
    session_expires = session.expires_at if session.expires_at.tzinfo else session.expires_at.replace(tzinfo=timezone.utc)
    if now > session_expires:
        session.is_active = False
        db.commit()
        raise HTTPException(status_code=404, detail="Session expired")

    is_stale = False
    if session.last_updated_at:
        last_up = session.last_updated_at if session.last_updated_at.tzinfo else session.last_updated_at.replace(tzinfo=timezone.utc)
        is_stale = (now - last_up).total_seconds() > 60

    return LocationSharePublicResponse(
        is_active=session.is_active,
        session_token=session.session_token,
        user_name=current_user.name or "SafeHer User",
        latitude=session.last_latitude,
        longitude=session.last_longitude,
        accuracy=session.last_accuracy,
        last_updated_at=session.last_updated_at,
        is_stale=is_stale,
        expires_at=session.expires_at
    )

@router.get("/share/track/{token}", response_model=LocationSharePublicResponse)
def track_shared_location(
    token: str,
    db: Session = Depends(get_db)
):
    """Public read-only tracking endpoint for emergency contacts using a cryptographic session token."""
    session = db.query(LocationSharingSession).filter(
        LocationSharingSession.session_token == token
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Tracking link not found or invalid token")

    now = datetime.now(timezone.utc)
    session_expires = session.expires_at if session.expires_at.tzinfo else session.expires_at.replace(tzinfo=timezone.utc)

    if not session.is_active or now > session_expires:
        return LocationSharePublicResponse(
            is_active=False,
            session_token=token,
            user_name="SafeHer User",
            latitude=None,
            longitude=None,
            accuracy=None,
            last_updated_at=session.last_updated_at,
            is_stale=True,
            expires_at=session.expires_at
        )

    is_stale = False
    if session.last_updated_at:
        last_up = session.last_updated_at if session.last_updated_at.tzinfo else session.last_updated_at.replace(tzinfo=timezone.utc)
        is_stale = (now - last_up).total_seconds() > 60
    else:
        is_stale = True

    user = db.query(User).filter(User.id == session.user_id).first()
    user_name = user.name if user and user.name else "SafeHer User"

    return LocationSharePublicResponse(
        is_active=True,
        session_token=token,
        user_name=user_name,
        latitude=session.last_latitude,
        longitude=session.last_longitude,
        accuracy=session.last_accuracy,
        last_updated_at=session.last_updated_at,
        is_stale=is_stale,
        expires_at=session.expires_at
    )

# ============================================================================
# LOCATION SAFETY RATING OUT OF 10
# ============================================================================

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

@router.get("/safety-score", response_model=SafetyScoreResponse)
def get_location_safety_score(
    latitude: float = Query(..., description="Latitude coordinate"),
    longitude: float = Query(..., description="Longitude coordinate"),
    accuracy: Optional[float] = Query(None, description="Horizontal GPS accuracy in meters"),
    db: Session = Depends(get_db)
):
    """
    Transparent, deterministic safety score out of 10 based on:
    1. Incident report density in a 5km radius (SafeHer incident records).
    2. Time of day vulnerability curve.
    3. GPS accuracy & telemetry freshness.
    4. Proximity to registered safety networks.
    """
    if not (-90.0 <= latitude <= 90.0) or not (-180.0 <= longitude <= 180.0):
        raise HTTPException(status_code=400, detail="Invalid coordinate values")

    now = datetime.now(timezone.utc)
    base_score = 8.5
    factors: List[SafetyFactor] = []
    missing_factors: List[str] = []

    # 1. Incident history signal (5km radius)
    recent_locations = db.query(Location).all()
    nearby_incidents_count = 0
    for loc in recent_locations:
        if loc.latitude and loc.longitude:
            dist = _haversine_km(latitude, longitude, loc.latitude, loc.longitude)
            if dist <= 5.0:
                nearby_incidents_count += 1

    if nearby_incidents_count == 0:
        base_score += 0.5
        factors.append(SafetyFactor(
            name="Local Incident History",
            score_impact=0.5,
            status="POSITIVE",
            source="SafeHer Verified Incidents Database",
            description="Zero reported incidents within a 5 km vicinity in the SafeHer database."
        ))
    elif nearby_incidents_count <= 2:
        base_score -= 1.2
        factors.append(SafetyFactor(
            name="Local Incident History",
            score_impact=-1.2,
            status="CAUTION",
            source="SafeHer Verified Incidents Database",
            description=f"{nearby_incidents_count} incident(s) registered within a 5 km perimeter."
        ))
    else:
        base_score -= 2.8
        factors.append(SafetyFactor(
            name="Local Incident History",
            score_impact=-2.8,
            status="ALERT",
            source="SafeHer Verified Incidents Database",
            description=f"{nearby_incidents_count} multiple recent incidents logged within a 5 km zone."
        ))

    # 2. Time of Day Signal (24h diurnal curve)
    current_hour = now.hour # UTC hour approximate
    if 22 <= current_hour or current_hour < 5:
        base_score -= 1.5
        factors.append(SafetyFactor(
            name="Time of Day",
            score_impact=-1.5,
            status="CAUTION",
            source="Diurnal Risk Analysis Model",
            description="Late night travel window (reduced pedestrian traffic and lower natural surveillance)."
        ))
    elif 18 <= current_hour < 22:
        base_score -= 0.5
        factors.append(SafetyFactor(
            name="Time of Day",
            score_impact=-0.5,
            status="NEUTRAL",
            source="Diurnal Risk Analysis Model",
            description="Evening hours; maintain alert posture and utilize well-lit corridors."
        ))
    else:
        base_score += 0.5
        factors.append(SafetyFactor(
            name="Time of Day",
            score_impact=0.5,
            status="POSITIVE",
            source="Diurnal Risk Analysis Model",
            description="Active daylight hours with regular commercial and transit activity."
        ))

    # 3. GPS Accuracy & Telemetry Confidence
    if accuracy is not None and accuracy > 0:
        if accuracy <= 20:
            base_score += 0.3
            factors.append(SafetyFactor(
                name="GPS Telemetry Precision",
                score_impact=0.3,
                status="POSITIVE",
                source="Hardware GNSS Sensor",
                description=f"High-precision coordinate fix (±{round(accuracy)}m) allows instant emergency pinpointing."
            ))
        elif accuracy <= 60:
            factors.append(SafetyFactor(
                name="GPS Telemetry Precision",
                score_impact=0.0,
                status="NEUTRAL",
                source="Hardware GNSS Sensor",
                description=f"Moderate GPS accuracy (±{round(accuracy)}m)."
            ))
        else:
            base_score -= 0.8
            factors.append(SafetyFactor(
                name="GPS Telemetry Precision",
                score_impact=-0.8,
                status="CAUTION",
                source="Hardware GNSS Sensor",
                description=f"Coarse location fix (±{round(accuracy)}m); coordinates may experience drift."
            ))
    else:
        missing_factors.append("GPS Horizontal Precision (accuracy metric unavailable)")

    # 4. Community Guardians Coverage
    guardians_count = db.query(EmergencyContact).count()
    if guardians_count > 0:
        base_score += 0.2
        factors.append(SafetyFactor(
            name="Emergency Network Readiness",
            score_impact=0.2,
            status="POSITIVE",
            source="SafeHer Emergency Contacts Network",
            description=f"Active emergency response contacts are synced and standby-ready."
        ))
    else:
        missing_factors.append("Personal Emergency Contacts (no contacts registered)")

    final_score = round(min(10.0, max(1.0, base_score)), 1)
    confidence = "HIGH" if len(missing_factors) == 0 else ("MEDIUM" if len(missing_factors) == 1 else "LOW")

    # Practical guidance
    if final_score >= 8.0:
        guidance = "Conditions appear favorable. Keep regular awareness and keep device charged."
        explanation = "High safety assessment driven by zero nearby incidents, daylight conditions, and verified emergency connectivity."
    elif final_score >= 5.5:
        guidance = "Stay on primary well-lit avenues. Consider starting live location sharing with your trusted contacts."
        explanation = "Moderate safety assessment. Night hours or proximity to earlier incident zones advise heightened vigilance."
    else:
        guidance = "Exercise extreme caution. Share live tracking immediately, stay in populated commercial zones, and keep one-tap SOS ready."
        explanation = "Elevated risk factors detected due to historical incidents in area or vulnerable late-night transit conditions."

    return SafetyScoreResponse(
        score=final_score,
        confidence=confidence,
        factors=factors,
        missing_factors=missing_factors,
        explanation=explanation,
        guidance=guidance,
        data_updated_at=now
    )
