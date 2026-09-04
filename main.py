from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import engine, get_db

# Creates tables if they don't exist (safe to run even though you already created them via pgAdmin)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="RankResume Test API")

# Allow your frontend (running on a different port/domain) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten this to your actual frontend URL before deploying
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/candidate", response_model=schemas.CandidateOut)
def create_candidate(candidate: schemas.CandidateCreate, db: Session = Depends(get_db)):
    new_candidate = models.Candidate(name=candidate.name, email=candidate.email)
    db.add(new_candidate)
    db.commit()
    db.refresh(new_candidate)
    return new_candidate

@app.get("/questions", response_model=List[schemas.QuestionOut])
def get_questions(db: Session = Depends(get_db)):
    questions = db.query(models.Question).order_by(models.Question.question_order).all()
    return questions

@app.post("/response")
def submit_response(response: schemas.ResponseCreate, db: Session = Depends(get_db)):
    new_response = models.Response(**response.dict())
    db.add(new_response)
    db.commit()
    db.refresh(new_response)
    return {"status": "saved", "response_id": new_response.response_id}

@app.get("/results/{candidate_id}")
def get_results(candidate_id: str, db: Session = Depends(get_db)):
    responses = db.query(models.Response).filter(models.Response.candidate_id == candidate_id).all()
    if not responses:
        raise HTTPException(status_code=404, detail="No responses found for this candidate")
    return responses