from pydantic import BaseModel
from typing import Optional, List, Any
from uuid import UUID

class CandidateCreate(BaseModel):
    name: str
    email: str

class CandidateOut(BaseModel):
    candidate_id: UUID
    name: str
    email: str
    class Config:
        from_attributes = True

class QuestionOut(BaseModel):
    question_id: int
    question_text: str
    question_order: int
    class Config:
        from_attributes = True

class ResponseCreate(BaseModel):
    candidate_id: UUID
    question_id: int
    answer_text: str
    typing_speed_wpm: float
    backspace_count: int
    paste_count: int
    paste_word_count: int
    tab_switch_count: int
    time_taken_seconds: float
    keystroke_log: Optional[Any] = None