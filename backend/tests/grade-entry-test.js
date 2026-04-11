/**
 * Test Script for Grade Entry System
 * 
 * This script demonstrates how to test the updated grade entry system
 * Run this with a tool like Postman or use the examples below with fetch/axios
 */

// ============================================
// 1. SETUP - Create Active Grade System First
// ============================================

const setupGradeSystem = async (token) => {
    const response = await fetch('http://localhost:5000/api/grades', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            grades: [
                { grade: 'A+', minPercentage: 90, maxPercentage: 100, gpa: 4.0, remarks: 'Excellent' },
                { grade: 'A', minPercentage: 80, maxPercentage: 89, gpa: 3.7, remarks: 'Very Good' },
                { grade: 'B+', minPercentage: 70, maxPercentage: 79, gpa: 3.3, remarks: 'Good' },
                { grade: 'B', minPercentage: 60, maxPercentage: 69, gpa: 3.0, remarks: 'Above Average' },
                { grade: 'C', minPercentage: 50, maxPercentage: 59, gpa: 2.0, remarks: 'Average' },
                { grade: 'D', minPercentage: 40, maxPercentage: 49, gpa: 1.0, remarks: 'Below Average' },
                { grade: 'F', minPercentage: 0, maxPercentage: 39, gpa: 0.0, remarks: 'Fail' }
            ]
        })
    });

    return await response.json();
};

// ============================================
// 2. ENTER MARKS - With Automatic Grade Calculation
// ============================================

const enterMarks = async (token, examId, subjectId, classId) => {
    const response = await fetch('http://localhost:5000/api/exams/marks/bulk', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            examId: examId,
            subjectId: subjectId,
            classId: classId,
            maxMarks: 100,
            marks: [
                {
                    studentId: 'STUDENT_ID_1',
                    score: 95,
                    remarks: 'Outstanding performance'
                },
                {
                    studentId: 'STUDENT_ID_2',
                    score: 85,
                    remarks: 'Good work'
                },
                {
                    studentId: 'STUDENT_ID_3',
                    score: 72,
                    remarks: 'Keep improving'
                },
                {
                    studentId: 'STUDENT_ID_4',
                    score: 58,
                    remarks: 'Needs more effort'
                },
                {
                    studentId: 'STUDENT_ID_5',
                    score: 35,
                    remarks: 'Requires attention'
                }
            ]
        })
    });

    const result = await response.json();
    console.log('Marks entered:', result);
    // Expected: Grades automatically calculated and saved
    // Student 1: 95% → A+ (4.0) - Excellent
    // Student 2: 85% → A (3.7) - Very Good
    // Student 3: 72% → B+ (3.3) - Good
    // Student 4: 58% → C (2.0) - Average
    // Student 5: 35% → F (0.0) - Fail

    return result;
};

// ============================================
// 3. GET MARKS - View Entered Marks with Grades
// ============================================

const getMarks = async (token, examId, classId) => {
    const response = await fetch(
        `http://localhost:5000/api/exams/marks?examId=${examId}&classId=${classId}`,
        {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }
    );

    const result = await response.json();
    console.log('Retrieved marks:', result);

    // Each mark should include:
    // - marksObtained
    // - maxMarks
    // - grade (A+, A, B+, etc.)
    // - gpa (4.0, 3.7, 3.3, etc.)
    // - gradeRemarks (Excellent, Very Good, etc.)

    return result;
};

// ============================================
// 4. UPDATE MARKS - Recalculates Grades Automatically
// ============================================

const updateMarks = async (token, examId, subjectId, classId) => {
    // Same endpoint as entering marks - it will update existing records
    const response = await fetch('http://localhost:5000/api/exams/marks/bulk', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            examId: examId,
            subjectId: subjectId,
            classId: classId,
            maxMarks: 100,
            marks: [
                {
                    studentId: 'STUDENT_ID_1',
                    score: 88, // Updated from 95 to 88
                    remarks: 'Revised score'
                }
            ]
        })
    });

    const result = await response.json();
    console.log('Marks updated:', result);
    // Grade will be recalculated: 88% → A (3.7) - Very Good

    return result;
};

