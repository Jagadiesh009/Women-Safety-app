from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    contacts = relationship("EmergencyContact", back_populates="user", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="user", cascade="all, delete-orphan")


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    relation = Column(String, nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="contacts")


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False) # e.g., 'SOS Emergency'
    status = Column(String, default="ACTIVE") # 'ACTIVE', 'RESOLVED'
    trigger_source = Column(String, default="MANUAL") # 'MANUAL', 'SHAKE', 'VOICE'
    idempotency_key = Column(String, unique=True, index=True, nullable=True)
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(String, nullable=True)
    locality = Column(String, nullable=True)
    city = Column(String, default="Bengaluru")
    is_verified = Column(Boolean, default=True)
    category = Column(String, default="SOS Emergency")
    assigned_officer_id = Column(Integer, ForeignKey("police_officers.id", ondelete="SET NULL"), nullable=True)
    dispatch_status = Column(String, default="UNASSIGNED") # UNASSIGNED, DISPATCH_PENDING, ACCEPTED, EN_ROUTE, ARRIVED, ASSISTANCE_PROVIDED, RESOLVED

    user = relationship("User", back_populates="incidents")
    locations = relationship("Location", back_populates="incident", cascade="all, delete-orphan")
    assigned_officer = relationship("PoliceOfficer", foreign_keys=[assigned_officer_id])
    police_responses = relationship("IncidentResponse", back_populates="incident", cascade="all, delete-orphan")
    dispatch_notifications = relationship("DispatchNotification", back_populates="incident", cascade="all, delete-orphan")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    incident = relationship("Incident", back_populates="locations")


class LocationSharingSession(Base):
    __tablename__ = "location_sharing_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_token = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    last_latitude = Column(Float, nullable=True)
    last_longitude = Column(Float, nullable=True)
    last_accuracy = Column(Float, nullable=True)
    last_updated_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User")

class AdminUser(Base):
    __tablename__ = "admin_users"
    
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    admin_user_id = Column(Integer, ForeignKey("admin_users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    
    admin_user = relationship("AdminUser")


class PoliceOfficer(Base):
    __tablename__ = "police_officers"

    id = Column(Integer, primary_key=True, index=True)
    badge_number = Column(String, unique=True, index=True, nullable=False) # e.g. "POL-101"
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    rank = Column(String, default="Patrol Officer") # Constable, Sub-Inspector, Inspector, Supervisor
    role = Column(String, default="OFFICER") # OFFICER, SUPERVISOR
    station_name = Column(String, default="Central Police Station")
    assigned_zone = Column(String, default="Indiranagar")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    duty_status = relationship("PoliceDutyStatus", back_populates="officer", uselist=False, cascade="all, delete-orphan")
    locations = relationship("PatrolLocation", back_populates="officer", cascade="all, delete-orphan")
    responses = relationship("IncidentResponse", back_populates="officer", cascade="all, delete-orphan")
    notifications = relationship("DispatchNotification", back_populates="officer", cascade="all, delete-orphan")
    assignments = relationship("PatrolAssignment", foreign_keys="PatrolAssignment.officer_id", back_populates="officer")


class PoliceDutyStatus(Base):
    __tablename__ = "police_duty_statuses"

    id = Column(Integer, primary_key=True, index=True)
    officer_id = Column(Integer, ForeignKey("police_officers.id", ondelete="CASCADE"), unique=True, nullable=False)
    is_on_duty = Column(Boolean, default=False)
    duty_started_at = Column(DateTime(timezone=True), nullable=True)
    duty_ended_at = Column(DateTime(timezone=True), nullable=True)
    current_patrol_zone = Column(String, nullable=True)
    vehicle_number = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    officer = relationship("PoliceOfficer", back_populates="duty_status")


class PatrolLocation(Base):
    __tablename__ = "patrol_locations"

    id = Column(Integer, primary_key=True, index=True)
    officer_id = Column(Integer, ForeignKey("police_officers.id", ondelete="CASCADE"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float, nullable=True)
    speed = Column(Float, nullable=True)
    heading = Column(Float, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    officer = relationship("PoliceOfficer", back_populates="locations")


class PatrolAssignment(Base):
    __tablename__ = "patrol_assignments"

    id = Column(Integer, primary_key=True, index=True)
    officer_id = Column(Integer, ForeignKey("police_officers.id", ondelete="CASCADE"), nullable=False)
    supervisor_id = Column(Integer, ForeignKey("police_officers.id", ondelete="SET NULL"), nullable=True)
    locality = Column(String, nullable=False)
    zone = Column(String, nullable=False)
    shift_period = Column(String, default="Night Patrol (20:00 - 04:00)")
    instructions = Column(String, nullable=True)
    status = Column(String, default="ASSIGNED") # ASSIGNED, IN_PROGRESS, COMPLETED
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    officer = relationship("PoliceOfficer", foreign_keys=[officer_id], back_populates="assignments")
    supervisor = relationship("PoliceOfficer", foreign_keys=[supervisor_id])


class PatrolRecommendation(Base):
    __tablename__ = "patrol_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    locality = Column(String, nullable=False)
    verified_incidents_count = Column(Integer, default=0)
    previous_week_count = Column(Integer, default=0)
    percentage_change = Column(Float, default=0.0)
    risk_level = Column(String, default="MODERATE") # HIGH, MODERATE, LOW
    primary_categories = Column(String, nullable=True)
    suggested_patrol_period = Column(String, default="Night Patrol (20:00 - 04:00)")
    reason = Column(String, nullable=False)
    status = Column(String, default="PENDING") # PENDING, APPROVED, DEPLOYED, REJECTED
    assigned_officer_id = Column(Integer, ForeignKey("police_officers.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    assigned_officer = relationship("PoliceOfficer")


class IncidentResponse(Base):
    __tablename__ = "incident_responses"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)
    officer_id = Column(Integer, ForeignKey("police_officers.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="ACCEPTED") # ACCEPTED, EN_ROUTE, ARRIVED, ASSISTANCE_PROVIDED, RESOLVED, CANCELLED
    accepted_at = Column(DateTime(timezone=True), server_default=func.now())
    en_route_at = Column(DateTime(timezone=True), nullable=True)
    arrived_at = Column(DateTime(timezone=True), nullable=True)
    assistance_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(String, nullable=True)
    response_time_seconds = Column(Integer, nullable=True)

    incident = relationship("Incident", back_populates="police_responses")
    officer = relationship("PoliceOfficer", back_populates="responses")


class DispatchNotification(Base):
    __tablename__ = "dispatch_notifications"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)
    officer_id = Column(Integer, ForeignKey("police_officers.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="PENDING") # PENDING, ACCEPTED, DECLINED, EXPIRED
    distance_km = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    responded_at = Column(DateTime(timezone=True), nullable=True)

    incident = relationship("Incident", back_populates="dispatch_notifications")
    officer = relationship("PoliceOfficer", back_populates="notifications")


class CommunitySafetyAlert(Base):
    __tablename__ = "community_safety_alerts"

    id = Column(Integer, primary_key=True, index=True)
    locality = Column(String, nullable=False)
    title = Column(String, nullable=False)
    advisory = Column(String, nullable=False)
    precautions = Column(String, nullable=True)
    severity = Column(String, default="WARNING") # ADVISORY, WARNING, CRITICAL
    issuing_authority = Column(String, default="Bengaluru City Police")
    issued_by_officer_id = Column(Integer, ForeignKey("police_officers.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)

    issued_by = relationship("PoliceOfficer")

