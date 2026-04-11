# Grade System API Documentation

## Overview
The Grade System Controller manages the grading system for your school management application. It allows you to create, manage, and calculate grades based on percentage scores.

## Location
- **Controller**: `backend/src/controllers/grade.controller.js`
- **Routes**: `backend/src/routes/grade.routes.js`
- **Model**: `backend/src/models/gradeSystem.model.js`

## API Endpoints

### 1. Create Grade System
**POST** `/api/grades`

Creates a new grade system for the tenant.

**Request Body:**
```json
{
  "grades": [
    {
      "grade": "A+",
      "minPercentage": 90,
      "maxPercentage": 100,
      "gpa": 4.0,
      "remarks": "Excellent"
    },
    {
      "grade": "A",
      "minPercentage": 80,
      "maxPercentage": 89,
      "gpa": 3.7,
      "remarks": "Very Good"
    },
    {
      "grade": "B+",
      "minPercentage": 70,
      "maxPercentage": 79,
      "gpa": 3.3,
      "remarks": "Good"
    },
    {
      "grade": "B",
      "minPercentage": 60,
      "maxPercentage": 69,
      "gpa": 3.0,
      "remarks": "Above Average"
    },
    {
      "grade": "C",
      "minPercentage": 50,
      "maxPercentage": 59,
      "gpa": 2.0,
      "remarks": "Average"
    },
    {
      "grade": "D",
      "minPercentage": 40,
      "maxPercentage": 49,
      "gpa": 1.0,
      "remarks": "Below Average"
    },
    {
      "grade": "F",
      "minPercentage": 0,
      "maxPercentage": 39,
      "gpa": 0.0,
      "remarks": "Fail"
    }
  ]
}
```

**Features:**
- Validates that grade ranges don't overlap
- Ensures only one active grade system exists per tenant
- Automatically sorts grades by percentage

---

### 2. Get Active Grade System
**GET** `/api/grades/active`

Retrieves the currently active grade system for the tenant.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "tenantId": "...",
    "grades": [...],
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### 3. Get All Grade Systems
**GET** `/api/grades`

Retrieves all grade systems (active and inactive) for the tenant.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [...]
}
```

---

### 4. Get Grade System by ID
**GET** `/api/grades/:id`

Retrieves a specific grade system by ID.

---

### 5. Update Grade System
**PUT** `/api/grades/:id`

Updates an existing grade system.

**Request Body:**
```json
{
  "grades": [...]
}
```

---

### 6. Delete Grade System
**DELETE** `/api/grades/:id`

Deletes a grade system.

---

### 7. Toggle Grade System Status
**PATCH** `/api/grades/:id/toggle`

Activates or deactivates a grade system. When activating a system, all other systems are automatically deactivated.

---

### 8. Calculate Grade from Percentage
**POST** `/api/grades/calculate`

Calculates the grade for a given percentage using the active grade system.

**Request Body:**
```json
{
  "percentage": 85
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "percentage": 85,
    "grade": "A",
    "gpa": 3.7,
    "remarks": "Very Good"
  }
}
```

---

## Helper Function

The controller also exports a helper function that can be used in other controllers:

```javascript
const { getGradeFromPercentage } = require('./controllers/grade.controller');

// Usage in other controllers
const gradeInfo = await getGradeFromPercentage(85, tenantId);
// Returns: { grade: "A", minPercentage: 80, maxPercentage: 89, gpa: 3.7, remarks: "Very Good" }
```

---

## Integration Example

### Using in Exam Controller

```javascript
const { getGradeFromPercentage } = require('./grade.controller');

// When calculating exam results
const percentage = (obtainedMarks / totalMarks) * 100;
const gradeInfo = await getGradeFromPercentage(percentage, req.user.tenantId);

const result = {
  studentId,
  examId,
  obtainedMarks,
  totalMarks,
  percentage,
  grade: gradeInfo?.grade,
  gpa: gradeInfo?.gpa,
  remarks: gradeInfo?.remarks
};
```

---

## Features

✅ **Multi-tenant Support**: Each tenant has their own grade system
✅ **Validation**: Prevents overlapping grade ranges
✅ **Single Active System**: Only one grade system can be active at a time
✅ **Automatic Sorting**: Grades are sorted by percentage
✅ **Easy Calculation**: Simple API to convert percentage to grade
✅ **Flexible**: Can have multiple inactive systems for history

---

## Notes

- All routes require authentication (protected by auth middleware)
- The grade system is tenant-specific
- Only one grade system can be active at a time per tenant
- Grade ranges must not overlap
- The system automatically sorts grades by percentage in descending order