// ============================================
// 5. DELETE SINGLE MARK
// ============================================

const deleteSingleMark = async (token, markId) => {
    const response = await fetch(`http://localhost:5000/api/exams/marks/${markId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const result = await response.json();
    console.log('Mark deleted:', result);

    return result;
};

// ============================================
// 6. BULK DELETE MARKS
// ============================================

const bulkDeleteMarks = async (token, examId, subjectId, classId, studentIds = null) => {
    const body = {
        examId: examId,
        subjectId: subjectId,
        classId: classId
    };

    // Optional: Delete specific students only
    if (studentIds) {
        body.studentIds = studentIds;
    }

    const response = await fetch('http://localhost:5000/api/exams/marks/bulk', {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const result = await response.json();
    console.log('Bulk delete result:', result);
    // Returns: { success: true, message: "...", deletedCount: 5 }

    return result;
};

// ============================================
// COMPLETE TEST FLOW
// ============================================

const runCompleteTest = async () => {
    const token = 'YOUR_AUTH_TOKEN_HERE';
    const examId = 'YOUR_EXAM_ID';
    const subjectId = 'YOUR_SUBJECT_ID';
    const classId = 'YOUR_CLASS_ID';

    try {
        console.log('=== Starting Grade Entry System Test ===\n');

        // Step 1: Setup grade system
        console.log('1. Setting up grade system...');
        await setupGradeSystem(token);
        console.log('✓ Grade system created\n');

        // Step 2: Enter marks
        console.log('2. Entering marks for students...');
        await enterMarks(token, examId, subjectId, classId);
        console.log('✓ Marks entered with auto-calculated grades\n');

        // Step 3: Retrieve marks
        console.log('3. Retrieving entered marks...');
        const marks = await getMarks(token, examId, classId);
        console.log('✓ Retrieved marks:', marks.data.length, 'records\n');

        // Step 4: Update a mark
        console.log('4. Updating a student mark...');
        await updateMarks(token, examId, subjectId, classId);
        console.log('✓ Mark updated with recalculated grade\n');

        // Step 5: Delete specific marks
        console.log('5. Deleting specific student marks...');
        await bulkDeleteMarks(token, examId, subjectId, classId, ['STUDENT_ID_5']);
        console.log('✓ Marks deleted\n');

        console.log('=== Test Completed Successfully ===');

    } catch (error) {
        console.error('Test failed:', error);
    }
};

// ============================================
// CURL EXAMPLES FOR MANUAL TESTING
// ============================================

/*

# 1. Enter marks with automatic grade calculation
curl -X POST http://localhost:5000/api/exams/marks/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "examId": "EXAM_ID",
    "subjectId": "SUBJECT_ID",
    "classId": "CLASS_ID",
    "maxMarks": 100,
    "marks": [
      {"studentId": "STUDENT_1", "score": 95},
      {"studentId": "STUDENT_2", "score": 85},
      {"studentId": "STUDENT_3", "score": 72}
    ]
  }'

# 2. Get marks with grades
curl -X GET "http://localhost:5000/api/exams/marks?examId=EXAM_ID&classId=CLASS_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Delete single mark
curl -X DELETE http://localhost:5000/api/exams/marks/MARK_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Bulk delete marks
curl -X DELETE http://localhost:5000/api/exams/marks/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "examId": "EXAM_ID",
    "subjectId": "SUBJECT_ID",
    "classId": "CLASS_ID",
    "studentIds": ["STUDENT_1", "STUDENT_2"]
  }'

*/

// Export for use in tests
module.exports = {
    setupGradeSystem,
    enterMarks,
    getMarks,
    updateMarks,
    deleteSingleMark,
    bulkDeleteMarks,
    runCompleteTest
};
