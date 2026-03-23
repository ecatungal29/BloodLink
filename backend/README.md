# BloodLink Backend

A Django REST API backend for blood donation management platform.

## Overview

BloodLink backend provides comprehensive REST API endpoints for blood donation management, user authentication, and inventory tracking.

## Features

### 🔐 **Authentication System**

- JWT-based authentication with refresh tokens
- Custom user model with blood types and roles
- Role-based access control (Donor, Recipient, Hospital, Blood Bank)
- Password validation and secure token handling

### 🩸 **Blood Request Management**

- Create and manage blood donation requests
- Urgency levels (Low, Medium, High, Critical)
- Patient information and medical details
- Hospital and contact information
- Request status tracking (Pending, Matched, Completed, Cancelled)

### 🎯 **Donor Matching Algorithm**

- Blood type compatibility checking
- Location-based matching
- Availability status management
- Donation history tracking

### 📊 **Inventory Management**

- Real-time blood stock tracking
- Multiple blood bank locations
- Automatic inventory updates
- Blood type-wise availability

### 🏥 **Donation Tracking**

- Schedule and manage donations
- Track donation history
- Location-based donation centers
- Status management (Scheduled, Completed, Cancelled, No Show)

### 🏢 **Donation Centers**

- Manage blood donation centers
- Operating hours and contact information
- Location services with geolocation
- Service availability tracking

## Tech Stack

- **Framework**: Django 4.2 with Django REST Framework
- **Database**: PostgreSQL with psycopg2
- **Authentication**: Django REST Framework Simple JWT
- **CORS**: django-cors-headers for frontend integration
- **Environment**: python-decouple for configuration management
- **Validation**: Built-in Django validators and custom validation

## Project Structure

```
bloodlink/
├── settings.py              # Main Django settings
├── urls.py                 # Root URL configuration
├── wsgi.py                  # WSGI application
├── asgi.py                  # ASGI application
├── accounts/                 # User management app
│   ├── models.py           # User and DonorProfile models
│   ├── views.py            # Authentication views
│   ├── serializers.py      # API serializers
│   ├── urls.py             # App URL routing
│   └── admin.py            # Django admin configuration
├── donations/               # Blood management app
│   ├── models.py           # BloodRequest, Donation, Inventory models
│   ├── views.py            # API views for requests and donations
│   ├── serializers.py      # Data serialization
│   ├── urls.py             # App URL routing
│   └── admin.py            # Django admin configuration
├── migrations/               # Database migrations
└── manage.py               # Django management script
```

## API Endpoints

### Authentication Endpoints

#### User Registration

```http
POST /api/auth/register/
Content-Type: application/json

Request Body:
{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": "+1234567890",
    "blood_type": "O+",
    "user_type": "donor",
    "date_of_birth": "1990-01-01",
    "address": "123 Main St, City, State"
}

Response:
{
    "user": {
        "id": 1,
        "username": "johndoe",
        "email": "john@example.com",
        "blood_type": "O+",
        "user_type": "donor"
    },
    "access": "eyJ0eXA4...",
    "refresh": "eyJ0eXA4..."
}
```

#### User Login

```http
POST /api/auth/login/
Content-Type: application/json

Request Body:
{
    "email": "john@example.com",
    "password": "SecurePass123!"
}

Response:
{
    "user": {...},
    "access": "eyJ0eXA4...",
    "refresh": "eyJ0eXA4..."
}
```

#### Profile Management

```http
GET /api/auth/profile/me/
Authorization: Bearer {access_token}

Response:
{
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "blood_type": "O+",
    "user_type": "donor",
    "donation_count": 5,
    "last_donation_date": "2024-01-15"
}
```

### Blood Request Endpoints

#### Create Blood Request

```http
POST /api/donations/requests/
Authorization: Bearer {access_token}
Content-Type: application/json

Request Body:
{
    "blood_type": "O+",
    "units_needed": 3,
    "urgency_level": "high",
    "hospital_name": "City General Hospital",
    "hospital_address": "123 Hospital Ave",
    "patient_name": "Jane Smith",
    "patient_age": 45,
    "medical_reason": "Surgery scheduled",
    "contact_person": "Dr. Smith",
    "contact_phone": "+1234567890",
    "required_date": "2024-02-01"
}
```

#### List Blood Requests

```http
GET /api/donations/requests/public/
Response:
{
    "count": 25,
    "next": "http://localhost:8000/api/donations/requests/?page=2",
    "previous": null,
    "results": [
        {
            "id": 1,
            "blood_type": "O+",
            "units_needed": 3,
            "urgency_level": "high",
            "status": "pending",
            "created_at": "2024-01-15T10:30:00Z"
        }
    ]
}
```

### Donation Endpoints

#### Schedule Donation

```http
POST /api/donations/donations/schedule/
Authorization: Bearer {access_token}
Content-Type: application/json

Request Body:
{
    "donation_date": "2024-02-01T10:00:00Z",
    "location": "City Blood Bank",
    "units_donated": 1
}
```

#### Donation History

