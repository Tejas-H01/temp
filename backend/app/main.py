from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.controllers.router import router as auth_router

app = FastAPI(title="GlobeTrotter Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import JSONResponse
from fastapi.requests import Request
from fastapi.exceptions import RequestValidationError
from app.auth.exceptions.exceptions import AuthException

@app.exception_handler(AuthException)
async def auth_exception_handler(request: Request, exc: AuthException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "errorCode": exc.error_code,
            "errors": exc.errors if hasattr(exc, 'errors') else {},
            "data": exc.data
        },
        headers={"Access-Control-Allow-Origin": "*"}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = {}
    for err in exc.errors():
        # Get the field name, defaulting to "unknown" if not present in the loc path
        field = err["loc"][-1] if len(err["loc"]) > 0 else "unknown"
        if field not in errors:
            errors[field] = []
        # Customize message based on the type, specifically for emails
        msg = err.get("msg")
        if err.get("type") == "value_error.email":
            msg = "Please enter a valid email address."
        errors[field].append(msg)
        
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation failed.",
            "errorCode": "VALIDATION_ERROR",
            "errors": errors
        },
        headers={"Access-Control-Allow-Origin": "*"}
    )

@app.get("/")
def health_check():
    return {"status": "Auth service is running."}

from app.api.endpoints import trips, master, stops, public, dashboard, saved_destinations, expenses, recommendations, community, users

app.include_router(auth_router)
app.include_router(trips.router, prefix="/api")
app.include_router(master.router, prefix="/api")
app.include_router(stops.router, prefix="/api")
app.include_router(public.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(saved_destinations.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")
app.include_router(community.router, prefix="/api")
app.include_router(users.router, prefix="/api")
