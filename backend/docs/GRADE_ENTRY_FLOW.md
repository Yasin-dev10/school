# Grade Entry System - Visual Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TEACHER INTERFACE                         │
│  (Frontend - React/Next.js)                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP Request
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API ENDPOINTS (Routes)                       │
│  POST   /api/exams/marks/bulk      - Enter/Update Marks         │
│  DELETE /api/exams/marks/:markId   - Delete Single Mark         │
│  DELETE /api/exams/marks/bulk      - Bulk Delete Marks          │
│  GET    /api/exams/marks           - Get Marks                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Auth Middleware
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHORIZATION CHECK                           │
│  - Verify JWT Token                                             │
│  - Check User Role (admin/teacher)                              │
│  - Verify Teacher Assignment (if teacher)                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Authorized
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CONTROLLER (Business Logic)                    │
│                                                                  │
│  1. Validate Input Data                                         │
│  2. Check Exam Status (not approved)                            │
│  3. Fetch Active Grade System ◄─────────────┐                   │
│  4. Calculate Percentage                    │                   │
│  5. Determine Grade, GPA, Remarks           │                   │
│  6. Save to Database                        │                   │
└────────────────────────┬────────────────────┼──────────────────┘
                         │                    │
                         │                    │
                         ▼                    │
┌─────────────────────────────────────────────┼──────────────────┐
│                   DATABASE (MongoDB)        │                  │
│                                             │                  │
│  ┌──────────────────┐    ┌─────────────────▼────────────────┐ │
│  │   Mark Model     │    │   GradeSystem Model              │ │
│  ├──────────────────┤    ├──────────────────────────────────┤ │
│  │ - exam           │    │ - tenantId                       │ │
│  │ - student        │    │ - isActive: true                 │ │
│  │ - subject        │    │ - grades: [                      │ │
│  │ - class          │    │     {grade, min, max, gpa, ...}  │ │
│  │ - marksObtained  │    │   ]                              │ │
│  │ - maxMarks       │    └──────────────────────────────────┘ │
│  │ - grade ◄────────┼─── Calculated from Grade System        │
│  │ - gpa            │                                         │
│  │ - gradeRemarks   │                                         │
│  │ - remarks        │                                         │
│  │ - gradedBy       │                                         │
│  └──────────────────┘                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mark Entry Flow

```
┌──────────────┐
│   Teacher    │
│  Logs In     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│ Select Exam, Class,      │
│ Subject                  │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Enter Marks for Students │
│                          │
│ Student 1: 95/100        │
│ Student 2: 85/100        │
│ Student 3: 72/100        │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ POST /api/exams/marks/bulk               │
│                                          │
│ {                                        │
│   examId: "...",                         │
│   subjectId: "...",                      │
│   classId: "...",                        │
│   maxMarks: 100,                         │
│   marks: [                               │
│     {studentId: "...", score: 95},       │
│     {studentId: "...", score: 85},       │
│     {studentId: "...", score: 72}        │
│   ]                                      │
│ }                                        │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ BACKEND PROCESSING                       │
│                                          │
│ For each student:                        │
│                                          │
│ 1. Calculate Percentage                  │
│    95/100 = 95%                          │
│                                          │
│ 2. Fetch Active Grade System             │
│    grades: [                             │
│      {A+: 90-100, gpa: 4.0, ...},        │
│      {A: 80-89, gpa: 3.7, ...},          │
│      ...                                 │
│    ]                                     │
│                                          │
│ 3. Find Matching Grade                   │
│    95% → A+ (90-100)                     │
│                                          │
│ 4. Extract Grade Info                    │
│    grade: "A+"                           │
│    gpa: 4.0                              │
│    remarks: "Excellent"                  │
│                                          │
│ 5. Save to Database                      │
│    {                                     │
│      marksObtained: 95,                  │
│      maxMarks: 100,                      │
│      grade: "A+",                        │
│      gpa: 4.0,                           │
│      gradeRemarks: "Excellent"           │
│    }                                     │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Success Response         │
│                          │
│ {                        │
│   success: true,         │
│   message: "Marks        │
│   updated successfully"  │
│ }                        │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Teacher Views Results    │
│                          │
│ Student 1: 95 → A+ (4.0) │
│ Student 2: 85 → A (3.7)  │
│ Student 3: 72 → B+ (3.3) │
└──────────────────────────┘
```

---

## Grade Calculation Logic

```
Input: marksObtained = 85, maxMarks = 100

Step 1: Calculate Percentage
┌─────────────────────────────┐
│ percentage = (85/100) × 100 │
│ percentage = 85%            │
└─────────────┬───────────────┘
              │
              ▼
Step 2: Fetch Active Grade System
┌─────────────────────────────────────────┐
│ Grade System:                           │
│ [                                       │
│   {grade: "A+", min: 90, max: 100, ...} │
│   {grade: "A",  min: 80, max: 89,  ...} │ ◄── Match!
│   {grade: "B+", min: 70, max: 79,  ...} │
│   {grade: "B",  min: 60, max: 69,  ...} │
│   ...                                   │
│ ]                                       │
└─────────────┬───────────────────────────┘
              │
              ▼
Step 3: Find Matching Grade
┌─────────────────────────────────────────┐
│ 85% falls in range 80-89                │
│ → Grade: "A"                            │
│ → GPA: 3.7                              │
│ → Remarks: "Very Good"                  │
└─────────────┬───────────────────────────┘
              │
              ▼
Step 4: Store in Database
┌─────────────────────────────────────────┐
│ Mark Document:                          │
│ {                                       │
│   marksObtained: 85,                    │
│   maxMarks: 100,                        │
│   grade: "A",         ◄── Stored!       │
│   gpa: 3.7,           ◄── Stored!       │
│   gradeRemarks: "Very Good" ◄── Stored! │
│ }                                       │
└─────────────────────────────────────────┘
```

