from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.auth.security.dependencies import get_current_user
from app.models.user import User
from app.models.trip import Trip, Expense
from app.schemas.trip import ExpenseCreate, ExpenseUpdate, ExpenseResponse

# We will mount this under /api/trips
router = APIRouter(prefix="/trips", tags=["Expenses"])

@router.post("/{trip_id}/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(trip_id: int, expense_in: ExpenseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    if expense_in.category not in ["TRANSPORT", "ACCOMMODATION", "MEAL", "OTHER"]:
        raise HTTPException(status_code=400, detail="Invalid expense category")
        
    expense = Expense(**expense_in.model_dump(), trip_id=trip_id)
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense

@router.put("/{trip_id}/expenses/{expense_id}", response_model=ExpenseResponse)
def update_expense(trip_id: int, expense_id: int, expense_in: ExpenseUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.trip_id == trip_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    update_data = expense_in.model_dump(exclude_unset=True)
    if "category" in update_data and update_data["category"] not in ["TRANSPORT", "ACCOMMODATION", "MEAL", "OTHER"]:
        raise HTTPException(status_code=400, detail="Invalid expense category")
        
    for key, value in update_data.items():
        setattr(expense, key, value)
        
    db.commit()
    db.refresh(expense)
    return expense

@router.delete("/{trip_id}/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(trip_id: int, expense_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.trip_id == trip_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    db.delete(expense)
    db.commit()
    return None
