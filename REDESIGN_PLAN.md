# School Management System UI/UX Redesign

## Reference and direction

[EduPortal's feature catalogue](https://www.eduportal.pk/features.php) is used as a functional reference for the flow from student records, attendance and fees to examinations, parent communication, teaching, library, payroll, inventory and multi-campus operations. Its catalogue also highlights features that are not currently implemented here, including syllabus coverage, transport, hostel and canteen/POS workflows. The UI uses navy `#1E3A8A`, cyan `#06B6D4`, white surfaces, light neutral page backgrounds, and the existing Next.js/React, Tailwind, Lucide, Next Themes, Express, Prisma, PostgreSQL, and Flutter stack.

## Existing features and UI

| Area | Existing implementation |
| --- | --- |
| School operations | Admissions/student records, staff, classes, grade levels, subjects, attendance, exams, marks/results, timetable, assignments, online learning, materials/library, announcements, notifications, certificates, inventory, alumni/events, reports, expenses, fees/invoices/payments, payroll/payslips, communication, school settings, and audit logs have routes/pages and corresponding backend modules. |
| Super Admin | Separate `/super-admin` layout and pages for global dashboard, tenants/schools, subscriptions, payments, users, announcements, contact messages, logs, backups, and global settings. Dashboard tenant totals load from `/tenants`. |
| School Admin | `/dashboard` analytics-backed overview and administration navigation. Tenant context and subscription module checks are in the API and dashboard layout. |
| Teacher | `/dashboard` teacher landing page and teaching navigation. Backend teacher-scope helpers constrain class, subject, and student queries. |
| Student | `/dashboard/student` loads the authenticated student profile and personal attendance, marks, fees, and timetable. Backend role policies and student endpoints provide data scope. |
| Parent | Child detail page and parent API endpoints already exist. Parent-child link verification is enforced by those API handlers. A dedicated overview dashboard was missing and has now been added. |
| Shared UX | Responsive navigation, mobile sidebar, page search, notifications, language/accessibility controls, dark/light theme provider, loading/empty/error UI primitives, and reusable cards/buttons are already present. |

## Added in this redesign pass

- Set shared UI brand tokens to navy and cyan and applied the dashboard neutral canvas.
- Updated the main dashboard sidebar active/focus treatments to the brand palette, with a home breadcrumb and profile menu.
- Added a parent-family dashboard with linked-child cards, attendance/marks summaries, progress links, empty/error/loading states, and child-scoped data requests.
- Added explicit parent dashboard route allow-listing and fixed root-route matching so `/dashboard` does not accidentally grant access to every nested page.
- Removed hard-coded growth badges and sparklines from school and Super Admin dashboards; displayed summary values remain API-backed.
- Expanded backend permission-service tests to cover Super Admin, School Admin, Teacher, Student, and Parent access boundaries.
- Rebuilt the teacher dashboard around assigned classes, today's timetable, and real submission counts from teacher-scoped endpoints.
- Redesigned the linked-child detail view with attendance, published results, timetable, linked fees, class assignments, and visible learning materials; removed sample behaviour/assignment counts and dead actions.
- Added server-side parent scoping for marks, exams, assignments, materials, class timetables, and teacher contacts/conversations. Parent views now restrict results to published exams.
- Corrected student dashboard links that previously opened routes outside the student's route allow-list and added a visible loading-error state.
- Replaced Super Admin's fixed "Operational" status label with the API-backed suspended-school count and added searchable platform navigation.

## Role dashboards

| Role | Dashboard entry | Primary view and permitted scope |
| --- | --- | --- |
| Super Admin | `/super-admin/dashboard` | Cross-school tenant, subscription, payments, global settings and platform analytics. The API must retain its super-admin role check; this role alone may cross tenant boundaries. |
| School Admin | `/dashboard` | School-level enrollment, staff, attendance, finance, academic performance and administration, scoped to the authenticated tenant and authorized modules. |
| Teacher | `/dashboard` | Teaching workflow, assigned classes/subjects, attendance, exams/marks, assignments and materials; server queries must use the teacher scope helpers. |
| Student | `/dashboard/student` | Own profile, timetable, attendance, results, fees, materials and learning tasks only. |
| Parent | `/dashboard` | Linked children, attendance and results; each child request must continue to verify the parent-child relation on the server. |

## Feature status

Admissions/profiles, staff, classes/subjects, attendance, examinations/grades/results, finance/receipts/expenses, payroll, timetable, assignments/LMS, parent communication, certificates, library/materials, inventory, announcements, reports, and notifications are existing feature areas. This pass reorganizes shared design foundations, supplies a real-data teacher dashboard, and completes the parent overview/detail flow. Do not treat a dashboard link as proof that every workflow is complete: verify each feature against its route, controller, Prisma model, and authorization middleware before expanding it.

New product features that need dedicated data models, screens and APIs are daily lesson plans/syllabus tracking, transport/route management, hostel/room management, canteen point-of-sale, biometric/QR attendance integrations, and a cross-school analytics API. These should be planned separately from the dashboard redesign; they are not represented as working controls.

Subscription management and basic tenant totals exist for Super Admin. Dedicated comparative global analytics and richer subscription health metrics should be added in Phase 2 only when backed by aggregate API data. Do not display hard-coded growth percentages as operational metrics.

## Delivery phases

1. **Foundation and role boundaries (current):** establish palette and shared shell conventions; document route/role map; add parent and teacher real-data dashboards; scope parent class/result/material/communication endpoints; exercise permission policy and API authorization tests. Remaining: audit every route/API pair for tenant, class and linked-child scope.
2. **Dashboard consistency:** align all five dashboards around the same responsive grid, data-backed KPIs, chart/table patterns, global search/filter/pagination behavior, and explicit loading/error/empty states. Add server aggregates for Super Admin global analytics where needed.
3. **Operational workflows:** review and connect the existing admissions, staff, attendance, exams/results, fee receipts/expenses, payroll, timetable, assignments/LMS, communications, library, inventory, and certificate screens. Prioritize gaps found in that route/API review; reuse existing endpoints and components.
4. **Cross-platform refinement:** align Flutter role home screens and shared tokens with the web palette; validate narrow screen, tablet, and desktop layouts; verify light and dark contrast and keyboard/screen-reader behavior.
5. **Release validation:** run route/API permission tests for all five roles and negative cross-tenant, unassigned-class, own-record, and unlinked-child cases; perform manual responsive and accessibility review; confirm no dashboard action is a dead control.

## Permission verification

Automated checks added/used in this pass:

- `backend/src/__tests__/permission.service.test.js`: role matrix verifies broad Super Admin and School Admin capabilities, teacher read/write limits, student read-only results, and parent read-only attendance.
- `backend/src/__tests__/parent-scope.test.js`: verifies section-aware linked-class resolution, no section guessing, parent teacher contacts, denial of out-of-scope assignment/timetable requests, and class/student scoping for materials and marks.
- `backend/src/__tests__/api_authorization.test.js`: verifies denied-role API requests return 403 and are audited; also covers assignment deadline/state enforcement.

The role matrix tests permission policy; parent-scope tests exercise controller query constraints. Phase 1's remaining authorization audit should add endpoint-level negative tests for cross-tenant school IDs, teacher class/subject assignments, student self-only routes, and unlinked-child IDs before the redesign is considered fully permission-verified.