---

## Authorization Flow

```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│ Check JWT Token      │
│ Extract User Info    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ User Role?           │
└──────┬───────────────┘
       │
       ├─────────────────────────────┐
       │                             │
       ▼                             ▼
┌──────────────┐            ┌────────────────┐
│ School Admin │            │    Teacher     │
└──────┬───────┘            └────────┬───────┘
       │                             │
       │                             ▼
       │                    ┌─────────────────────┐
       │                    │ Check Assignment:   │
       │                    │ - Timetable?        │
       │                    │ - Class Teacher?    │
       │                    └────────┬────────────┘
       │                             │
       │                             ├─────────┬─────────┐
       │                             │         │         │
       │                             ▼         ▼         ▼
       │                          ┌─────┐  ┌─────┐  ┌─────┐
       │                          │ Yes │  │ No  │  │ No  │
       │                          └──┬──┘  └──┬──┘  └──┬──┘
       │                             │        │        │
       ▼                             ▼        ▼        ▼
┌──────────────┐            ┌─────────┐  ┌──────────────┐
│   ALLOWED    │            │ ALLOWED │  │   DENIED     │
│ All Classes  │            │ Assigned│  │ 403 Error    │
└──────────────┘            └─────────┘  └──────────────┘
```

---

## Delete Flow

```
┌─────────────────────┐
│ Teacher wants to    │
│ delete marks        │
└──────┬──────────────┘
       │
       ├──────────────────────────┬──────────────────────┐
       │                          │                      │
       ▼                          ▼                      ▼
┌──────────────┐        ┌──────────────┐      ┌──────────────┐
│ Single Mark  │        │ Multiple     │      │ All Marks    │
│              │        │ Students     │      │ for Exam     │
└──────┬───────┘        └──────┬───────┘      └──────┬───────┘
       │                       │                      │
       ▼                       ▼                      ▼
┌──────────────┐        ┌──────────────┐      ┌──────────────┐
│ DELETE       │        │ DELETE       │      │ DELETE       │
│ /marks/:id   │        │ /marks/bulk  │      │ /marks/bulk  │
│              │        │ + studentIds │      │ (no IDs)     │
└──────┬───────┘        └──────┬───────┘      └──────┬───────┘
       │                       │                      │
       └───────────────────────┴──────────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │ Check Exam       │
                    │ Approved?        │
                    └──────┬───────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
              ┌─────────┐   ┌─────────┐
              │   Yes   │   │   No    │
              └────┬────┘   └────┬────┘
                   │             │
                   ▼             ▼
            ┌──────────┐   ┌──────────┐
            │ Admin?   │   │ DELETE   │
            └────┬─────┘   │ Marks    │
                 │         └──────────┘
          ┌──────┴──────┐
          │             │
          ▼             ▼
    ┌─────────┐   ┌─────────┐
    │   Yes   │   │   No    │
    └────┬────┘   └────┬────┘
         │             │
         ▼             ▼
    ┌─────────┐   ┌─────────┐
    │ DELETE  │   │ DENIED  │
    │ Marks   │   │ 400 Err │
    └─────────┘   └─────────┘
```

---

## Data Flow Summary

```
Teacher Input          Backend Processing           Database Storage
─────────────          ──────────────────           ────────────────

Score: 95         →    Calculate: 95/100 = 95%  →   marksObtained: 95
Max: 100          →    Validate: 95 ≤ 100       →   maxMarks: 100
                  →    Find Grade: 95% → A+     →   grade: "A+"
                  →    Get GPA: 4.0             →   gpa: 4.0
                  →    Get Remarks: "Excellent" →   gradeRemarks: "Excellent"
Remarks: "Great!" →    Store Remarks            →   remarks: "Great!"
```

---

## Key Features Visualization

```
┌─────────────────────────────────────────────────────────────┐
│                   GRADE ENTRY SYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ Automatic Grade Calculation                            │
│     Input: Score → Output: Grade + GPA + Remarks           │
│                                                             │
│  ✅ Complete CRUD Operations                               │
│     Create → Read → Update → Delete                        │
│                                                             │
│  ✅ Authorization & Security                               │
│     Role-based access + Assignment verification            │
│                                                             │
│  ✅ Data Validation                                        │
│     Score ≤ Max Marks + Approved exam protection           │
│                                                             │
│  ✅ Audit Trail                                            │
│     All actions logged with user + timestamp               │
│                                                             │
│  ✅ Bulk Operations                                        │
│     Enter/Delete multiple students at once                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
