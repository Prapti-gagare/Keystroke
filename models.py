import uuid
from sqlalchemy import Column, String, Integer, Float, Text, TIMESTAMP, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from database import Base

class Candidate(Base):
    __tablename__ = "candidates"
    candidate_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100))
    email = Column(String(100))
    created_at = Column(TIMESTAMP, server_default=func.now())

class Question(Base):
    __tablename__ = "questions"
    question_id = Column(Integer, primary_key=True, index=True)
    question_text = Column(Text, nullable=False)
    question_order = Column(Integer)

class Response(Base):
    __tablename__ = "responses"
    response_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.candidate_id"))
    question_id = Column(Integer, ForeignKey("questions.question_id"))
    answer_text = Column(Text)
    typing_speed_wpm = Column(Float)
    backspace_count = Column(Integer)
    paste_count = Column(Integer)
    paste_word_count = Column(Integer)
    tab_switch_count = Column(Integer)
    time_taken_seconds = Column(Float)
    keystroke_log = Column(JSONB)
    integrity_flag = Column(String(20))
    submitted_at = Column(TIMESTAMP, server_default=func.now())