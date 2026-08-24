# Exam & Academic Management Portal

> A web-based, assessment-first academic management platform for schools, teachers, instructors, administrators, and students.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Product Vision](#2-product-vision)
3. [Main Goals](#3-main-goals)
4. [User Roles](#4-user-roles)
5. [Dashboards](#5-dashboards)
6. [Academic Structure](#6-academic-structure)
7. [Class / Section Management](#7-class--section-management)
8. [Assessment System](#8-assessment-system)
9. [Assessment Types](#9-assessment-types)
10. [Assessment Creation](#10-assessment-creation)
11. [Question Types](#11-question-types)
12. [Question Bank](#12-question-bank)
13. [Question Metadata](#13-question-metadata)
14. [Question Bank Features](#14-question-bank-features)
15. [Question Pools](#15-question-pools)
16. [Assessment Settings](#16-assessment-settings)
17. [Question Randomization](#17-question-randomization)
18. [Exam Navigation](#18-exam-navigation)
19. [Exam Security](#19-exam-security)
20. [Student Exam Interface](#20-student-exam-interface)
21. [Auto-Save](#21-auto-save)
22. [Assessment Attempt](#22-assessment-attempt)
23. [Attempt Status](#23-attempt-status)
24. [Student Answers](#24-student-answers)
25. [Automatic Grading](#25-automatic-grading)
26. [Partial Credit](#26-partial-credit)
27. [Manual Grade Adjustment](#27-manual-grade-adjustment)
28. [Grading Audit Trail](#28-grading-audit-trail)
29. [Results](#29-results)
30. [Teacher Results](#30-teacher-results)
31. [Question Analytics](#31-question-analytics)
32. [Competency Analytics](#32-competency-analytics)
33. [Student Academic Profile](#33-student-academic-profile)
34. [Student Assessment Timeline](#34-student-assessment-timeline)
35. [Performance Trends](#35-performance-trends)
36. [Attendance](#36-attendance)
37. [Attendance Methods](#37-attendance-methods)
38. [Attendance Record](#38-attendance-record)
39. [Attendance Analytics](#39-attendance-analytics)
40. [Gradebook](#40-gradebook)
41. [Grade Categories](#41-grade-categories)
42. [Notifications](#42-notifications)
43. [Notification Center](#43-notification-center)
44. [Reports](#44-reports)
45. [Import / Export](#45-import--export)
46. [Audit Logs](#46-audit-logs)
47. [Soft Delete / Archiving](#47-soft-delete--archiving)
48. [Assessment Lifecycle](#48-assessment-lifecycle)
49. [Suggested Database Structure](#49-suggested-database-structure)
50. [Relationship Overview](#50-relationship-overview)
51. [Assessment Data Model](#51-assessment-data-model)
52. [Assessment Attempt Data Model](#52-assessment-attempt-data-model)
53. [Student Answer Data Model](#53-student-answer-data-model)
54. [Security Requirements](#54-security-requirements)
55. [Data Integrity](#55-data-integrity)
56. [Exam Submission Reliability](#56-exam-submission-reliability)
57. [Offline Support](#57-offline-support)
58. [Mobile / Responsive Design](#58-mobile--responsive-design)
59. [Progressive Web App](#59-progressive-web-app)
60. [Accessibility](#60-accessibility)
61. [Search](#61-search)
62. [Filtering](#62-filtering)
63. [Dashboard Analytics](#63-dashboard-analytics)
64. [Question Quality Analytics](#64-question-quality-analytics)
65. [Competency-Based Assessment](#65-competency-based-assessment)
66. [Exam Templates](#66-exam-templates)
67. [Exam Duplication](#67-exam-duplication)
68. [Exam Versioning](#68-exam-versioning)
69. [AI Features — Future](#69-ai-features--future)
70. [AI Question Generation Workflow](#70-ai-question-generation-workflow)
71. [Proctoring — Future](#71-proctoring--future)
72. [Notification Architecture](#72-notification-architecture)
73. [API Architecture](#73-api-architecture)
74. [Important Backend Services](#74-important-backend-services)
75. [Recommended Core Flow](#75-recommended-core-flow)
76. [Single Source of Truth](#76-single-source-of-truth)
77. [MVP](#77-mvp)
78. [Version 2](#78-version-2)
79. [Version 3](#79-version-3)
80. [Core Product Differentiator](#80-core-product-differentiator)
81. [Final Feature Map](#81-final-feature-map)
82. [Most Important Architectural Decision](#82-most-important-architectural-decision)

---

> **Implementation Status — Checklist Mode (auto-generated 2026-08-24)**  
> Legend: ✅ DONE · 🚧 PARTIAL · ⏳ TODO · Legend applies per bullet. Table below is the quick tracker.

## Implementation Tracker

| # | Module | Status | Notes |
|---|--------|--------|-------|
| 1 | Product Overview | ✅ DONE | Core premise captured |
| 2 | Product Vision | ✅ DONE | Vision loop ASSESS→RECORD→GRADE→ANALYZE |
| 3 | Main Goals | ✅ DONE | 11 primary goals listed |
| 4 | User Roles | 🚧 PARTIAL | Admin/Teacher/Student OK; Parent/Registrar optional future |
| 5 | Dashboards | 🚧 PARTIAL | Admin + Teacher merged; Student Landing/Records OK, dedicated Student Dashboard enhancements pending |
| 6 | Academic Structure | 🚧 PARTIAL | Classes done; Academic Year/Term hierarchy pending |
| 7 | Class / Section Management | ✅ DONE | Create/edit/archive, roster, import, codes |
| 8 | Assessment System | ✅ DONE | Core module |
| 9 | Assessment Types | ✅ DONE | 12 types + `EXAM_TYPE_LABELS` `src/utils.js:299` |
| 10 | Assessment Creation | 🚧 PARTIAL | Single-page builder OK; 5-step wizard pending |
| 11 | Question Types | 🚧 PARTIAL | MCQ + Fill-blank done; TF/Matching/Essay/Ordering pending |
| 12 | Question Bank | ✅ DONE | Reusable bank `GET /bank` `worker/index.js:236` |
| 13 | Question Metadata | ✅ DONE | difficulty/topic/competency/tags `worker/schema.sql:32` |
| 14 | Question Bank Features | ✅ DONE | Filter/search/tag/preview |
| 15 | Question Pools | ⏳ TODO | Pool random selection (Easy/Med/Hard) not yet |
| 16 | Assessment Settings | 🚧 PARTIAL | Duration/passing/schedule done;Attempts/score-policy pending |
| 17 | Question Randomization | ✅ DONE | Seeded shuffle `src/utils.js:15` ↔ `worker/index.js:1464` |
| 18 | Exam Navigation | ✅ DONE | Per-page nav, mark-for-review |
| 19 | Exam Security | ✅ DONE | Fullscreen/tab-detect/single-session `worker/index.js:382` |
| 20 | Student Exam Interface | ✅ DONE | `src/pages/Exam.jsx:13` |
| 21 | Auto-Save | ✅ DONE | localStorage + heartbeat `Exam.jsx:87` |
| 22 | Assessment Attempt | ✅ DONE | `submissions` as attempt `worker/schema.sql:39` |
| 23 | Attempt Status | 🚧 PARTIAL | manual/timeout/tab/kick `submissions.reason`; full NOT_STARTED/IN_PROGRESS statuses pending |
| 24 | Student Answers | ✅ DONE | `answers` JSON `submissions:45` |
| 25 | Automatic Grading | ✅ DONE | MCQ + fill-blank `matchesAnswer` `worker/index.js:1719` |
| 26 | Partial Credit | ⏳ TODO | Complex/multiple-answer partial not yet |
| 27 | Manual Grade Adjustment | ✅ DONE | `answer_reviews` + regrade `worker/index.js:1772` |
| 28 | Grading Audit Trail | 🚧 PARTIAL | `activity_log` `worker/index.js:26`; full old/new diff pending |
| 29 | Results | ✅ DONE | Student result view |
| 30 | Teacher Results | ✅ DONE | `GET /submissions/:examId` `worker/index.js:1355` |
| 31 | Question Analytics | ✅ DONE | `GET /analytics/:examId` `worker/index.js:1386` |
| 32 | Competency Analytics | ✅ DONE | StudentRecords + class gradebook category avg |
| 33 | Student Academic Profile | ✅ DONE | `GET /student/:studentId` `worker/index.js:1205` |
| 34 | Student Assessment Timeline | ✅ DONE | `timeline` in records `worker/index.js:1301` |
| 35 | Performance Trends | ✅ DONE | `trend` last 10 `worker/index.js:1316` |
| 36 | Attendance | ✅ DONE | Dual model `class_attendance` `worker/schema.sql:160` |
| 37 | Attendance Methods | 🚧 PARTIAL | Manual + QR done; scheduled/NFC pending |
| 38 | Attendance Record | ✅ DONE | Per-student per-date `worker/index.js:1111` |
| 39 | Attendance Analytics | 🚧 PARTIAL | Present/late/absent counts; full rate charts pending |
| 40 | Gradebook | ✅ DONE | `GET /classes/:id/gradebook` `worker/index.js:928` |
| 41 | Grade Categories | ✅ DONE | **2026-08-24** Weighted categories `class_grade_categories` `worker/schema.sql:187` `worker/index.js:1089` |
| 42 | Notifications | ✅ DONE | **2026-08-24** `notifications` + `notification_reads` `worker/schema.sql:196` `migration_notifications.sql` `worker/index.js:26` auto on publish/grade |
| 43 | Notification Center | ✅ DONE | **2026-08-24** Public `/notifications` + admin `/admin/notifications` `src/pages/Notifications.jsx` `src/pages/admin/Notifications.jsx` |
| 44 | Reports | 🚧 PARTIAL | CSV export `src/utils.js:341`; PDF/Excel pending |
| 45 | Import / Export | 🚧 PARTIAL | CSV import roster/questions done; Excel/PDF pending |
| 46 | Audit Logs | ✅ DONE | `activity_log` + `GET /logs` `worker/index.js:279` |
| 47 | Soft Delete / Archiving | 🚧 PARTIAL | `status=archived` `exams:15`; full soft-delete pending |
| 48 | Assessment Lifecycle | ✅ DONE | draft→scheduled→active→closed→archived `worker/index.js:395` |
| 49 | Suggested Database Structure | 🚧 PARTIAL | 12 tables ok; §49 normalized split pending |
| 50 | Relationship Overview | ✅ DONE | ER `ARCHITECTURE.md:199` |
| 51 | Assessment Data Model | ✅ DONE | `exams` model |
| 52 | Assessment Attempt Data Model | ✅ DONE | `submissions` model |
| 53 | Student Answer Data Model | ✅ DONE | `answer_reviews` + `answers` JSON |
| 54 | Security Requirements | 🚧 PARTIAL | `adminCheck` ok; CSP/rate-limit/Turnstile pending (see OPTIMIZATION_PLAN §13) |
| 55 | Data Integrity | ✅ DONE | Auto-save + idempotent submit `worker/index.js:328` |
| 56 | Exam Submission Reliability | ✅ DONE | Idempotent re-submit guard |
| 57 | Offline Support | ✅ DONE | PWA `public/sw.js:1` + localStorage queue |
| 58 | Mobile / Responsive | ✅ DONE | Responsive + drawer `AdminLayout.jsx:158` |
| 59 | Progressive Web App | ✅ DONE | Manifest + SW v2 |
| 60 | Accessibility | 🚧 PARTIAL | Keyboard/labels ok; full a11y audit pending |
| 61 | Search | ⏳ TODO | Global search not yet |
| 62 | Filtering | ✅ DONE | Filters on bank/gradebook/etc |
| 63 | Dashboard Analytics | 🚧 PARTIAL | KPIs on Dashboard; full charts pending |
| 64 | Question Quality Analytics | ⏳ TODO | Discrimination/distractor pending |
| 65 | Competency-Based Assessment | ✅ DONE | `competency` per question `worker/schema.sql:34` |
| 66 | Exam Templates | ⏳ TODO | Save-as-template pending |
| 67 | Exam Duplication | ✅ DONE | `POST /exams/:id/duplicate` `worker/index.js:112` |
| 68 | Exam Versioning | ⏳ TODO | Version history pending |
| 69 | AI Features — Future | ⏳ TODO | Future |
| 70 | AI Question Generation Workflow | ⏳ TODO | Future |
| 71 | Proctoring — Future | 🚧 PARTIAL | Basic heartbeat/kick `worker/index.js:440`; webcam pending |
| 72 | Notification Architecture | ✅ DONE | **2026-08-24** Event→Service→User via `createNotification()` hooks on `POST /exams` & review |
| 73 | API Architecture | ✅ DONE | Hono ~50 routes `worker/index.js:1` |
| 74 | Important Backend Services | 🚧 PARTIAL | Monolithic Hono; service split pending |
| 75 | Recommended Core Flow | ✅ DONE | ASSESS→RECORD→GRADE→ANALYZE |
| 76 | Single Source of Truth | ✅ DONE | Submissions as source |
| 77 | MVP | ✅ DONE | Foundation solid |
| 78 | Version 2 | 🚧 PARTIAL | Attendance/Gradebook/Profile done; Templates pending |
| 79 | Version 3 | ⏳ TODO | Competency/PWA done; AI/Parent pending |
| 80 | Core Product Differentiator | ✅ DONE | Assessment-first platform |
| 81 | Final Feature Map | 🚧 PARTIAL | Map done; gaps per above |
| 82 | Most Important Architectural Decision | ✅ DONE | 6 entities solid |

> **How to use:** Check `- [x]` bullets below as you complete them. This file is version-controlled on `upscale-branch`; commit after each section lands.

---

# 1. Product Overview

The **Exam & Academic Management Portal** is a web-based:

- [x] Exam Management System
- [x] Quiz Management System
- [x] Classroom Management System
- [x] Attendance Management System
- [x] Academic Record Management System
- [x] Assessment Analytics Platform

The primary purpose of the application is to allow schools, teachers, instructors, and administrators to:

- [x] Create and manage exams and quizzes
- [x] Build reusable question banks
- [x] Conduct online assessments
- [x] Automatically record student attempts
- [x] Automatically grade objective questions
- [x] Track student performance
- [x] Manage attendance
- [x] Maintain student academic records
- [x] Analyze class and question performance
- [x] Manage classes, subjects, sections, and enrollment
- [x] Generate academic reports — CSV done, PDF pending

## Core Philosophy

> **Every assessment activity should automatically become part of the student's academic record.**

---

# 2. Product Vision

The system should evolve from a simple online examination platform into a complete:

> **Assessment & Academic Management Platform**

The core workflow is:

```text
Teacher
   │
   ├── Creates Class
   │
   ├── Creates Assessment
   │       │
   │       ├── Quiz
   │       ├── Major Exam
   │       ├── Diagnostic
   │       ├── Midterm
   │       ├── Final
   │       └── Custom Type
   │
   └── Publishes Assessment
             │
             ↓
          Student
             │
             ↓
       Takes Assessment
             │
             ↓
        Auto-save Answers
             │
             ↓
        Assessment Attempt
             │
             ↓
       Automatic Grading
             │
             ↓
        Results / Grade
             │
             ↓
      Student Academic Record
             │
             ↓
         Analytics
```

---

# 3. Main Goals

## 3.1 Primary Goals

The application must:

- Make exam creation fast.
- Make online exams reliable.
- Automatically save student answers.
- Automatically record every assessment attempt.
- [x] Automatically grade objective questions.
- Maintain a permanent assessment history.
- Provide useful teacher analytics.
- Provide student performance tracking.
- Support multiple assessment types.
- Support attendance.
- Support academic records.
- Support multiple user roles.
- Maintain an audit trail for important academic changes.

---

# 4. User Roles

## 4.1 Administrator

Administrators have system-wide access.

### Responsibilities

- Manage users
- Manage teachers
- Manage students
- Manage classes
- Manage subjects
- Manage academic years
- Manage semesters/terms
- Manage assessment types
- View system analytics
- View reports
- Manage permissions
- Manage system configuration

---

## 4.2 Teacher / Instructor

Teachers manage their own classes and assessments.

### Permissions

- Create classes
- View assigned classes
- Add students
- Create assessments
- Create questions
- Manage question banks
- Publish exams
- Grade subjective answers
- View student performance
- Record attendance
- View class analytics
- Generate reports

---

## 4.3 Student

Students can:

- View enrolled classes
- View available assessments
- Take exams
- Submit exams
- View allowed results
- View grades
- View attendance
- View academic history

---

## 4.4 Parent / Guardian

Optional future role.

Parents can view:

- Student attendance
- Student grades
- Exam results
- Academic progress
- Teacher remarks

---

## 4.5 Registrar / Academic Staff

Optional role.

Can manage:

- Student enrollment
- Academic records
- Classes
- Sections
- Academic years
- Student transfers
- Reports

---

# 5. Dashboards

## 5.1 Admin Dashboard

Display:

- Total students
- Total teachers
- Total classes
- Active assessments
- Completed assessments
- Attendance summary
- Average student performance
- Recent activity
- System alerts

---

## 5.2 Teacher Dashboard

Display:

- My classes
- Upcoming assessments
- Active assessments
- Recent assessments
- Pending grading
- Recent student submissions
- Attendance summary
- Class performance

### Quick Actions

- Create Assessment
- Create Question
- Create Class
- Take Attendance
- View Results
- Generate Report

---

## 5.3 Student Dashboard

Display:

- My classes
- Upcoming exams
- Active exams
- Recent results
- Attendance percentage
- Overall performance
- Notifications

### Example

```text
Upcoming

Biology Major Exam
August 25, 2026
09:00 AM
Duration: 60 minutes

[View Exam]
```

---

# 6. Academic Structure

The platform should support the following hierarchy:

```text
Academic Year
    │
    └── Term / Semester
            │
            └── Course / Subject
                    │
                    └── Section / Class
                            │
                            └── Students
```

### Example

```text
Academic Year: 2026–2027

Semester: 1st Semester

Subject: Biology

Section: Grade 10 - A

Students:
- Juan Dela Cruz
- Maria Santos
- Pedro Garcia
```

---

# 7. Class / Section Management

Teachers and administrators should be able to:

- Create classes
- Edit classes
- Archive classes
- Assign teachers
- Add students
- Remove students
- Import students
- View class roster

## Class Information

- Class Name
- Subject
- Grade Level
- Section
- Teacher
- Academic Year
- Term
- Schedule
- Room
- Status

---

# 8. Assessment System

The assessment system is the **core module**.

An assessment represents an:

- Exam
- Quiz
- Diagnostic test
- Assignment
- Survey
- Other evaluation activity

---

# 9. Assessment Types

Assessment types should be configurable rather than hard-coded.

## Default Types

- Quiz
- Major Exam
- Long Exam
- Midterm Exam
- Final Exam
- Diagnostic Test
- Pre-Test
- Post-Test
- Practice Test
- Assignment
- Survey

Administrators should be able to create custom types.

### Example

```text
Assessment Type:
"Quarterly Examination"
```

---

# 10. Assessment Creation

Teachers should be able to create an assessment using a guided workflow.

## Step 1 — Basic Information

- Title
- Description
- Instructions
- Subject
- Class
- Assessment Type
- Total Points
- Passing Score

## Step 2 — Questions

Teacher can:

- Create new question
- Select from question bank
- Import questions
- Duplicate questions
- Randomly select questions

## Step 3 — Settings

Configure:

- Date/time
- Duration
- Attempts
- Randomization
- Navigation
- Result visibility
- Security settings

## Step 4 — Review

Example:

```text
Assessment: Biology Major Exam

Questions: 50
Total Points: 50
Duration: 60 minutes
Passing Score: 75%

Status:
Draft
```

## Step 5 — Publish

Possible statuses:

- Draft
- Scheduled
- Active
- Closed
- Grading
- Graded
- Published
- Archived

---

# 11. Question Types

## Objective

- Multiple Choice
- Multiple Answer
- True/False
- Matching
- Ordering
- Fill in the Blank
- Numeric Answer

## Subjective

- Short Answer
- Essay
- Enumeration

## Multimedia

- Multimedia questions

### Future Support

- Image-based questions
- Audio questions
- Video questions
- Interactive questions

---

# 12. Question Bank

The Question Bank allows teachers to create reusable questions.

Each question can contain:

- Question
- Question Type
- Subject
- Topic
- Category
- Difficulty
- Points
- Explanation
- Correct Answer
- Tags
- Status

---

# 13. Question Metadata

Example:

```text
Subject: Mathematics
Topic: Algebra
Grade Level: Grade 10
Difficulty: Medium
Competency: Linear Equations
Question Type: Multiple Choice
Points: 1

Tags:
- algebra
- equation
- linear
```

---

# 14. Question Bank Features

Teachers should be able to:

- Create question
- Edit question
- Duplicate question
- Archive question
- Search questions
- Filter questions
- Tag questions
- Categorize questions
- Preview questions
- Reuse questions

## Filters

- Subject
- Topic
- Difficulty
- Question Type
- Competency
- Tag
- Created By

---

# 15. Question Pools

Teachers should be able to create question pools.

### Example

```text
Question Pool: Algebra

Easy:   20
Medium: 40
Hard:   20
```

An exam can select:

```text
10 Easy
20 Medium
10 Hard
```

The system randomly selects questions.

---

# 16. Assessment Settings

Each assessment should have configurable settings.

## General

- Title
- Description
- Instructions
- Assessment Type
- Subject
- Class

## Scheduling

- Start Date
- Start Time
- End Date
- End Time
- Duration

## Attempts

- Maximum Attempts
- Allow Retake
- Score Policy

### Score Policies

- Highest Score
- Latest Score
- First Score
- Average Score

---

# 17. Question Randomization

Optional settings:

- Randomize Questions
- Randomize Answer Choices

When enabled, the system should generate different question orders for students.

---

# 18. Exam Navigation

Possible settings:

- Allow Previous Question
- Allow Next Question
- One Question Per Page
- All Questions on One Page
- Mark for Review

---

# 19. Exam Security

Optional settings:

- Prevent Copy/Paste
- Full Screen
- Detect Tab Switching
- Detect Window Change
- Disable Right Click
- Time Limit
- Auto Submit

Security features should be configurable per assessment.

> Security features should not be mandatory for every exam.

---

# 20. Student Exam Interface

The exam interface should be simple and distraction-free.

Example:

```text
┌─────────────────────────────────────────────┐
│ Biology Major Exam            42:17          │
├─────────────────────────────────────────────┤
│                                             │
│ Question 12                                 │
│                                             │
│ Which organelle produces ATP?               │
│                                             │
│ ○ Nucleus                                   │
│ ○ Ribosome                                  │
│ ○ Mitochondria                              │
│ ○ Golgi Apparatus                           │
│                                             │
├─────────────────────────────────────────────┤
│ [Previous] [Mark for Review] [Next]         │
└─────────────────────────────────────────────┘
```

---

# 21. Auto-Save

Student answers must be automatically saved.

> Do not rely exclusively on final submission.

## Recommended Behavior

```text
Student selects answer
        ↓
Save answer
        ↓
Server confirms
        ↓
Show "Saved"
```

## Connection Failure

```text
Offline / Connection Lost

Answers are stored locally.
Waiting for connection...
```

The system should synchronize answers when the connection returns.

---

# 22. Assessment Attempt

An `AssessmentAttempt` represents one student's participation in an assessment.

### Example

```text
Student:
Juan Dela Cruz

Assessment:
Biology Major Exam

Attempt:
1

Started:
08:02 AM

Submitted:
08:47 AM

Duration:
45 minutes

Score:
42 / 50

Percentage:
84%

Status:
Completed
```

---

# 23. Attempt Status

Possible statuses:

```text
NOT_STARTED
IN_PROGRESS
SUBMITTED
AUTO_SUBMITTED
GRADING
GRADED
ABANDONED
EXPIRED
```

---

# 24. Student Answers

Each attempt should have individual answer records.

### Example

```text
Question:
Q12

Selected Answer:
C

Correct Answer:
C

Points:
1

Earned:
1

Time Spent:
34 seconds
```

This enables detailed analytics later.

---

# 25. Automatic Grading

## Automatically Graded

- Multiple Choice
- Multiple Answer
- True/False
- Matching
- Ordering
- Numeric
- Configured Fill in the Blank

## Teacher Graded

- Essay
- Short Answer
- Subjective responses

---

# 26. Partial Credit

The grading system should eventually support partial credit.

### Example

```text
Question:
5 points

Student earned:
3 points
```

Useful for:

- Multiple answers
- Matching
- Enumeration
- Essays
- Complex questions

---

# 27. Manual Grade Adjustment

Teachers can adjust grades when necessary.

### Example

```text
Original Score: 85

Adjustment: +2

Final Score: 87

Reason:
Alternative answer accepted.
```

Every adjustment must be recorded in the audit log.

---

# 28. Grading Audit Trail

Every grade modification should contain:

- Student
- Assessment
- Previous Score
- New Score
- Changed By
- Date/Time
- Reason

---

# 29. Results

## Student Result

Example:

```text
Biology Major Exam

Score
42 / 50

Percentage
84%

Correct
42

Incorrect
8

Skipped
0

Status
PASSED
```

Depending on teacher settings, results may also show:

- Correct answers
- Wrong answers
- Explanations
- Teacher comments
- Time spent
- Class average

---

# 30. Teacher Results

Teachers should see:

```text
Total Students: 40
Completed: 38
Not Started: 2

Average: 78%
Highest: 98%
Lowest: 42%
Passing Rate: 84%
```

---

# 31. Question Analytics

For every question:

```text
Question 12

Correct: 32%
Incorrect: 68%

Average Time:
48 seconds

Difficulty:
High
```

This helps teachers identify problematic questions.

---

# 32. Competency Analytics

Questions can be mapped to competencies.

Example:

```text
Mathematics

Algebra          91%
Geometry         78%
Statistics       64%
Trigonometry     83%
```

This allows the system to identify learning gaps.

---

# 33. Student Academic Profile

Each student should have a unified academic profile.

```text
Student
│
├── Personal Information
├── Enrollment
├── Classes
├── Attendance
├── Assessments
├── Grades
├── Competencies
├── Academic History
└── Teacher Remarks
```

---

# 34. Student Assessment Timeline

One of the key features of the platform.

Example:

```text
August 10
Biology Quiz
Score: 82%

August 14
Biology Quiz
Score: 88%

August 18
Biology Major Exam
Score: 76%

August 20
Biology Final Practice
Score: 91%
```

The system automatically builds this timeline from assessment attempts.

---

# 35. Performance Trends

Show:

```text
Assessment Performance

100% ┤                  ●
 90% ┤        ●     ●
 80% ┤   ●
 70% ┤             ●
 60% ┤
     └────────────────────
       Q1 Q2 Q3 Q4 Q5
```

Calculate:

- Average
- Trend
- Improvement
- Decline
- Highest score
- Lowest score

---

# 36. Attendance

Attendance should be integrated with classes.

## Statuses

- Present
- Absent
- Late
- Excused

---

# 37. Attendance Methods

## Manual

Teacher selects attendance status.

## QR Code

Teacher generates a QR code and students scan it.

## Scheduled Attendance

System creates attendance automatically based on class schedule.

### Future

- NFC
- GPS-based verification
- Device verification

---

# 38. Attendance Record

Example:

```text
Student:
Juan Dela Cruz

Date:
August 21, 2026

Class:
Biology

Status:
Present

Recorded By:
Teacher Maria

Recorded At:
08:02 AM
```

---

# 39. Attendance Analytics

Display:

```text
Attendance Rate: 92%

Present: 44
Absent: 3
Late: 1
Excused: 0
```

---

# 40. Gradebook

Teachers should eventually have a gradebook.

| Student | Quiz 1 | Quiz 2 | Major | Final | Average |
| ------- | -----: | -----: | ----: | ----: | ------: |
| Juan    |     85 |     88 |    82 |    91 |    86.5 |
| Maria   |     91 |     94 |    89 |    95 |    92.3 |

---

# 41. Grade Categories

Teachers can configure categories:

```text
Quizzes        20%
Major Exams    30%
Assignments    20%
Final Exam     30%
```

The system calculates weighted grades.

---

# 42. Notifications

Notifications should support:

- New assessment
- Assessment reminder
- Assessment started
- Assessment submitted
- Result published
- Grade changed
- Attendance recorded
- Teacher announcement

---

# 43. Notification Center

Students can see notifications such as:

```text
🔔 New Biology Exam

Your Biology Major Exam is scheduled
for August 25 at 9:00 AM.


🔔 Result Available

Your Mathematics Quiz result is now available.
```

---

# 44. Reports

## Teacher Reports

- Class performance
- Assessment results
- Student performance
- Attendance
- Question analysis
- Gradebook

## Student Reports

- Academic history
- Assessment history
- Attendance
- Performance trends

## Admin Reports

- School performance
- Teacher activity
- Class performance
- Student performance
- Attendance
- Assessment statistics

---

# 45. Import / Export

## Import

Support:

- CSV
- Excel

Import:

- Students
- Teachers
- Classes
- Questions
- Enrollment

## Export

Export:

- CSV
- Excel
- PDF

### Reports

- Exam results
- Gradebook
- Attendance
- Student academic record
- Question analytics

---

# 46. Audit Logs

Important actions must be recorded.

Examples:

- Teacher created assessment
- Teacher published assessment
- Teacher changed answer key
- Teacher changed student's grade
- Admin changed enrollment
- Student submitted assessment

## Audit Record

```text
User
Action
Entity
Entity ID
Old Value
New Value
Timestamp
IP / Device information
```

---

# 47. Soft Delete / Archiving

Important academic data should generally not be permanently deleted.

Instead use:

```text
Active
Archived
Deleted
```

For example:

> Archive Assessment

rather than immediately deleting it.

---

# 48. Assessment Lifecycle

Recommended lifecycle:

```text
DRAFT
   ↓
SCHEDULED
   ↓
ACTIVE
   ↓
CLOSED
   ↓
GRADING
   ↓
GRADED
   ↓
PUBLISHED
   ↓
ARCHIVED
```

---

# 49. Suggested Database Structure

## Core Entities

```text
users
students
teachers
admins

academic_years
terms

subjects
courses
sections
enrollments

assessment_types
assessments
assessment_settings

question_banks
questions
question_choices
question_tags
question_competencies

assessment_questions

assessment_attempts
student_answers

grades
grade_adjustments

attendance
attendance_records

notifications

audit_logs
```

---

# 50. Relationship Overview

```text
User
 │
 ├── Student
 ├── Teacher
 └── Admin

Teacher
 │
 └── Section
       │
       └── Enrollment
              │
              └── Student

Teacher
 │
 └── Assessment
       │
       ├── Assessment Questions
       │       │
       │       └── Question Bank
       │
       └── Assessment Attempt
                │
                └── Student Answer
                        │
                        └── Grade
```

---

# 51. Assessment Data Model

Conceptually:

```text
Assessment
├── id
├── title
├── description
├── type_id
├── subject_id
├── section_id
├── created_by
├── total_points
├── passing_score
├── start_at
├── end_at
├── duration_minutes
├── max_attempts
├── status
├── created_at
└── updated_at
```

---

# 52. Assessment Attempt Data Model

```text
AssessmentAttempt
├── id
├── assessment_id
├── student_id
├── attempt_number
├── started_at
├── submitted_at
├── duration_seconds
├── score
├── percentage
├── status
├── auto_submitted
└── created_at
```

---

# 53. Student Answer Data Model

```text
StudentAnswer
├── id
├── attempt_id
├── question_id
├── answer
├── is_correct
├── points_possible
├── points_earned
├── time_spent_seconds
├── answered_at
└── graded_at
```

---

# 54. Security Requirements

Because this application contains academic records, security is critical.

Implement:

- Secure authentication
- Password hashing
- Role-based access control
- Server-side authorization
- Input validation
- CSRF protection where applicable
- XSS protection
- SQL injection protection
- Rate limiting
- Secure sessions/tokens
- HTTPS
- Audit logs
- Backup strategy

> **Never rely on frontend permissions alone.**

---

# 55. Data Integrity

The system must prevent situations such as:

```text
Student answers question
        ↓
Network failure
        ↓
Answer disappears
```

Use:

- Auto-save
- Transactions
- Idempotent submission
- Server-side validation
- Local temporary storage
- Retry mechanism

---

# 56. Exam Submission Reliability

Submission should be **idempotent**.

If the student presses Submit twice:

```text
Submit #1 → Successful

Submit #2 → No duplicate attempt created
```

The system must ensure that an assessment attempt is finalized only once.

---

# 57. Offline Support

Future versions should support limited offline examination.

Architecture:

```text
Browser
   ↓
Local Storage / IndexedDB
   ↓
Temporary Answers
   ↓
Connection Restored
   ↓
Synchronization
   ↓
Server
```

This is especially valuable for unreliable internet environments.

---

# 58. Mobile / Responsive Design

The platform should work on:

- Desktop
- Laptop
- Tablet
- Mobile

However:

- Teacher/admin interfaces can prioritize desktop.
- Student exam interfaces should be highly responsive.

---

# 59. Progressive Web App

Future support:

- Install App
- Offline Mode
- Push Notifications
- Fast Loading
- Mobile Exam Experience

---

# 60. Accessibility

Support:

- Keyboard navigation
- Screen readers
- Proper labels
- Sufficient color contrast
- Focus indicators
- Accessible forms
- Adjustable text size

---

# 61. Search

Global search should eventually support:

- Students
- Teachers
- Classes
- Assessments
- Questions
- Results

### Example

```text
Search:
"Juan Dela Cruz"
```

Results:

```text
Student
Classes
Assessments
Attendance
Academic Record
```

---

# 62. Filtering

Common filters:

- Academic Year
- Term
- Subject
- Class
- Teacher
- Assessment Type
- Assessment Status
- Student
- Date
- Score

---

# 63. Dashboard Analytics

Useful KPIs:

- Total Students
- Active Classes
- Active Assessments
- Average Score
- Passing Rate
- Attendance Rate
- Pending Grading

---

# 64. Question Quality Analytics

Eventually calculate:

## Difficulty

Percentage of students answering correctly.

## Discrimination

How well the question distinguishes high-performing and low-performing students.

## Distractor Analysis

For multiple-choice questions:

```text
A → 8%
B → 12%
C → 72% ✓
D → 8%
```

This allows teachers to improve their question bank.

---

# 65. Competency-Based Assessment

Questions can map to learning competencies.

Example:

```text
Question 1
Competency: Solve linear equations

Question 2
Competency: Solve linear equations

Question 3
Competency: Interpret graphs
```

Then calculate:

```text
Linear Equations:   91%
Graph Interpretation: 72%
Statistics:         64%
```

---

# 66. Exam Templates

Teachers should be able to save templates.

### Example

```text
Biology Major Exam Template

50 Questions
60 Minutes

10 Easy
30 Medium
10 Hard

Passing: 75%
Randomize: Yes
```

Next time:

```text
Create from Template
```

---

# 67. Exam Duplication

Teachers should be able to duplicate an assessment.

Example:

```text
Biology Quiz 1
        ↓
Duplicate
        ↓
Biology Quiz 1 - Section B
```

---

# 68. Exam Versioning

For published exams, changes should create a version.

Example:

```text
Version 1
50 questions

Version 2
51 questions

Version 3
Corrected Question 12
```

Past student attempts must remain connected to the exact version they actually took.

---

# 69. AI Features — Future

AI should be an enhancement, not a core dependency.

Potential features:

### Question Generation

```text
Generate 10 Grade 10 Biology questions

Topic:
Cell Biology

Difficulty:
Medium
```

### Question Improvement

AI can identify:

- Ambiguous wording
- Duplicate questions
- Poor distractors
- Grammar problems

### Essay Assistance

AI can provide a suggested score/rubric analysis.

> **Teacher remains the final authority.**

---

# 70. AI Question Generation Workflow

```text
Teacher
 ↓
Select Subject
 ↓
Select Topic
 ↓
Select Difficulty
 ↓
Select Question Type
 ↓
AI Generates Questions
 ↓
Teacher Reviews
 ↓
Teacher Approves
 ↓
Question Bank
```

AI-generated questions should **never automatically become published exam questions without teacher review**.

---

# 71. Proctoring — Future

Optional integrations:

- Webcam monitoring
- Screen monitoring
- Browser lockdown
- Identity verification
- Tab switching detection
- Suspicious activity detection

These should be treated as advanced features rather than required functionality.

---

# 72. Notification Architecture

Use a central notification system.

```text
Event
 ↓
Notification Service
 ↓
User Notification
```

## Events

- Assessment Published
- Assessment Starting
- Assessment Submitted
- Result Published
- Grade Changed
- Attendance Recorded

---

# 73. API Architecture

A possible API structure:

```text
/api/auth
/api/users
/api/students
/api/teachers

/api/academic-years
/api/terms
/api/subjects
/api/classes
/api/enrollments

/api/assessments
/api/assessment-types
/api/assessment-attempts

/api/questions
/api/question-banks

/api/grades
/api/attendance

/api/reports
/api/analytics

/api/notifications
/api/audit-logs
```

---

# 74. Important Backend Services

Separate business logic into services such as:

```text
AssessmentService
QuestionService
AttemptService
GradingService
AttendanceService
NotificationService
AnalyticsService
ReportService
AuditService
```

This will make the application easier to maintain as it grows.

---

# 75. Recommended Core Flow

The most important backend flow should be:

```text
Create Assessment
        ↓
Attach Questions
        ↓
Configure Settings
        ↓
Publish
        ↓
Student Starts
        ↓
Create AssessmentAttempt
        ↓
Student Answers
        ↓
Auto-save StudentAnswer
        ↓
Student Submits
        ↓
Finalize Attempt
        ↓
Auto-grade
        ↓
Calculate Score
        ↓
Create/Update Grade
        ↓
Update Student Academic Record
        ↓
Update Analytics
        ↓
Notify Student
```

---

# 76. Single Source of Truth

A very important architectural principle:

> **Do not manually enter the same academic data in multiple places.**

For example, when a student completes an exam:

```text
AssessmentAttempt
       ↓
Grade
       ↓
Student Academic Record
       ↓
Gradebook
       ↓
Analytics
       ↓
Reports
```

All of these should derive from the underlying assessment data.

> **Do not create five independent copies of the same score.**

---

# 77. MVP

The first production version should focus on:

```text
Authentication
        ↓
Users / Roles
        ↓
Classes
        ↓
Students
        ↓
Assessment Builder
        ↓
Question Bank
        ↓
Online Exam
        ↓
Auto-save
        ↓
Assessment Attempts
        ↓
Auto-grading
        ↓
Results
        ↓
Basic Analytics
```

This is enough to prove the core product.

---

# 78. Version 2

Add:

- Attendance
- Gradebook
- Student Academic Profile
- Notifications
- Reports
- Import / Export
- Audit Logs
- Question Analytics
- Assessment Templates

---

# 79. Version 3

Add:

- Competency Tracking
- Advanced Analytics
- Offline Exams
- PWA
- AI Question Generation
- AI Essay Assistance
- Advanced Question Analysis
- Parent Portal

---

# 80. Core Product Differentiator

The product should **not** be positioned simply as:

> "A Google Classroom alternative."

A stronger positioning is:

> **An assessment-first academic management platform that automatically turns every quiz, exam, and attendance event into actionable student records and performance analytics.**

## Core Loop

```text
ASSESS
   ↓
RECORD
   ↓
GRADE
   ↓
ANALYZE
   ↓
IMPROVE
```

## Student Academic View

```text
Student
   │
   ├── Attendance
   │
   ├── Assessments
   │      ├── Quizzes
   │      ├── Major Exams
   │      ├── Diagnostics
   │      └── Finals
   │
   ├── Grades
   │
   ├── Competencies
   │
   └── Academic History
```

---

# 81. Final Feature Map

```text
EXAM & ACADEMIC MANAGEMENT PLATFORM
│
├── Authentication
│   ├── Login
│   ├── Registration
│   ├── Password Reset
│   └── Role Management
│
├── Dashboard
│   ├── Admin
│   ├── Teacher
│   └── Student
│
├── Academic Management
│   ├── Academic Years
│   ├── Terms
│   ├── Subjects
│   ├── Courses
│   ├── Classes
│   ├── Sections
│   └── Enrollment
│
├── Assessment
│   ├── Assessment Types
│   ├── Exam Builder
│   ├── Scheduling
│   ├── Settings
│   ├── Attempts
│   ├── Submissions
│   └── Results
│
├── Question Bank
│   ├── Questions
│   ├── Categories
│   ├── Tags
│   ├── Difficulty
│   ├── Competencies
│   └── Question Pools
│
├── Grading
│   ├── Auto Grading
│   ├── Manual Grading
│   ├── Partial Credit
│   ├── Grade Adjustment
│   └── Gradebook
│
├── Attendance
│   ├── Manual
│   ├── QR
│   ├── Present
│   ├── Absent
│   ├── Late
│   └── Excused
│
├── Student Records
│   ├── Student Profile
│   ├── Assessment History
│   ├── Attendance History
│   ├── Grades
│   ├── Competencies
│   └── Academic Timeline
│
├── Analytics
│   ├── Student Analytics
│   ├── Class Analytics
│   ├── Exam Analytics
│   ├── Question Analytics
│   ├── Competency Analytics
│   └── Performance Trends
│
├── Reports
│   ├── Exam Reports
│   ├── Grade Reports
│   ├── Attendance Reports
│   └── Student Reports
│
├── Notifications
│   ├── In-App
│   ├── Email
│   └── Push
│
├── Administration
│   ├── Users
│   ├── Permissions
│   ├── Audit Logs
│   ├── System Settings
│   └── Data Management
│
└── Future
    ├── Offline Exams
    ├── PWA
    ├── AI Question Generation
    ├── AI Essay Assistance
    ├── Proctoring
    └── Parent Portal
```

---

# 82. Most Important Architectural Decision

If upgrading an existing application, **do not start by adding attendance, AI, notifications, or other secondary features.**

First make these six entities extremely solid:

```text
Assessment
Question
AssessmentAttempt
StudentAnswer
Grade
StudentAcademicRecord
```

Everything else should connect to these entities.

## Core Architecture

```text
                    ┌──────────────┐
                    │  Assessment  │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Question   │
                    └──────┬───────┘
                           │
                           ▼
                 ┌────────────────────┐
                 │ AssessmentAttempt  │
                 └─────────┬──────────┘
                           │
                           ▼
                 ┌────────────────────┐
                 │   StudentAnswer   │
                 └─────────┬──────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Grade     │
                    └──────┬───────┘
                           │
                           ▼
             ┌──────────────────────────┐
             │ StudentAcademicRecord    │
             └────────────┬─────────────┘
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
         Gradebook     Analytics     Reports
```

This provides a clean foundation where every exam or quiz automatically produces a reliable academic record.

---

# Product Principle

> **Every assessment should produce reliable academic data.**

The central platform loop is:

```text
ASSESS
   ↓
RECORD
   ↓
GRADE
   ↓
ANALYZE
   ↓
IMPROVE
```

The goal is not merely to build an online exam system.

The goal is to build an **assessment-first academic management platform** where assessment data becomes the foundation for grades, academic records, analytics, reports, competencies, and long-term student performance tracking.

---

## MVP Priority

```text
┌───────────────────────────────────────────┐
│              CORE FOUNDATION              │
├───────────────────────────────────────────┤
│                                           │
│  1. Authentication & Roles                │
│  2. Academic Structure                    │
│  3. Classes & Enrollment                  │
│  4. Question Bank                         │
│  5. Assessment Builder                    │
│  6. Assessment Attempt                    │
│  7. Reliable Auto-Save                   │
│  8. Auto-Grading                          │
│  9. Results & Grades                      │
│ 10. Basic Analytics                       │
│                                           │
└───────────────────────────────────────────┘
```

Everything else should be built on top of this foundation.
