# User Journey: From Roadmap Enrollment to Completion

This document outlines the Product Requirements Document (PRD) and technical flow for the user journey in a roadmap-based learning platform. The design is scalable for millions of requests and supports modular, reusable API endpoints and common functions.

---

## 1. Enroll User to a Roadmap

**Action:**

- Insert user enrollment into `user_enrolled_roadmaps`.
- Fetch all courses from `roadmap_courses_mapping` for the roadmap, ordered by `order`.
- Auto-enroll the first course (by order) into `user_enrolled_courses`.
- Insert the rest of the courses as locked or preview-only (is_enrolled = 0).

**DB Operations:**

```sql
INSERT INTO user_enrolled_roadmaps (user_id, roadmap_id, is_enrolled, enrolled_at)
VALUES (:user_id, :roadmap_id, 1, NOW());

-- Fetch courses
SELECT * FROM roadmap_courses_mapping WHERE roadmap_id = :roadmap_id ORDER BY `order`;

-- Enroll first course
INSERT INTO user_enrolled_courses (user_id, roadmap_course_id, is_enrolled, enrolled_at)
VALUES (:user_id, :first_roadmap_course_id, 1, NOW());
```

---

## 2. User Starts the Course

**Action:**

- Fetch all sections of the course.
- Insert into `user_section_progress` for all sections (is_unlocked = 0).
- Unlock the first section immediately (or via cron).
- Insert all chapters into `user_chapter_progress` (is_unlocked = 0).
- Unlock only the first chapter of the first unlocked section.

**DB Operations:**

```sql
-- For each section
INSERT INTO user_section_progress (user_id, course_id, section_id, roadmap_course_id, total_chapters)
VALUES (...);

-- Unlock first section
UPDATE user_section_progress
SET is_unlocked = 1
WHERE user_id = :user_id AND section_id = :first_section_id;
```

---

## 3. User Progresses Through Weekly Sections

**Action:**

- Cron job runs weekly to unlock new sections based on weeks elapsed since enrollment.
- As user completes chapters, update `user_chapter_progress`.
- If section is complete, mark `user_section_progress.is_completed = 1`.
- If course is complete, mark `user_course_progress.is_completed = 1`.

---

## 4. User Submits Project

**Action:**

- User submits project via `user_project_submissions` (status = 'submitted', is_latest = 1).
- Tutor reviews and updates status, comments, reviewer info, and review date.

---

## 5. Project Approved → Course Completed

**Action:**

- Mark `user_course_progress.is_completed = 1`.
- Generate certificate and insert into `user_certificates`.

**DB Operations:**

```sql
INSERT INTO user_certificates (
  user_id, course_id, roadmap_course_id, certificate_number, certificate_url
) VALUES (...);
```

---

## 6. Enroll User in Next Course

**Action:**

- Find next course(s) by order from `roadmap_courses_mapping`.
- If multiple, let user choose (frontend enroll button).
- If only one, auto-enroll user into `user_enrolled_courses`.

---

## 7. Roadmap Completion Check

**Action:**

- When all mandatory `roadmap_courses_mapping` entries are present in `user_enrolled_courses` and completed in `user_course_progress`, mark roadmap as completed (derived logic or via `user_roadmap_progress`).

---

## API Design Principles

- Use RESTful endpoints with clear resource naming.
- Modularize business logic into common service functions (e.g., enrollment, progress tracking, unlocking logic).
- Use async/await and connection pooling for scalability.
- Implement bulk operations where possible to minimize DB round-trips.
- Use caching for frequently accessed roadmap/course metadata.
- Ensure idempotency for enrollment and progress APIs.
- Use background jobs (cron/queue) for scheduled unlocks and progress checks.

---

## Example API Endpoints (to be implemented)

- `POST /roadmaps/:roadmapId/enroll`
- `POST /courses/:courseId/start`
- `POST /sections/:sectionId/unlock`
- `POST /chapters/:chapterId/progress`
- `POST /projects/:projectId/submit`
- `POST /courses/:courseId/complete`
- `POST /roadmaps/:roadmapId/complete`

---

## Common Functions (to be implemented)

- `enrollUserToRoadmap(userId, roadmapId)`
- `autoEnrollFirstCourse(userId, roadmapId)`
- `unlockNextSection(userId, courseId)`
- `trackChapterProgress(userId, chapterId)`
- `submitProject(userId, projectId, data)`
- `generateCertificate(userId, courseId, roadmapCourseId)`
- `checkRoadmapCompletion(userId, roadmapId)`

---

This document will be used as the foundation for scalable API and service development for the user journey in roadmap-based learning.
