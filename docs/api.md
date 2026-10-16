# Survey Builder API notes

Base address: `http://localhost:4000`
All requests and answers are JSON. There is no login. The author routes and the
respondent routes are just different addresses.

## How errors look

Every error comes back as:

```json
{ "error": "a readable message" }
```

| Status | When |
|---|---|
| 400 | The request is wrong: bad body, bad paging values, or an invalid answer |
| 404 | The survey or question does not exist (or a draft is asked for on the respondent side) |
| 409 | The request is fine, but the survey is in the wrong state (for example editing a published survey) |

Database errors are never sent out. The messages above are all you get.

## Pagination (survey list and response list)

| Parameter | Default | Rules |
|---|---|---|
| `page` | 1 | whole number, 1 or more |
| `pageSize` | 10 | whole number, 1 to 50 |

- Order is newest first. If two items have the same time, the larger id comes first, so the order never jumps between pages.
- A valid page past the last one is **not** an error. It gives an empty `items` list and the right totals.
- Bad values (`page=0`, `page=abc`, `pageSize=1000`) give **400**.

A page answer looks like this:

```json
{ "items": [], "page": 1, "pageSize": 10, "total": 31, "totalPages": 4 }
```

---

## Author routes

### POST /surveys
Create a draft.
Body: `{ "title": "Week 1 check-in", "description": "optional" }`
- **201:** the new survey (status `draft`, no questions)
- **400:** title is missing or not text

### GET /surveys
List surveys, one page at a time.
Query: `page`, `pageSize`, and optional `status` = `draft`, `published` or `closed` (leave it out for all).
The filter is applied before the page is cut.
- **200:** a page of surveys
- **400:** bad `page`, `pageSize` or `status`

### GET /surveys/:id
One survey with its questions and options.
`:id` is the survey's id.
- **200:** the survey
- **404:** `Survey not found`

```json
{
  "id": "3b24...",
  "title": "Week 1 check-in",
  "description": "How is it going?",
  "status": "draft",
  "createdAt": "2026-10-14T08:00:00.000Z",
  "questions": [
    {
      "id": "7fe1...",
      "type": "single_choice",
      "label": "How is the team?",
      "helperText": "",
      "required": false,
      "options": [{ "id": "8bc7...", "text": "Great" }]
    }
  ]
}
```

Question types: `short_text`, `long_text`, `single_choice`, `multiple_choice`, `rating`.

### DELETE /surveys/:id
Delete a survey. Drafts only.
- **204:** deleted, nothing returned
- **404:** survey not found
- **409:** `Only a draft survey can be deleted`

### Editing a draft
All of these only work while the survey is a **draft**. Each one answers with the whole updated survey. On a published or closed survey they all give **409** `Only a draft survey can be changed`. A wrong survey id gives **404** `Survey not found`, and a wrong question id gives **404** `Question not found`.

**POST /surveys/:id/questions** adds a question.
Body: `{ "type": "rating", "label": "Rate your first week" }`
- **201:** the survey
- **400:** bad type or label
- **409:** already 5 questions (`A survey can have at most 5 questions`)

**PATCH /surveys/:id/questions/:questionId** edits a question.
Body: any of `{ "label": "...", "helperText": "...", "required": true }`
- **200:** the survey
- **400:** wrong types in the body

**DELETE /surveys/:id/questions/:questionId** removes a question.
- **200:** the survey

**PATCH /surveys/:id/questions/:questionId/move** moves a question one place.
Body: `{ "direction": "up" }` or `"down"`
- **200:** the survey
- **400:** direction is not up or down
- **409:** it is already first or last (`The question cannot move up`)

**POST /surveys/:id/questions/:questionId/duplicate** copies a question right after itself. The copy and its options get new ids.
- **201:** the survey
- **409:** already 5 questions

**POST /surveys/:id/questions/:questionId/options** adds an option.
Body: `{ "text": "Great" }`
- **201:** the survey
- **400:** text missing
- **409:** the question is not a choice question (`Only choice questions can have options`)

**DELETE /surveys/:id/questions/:questionId/options/:optionId** removes an option.
- **200:** the survey

### POST /surveys/:id/publish
Publish a draft. Body: none.
To publish, the title must not be blank, there must be 1 to 5 questions, every question needs a label, and every choice question needs at least two different, non-blank options.
- **200:** the survey, now `published`
- **409:** not a draft (`Only a draft survey can be published`), or something is invalid. The message lists every problem, for example
  `Cannot publish: Question 1: A choice question needs at least two options`

After publishing, the questions never change.

### POST /surveys/:id/close
Close a published survey. Body: none. Existing responses and results stay.
- **200:** the survey, now `closed`
- **409:** `Only a published survey can be closed`

### GET /surveys/:id/responses
The responses of one survey, newest first, one page at a time. Query: `page`, `pageSize`.
- **200:** a page of responses
- **400:** bad paging values
- **404:** survey not found

```json
{
  "id": "c1d2...",
  "surveyId": "3b24...",
  "answers": [
    { "questionId": "7fe1...", "value": "8bc7..." },
    { "questionId": "9a10...", "value": 4 }
  ],
  "submittedAt": "2026-10-14T09:30:00.000Z"
}
```

### GET /surveys/:id/results
The summary of **all** responses. It does not depend on any page.
- **200:** see below
- **404:** survey not found

```json
{
  "totalResponses": 27,
  "questions": [
    {
      "questionId": "7fe1...", "label": "How is the team?", "type": "single_choice",
      "answeredCount": 27,
      "optionCounts": [{ "optionId": "8bc7...", "text": "Great", "count": 9 }]
    },
    {
      "questionId": "9a10...", "label": "Rate your first week", "type": "rating",
      "answeredCount": 27, "average": 2.89,
      "distribution": [{ "rating": 1, "count": 6 }]
    }
  ]
}
```

- Choice questions get a count for every option (0 if nobody picked it). Each checked box counts once.
- Rating questions get an `average` of the answered ratings only. With no ratings it is `null`, never a bad number.
- Text questions get a `textAnswers` list.
- A survey with no responses gives `totalResponses: 0` and zero counts.

---

## Respondent routes

### GET /surveys/:id/form
The form to fill in. Only a published survey.
- **200:** `{ id, title, description, questions }`
- **404:** the survey does not exist, or it is still a draft
- **409:** `This survey is closed`

### POST /surveys/:id/responses
Send the answers. Body:

```json
{
  "answers": [
    { "questionId": "7fe1...", "value": "8bc7..." },
    { "questionId": "9a10...", "value": 4 }
  ]
}
```

What `value` must be for each type:

| Question type | `value` |
|---|---|
| `short_text`, `long_text` | text |
| `single_choice` | one option id of that question |
| `multiple_choice` | a list of option ids of that question (repeats count once) |
| `rating` | a whole number from 1 to 5 |

Checks, done by the server whatever the browser did:
- the survey must be published
- every `questionId` must exist, and each question may appear only once
- the value must match the question type, and option ids must belong to that question
- a required question needs a real answer (not missing, not blank, not an empty list)
- an optional question can be left out
- ratings like `0`, `6` or `2.5` are rejected

Nothing is saved unless every check passes.
- **201:** the saved response
- **400:** the body is wrong, or an answer is invalid. The message lists every problem, for example
  `Invalid response: "Rate your first week": Rating must be between 1 and 5`
- **404:** survey not found
- **409:** `This survey is not available yet` (draft) or `This survey is closed`