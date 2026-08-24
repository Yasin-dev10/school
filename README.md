d

# 🎓 Multi-Tenant School Management System

A comprehensive, full-stack school management system with multi-tenant architecture, featuring a Next.js web dashboard and Flutter mobile application. Built to streamline educational institution operations with real-time updates, role-based access control, and extensive administrative features.

[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![Flutter](https://img.shields.io/badge/Flutter-3.9.2-02569B?style=flat-square&logo=flutter)](https://flutter.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [User Roles &amp; Permissions](#-user-roles--permissions)
- [Key Features Deep Dive](#-key-features-deep-dive)
- [Screenshots](#-screenshots)
- [Team Contributors](#-team-contributors)
- [Deployment](DEPLOYMENT_GUIDE.md)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🎯 Core Functionality

- **Multi-Tenant Architecture** - Support for multiple schools/institutions with isolated data
- **Role-Based Access Control** - Admin, Teacher, Student, and Parent roles with granular permissions
- **Real-Time Updates** - Socket.io integration for live notifications and data synchronization
- **Responsive Design** - Mobile-first approach with dark/light theme support
- **Cross-Platform** - Web dashboard (Next.js) and native mobile app (Flutter)

### 📚 Academic Management

- **Student Management** - Complete student lifecycle management with profiles, ID cards, and enrollment
- **Class Management** - Class creation, assignment, and organization with teacher allocation
- **Subject Management** - Subject creation, teacher assignment, and curriculum planning
- **Timetable Management** - Dynamic timetable creation and management for classes
- **Attendance Tracking** - Subject-wise attendance with monthly reports and analytics
- **Exam Management** - Exam scheduling, grade entry, and result generation
- **Grade System** - Customizable grading systems with GPA calculation
- **Assignments** - Assignment creation, submission tracking, and grading
- **Learning Materials** - Document sharing and learning resource management
- **Student Promotion** - Admin-only promotion using completed exams, missing-mark checks, and a 50% overall pass threshold
- **Online Learning** - Quiz creation, scheduling, submissions, and automatic marking

### 💼 Administrative Features

- **Teacher Management** - Teacher profiles, subject assignments, and performance tracking
- **Parent Portal** - Parent access to student progress, attendance, and communication
- **Certificate Generation** - Automated certificate creation and PDF download
- **Fee Management** - Fee type creation, invoice generation, and payment tracking
- **Payroll System** - Salary management and payslip generation for staff
- **Inventory Management** - Track school assets and resources
- **Expense Tracking** - Financial expense recording and reporting
- **HR Management** - Staff management and administrative operations
- **Alumni Management** - Graduate directory, outcomes, events, and donation tracking
- **School Calendar** - Academic and administrative event scheduling
- **Help & Feedback** - In-app support requests and feedback management

### 🤖 AI Assistance

- **Bilingual Study Assistant** - Student support in Somali and English
- **Admin Helper** - Admin-only drafts for announcements, parent messages, meeting agendas, summaries, and action plans
- **Announcement Translation** - Somali ↔ English translation
- **Report-Card Comments** - Constructive teacher comment drafting
- **Early-Risk Signals** - Admin-only indicators based on grades, attendance, and fees
- **Safe Fallbacks** - Limited built-in suggestions when no AI provider is configured

### 📊 Analytics & Reporting

- **Dashboard Analytics** - Real-time statistics and visual data representation
- **Performance Reports** - Student and class performance analytics
- **Attendance Reports** - Comprehensive attendance tracking and reporting
- **Financial Reports** - Revenue, expenses, and payment analytics
- **Audit Logs** - Complete system activity tracking and logging

### 💬 Communication

- **Notifications** - Real-time push notifications for important updates
- **Announcements** - School-wide and class-specific announcements
- **Messaging** - Internal communication system between users
- **Exam Complaints** - Student exam complaint submission and resolution

---

## 🛠 Tech Stack

### Backend

- **Runtime:** Node.js with Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT (JSON Web Tokens)
- **Real-Time:** Socket.io
- **Security:** Helmet, bcryptjs for password hashing
- **Validation:** Joi for request validation
- **File Processing:** ExcelJS, PDFMake
- **Email:** Nodemailer
- **SMS:** Twilio integration

### Frontend (Web)

- **Framework:** Next.js 16.1.1 (React 19.2.3)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI Components:** Heroicons, Lucide React
- **Charts:** Chart.js with react-chartjs-2
- **State Management:** React Context API
- **HTTP Client:** Axios
- **Real-Time:** Socket.io Client
- **Theme:** next-themes for dark/light mode
- **Notifications:** react-hot-toast
- **PDF Generation:** jsPDF, html2canvas
- **Excel Export:** xlsx

### Mobile (Flutter)

- **Framework:** Flutter 3.9.2
- **Language:** Dart
- **State Management:** Provider
- **HTTP Client:** http package
- **Local Storage:** flutter_secure_storage, Hive, shared_preferences
- **Charts:** fl_chart
- **Real-Time:** socket_io_client
- **Fonts:** Google Fonts
- **Connectivity:** connectivity_plus
- **Internationalization:** intl

---

## 📁 Project Structure

```
school/
├── backend/                    # Node.js/Express API Server
│   ├── src/
│   │   ├── config/            # Database and Socket.io configuration
│   │   ├── controllers/       # Route controllers (20 modules)
│   │   ├── middlewares/       # Auth and validation middlewares
│   │   ├── models/            # Compatibility model helpers
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Business logic services
│   │   ├── utils/             # Helper functions and utilities
│   │   ├── scripts/           # Database scripts
│   │   ├── app.js             # Express app configuration
│   │   └── server.js          # Server entry point
│   ├── prisma/                # PostgreSQL schema and migrations
│   └── package.json
│
├── frontend/                   # Next.js Web Dashboard
│   ├── src/
│   │   ├── app/               # Next.js App Router
│   │   │   ├── dashboard/     # Protected dashboard routes
│   │   │   │   ├── students/  # Student management
│   │   │   │   ├── teachers/  # Teacher management
│   │   │   │   ├── classes/   # Class management
│   │   │   │   ├── subjects/  # Subject management
│   │   │   │   ├── attendance/# Attendance tracking
│   │   │   │   ├── exams/     # Exam management
│   │   │   │   ├── grades/    # Grade management
│   │   │   │   ├── timetable/ # Timetable management
│   │   │   │   ├── finance/   # Financial management
│   │   │   │   ├── payroll/   # Payroll system
│   │   │   │   ├── hr/        # HR management
│   │   │   │   ├── inventory/ # Inventory tracking
│   │   │   │   ├── materials/ # Learning materials
│   │   │   │   ├── certificates/ # Certificate generation
│   │   │   │   ├── reports/   # Analytics and reports
│   │   │   │   ├── notifications/ # Notification center
│   │   │   │   ├── communication/ # Messaging
│   │   │   │   ├── settings/  # System settings
│   │   │   │   ├── profile/   # User profile
│   │   │   │   └── parent/    # Parent portal
│   │   │   ├── login/         # Authentication pages
│   │   │   └── layout.tsx     # Root layout
│   │   ├── components/        # Reusable React components
│   │   └── utils/             # Frontend utilities
│   └── package.json
│


---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)
- **Flutter SDK** (v3.9.2 or higher) - [Install Guide](https://docs.flutter.dev/get-started/install)
- **Git** - [Download](https://git-scm.com/)
- **Code Editor** (VS Code recommended) - [Download](https://code.visualstudio.com/)

### Optional
- **pgAdmin** - GUI for PostgreSQL
- **Postman** - API testing
- **Android Studio** - For Android development
- **Xcode** - For iOS development (macOS only)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd school
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/school_management
DIRECT_URL=postgresql://postgres:your_password@localhost:5432/school_management

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=30d

# Email Configuration (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# Twilio SMS Configuration (Optional)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Socket.io Configuration
SOCKET_CORS_ORIGIN=http://localhost:3000

# AI Assistant (Optional)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 4. Mobile Setup

```bash
cd ../mobile
flutter pub get
```

By default the Flutter app uses the **same production API** as the web app
(`https://school-ta8j.onrender.com/api`) via `lib/config/app_config.dart`.

For local development with the same backend as the web app:

```bash
# Emulator / simulator → http://localhost:5000 (Android uses 10.0.2.2)
flutter run --dart-define=USE_LOCAL_API=true

# Physical device on your LAN
flutter run --dart-define=API_BASE_URL=http://192.168.1.XXX:5000/api
```

Ensure `frontend/.env.local` also points at that API:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

Both clients use the same JWT auth (`POST /api/auth/login`) and Socket.IO host.
---------------------------------------------------------

## ⚙️ Configuration

### Database Setup

1. **Start PostgreSQL:**

   ```bash
   # Windows (if installed as service)
   net start postgresql-x64-16

   # macOS/Linux
   sudo systemctl start postgresql
   ```
2. **Create Database:**

   ```bash
   createdb -U postgres school_management
   ```
3. **Apply Prisma Migrations:**

   ```bash
   cd backend
   npm run db:migrate
   ```
4. **Seed Initial Data (Optional):**

   ```bash
   cd backend
   npm run db:seed
   ```

### Environment Variables

Ensure all environment variables are properly configured:

- **Backend:** `.env` file with database, JWT, and service credentials
- **Frontend:** `.env.local` file with API endpoints
- **Mobile:** Update API URLs in `api_service.dart`

---

## 🏃 Running the Application

### Development Mode

#### 1. Start Backend Server

```bash
cd backend
npm run dev
```

The API server will start on `http://localhost:5000`

#### 2. Start Frontend Dashboard

```bash
cd frontend
npm run dev
```

The web dashboard will be available at `http://localhost:3000`

#### 3. Run Mobile Application

**Android:**

```bash
cd mobile
flutter run
```

**iOS (macOS only):**

```bash
cd mobile
flutter run -d ios
```

**Chrome (Web Preview):**

```bash
cd mobile
flutter run -d chrome
```

### Production Mode

#### Backend

```bash
cd backend
npm start
```

#### Frontend

```bash
cd frontend
npm run build
npm start
```

#### Mobile

```bash
cd mobile
# Android
flutter build apk --release

# iOS
flutter build ios --release
```

### Docker

Docker runs PostgreSQL, the backend API, and the Next.js frontend together.

```bash
Copy-Item .env.example .env
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5001/api`
- PostgreSQL: `localhost:5432`

The backend container runs `prisma migrate deploy` before `npm start`. Uploaded backend files are stored in the `backend_uploads` Docker volume, and database data is stored in the `postgres_data` volume.

Useful commands:

```bash
docker compose down
docker compose logs backend
docker compose exec backend npm run db:seed
```

If you run the backend locally with `npm run dev`, make sure `backend/.env` points to a running PostgreSQL database. To use the Docker PostgreSQL service with local `nodemon`, start only the database:

```bash
docker compose up -d postgres
```

Then set `backend/.env` database URLs to:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/school_management?schema=public
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/school_management?schema=public
```

Apply migrations before starting the backend:

```bash
cd backend
npm run db:migrate
npm run dev
```

---

## 📡 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Main Endpoints

#### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user
- `PUT /auth/update-profile` - Update user profile
- `PUT /auth/change-password` - Change password

#### Students

- `GET /students` - Get all students (filtered by role)
- `GET /students/:id` - Get student by ID
- `POST /students` - Create new student
- `PUT /students/:id` - Update student
- `DELETE /students/:id` - Delete student
- `GET /students/:id/id-card` - Get student ID card data
- `GET /students/promotion-eligibility?classId=:classId` - Calculate promotion eligibility
- `POST /students/promote` - Promote selected students (school admin only)

#### AI Assistant

- `POST /ai-assistant/generate` - Generate study help, translations, report comments, or admin drafts
- Admin mode is restricted to the `school-admin` role

#### Alumni

- `GET /alumni` - Get alumni, events, donations, and outcome statistics
- `POST /alumni` - Add a graduate
- `PUT /alumni/:id` - Update a graduate profile
- `DELETE /alumni/:id` - Delete a graduate (school admin only)
- `POST /alumni/events` - Create an alumni event
- `POST /alumni/donations` - Record an alumni donation

#### Teachers

- `GET /teachers` - Get all teachers
- `GET /teachers/:id` - Get teacher by ID
- `POST /teachers` - Create new teacher
- `PUT /teachers/:id` - Update teacher
- `DELETE /teachers/:id` - Delete teacher

#### Classes

- `GET /classes` - Get all classes (filtered by role)
- `GET /classes/:id` - Get class by ID
- `POST /classes` - Create new class
- `PUT /classes/:id` - Update class
- `DELETE /classes/:id` - Delete class
- `GET /classes/:id/students` - Get class students

#### Subjects

- `GET /subjects` - Get all subjects
- `GET /subjects/:id` - Get subject by ID
- `POST /subjects` - Create new subject
- `PUT /subjects/:id` - Update subject
- `DELETE /subjects/:id` - Delete subject

#### Attendance

- `GET /attendance` - Get attendance records
- `POST /attendance` - Mark attendance
- `PUT /attendance/:id` - Update attendance
- `GET /attendance/student/:studentId` - Get student attendance
- `GET /attendance/class/:classId` - Get class attendance

#### Exams

- `GET /exams` - Get all exams
- `GET /exams/:id` - Get exam by ID
- `POST /exams` - Create new exam
- `PUT /exams/:id` - Update exam
- `DELETE /exams/:id` - Delete exam
- `POST /exams/:id/marks` - Submit exam marks
- `GET /exams/student-grades/:studentId` - Get student grades with GPA

#### Timetable

- `GET /timetable/class/:classId` - Get class timetable
- `POST /timetable` - Create timetable entry
- `PUT /timetable/:id` - Update timetable entry
- `DELETE /timetable/:id` - Delete timetable entry
- `POST /timetable/bulk-update` - Bulk update class timetable

#### Certificates

- `GET /certificates` - Get all certificates
- `GET /certificates/:id` - Get certificate by ID
- `POST /certificates` - Issue new certificate
- `PATCH /certificates/:id` - Update certificate
- `DELETE /certificates/:id` - Delete certificate

#### Finance

- `GET /fees` - Get fee types
- `POST /fees` - Create fee type
- `GET /fees/invoices` - Get invoices
- `POST /fees/invoices` - Create invoice
- `POST /fees/payments` - Record payment

#### Payroll

- `GET /salary` - Get salary records
- `POST /salary` - Create salary record
- `GET /salary/payslips/:userId` - Get user payslips

#### Notifications

- `GET /notifications` - Get user notifications
- `POST /notifications` - Create notification
- `PUT /notifications/:id/read` - Mark as read
- `DELETE /notifications/:id` - Delete notification

#### Analytics

- `GET /analytics/dashboard` - Get dashboard statistics
- `GET /analytics/attendance` - Get attendance analytics
- `GET /analytics/performance` - Get performance analytics

#### Materials

- `GET /materials` - Get learning materials
- `POST /materials` - Upload material
- `DELETE /materials/:id` - Delete material

#### Assignments

- `GET /assignments` - Get assignments
- `POST /assignments` - Create assignment
- `GET /assignments/:id/submissions` - Get submissions
- `POST /assignments/:id/submit` - Submit assignment

For complete API documentation, refer to the controller files in `backend/src/controllers/`.

---

## 👥 User Roles & Permissions

### 1. Admin

**Full system access including:**

- Tenant management
- User creation and management (all roles)
- System configuration and settings
- Financial management
- HR and payroll
- Inventory management
- Analytics and reporting
- Audit log access

### 2. Teacher

**Academic and class management:**

- View assigned classes and students
- Mark attendance for their subjects
- Create and grade exams
- Manage assignments
- Upload learning materials
- View timetable
- Access student performance data
- Issue certificates
- Communication with students and parents

### 3. Student

**Personal academic access:**

- View personal profile and ID card
- View class and subject information
- Check attendance records
- View exam results and grades
- Submit assignments
- Access learning materials
- View timetable
- Receive notifications
- View certificates

### 4. Parent

**Child monitoring access:**

- View children's profiles
- Monitor attendance
- View exam results and grades
- Access timetable
- Receive notifications about children
- Communication with teachers
- View fee and payment information

### 5. Receptionist

- Create and maintain student records
- Access permitted communication and administrative tools
- Add and update alumni, events, and donations
- Cannot delete alumni records, alumni events, or donations

---

## 🎯 Key Features Deep Dive

### Multi-Tenant Architecture

The system supports multiple schools/institutions with complete data isolation:

- Each tenant has a unique identifier
- Data is automatically filtered by tenant
- Separate configurations per tenant
- Scalable architecture for growth

### Real-Time Updates

Socket.io integration provides live updates for:

- New notifications
- Attendance changes
- Grade updates
- Announcements
- System alerts

### Student ID Card System

Comprehensive ID card generation with:

- Student photo and details
- School logo and name
- QR code for verification
- PDF download capability
- Print-ready format

### GPA Calculation System

Advanced grading system featuring:

- Term-wise GPA calculation
- Cumulative GPA tracking
- Subject credit weighting
- Customizable grade scales
- Performance analytics

### Attendance Tracking

Robust attendance management:

- Subject-wise attendance
- Monthly and term reports
- Attendance percentage calculation
- Filter by date range
- Export capabilities

### Student Promotion

- Available to school administrators only
- Loads students from the selected current class
- Uses completed exams and recorded marks
- Treats missing exam results as not eligible
- Uses a 50% overall result as the promotion threshold
- Preselects eligible students for admin review
- Updates class and section only after confirmation

### Alumni Management

- Searchable graduate directory with graduation-year filtering
- Employment, university, course, and location tracking
- Alumni events with capacity and attendance counts
- Donation records with currency, purpose, date, and optional graduate link
- Employment and university outcome summaries
- Tenant-isolated data with role-based delete permissions

### AI Assistant

- Somali and English study support
- Admin-only operational writing assistant
- Somali ↔ English announcement drafts
- Report-card comment generation
- Admin-only early-risk indicators
- Full responses use `OPENAI_API_KEY`; limited built-in fallbacks work without it

### Certificate Generation

Professional certificate creation:

- Multiple certificate types
- Custom templates
- Digital signatures
- PDF generation
- Preview before download

### Financial Management

Complete financial tracking:

- Fee type management
- Invoice generation
- Payment tracking
- Expense recording
- Financial reports
- Revenue analytics

### Payroll System

Automated payroll processing:

- Salary structure management
- Payslip generation
- Payment history
- Tax calculations
- Export to Excel/PDF

---

## 🖼 Screenshots

### Web Dashboard

**Dashboard Overview**

- Real-time statistics and analytics
- Quick access cards
- Recent activity feed
- Performance charts

**Student Management**

- Student list with search and filters
- Student profile with complete details
- ID card generation and download
- Academic performance tracking

**Attendance System**

- Subject-wise attendance marking
- Monthly attendance reports
- Attendance analytics
- Export functionality

**Exam & Grades**

- Exam creation and scheduling
- Grade entry interface
- Result generation
- GPA calculation

### Mobile Application

**Student Dashboard**

- Personal statistics
- Quick action buttons
- Upcoming events
- Notifications

**Teacher Dashboard**

- Class overview
- Student management
- Attendance marking
- Grade entry

**Parent Portal**

- Children's progress
- Attendance monitoring
- Communication hub
- Fee information

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

### Coding Standards

- **Backend:** Follow ESLint configuration
- **Frontend:** Use TypeScript and follow Next.js best practices
- **Mobile:** Follow Dart style guide and Flutter conventions
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation as needed

---

## �‍💻 Team Contributors

This project was developed by a dedicated team of students:

### Team Leader

- **Yasin Mohamud Abdullahi** - C1220926 (Team Leader & Project Lead)

### Team Members

- **Abdibasid Mohamed Ahmed** - C1221173
- **Falastin Mohamud Adow** - C1220745
- **Yasmin Osman Mohamud** - C1220724
- **Samiira Faysal Ahmed** - C1220738
- **Aamino Osmaan Mohamed** - C1220731
- **Manal Jabril Hussein** - C1220722
- **Maryan Liban Abuker** - C1220782

We would like to thank all team members for their valuable contributions to this project.

---

## �📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Next.js** - The React Framework for Production
- **Flutter** - Google's UI toolkit for beautiful apps
- **PostgreSQL** - The relational database used by the platform
- **Prisma** - Database schema, migrations, and data access
- **Socket.io** - Real-time bidirectional event-based communication
- **Tailwind CSS** - A utility-first CSS framework

---

## 📞 Support

For support, email support@yourschool.com or join our Slack channel.

---

## 🗺 Roadmap

### Upcoming Features

- [X] Mobile app push notifications
- [ ] Video conferencing integration
- [ ] Online exam system with proctoring
- [X] AI-assisted early-risk signals
- [ ] Mobile app for iOS
- [ ] Advanced analytics dashboard
- [X] Somali and English interface support
- [ ] Biometric attendance
- [ ] Parent mobile app
- [ ] Library management system
- [ ] Transport management
- [ ] Hostel management
- [X] Alumni management
- [X] Alumni and school event management
- [ ] Document management system

---

## 🔧 Troubleshooting

### Common Issues

**Backend won't start:**

- Check PostgreSQL is running
- Verify `.env` file exists and is configured
- Apply Prisma migrations with `npm run db:migrate`
- Ensure port 5000 is not in use

**Frontend connection errors:**

- Verify backend is running
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Clear browser cache and restart

**Mobile app can't connect:**

- Update API URL in `api_service.dart`
- For physical devices, use computer's IP address
- Ensure backend allows CORS from mobile

**Database connection failed:**

- Verify PostgreSQL is running
- Check `DATABASE_URL` and `DIRECT_URL` in `.env`
- Ensure database user has proper permissions

**Socket.io not working:**

- Check `SOCKET_CORS_ORIGIN` in backend `.env`
- Verify frontend socket URL is correct
- Check firewall settings

---

## 📊 System Requirements

### Backend Server

- **CPU:** 2+ cores
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 20GB minimum
- **OS:** Windows, macOS, or Linux

### Development Machine

- **CPU:** 4+ cores recommended
- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 50GB free space
- **OS:** Windows 10+, macOS 10.14+, or Linux

### Mobile Development

- **Android:** Android Studio with SDK 21+
- **iOS:** Xcode 12+ (macOS only)
- **Emulator:** 4GB RAM allocated

---

**Built with ❤️ for Educational Institutions**

*Last Updated: August 24, 2026*
