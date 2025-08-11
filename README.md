# TalentLink

TalentLink is a comprehensive career portal and resume parsing system designed to streamline the recruitment process. The platform enables job seekers to upload their resumes and apply for positions, while recruiters can efficiently manage job postings and candidate applications.

## 🚀 Features

### For Job Seekers
- **User Profiles**: Create and manage professional profiles
- **Resume Management**: Upload and parse resumes (PDF/DOCX)
- **Job Search**: Browse and filter job listings
- **One-Click Apply**: Quick application process
- **Application Tracking**: Monitor application status
- **Job Recommendations**: Personalized job suggestions

### For Employers/Recruiters
- **Job Posting**: Create and manage job listings
- **Candidate Search**: Find and filter candidates
- **Application Management**: Review and process applications
- **Company Profiles**: Showcase company information
- **Analytics**: Track job posting performance

### Technical Features
- **Resume Parsing**: Automated extraction of candidate information
- **Advanced Search**: Filter jobs/candidates by multiple criteria
- **Real-time Notifications**: Email and in-app notifications
- **Responsive Design**: Works on desktop and mobile devices
- **Secure File Handling**: Safe storage and processing of resumes

## 🛠 Tech Stack

### Backend
- **Framework**: Django 4.2.7
- **REST API**: Django REST Framework 3.14.0
- **Authentication**: JWT with djangorestframework-simplejwt
- **Database**: PostgreSQL (Production), SQLite (Development)
- **File Storage**: Local file system (Development), S3 (Production)
- **API Documentation**: DRF Spectacular
- **Task Queue**: Celery (for background tasks)
- **Search**: Django Haystack with Whoosh (Development) / Elasticsearch (Production)

### Frontend
- **Framework**: React 18+ (in `/frontend` directory)
- **State Management**: Redux Toolkit
- **UI Components**: Material-UI 5
- **Form Handling**: Formik with Yup validation
- **Routing**: React Router v6
- **HTTP Client**: Axios

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Redis (for background tasks)
- pip (Python package manager)
- npm or yarn

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/TalentLink.git
   cd TalentLink/backend
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
   
3. **Install Python dependencies**
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

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```
   
2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```
   
3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```
   
4. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   ```

## 🧪 Running Tests

### Backend Tests
```bash
# Run all tests
pytest

# Run tests with coverage
coverage run -m pytest
coverage report
```

### Frontend Tests
```bash
cd frontend
npm test
# or
yarn test
```

## 🛠 Development

### Code Style
- Backend: Follows PEP 8 with Black formatting
- Frontend: ESLint and Prettier configuration

### Git Workflow
1. Create a new branch for your feature/fix
2. Make your changes
3. Write tests for your changes
4. Run tests locally
5. Submit a pull request

## 📦 Deployment

### Backend
1. Set up a production server (Nginx + Gunicorn recommended)
2. Configure environment variables for production
3. Set up a production database
4. Configure static/media file storage (S3 recommended)
5. Set up SSL/TLS
6. Configure logging and monitoring

### Frontend
1. Build the production bundle
   ```bash
   npm run build
   # or
   yarn build
   ```
2. Deploy the build folder to your static file server

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📧 Contact

Your Name - your.email@example.com

Project Link: [https://github.com/yourusername/TalentLink](https://github.com/yourusername/TalentLink)

4. **Set up environment variables**
   Create a `.env` file in the `backend` directory with the following variables:
   ```env
   DEBUG=True
   SECRET_KEY=
   DATABASE_URL=
   ALLOWED_HOSTS=
   CORS_ALLOWED_ORIGINS=
   ```

5. **Run migrations**
   ```bash
   python manage.py migrate
   ```

6. **Create superuser**
   ```bash
   python manage.py createsuperuser
   ```

7. **Run the development server**
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   ```

## 🏗 Project Structure

```
TalentLink/
├── backend/                  # Django backend
│   ├── career_portal/        # Main app for job postings and applications
│   ├── core/                 # Project settings and configurations
│   ├── resume_parser/        # Resume parsing functionality
│   ├── manage.py             # Django management script
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React frontend
└── README.md                 # This file
```


## 🚀 Deployment

### Backend Deployment

1. **Set up production environment variables**
   ```bash
   DEBUG=False
   SECRET_KEY=your-production-secret-key
   DATABASE_URL=your-production-db-url
   ALLOWED_HOSTS=your-domain.com,www.your-domain.com
   ```

2. **Install production dependencies**
   ```bash
   pip install gunicorn whitenoise
   ```

3. **Collect static files**
   ```bash
   python manage.py collectstatic --noinput
   ```

4. **Run with Gunicorn**
   ```bash
   gunicorn core.wsgi:application --bind 0.0.0.0:8000
   ```

### Frontend Deployment

1. **Build for production**
   ```bash
   npm run build
   # or
   yarn build
   ```

2. **Deploy the `build` directory** to your static file hosting service (e.g., Vercel, Netlify, or S3).

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
