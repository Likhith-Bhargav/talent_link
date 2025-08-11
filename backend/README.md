# TalentLink Backend

Django REST API backend for the TalentLink job board application.

## Features

- User authentication (JWT + Session)
- Job postings management
- Company profiles
- Job applications tracking
- RESTful API endpoints
- CORS support
- File uploads
- Rate limiting
- API documentation

## Prerequisites

- Python 3.8+
- PostgreSQL
- pip
- Virtual environment (recommended)

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/TalentLink.git
   cd TalentLink/backend
   ```

2. **Create and activate a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Set up the database**
   ```bash
   python manage.py migrate
   ```

6. **Create a superuser**
   ```bash
   python manage.py createsuperuser
   ```

7. **Run the development server**
   ```bash
   python manage.py runserver
   ```

## Development

### Running tests
```bash
pytest
```

### API Documentation
API documentation is available at `/api/docs/` when running the development server.

### Code style
This project uses `black` for code formatting and `flake8` for linting.

```bash
black .
flake8
```

## Deployment

For production deployment, make sure to:

1. Set `DEBUG=False` in your environment variables
2. Set up a proper database (PostgreSQL recommended)
3. Configure a production web server (Nginx + Gunicorn)
4. Set up SSL/TLS
5. Configure proper CORS settings
6. Set up proper logging and monitoring

## Environment Variables

See `.env.example` for a list of required environment variables.

## License

MIT
