# Mark Entry and Grade Management API

## Overview
This document describes the complete API for entering, updating, and deleting student marks with automatic grade calculation. When teachers enter marks, the system automatically calculates and stores the grade (A+, A, B, etc.), GPA, and grade remarks based on the active grading system.

## Location
- **Controller**: `backend/src/controllers/exam.controller.js`
- **Routes**: `backend/src/routes/exam.routes.js`
- **Models**: 
  - `backend/src/models/mark.model.js`
  - `backend/src/models/gradeSystem.model.js`

---

## Mark Entry Endpoints

### 1. Bulk Mark Entry (Create/Update)
**POST** `/api/exams/marks/bulk`

**Authorization**: `school-admin`, `teacher`

Creates or updates marks for multiple students in a single request. Automatically calculates and stores grade, GPA, and grade remarks based on the active grading system.

**Request Body:**
```json
{
  "examId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "subjectId": "64a1b2c3d4e5f6g7h8i9j0k2",
  "classId": "64a1b2c3d4e5f6g7h8i9j0k3",
  "maxMarks": 100,
  "marks": [
    {
      "studentId": "64a1b2c3d4e5f6g7h8i9j0k4",
      "score": 85,
      "remarks": "Good performance"
    },
    {
      "studentId": "64a1b2c3d4e5f6g7h8i9j0k5",
      "score": 92,
      "maxMarks": 100,
      "remarks": "Excellent work"
    }
  ]
}
```

**Field Descriptions:**
- `examId` (required): ID of the exam
- `subjectId` (required): ID of the subject
- `classId` (required): ID of the class
- `maxMarks` (optional): Global maximum marks (default: 100). Can be overridden per student.
- `marks` (required): Array of student marks
  - `studentId` (required): ID of the student
  - `score` (required): Marks obtained by the student
  - `maxMarks` (optional): Maximum marks for this student (overrides global maxMarks)
  - `remarks` (optional): Teacher's remarks/comments

**Automatic Grade Calculation:**
The system automatically:
1. Calculates percentage: `(marksObtained / maxMarks) * 100`
2. Finds matching grade from active grade system
3. Stores `grade`, `gpa`, and `gradeRemarks` in the database

**Example Response:**
```json
{
  "success": true,
  "message": "Marks updated successfully"
}
```

**Features:**
- ✅ Validates marks don't exceed maximum marks
- ✅ Prevents updates to approved exams (except by admin)
- ✅ Teachers can only enter marks for their assigned classes/subjects
- ✅ Automatically calculates and stores grades
- ✅ Upsert operation (creates or updates existing marks)
- ✅ Logs all mark entry actions

---

### 2. Delete Single Mark
**DELETE** `/api/exams/marks/:markId`

**Authorization**: `school-admin`, `teacher`

Deletes a single mark entry including its associated grade.

**URL Parameters:**
- `markId`: ID of the mark to delete

**Example Response:**
```json
{
  "success": true,
  "message": "Mark deleted successfully"
}
```

**Features:**
- ✅ Prevents deletion of marks for approved exams (except by admin)
- ✅ Teachers can only delete marks for their assigned classes/subjects
- ✅ Logs deletion actions

---

### 3. Bulk Delete Marks
**DELETE** `/api/exams/marks/bulk`

**Authorization**: `school-admin`, `teacher`

Deletes multiple marks at once. Can delete all marks for an exam/subject/class combination, or specific students.

**Request Body:**
```json
{
  "examId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "subjectId": "64a1b2c3d4e5f6g7h8i9j0k2",
  "classId": "64a1b2c3d4e5f6g7h8i9j0k3",
  "studentIds": ["64a1b2c3d4e5f6g7h8i9j0k4", "64a1b2c3d4e5f6g7h8i9j0k5"]
}
```

**Field Descriptions:**
- `examId` (required): ID of the exam
- `subjectId` (required): ID of the subject
- `classId` (required): ID of the class
- `studentIds` (optional): Array of student IDs. If not provided, deletes all marks for the exam/subject/class.

**Example Response:**
```json
{
  "success": true,
  "message": "Successfully deleted 5 mark(s)",
  "deletedCount": 5
}
```