```http
GET /api/donations/donations/
Authorization: Bearer {access_token}

Response:
{
    "count": 15,
    "results": [
        {
            "id": 1,
            "donation_date": "2024-01-15T10:00:00Z",
            "location": "City Blood Bank",
            "status": "completed",
            "units_donated": 1
        }
    ]
}
```

### Inventory Endpoints

#### Blood Inventory

```http
GET /api/donations/inventory/
Authorization: Bearer {access_token}

Response:
{
    "results": [
        {
            "id": 1,
            "blood_type": "O+",
            "units_available": 45,
            "location": "Main Blood Bank",
            "last_updated": "2024-01-15T14:30:00Z"
        }
    ]
}
```

### Donor Search Endpoints

#### Search Compatible Donors

```http
GET /api/donations/search-donors/?blood_type=O+&location=New+York
Authorization: Bearer {access_token}

Response:
{
    "results": [
        {
            "id": 1,
            "username": "johndoe",
            "blood_type": "O+",
            "distance": "5.2 miles",
            "last_donation_date": "2023-12-01",
            "is_available": true
        }
    ]
}
```

## Database Models

### User Model

```python
class User(AbstractUser):
    email = models.EmailField(unique=True)
    blood_type = models.CharField(max_length=3, choices=BLOOD_TYPE_CHOICES)
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES)
    phone_number = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    is_verified = models.BooleanField(default=False)
```

### Blood Request Model

```python
class BloodRequest(models.Model):
    requester = models.ForeignKey(User, on_delete=models.CASCADE)
    blood_type = models.CharField(max_length=3)
    units_needed = models.PositiveIntegerField()
    urgency_level = models.CharField(max_length=10, choices=URGENCY_LEVELS)
    hospital_name = models.CharField(max_length=200)
    patient_name = models.CharField(max_length=100)
    medical_reason = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    required_date = models.DateField()
```

### Donation Model

```python
class Donation(models.Model):
    donor = models.ForeignKey(User, on_delete=models.CASCADE)
    blood_request = models.ForeignKey(BloodRequest, null=True, blank=True)
    donation_date = models.DateTimeField()
    location = models.CharField(max_length=200)
    status = models.CharField(max_length=10, choices=DONATION_STATUS)
    units_donated = models.PositiveIntegerField(default=1)
```

## Setup Instructions

### Prerequisites

- Python 3.8+
- PostgreSQL 12+
- pip package manager

### Installation

1. **Create virtual environment**

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   source venv/Scripts/activate

   ```

2. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Environment configuration**

   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Database setup**

   ```bash
   createdb bloodlink_db
   ```

5. **Run migrations**

   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. **Create superuser**

   ```bash
   python manage.py createsuperuser
   ```

7. **Start development server**
   ```bash
   python manage.py runserver
   ```

## Management Commands

### Database Operations

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start shell
python manage.py shell

# Collect static files
python manage.py collectstatic
```

### Testing

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test accounts
python manage.py test donations

# Test with coverage
coverage run --source='.' manage.py test
```

## Configuration

### Environment Variables

```bash
SECRET_KEY=your-secret-key-here
DEBUG=True
DB_NAME=bloodlink_db
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432
```

### Django Settings

- Custom user model: `AUTH_USER_MODEL = 'accounts.User'`
- JWT authentication configuration
- CORS settings for frontend integration
- Database configuration for PostgreSQL
- Static files and media handling

## Security

### Authentication

- JWT tokens with configurable expiration
- Password validation with Django's built-in validators
- CORS configuration for frontend domains
- Secure password hashing

### API Security

- Permission-based access control
- Request throttling
- Input validation and sanitization
- SQL injection prevention

### Data Protection

- Environment variable configuration
- Secure file uploads
- GDPR compliance considerations

## Deployment

### Production Settings

```python
# Production settings
DEBUG=False
ALLOWED_HOSTS=['yourdomain.com']
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
```

### Database Configuration

```python
# Production database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT'),
    }
}
```

### Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

## API Documentation

### Authentication Flow

1. Register user account → Receive JWT tokens
2. Include tokens in API requests → Authorization: Bearer {token}
3. Refresh tokens when needed → Use refresh endpoint

### Error Handling

- Standard HTTP status codes
- Consistent error response format
- Validation error messages
- Logging for debugging

### Rate Limiting

- Request throttling configuration
- User-based rate limits
- API endpoint protection

## Performance

### Database Optimization

- Database indexing on frequently queried fields
- Query optimization with select_related
- Connection pooling configuration

### Caching

- Redis integration for session storage
- API response caching
- Static file optimization

## Monitoring

### Logging

- Structured logging configuration
- Error tracking integration
- Performance monitoring setup

### Health Checks

- Database connection monitoring
- API endpoint health checks
- System resource monitoring

## Contributing

### Development Workflow

1. Fork the repository
2. Create feature branch
3. Write tests for new features
4. Submit pull request with tests

### Code Style

- Follow PEP 8 guidelines
- Use type hints
- Document API endpoints
- Write comprehensive tests

### Testing Guidelines

- Unit tests for models and views
- Integration tests for API endpoints
- Test coverage minimum 80%
- Use factory pattern for test data

---

**Built with Django REST Framework for efficient blood donation management**
