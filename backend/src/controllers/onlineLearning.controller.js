const prisma = require('../config/prismaClient');
const { canTeacherAccessClassSubject } = require('../utils/teacherScope');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const pdfParse = require('pdf-parse');
const { createWorker, OEM } = require('tesseract.js');
const englishOcr = require('@tesseract.js-data/eng');
const arabicOcr = require('@tesseract.js-data/ara');

const manager = (user) => ['school-admin', 'super-admin', 'teacher'].includes(user.role);

const classIdsFor = async (user) => {
    if (!['student', 'parent'].includes(user.role)) return null;
    if (user.role === 'student') {
        const rows = await prisma.class.findMany({ where: { tenantId: user.tenantId, name: user.profile?.class || '__none__' }, select: { id: true } });
        return rows.map((row) => row.id);
    }
    const links = await prisma.studentParent.findMany({ where: { parentId: user.id }, include: { student: { select: { profileClass: true } } } });
    const names = links.map((link) => link.student.profileClass).filter(Boolean);
    const rows = await prisma.class.findMany({ where: { tenantId: user.tenantId, name: { in: names } }, select: { id: true } });
    return rows.map((row) => row.id);
};

exports.getCourses = async (req, res) => {
    try {
        const classIds = await classIdsFor(req.user);
        const where = { tenantId: req.user.tenantId, ...(classIds && { classId: { in: classIds }, published: true }), ...(req.user.role === 'teacher' && { createdById: req.user.id }) };
        const courses = await prisma.course.findMany({
            where,
            include: {
                class: { select: { id: true, name: true, section: true } }, subject: { select: { id: true, name: true } },
                lessons: { where: classIds ? { published: true } : {}, orderBy: { position: 'asc' }, include: { progress: { where: { studentId: req.user.id } } } },
                quizzes: { where: classIds ? { published: true } : {}, include: { _count: { select: { questions: true } }, attempts: { where: { studentId: req.user.id }, orderBy: { submittedAt: 'desc' }, take: 1 } } }
            }, orderBy: { createdAt: 'desc' }
        });
        const data = courses.map((course) => {
            const complete = course.lessons.filter((lesson) => lesson.progress[0]?.completed).length;
            return { ...course, progressPercent: course.lessons.length ? Math.round((complete / course.lessons.length) * 100) : 0 };
        });
        res.json({ success: true, data });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createCourse = async (req, res) => {
    try {
        if (!manager(req.user)) return res.status(403).json({ message: 'Not authorized' });
        const { title, description, classId, subjectId, published } = req.body;
        if (!title || !classId) return res.status(400).json({ message: 'Title and class are required' });
        if (req.user.role === 'teacher' && (!subjectId || !(await canTeacherAccessClassSubject(req.user.id, classId, subjectId, req.user.tenantId)))) return res.status(403).json({ message: 'You are not assigned to this class subject' });
        const course = await prisma.course.create({ data: { tenantId: req.user.tenantId, title, description: description || null, classId, subjectId: subjectId || null, published: Boolean(published), createdById: req.user.id } });
        res.status(201).json({ success: true, data: course });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.addLesson = async (req, res) => {
    try {
        const course = await prisma.course.findFirst({ where: { id: req.params.courseId, tenantId: req.user.tenantId } });
        if (!course || !manager(req.user) || (req.user.role === 'teacher' && course.createdById !== req.user.id)) return res.status(403).json({ message: 'Not authorized' });
        const { title, description, videoUrl, durationMin, position } = req.body;
        if (!title || !videoUrl) return res.status(400).json({ message: 'Title and video URL are required' });
        const lesson = await prisma.lesson.create({ data: { courseId: course.id, title, description: description || null, videoUrl, durationMin: durationMin ? Number(durationMin) : null, position: Number(position || 0) } });
        res.status(201).json({ success: true, data: lesson });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.saveProgress = async (req, res) => {
    try {
        if (req.user.role !== 'student') return res.status(403).json({ message: 'Students only' });
        const lesson = await prisma.lesson.findFirst({ where: { id: req.params.lessonId, course: { tenantId: req.user.tenantId, published: true } } });
        if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
        const progress = await prisma.lessonProgress.upsert({ where: { lessonId_studentId: { lessonId: lesson.id, studentId: req.user.id } }, update: { completed: Boolean(req.body.completed), watchedSecs: Number(req.body.watchedSecs || 0) }, create: { lessonId: lesson.id, studentId: req.user.id, completed: Boolean(req.body.completed), watchedSecs: Number(req.body.watchedSecs || 0) } });
        res.json({ success: true, data: progress });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createQuiz = async (req, res) => {
    try {
        const course = await prisma.course.findFirst({ where: { id: req.params.courseId, tenantId: req.user.tenantId } });
        if (!course || !manager(req.user) || (req.user.role === 'teacher' && course.createdById !== req.user.id)) return res.status(403).json({ message: 'Not authorized' });
        const { title, description, passPercent = 50, questions = [] } = req.body;
        if (!title || !questions.length) return res.status(400).json({ message: 'Title and questions are required' });
        const quiz = await prisma.quiz.create({ data: { courseId: course.id, title, description: description || null, passPercent: Number(passPercent), questions: { create: questions.map((q, index) => ({ prompt: q.prompt, options: q.options, correctIndex: Number(q.correctIndex), points: Number(q.points || 1), position: index })) } }, include: { questions: true } });
        res.status(201).json({ success: true, data: quiz });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createClassQuiz = async (req, res) => {
    try {
        if (!manager(req.user)) return res.status(403).json({ message: 'Not authorized' });
        const { classId, subjectId, title, description, passPercent = 50, durationMin, availableFrom, deadline, questions = [] } = req.body;
        if (!classId || !title || !Array.isArray(questions) || !questions.length) return res.status(400).json({ message: 'Class, title and questions are required' });
        const academicClass = await prisma.class.findFirst({ where: { id: classId, tenantId: req.user.tenantId }, select: { id: true, name: true, section: true } });
        if (!academicClass) return res.status(404).json({ message: 'Class not found' });
        if (req.user.role === 'teacher' && (!subjectId || !(await canTeacherAccessClassSubject(req.user.id, classId, subjectId, req.user.tenantId)))) return res.status(403).json({ message: 'You are not assigned to this class subject' });
        const normalizedQuestions = questions.map((question, index) => {
            const questionType = question.questionType === 'written' ? 'written' : 'multiple_choice';
            const prompt = String(question.prompt || '').trim();
            const options = Array.isArray(question.options) ? question.options.map(option => String(option).trim()) : [];
            const correctIndex = Number(question.correctIndex);
            const points = Number(question.points || 1);
            const modelAnswer = questionType === 'written' ? String(question.modelAnswer || '').trim() : null;
            let keywords = questionType === 'written'
                ? (Array.isArray(question.keywords) ? question.keywords : String(question.keywords || '').split(',')).map(keyword => String(keyword).trim()).filter(Boolean)
                : [];
            if (!prompt) throw Object.assign(new Error(`Question ${index + 1}: write the question text`), { statusCode: 400 });
            if (!Number.isFinite(points) || points <= 0) throw Object.assign(new Error(`Question ${index + 1}: marks must be greater than zero`), { statusCode: 400 });
            if (questionType === 'multiple_choice') {
                if (options.length < 2 || options.some(option => !option)) throw Object.assign(new Error(`Question ${index + 1}: complete all answer options`), { statusCode: 400 });
                if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) throw Object.assign(new Error(`Question ${index + 1}: select the correct answer`), { statusCode: 400 });
            } else {
                if (!modelAnswer) throw Object.assign(new Error(`Question ${index + 1}: add the teacher model answer`), { statusCode: 400 });
                if (!keywords.length) keywords = [...new Set((modelAnswer.match(/[\p{L}\p{N}]{3,}/gu) || []).map(word => word.toLocaleLowerCase()))].slice(0, 12);
            }
            return { prompt, options: questionType === 'written' ? [] : options, correctIndex: questionType === 'written' ? 0 : correctIndex, points, position: index, questionType, modelAnswer, keywords };
        });
        const startDate = availableFrom ? new Date(availableFrom) : null;
        const deadlineDate = deadline ? new Date(deadline) : null;
        if ((startDate && Number.isNaN(startDate.getTime())) || (deadlineDate && Number.isNaN(deadlineDate.getTime()))) return res.status(400).json({ message: 'Invalid quiz schedule' });
        if (deadlineDate && deadlineDate <= (startDate || new Date())) return res.status(400).json({ message: 'Deadline must be after the start time' });
        let course = await prisma.course.findFirst({ where: { tenantId: req.user.tenantId, classId, subjectId: subjectId || null, createdById: req.user.id, title: 'Manual Quizzes' } });
        if (!course) course = await prisma.course.create({ data: { tenantId: req.user.tenantId, classId, subjectId: subjectId || null, createdById: req.user.id, title: 'Manual Quizzes', description: `Quizzes for ${academicClass.name} ${academicClass.section || ''}`.trim(), published: true } });
        const quiz = await prisma.quiz.create({
            data: {
                courseId: course.id, title: String(title).trim(), description: description || null,
                passPercent: Math.min(100, Math.max(0, Number(passPercent))),
                durationMin: durationMin ? Math.min(300, Math.max(1, Number(durationMin))) : null,
                availableFrom: startDate, deadline: deadlineDate,
                questions: { create: normalizedQuestions }
            },
            include: { questions: true }
        });
        res.status(201).json({ success: true, data: quiz });
    } catch (error) { res.status(error.statusCode || 500).json({ success: false, message: error.message }); }
};

const questionsFromText = (text, requestedCount) => {
    const limit = Math.min(Math.max(Number(requestedCount) || 5, 3), 20);
    const normalizedText = text
        .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
        .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
        .replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/[−–—]/g, '-');
    const mathQuestions = [];
    const equationPattern = /(-?\d+(?:\.\d+)?(?:\s*[+\-*/]\s*-?\d+(?:\.\d+)?)+)\s*=\s*(-?\d+(?:\.\d+)?)/g;
    for (const match of normalizedText.matchAll(equationPattern)) {
        const answer = Number(match[2]);
        if (!Number.isFinite(answer)) continue;
        const step = Number.isInteger(answer) ? 1 : 0.1;
        const values = [answer, answer + step, answer - step, answer + (step * 2)].map(value => Number(value.toFixed(2)));
        const correctIndex = mathQuestions.length % 4;
        const options = values.slice(1);
        options.splice(correctIndex, 0, values[0]);
        mathQuestions.push({ prompt: `${match[1].trim()} = ?`, options: options.map(String), correctIndex, points: 1 });
        if (mathQuestions.length === limit) break;
    }

    const sentences = normalizedText
        .split(/(?<=[.!?؟])\s+|[\r\n]+/u)
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length >= 45 && sentence.length <= 260);
    const stopWords = new Set([
        'about', 'after', 'again', 'also', 'because', 'before', 'being', 'between', 'could', 'from', 'have', 'into', 'more', 'most', 'other', 'should', 'such', 'than', 'that', 'their', 'there', 'these', 'they', 'this', 'those', 'through', 'under', 'very', 'were', 'what', 'when', 'where', 'which', 'while', 'with', 'would', 'your',
        'ayaa', 'ahaa', 'ahaan', 'ama', 'ayaa', 'iyo', 'inuu', 'iyada', 'isaga', 'kale', 'karaa', 'lagu', 'marka', 'maxaa', 'midka', 'sida', 'sidoo', 'tahay', 'waxaa', 'waxay', 'waxaana', 'wuxuu',
        'التي', 'الذي', 'الذين', 'إلى', 'على', 'عليه', 'عنها', 'فيها', 'كان', 'كانت', 'هذا', 'هذه', 'ذلك', 'تلك', 'هناك', 'يكون', 'يمكن', 'منها', 'وهو', 'وهي'
    ]);
    const candidates = sentences.map(sentence => {
        const words = sentence.match(/[\p{L}\p{M}][\p{L}\p{M}'’\-]{3,}/gu) || [];
        const answer = words.filter(word => !stopWords.has(word.toLocaleLowerCase())).sort((a, b) => b.length - a.length)[0];
        return answer ? { sentence, answer } : null;
    }).filter(Boolean);
    const answerPool = [...new Map(candidates.map(item => [item.answer.toLocaleLowerCase(), item.answer])).values()];
    const textQuestions = answerPool.length < 4 ? [] : candidates.map((item, index) => {
        const otherAnswers = answerPool.filter(answer => answer.toLocaleLowerCase() !== item.answer.toLocaleLowerCase());
        const distractors = [0, 1, 2].map(offset => otherAnswers[(index + offset) % otherAnswers.length]);
        const correctIndex = index % 4;
        const options = distractors.slice(0, 3);
        options.splice(correctIndex, 0, item.answer);
        return { prompt: item.sentence.replace(item.answer, '_____'), options, correctIndex, points: 1 };
    });
    const combined = [...mathQuestions, ...textQuestions].slice(0, limit).map((question, position) => ({ ...question, position }));
    if (combined.length < 3) throw Object.assign(new Error('PDF-ka lagama helin ugu yaraan 3 su’aalood oo la isku halayn karo, xitaa kadib OCR.'), { statusCode: 400 });
    return combined;
};

const extractTextWithOcr = async pdfPath => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'school-quiz-ocr-'));
    let document;
    let worker;
    try {
        await Promise.all([
            fs.copyFile(path.join(englishOcr.langPath, 'eng.traineddata.gz'), path.join(tempDir, 'eng.traineddata.gz')),
            fs.copyFile(path.join(arabicOcr.langPath, 'ara.traineddata.gz'), path.join(tempDir, 'ara.traineddata.gz'))
        ]);
        const { pdf } = await import('pdf-to-img');
        document = await pdf(pdfPath, { scale: 2 });
        worker = await createWorker(['eng', 'ara'], OEM.LSTM_ONLY, { langPath: tempDir, gzip: true });
        const pageCount = Math.min(document.length, 12);
        const pageTexts = [];
        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
            const image = await document.getPage(pageNumber);
            const result = await worker.recognize(image, { rotateAuto: true });
            pageTexts.push(result.data.text || '');
        }
        return pageTexts.join('\n');
    } finally {
        if (worker) await worker.terminate().catch(() => undefined);
        if (document) await document.destroy().catch(() => undefined);
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
};

exports.createQuizFromPdf = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'PDF file is required' });
        if (path.extname(req.file.originalname).toLowerCase() !== '.pdf' || req.file.mimetype !== 'application/pdf') return res.status(400).json({ message: 'Only PDF files are accepted' });
        if (!manager(req.user)) return res.status(403).json({ message: 'Not authorized' });
        let course;
        if (req.params.courseId) {
            course = await prisma.course.findFirst({ where: { id: req.params.courseId, tenantId: req.user.tenantId } });
            if (!course || (req.user.role === 'teacher' && course.createdById !== req.user.id)) return res.status(403).json({ message: 'Not authorized' });
        } else {
            const { classId, subjectId } = req.body;
            if (!classId) return res.status(400).json({ message: 'Class is required' });
            const academicClass = await prisma.class.findFirst({ where: { id: classId, tenantId: req.user.tenantId }, select: { id: true, name: true, section: true } });
            if (!academicClass) return res.status(404).json({ message: 'Class not found' });
            if (req.user.role === 'teacher' && (!subjectId || !(await canTeacherAccessClassSubject(req.user.id, classId, subjectId, req.user.tenantId)))) return res.status(403).json({ message: 'You are not assigned to this class subject' });
            course = await prisma.course.findFirst({ where: { tenantId: req.user.tenantId, classId, subjectId: subjectId || null, createdById: req.user.id, title: 'PDF Quizzes' } });
            if (!course) course = await prisma.course.create({ data: { tenantId: req.user.tenantId, classId, subjectId: subjectId || null, createdById: req.user.id, title: 'PDF Quizzes', description: `Quizzes for ${academicClass.name} ${academicClass.section || ''}`.trim(), published: true } });
        }
        const parsed = await pdfParse(await fs.readFile(req.file.path));
        let questions;
        try {
            questions = questionsFromText(parsed.text || '', req.body.questionCount);
        } catch (extractionError) {
            if (extractionError.statusCode !== 400) throw extractionError;
            const ocrText = await extractTextWithOcr(req.file.path);
            questions = questionsFromText(ocrText, req.body.questionCount);
        }
        const title = String(req.body.title || path.parse(req.file.originalname).name).trim().slice(0, 150);
        const quiz = await prisma.quiz.create({
            data: { courseId: course.id, title, passPercent: 50, questions: { create: questions } },
            include: { questions: true }
        });
        res.status(201).json({ success: true, data: quiz });
    } catch (error) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    } finally {
        if (req.file?.path) await fs.unlink(req.file.path).catch(() => undefined);
    }
};

exports.getQuiz = async (req, res) => {
    try {
        if (req.user.role !== 'student') return res.status(403).json({ message: 'Students only' });
        const quiz = await prisma.quiz.findFirst({ where: { id: req.params.quizId, course: { tenantId: req.user.tenantId } }, include: { questions: { orderBy: { position: 'asc' } } } });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        const now = new Date();
        if (quiz.availableFrom && quiz.availableFrom > now) return res.status(403).json({ message: 'Quiz-kan wali lama furin' });
        if (quiz.deadline && quiz.deadline < now) return res.status(410).json({ message: 'Waqtigii quiz-kan wuu dhammaaday' });
        const existingAttempt = await prisma.quizAttempt.findUnique({ where: { quizId_studentId: { quizId: quiz.id, studentId: req.user.id } } });
        if (existingAttempt) return res.status(409).json({ message: 'Quiz-kan mar hore ayaad u gashay; mar labaad lama geli karo' });
        const totalPoints = quiz.questions.reduce((sum, question) => sum + question.points, 0);
        await prisma.quizAttempt.create({ data: { quizId: quiz.id, studentId: req.user.id, answers: [], score: 0, totalPoints, percentage: 0, passed: false } });
        const data = { ...quiz, questions: quiz.questions.map(({ correctIndex, modelAnswer, keywords, ...question }) => question) };
        res.json({ success: true, data });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ message: 'Quiz-kan mar hore ayaad u gashay; mar labaad lama geli karo' });
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getQuizResults = async (req, res) => {
    try {
        if (!manager(req.user)) return res.status(403).json({ message: 'Not authorized' });
        const quiz = await prisma.quiz.findFirst({
            where: { id: req.params.quizId, course: { tenantId: req.user.tenantId, ...(req.user.role === 'teacher' ? { createdById: req.user.id } : {}) } },
            select: {
                id: true, title: true, description: true, passPercent: true, durationMin: true, availableFrom: true, deadline: true,
                course: { select: { class: { select: { id: true, name: true, section: true } }, subject: { select: { id: true, name: true } } } },
                questions: { orderBy: { position: 'asc' }, select: { id: true, prompt: true, questionType: true, options: true, correctIndex: true, modelAnswer: true, keywords: true, points: true } },
                attempts: {
                    orderBy: { submittedAt: 'desc' },
                    select: {
                        id: true, answers: true, score: true, totalPoints: true, percentage: true, passed: true, submittedAt: true, completedAt: true,
                        student: { select: { id: true, firstName: true, lastName: true, studentId: true, admissionNo: true } }
                    }
                }
            }
        });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        const completed = quiz.attempts.filter(attempt => attempt.completedAt);
        const averagePercentage = completed.length ? Math.round((completed.reduce((sum, attempt) => sum + attempt.percentage, 0) / completed.length) * 100) / 100 : 0;
        res.json({
            success: true,
            data: {
                ...quiz,
                summary: {
                    entered: quiz.attempts.length,
                    submitted: completed.length,
                    inProgress: quiz.attempts.length - completed.length,
                    passed: completed.filter(attempt => attempt.passed).length,
                    averagePercentage
                }
            }
        });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const manageableQuiz = (user, quizId) => prisma.quiz.findFirst({
    where: { id: quizId, course: { tenantId: user.tenantId, ...(user.role === 'teacher' ? { createdById: user.id } : {}) } },
    select: { id: true }
});

exports.updateQuiz = async (req, res) => {
    try {
        if (!manager(req.user)) return res.status(403).json({ message: 'Not authorized' });
        const existing = await manageableQuiz(req.user, req.params.quizId);
        if (!existing) return res.status(404).json({ message: 'Quiz not found' });
        const { title, description, passPercent, durationMin, availableFrom, deadline, questions } = req.body;
        if (!String(title || '').trim()) return res.status(400).json({ message: 'Quiz title is required' });
        const startDate = availableFrom ? new Date(availableFrom) : null;
        const deadlineDate = deadline ? new Date(deadline) : null;
        if ((startDate && Number.isNaN(startDate.getTime())) || (deadlineDate && Number.isNaN(deadlineDate.getTime())) || (deadlineDate && startDate && deadlineDate <= startDate)) return res.status(400).json({ message: 'Invalid quiz schedule' });
        let normalizedQuestions;
        if (Array.isArray(questions)) {
            const attemptCount = await prisma.quizAttempt.count({ where: { quizId: existing.id } });
            if (attemptCount > 0) return res.status(409).json({ message: 'Questions cannot be changed after a student has entered the quiz; schedule and title can still be edited' });
            if (!questions.length) return res.status(400).json({ message: 'At least one question is required' });
            normalizedQuestions = questions.map((question, index) => {
                const questionType = question.questionType === 'written' ? 'written' : 'multiple_choice';
                const prompt = String(question.prompt || '').trim();
                const options = Array.isArray(question.options) ? question.options.map(option => String(option).trim()) : [];
                const correctIndex = Number(question.correctIndex);
                const points = Number(question.points || 1);
                const modelAnswer = questionType === 'written' ? String(question.modelAnswer || '').trim() : null;
                let keywords = questionType === 'written' ? (Array.isArray(question.keywords) ? question.keywords : String(question.keywords || '').split(',')).map(keyword => String(keyword).trim()).filter(Boolean) : [];
                if (!prompt || !Number.isFinite(points) || points <= 0) throw Object.assign(new Error(`Invalid question ${index + 1}`), { statusCode: 400 });
                if (questionType === 'multiple_choice' && (options.length < 2 || options.some(option => !option) || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length)) throw Object.assign(new Error(`Question ${index + 1}: complete options and select the correct answer`), { statusCode: 400 });
                if (questionType === 'written' && !modelAnswer) throw Object.assign(new Error(`Question ${index + 1}: add the model answer`), { statusCode: 400 });
                if (questionType === 'written' && !keywords.length) keywords = [...new Set((modelAnswer.match(/[\p{L}\p{N}]{3,}/gu) || []).map(word => word.toLocaleLowerCase()))].slice(0, 12);
                return { prompt, questionType, options: questionType === 'written' ? [] : options, correctIndex: questionType === 'written' ? 0 : correctIndex, modelAnswer, keywords, points, position: index };
            });
        }
        const quiz = await prisma.$transaction(async transaction => {
            await transaction.quiz.update({ where: { id: existing.id }, data: { title: String(title).trim(), description: description || null, passPercent: Math.min(100, Math.max(0, Number(passPercent ?? 50))), durationMin: durationMin ? Math.min(300, Math.max(1, Number(durationMin))) : null, availableFrom: startDate, deadline: deadlineDate } });
            if (normalizedQuestions) {
                await transaction.quizQuestion.deleteMany({ where: { quizId: existing.id } });
                await transaction.quizQuestion.createMany({ data: normalizedQuestions.map(question => ({ ...question, quizId: existing.id })) });
            }
            return transaction.quiz.findUnique({ where: { id: existing.id }, include: { questions: { orderBy: { position: 'asc' } } } });
        });
        res.json({ success: true, data: quiz });
    } catch (error) { res.status(error.statusCode || 500).json({ success: false, message: error.message }); }
};

exports.deleteQuiz = async (req, res) => {
    try {
        if (!manager(req.user)) return res.status(403).json({ message: 'Not authorized' });
        const existing = await manageableQuiz(req.user, req.params.quizId);
        if (!existing) return res.status(404).json({ message: 'Quiz not found' });
        await prisma.quiz.delete({ where: { id: existing.id } });
        res.json({ success: true, message: 'Quiz deleted' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.submitQuiz = async (req, res) => {
    try {
        if (req.user.role !== 'student') return res.status(403).json({ message: 'Students only' });
        const quiz = await prisma.quiz.findFirst({ where: { id: req.params.quizId, published: true, course: { tenantId: req.user.tenantId, published: true } }, include: { questions: true } });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
        const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
        const tokens = value => new Set(String(value || '').toLocaleLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(token => token.length > 1));
        const score = quiz.questions.reduce((sum, question, index) => {
            if (question.questionType !== 'written') return sum + (Number(answers[index]) === question.correctIndex ? question.points : 0);
            const responseTokens = tokens(answers[index]);
            if (!responseTokens.size) return sum;
            const keywordTokens = (question.keywords || []).flatMap(keyword => [...tokens(keyword)]);
            const modelTokens = [...tokens(question.modelAnswer)];
            const keywordCoverage = keywordTokens.length ? keywordTokens.filter(token => responseTokens.has(token)).length / keywordTokens.length : 0;
            const modelCoverage = modelTokens.length ? modelTokens.filter(token => responseTokens.has(token)).length / modelTokens.length : 0;
            const relevance = (keywordCoverage * 0.7) + (modelCoverage * 0.3);
            return sum + Math.round(question.points * Math.min(1, relevance));
        }, 0);
        const percentage = totalPoints ? Math.round((score / totalPoints) * 10000) / 100 : 0;
        const existingAttempt = await prisma.quizAttempt.findUnique({ where: { quizId_studentId: { quizId: quiz.id, studentId: req.user.id } } });
        if (!existingAttempt) return res.status(403).json({ message: 'Open the quiz before submitting' });
        if (existingAttempt.completedAt) return res.status(409).json({ message: 'Quiz-kan mar hore ayaad u dirtay' });
        const now = new Date();
        if (quiz.deadline && quiz.deadline < now) return res.status(410).json({ message: 'Deadline-ka quiz-ka wuu dhammaaday' });
        if (quiz.durationMin && now.getTime() > existingAttempt.submittedAt.getTime() + (quiz.durationMin * 60 * 1000) + 30000) return res.status(410).json({ message: 'Waqtigii quiz-ka wuu dhammaaday' });
        const attempt = await prisma.quizAttempt.update({ where: { id: existingAttempt.id }, data: { answers, score, totalPoints, percentage, passed: percentage >= quiz.passPercent, submittedAt: new Date(), completedAt: new Date() } });
        res.json({ success: true, data: attempt });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