**Features:**
- ✅ Prevents deletion of marks for approved exams (except by admin)
- ✅ Teachers can only delete marks for their assigned classes/subjects
- ✅ Can delete all marks or specific students
- ✅ Returns count of deleted marks
- ✅ Logs bulk deletion actions

---

### 4. Get Marks
**GET** `/api/exams/marks`

**Authorization**: `school-admin`, `teacher`, `student`, `parent`

Retrieves marks with grades. Students can only see their own marks.

**Query Parameters:**
- `examId` (optional): Filter by exam
- `subjectId` (optional): Filter by subject
- `classId` (optional): Filter by class
- `studentId` (optional): Filter by student (admin/teacher only)

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6g7h8i9j0k6",
      "student": {
        "_id": "64a1b2c3d4e5f6g7h8i9j0k4",
        "firstName": "John",
        "lastName": "Doe",
        "profile": {
          "rollNo": "2024001"
        }
      },
      "subject": {
        "_id": "64a1b2c3d4e5f6g7h8i9j0k2",
        "name": "Mathematics",
        "code": "MATH101"
      },
      "exam": {
        "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
        "name": "Mid-Term Exam",
        "term": "1",
        "isApproved": false
      },
      "marksObtained": 85,
      "maxMarks": 100,
      "grade": "A",
      "gpa": 3.7,
      "gradeRemarks": "Very Good",
      "remarks": "Good performance",
      "gradedBy": "64a1b2c3d4e5f6g7h8i9j0k7",
      "createdAt": "2024-02-03T09:00:00.000Z",
      "updatedAt": "2024-02-03T09:00:00.000Z"
    }
  ]
}
```

---

## Mark Model Schema

The Mark model now includes the following fields:

```javascript
{
  exam: ObjectId,              // Reference to Exam
  student: ObjectId,           // Reference to User (student)
  subject: ObjectId,           // Reference to Subject
  class: ObjectId,             // Reference to Class
  marksObtained: Number,       // Marks scored by student
  maxMarks: Number,            // Maximum marks (default: 100)
  remarks: String,             // Teacher's remarks
  grade: String,               // Calculated grade (A+, A, B, etc.)
  gpa: Number,                 // Calculated GPA (0.0 - 4.0)
  gradeRemarks: String,        // Grade remarks (Excellent, Good, etc.)
  tenantId: String,            // Tenant identifier
  gradedBy: ObjectId,          // Reference to User (teacher who graded)
  createdAt: Date,             // Auto-generated
  updatedAt: Date              // Auto-generated
}
```

---

## Authorization Rules

### Teachers
- Can enter/update/delete marks **only** for:
  - Classes and subjects they are assigned to (via Timetable)
  - Classes where they are the class teacher
- Cannot modify marks for approved exams (only admin can)

### School Admin
- Can enter/update/delete marks for any class/subject
- Can modify marks even for approved exams

### Students & Parents
- Can only **view** marks
- Students can only see their own marks

---

## Workflow Example

### Complete Mark Entry Flow

1. **Teacher logs in** and navigates to mark entry
2. **Selects exam, class, and subject**
3. **Enters marks** for students:
   ```json
   POST /api/exams/marks/bulk
   {
     "examId": "...",
     "subjectId": "...",
     "classId": "...",
     "maxMarks": 100,
     "marks": [
       { "studentId": "...", "score": 85 },
       { "studentId": "...", "score": 92 }
     ]
   }
   ```
4. **System automatically**:
   - Validates marks
   - Calculates percentage for each student
   - Fetches active grade system
   - Determines grade, GPA, and remarks
   - Saves everything to database
5. **Teacher can view entered marks**:
   ```json
   GET /api/exams/marks?examId=...&subjectId=...&classId=...
   ```
6. **If correction needed**, teacher can:
   - **Update**: Re-submit with corrected scores (same endpoint)
   - **Delete single**: `DELETE /api/exams/marks/:markId`
   - **Delete multiple**: `DELETE /api/exams/marks/bulk`

---

## Error Handling

### Common Error Responses

**400 Bad Request** - Invalid data
```json
{
  "success": false,
  "message": "Invalid marks for student 64a1b2c3d4e5f6g7h8i9j0k4. Marks obtained (105) cannot exceed max marks (100)."
}
```

**403 Forbidden** - Unauthorized access
```json
{
  "success": false,
  "message": "Access denied. You are not assigned to this class and subject."
}
```

**404 Not Found** - Resource not found
```json
{
  "success": false,
  "message": "Exam not found"
}
```

**400 Bad Request** - Approved exam
```json
{
  "success": false,
  "message": "Marks are locked for this exam as it has been approved. Contact admin to revert approval."
}
```

---

## Integration with Grade System

The mark entry system integrates with the Grade System API (see `GRADE_SYSTEM_API.md`):

1. **Active Grade System Required**: The system uses the active grade system to calculate grades
2. **Automatic Calculation**: Grades are calculated automatically when marks are entered
3. **Stored in Database**: Calculated grades are stored, not computed on-the-fly
4. **Updates on Grade System Change**: If you change the grade system, existing marks keep their original grades. Re-enter marks to recalculate with new system.

**Example Grade System:**
```json
{
  "grades": [
    { "grade": "A+", "minPercentage": 90, "maxPercentage": 100, "gpa": 4.0, "remarks": "Excellent" },
    { "grade": "A", "minPercentage": 80, "maxPercentage": 89, "gpa": 3.7, "remarks": "Very Good" },
    { "grade": "B+", "minPercentage": 70, "maxPercentage": 79, "gpa": 3.3, "remarks": "Good" },
    { "grade": "B", "minPercentage": 60, "maxPercentage": 69, "gpa": 3.0, "remarks": "Above Average" },
    { "grade": "C", "minPercentage": 50, "maxPercentage": 59, "gpa": 2.0, "remarks": "Average" },
    { "grade": "D", "minPercentage": 40, "maxPercentage": 49, "gpa": 1.0, "remarks": "Below Average" },
    { "grade": "F", "minPercentage": 0, "maxPercentage": 39, "gpa": 0.0, "remarks": "Fail" }
  ]
}
```

---

## Best Practices

1. **Always set up grade system first** before entering marks
2. **Use bulk entry** for efficiency when entering marks for multiple students
3. **Validate data** on frontend before submission
4. **Handle errors gracefully** and show meaningful messages to users
5. **Log all actions** for audit trail (automatically done)
6. **Prevent approved exam modifications** except by admin
7. **Use upsert pattern** - same endpoint for create and update

---

## Testing Examples

### Using cURL

**Enter marks:**
```bash
curl -X POST http://localhost:5000/api/exams/marks/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "examId": "64a1b2c3d4e5f6g7h8i9j0k1",
    "subjectId": "64a1b2c3d4e5f6g7h8i9j0k2",
    "classId": "64a1b2c3d4e5f6g7h8i9j0k3",
    "maxMarks": 100,
    "marks": [
      {"studentId": "64a1b2c3d4e5f6g7h8i9j0k4", "score": 85},
      {"studentId": "64a1b2c3d4e5f6g7h8i9j0k5", "score": 92}
    ]
  }'
```

**Get marks:**
```bash
curl -X GET "http://localhost:5000/api/exams/marks?examId=64a1b2c3d4e5f6g7h8i9j0k1&classId=64a1b2c3d4e5f6g7h8i9j0k3" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Delete mark:**
```bash
curl -X DELETE http://localhost:5000/api/exams/marks/64a1b2c3d4e5f6g7h8i9j0k6 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Summary

✅ **Teachers can now**:
- Enter marks with automatic grade calculation
- Update marks (grades recalculated automatically)
- Delete individual marks
- Delete multiple marks at once
- View all entered marks with grades

✅ **Grades are**:
- Automatically calculated based on percentage
- Stored in database (not calculated on-the-fly)
- Include letter grade (A+, A, B, etc.)
- Include GPA value (0.0 - 4.0)
- Include grade remarks (Excellent, Good, etc.)

✅ **System ensures**:
- Proper authorization (teachers can only modify their classes)
- Data validation (marks can't exceed maximum)
- Audit logging (all actions are logged)
- Approved exam protection (can't modify without admin)
