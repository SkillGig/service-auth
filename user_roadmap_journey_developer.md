# User Roadmap Journey (Developer-Focused)

This document details the technical flow and API/service design for the user journey in a roadmap-based learning platform. It is intended for backend/frontend developers and architects.

---

## 1. Roadmap Enrollment
- Endpoint: `POST /roadmaps/:roadmapId/enroll`
- Insert into `user_enrolled_roadmaps`.
- Fetch all courses from `roadmap_courses_mapping` (ordered).
- Auto-enroll first course in `user_enrolled_courses`.
- Insert remaining courses as locked (is_enrolled = 0).

## 2. Course Start
- Endpoint: `POST /courses/:courseId/start`
- Fetch all sections for the course.
- Insert all into `user_section_progress` (is_unlocked = 0).
- Unlock first section (is_unlocked = 1).
- Insert all chapters into `user_chapter_progress` (is_unlocked = 0), unlock first chapter.

## 3. Weekly Section Unlock (Cron)
- Cron job checks weeks since enrollment.
- Unlocks N sections in `user_section_progress` where N = weeks elapsed.
- As chapters are completed, update `user_chapter_progress`.
- Mark section/course as complete when all chapters/sections are done.

## 4. Project Submission
- Endpoint: `POST /projects/:projectId/submit`
- Insert into `user_project_submissions` (status = 'submitted', is_latest = 1).
- Tutor reviews: update status, comments, reviewer info, review date.

## 5. Course Completion & Certificate
- Endpoint: `POST /courses/:courseId/complete`
- Mark `user_course_progress.is_completed = 1`.
- Insert into `user_certificates` (generate certificate_number, certificate_url).

## 6. Next Course Enrollment
- Find next course(s) from `roadmap_courses_mapping`.
- If one, auto-enroll. If multiple, let user choose (frontend action).

## 7. Roadmap Completion
- Check all required courses in `user_enrolled_courses` and `user_course_progress`.
- Mark roadmap as complete (derived or via `user_roadmap_progress`).

---

### API/Service Design
- Use RESTful endpoints, async/await, connection pooling.
- Modularize logic into service functions (enrollment, progress, unlock, etc.).
- Use bulk DB operations and caching for scale.
- Ensure idempotency and background jobs for unlocks.

---

### Common Functions
- `enrollUserToRoadmap(userId, roadmapId)`
- `autoEnrollFirstCourse(userId, roadmapId)`
- `unlockNextSection(userId, courseId)`
- `trackChapterProgress(userId, chapterId)`
- `submitProject(userId, projectId, data)`
- `generateCertificate(userId, courseId, roadmapCourseId)`
- `checkRoadmapCompletion(userId, roadmapId)`

---

This document is a reference for implementing scalable, maintainable APIs and services for the roadmap user journey.
